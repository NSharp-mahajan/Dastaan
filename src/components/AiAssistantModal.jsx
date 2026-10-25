import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import '../styles/assistant.css';

const SESSION_KEY = 'dastaan_assistant_session';

const INITIAL_MESSAGE = {
  id: 'init-msg',
  role: 'assistant',
  text: 'Where would you like to travel?',
  suggestedReplies: [],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

function loadSavedSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[AiAssistant] Could not load saved session:', err);
  }
  return null;
}

export default function AiAssistantModal() {
  const navigate = useNavigate();
  const saved = loadSavedSession();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(saved?.messages || [INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPreferences, setCurrentPreferences] = useState(saved?.currentPreferences || {});
  const [conversationStage, setConversationStage] = useState(saved?.conversationStage || 'collecting_preferences');
  const [activeTrip, setActiveTrip] = useState(saved?.activeTrip || null);

  const transcriptEndRef = useRef(null);
  const inputRef = useRef(null);

  // Persist session state across page refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          messages,
          currentPreferences,
          conversationStage,
          activeTrip
        })
      );
    } catch (e) {
      // Ignore quota errors
    }
  }, [messages, currentPreferences, conversationStage, activeTrip]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isGenerating, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Global event listener to open assistant from anywhere
  useEffect(() => {
    const handleOpenEvent = (e) => {
      setIsOpen(true);
      if (e.detail?.initialPrompt) {
        setInputValue(e.detail.initialPrompt);
      }
      if (e.detail?.trip) {
        setActiveTrip(e.detail.trip);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('open-dastaan-assistant', handleOpenEvent);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-dastaan-assistant', handleOpenEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleResetSession = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setMessages([INITIAL_MESSAGE]);
    setCurrentPreferences({});
    setConversationStage('collecting_preferences');
    setActiveTrip(null);
    setInputValue('');
  };

  const handleSendMessage = async (textToSend, action = null) => {
    let text = (textToSend || inputValue).trim();
    if (!text && !action) return;

    // If text expresses explicit confirmation intent while in ready state
    const isCurrentlyReady = messages.some(m => m.readyForConfirmation);
    if (!action && /^confirm/i.test(text) && isCurrentlyReady) {
      action = 'confirm';
    }

    // Add user message to transcript
    const userMsgId = 'usr-' + Date.now();
    if (text) {
      setMessages(prev => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setInputValue('');
    }

    if (action === 'confirm') {
      setIsGenerating(true);
    } else {
      setIsLoading(true);
    }

    // Prepare bounded conversation history
    const conversationHistory = messages
      .filter(m => m.id !== 'init-msg')
      .map(m => ({ role: m.role, content: m.text }));

    try {
      const payload = {
        message: text,
        action,
        conversationHistory,
        currentPreferences,
        currentTripId: activeTrip?._id || null,
        currentTrip: activeTrip || null
      };

      const res = await apiClient.sendAssistantMessage(payload);

      if (res.success && res.data) {
        const data = res.data;

        if (data.currentPreferences) {
          setCurrentPreferences(data.currentPreferences);
        }
        if (data.conversationStage) {
          setConversationStage(data.conversationStage);
        }

        // If itinerary was generated upon confirmation
        if (data.type === 'itinerary_generated' && data.trip) {
          localStorage.setItem('dastaanTrip', JSON.stringify(data.trip));
          setActiveTrip(data.trip);

          setMessages(prev => [
            ...prev,
            {
              id: 'ast-' + Date.now(),
              role: 'assistant',
              text: data.reply || 'Your itinerary has been curated and verified!',
              trip: data.trip,
              conversationStage: 'completed',
              redirectUrl: data.redirectUrl || '/itinerary',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else if (data.type === 'itinerary_modified' && data.trip) {
          localStorage.setItem('dastaanTrip', JSON.stringify(data.trip));
          setActiveTrip(data.trip);

          setMessages(prev => [
            ...prev,
            {
              id: 'ast-' + Date.now(),
              role: 'assistant',
              text: data.reply || 'Your itinerary has been updated.',
              trip: data.trip,
              conversationStage: data.conversationStage || 'ready_for_confirmation',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          // Regular conversational turn
          setMessages(prev => [
            ...prev,
            {
              id: 'ast-' + Date.now(),
              role: 'assistant',
              text: data.reply,
              summary: data.confirmationSummary,
              readyForConfirmation: Boolean(data.readyForConfirmation),
              missingFields: data.missingFields || [],
              suggestedReplies: data.suggestedReplies || [],
              conversationStage: data.conversationStage || 'collecting_preferences',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } else {
        let errorText = res.error || res.data?.message;
        if (!errorText || errorText === 'Failed to fetch' || errorText.includes('NetworkError')) {
          errorText = res.errorType === 'TIMEOUT'
            ? 'The travel assistant request timed out. Please try again.'
            : (res.errorType === 'CORS_ERROR'
              ? 'Request blocked by browser security (CORS). Please verify server allowed origins.'
              : 'Could not connect to the travel assistant service. Please check that the server is running on port 5000 and try again.');
        }
        if (res.data?.currentPreferences) {
          setCurrentPreferences(res.data.currentPreferences);
        }
        if (res.data?.conversationStage) {
          setConversationStage(res.data.conversationStage);
        }
        const isRetryable = Boolean(res.data?.retryable || res.retryable || /504|timeout|unavailable|retry/i.test(errorText));
        setMessages(prev => {
          // Avoid appending duplicate identical error messages in sequence
          if (prev.length > 0 && prev[prev.length - 1]?.isError && prev[prev.length - 1]?.text === errorText) {
            return prev;
          }
          return [
            ...prev,
            {
              id: 'err-' + Date.now(),
              role: 'assistant',
              text: errorText,
              isError: true,
              isRetryable,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
        });
      }
    } catch (err) {
      const msg = (err.name === 'AbortError' || /timeout/i.test(err.message))
        ? 'The travel assistant request timed out. Please try again.'
        : (err.name === 'TypeError' || err.message === 'Failed to fetch'
          ? 'Could not connect to the travel assistant service. Please check that the server is running on port 5000 and try again.'
          : (err.message || 'Network connection to the AI assistant failed.'));
      const isRetryable = /504|timeout|unavailable|retry/i.test(msg);
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1]?.isError && prev[prev.length - 1]?.text === msg) {
          return prev;
        }
        return [
          ...prev,
          {
            id: 'err-' + Date.now(),
            role: 'assistant',
            text: msg,
            isError: true,
            isRetryable,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleConfirmAndBuild = () => {
    if (isGenerating) return;
    handleSendMessage('', 'confirm');
  };

  const handleOpenGeneratedTrip = (url) => {
    setIsOpen(false);
    if (url) {
      navigate(url);
    } else {
      navigate('/itinerary');
    }
  };

  // Find latest suggestions from the most recent assistant message (no hardcoded examples)
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const activeSuggestions = (lastAssistantMsg?.suggestedReplies && Array.isArray(lastAssistantMsg.suggestedReplies))
    ? lastAssistantMsg.suggestedReplies
    : [];

  return (
    <>
      {/* Floating Circular Launcher Button (Bottom-Right, Hidden when open) */}
      <button
        type="button"
        className={`assistant-launcher-btn ${isOpen ? 'launcher-hidden' : ''}`}
        id="btn-open-assistant"
        onClick={() => setIsOpen(true)}
        aria-label="Open Dastaan AI Travel Assistant"
        title="Dastaan AI Travel Assistant"
        aria-hidden={isOpen}
      >
        <span className="assistant-sparkle-icon" aria-hidden="true">&#10024;</span>
      </button>

      {/* Floating Chat Widget Panel */}
      <div
        className={`assistant-widget-backdrop assistant-modal-backdrop ${isOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false);
        }}
      >
        <aside
          className="assistant-widget-panel assistant-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Dastaan AI Travel Assistant"
        >
          {/* Fixed Widget Header */}
          <div className="assistant-header">
            <div className="assistant-header-titles">
              <h2 className="assistant-title">Dastaan AI</h2>
              <span className="assistant-subtitle">Plan your next trip</span>
            </div>
            <div className="assistant-header-actions">
              <button
                type="button"
                className="assistant-reset-btn"
                onClick={handleResetSession}
                aria-label="Start new journey"
                title="Start new journey"
              >
                &#8634;
              </button>
              <button
                type="button"
                className="assistant-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant"
                title="Close Assistant"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Scrollable Transcript Area */}
          <div className="assistant-transcript">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                <div className={`chat-bubble ${msg.isError ? 'error-bubble' : ''}`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                    {msg.text.split(/(\[.*?\]\(.*?\))/g).map((part, i) => {
                      const match = part.match(/\[(.*?)\]\((.*?)\)/);
                      if (match) {
                        return (
                          <a 
                            key={i} 
                            href={match[2]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="chat-inline-link"
                          >
                            {match[1]}
                          </a>
                        );
                      }
                      return part;
                    })}
                  </p>

                  {/* 1-Click Retry on Transient Errors */}
                  {msg.isError && msg.isRetryable && (
                    <div className="assistant-error-actions">
                      <button
                        type="button"
                        className="assistant-retry-btn"
                        onClick={handleConfirmAndBuild}
                        disabled={isGenerating || isLoading}
                      >
                        Retry Generation &#x21bb;
                      </button>
                    </div>
                  )}

                  {/* Explicit Confirmation Summary Card (ONLY rendered when readyForConfirmation is true) */}
                  {msg.summary && msg.readyForConfirmation && (
                    <div className="assistant-confirmation-card">
                      <div className="conf-card-header">CONFIRM YOUR JOURNEY PARAMETERS</div>
                      <div className="conf-grid">
                        <div className="conf-item">
                          <span className="conf-label">Destination</span>
                          <span className="conf-val">{msg.summary.destination?.name}</span>
                        </div>
                        <div className="conf-item">
                          <span className="conf-label">Duration</span>
                          <span className="conf-val">{msg.summary.duration} Days</span>
                        </div>
                        <div className="conf-item">
                          <span className="conf-label">Travellers</span>
                          <span className="conf-val">
                            {msg.summary.travelers} {msg.summary.travelers === 1 ? 'Person' : 'People'}
                          </span>
                        </div>
                        <div className="conf-item">
                          <span className="conf-label">Total Budget</span>
                          <span className="conf-val">₹{msg.summary.budget?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="conf-item">
                          <span className="conf-label">Per Person</span>
                          <span className="conf-val">
                            ~₹{msg.summary.estimatedCostPerPerson?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {msg.summary.startingCity && (
                          <div className="conf-item">
                            <span className="conf-label">Starting From</span>
                            <span className="conf-val">{msg.summary.startingCity}</span>
                          </div>
                        )}
                        <div className="conf-item">
                          <span className="conf-label">Pace & Style</span>
                          <span className="conf-val">{msg.summary.travelStyle}</span>
                        </div>
                      </div>

                      <div className="conf-actions">
                        <button
                          type="button"
                          className="btn-conf-build"
                          onClick={handleConfirmAndBuild}
                          disabled={isGenerating}
                        >
                          {isGenerating ? 'Building Itinerary...' : 'Confirm & Build Itinerary \u2192'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generated Trip Link (ONLY shown when conversation is completed) */}
                  {msg.trip && msg.conversationStage === 'completed' && (
                    <div className="assistant-success-card">
                      <span className="success-badge">&#10003; JOURNEY CURATED & GROUNDED</span>
                      <p style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
                        {msg.trip.destination?.name} &bull; {msg.trip.duration} Days &bull; ₹{msg.trip.budget?.toLocaleString('en-IN')}
                      </p>
                      <button
                        type="button"
                        className="btn-open-itinerary"
                        onClick={() => handleOpenGeneratedTrip(msg.redirectUrl)}
                      >
                        View My Itinerary &rarr;
                      </button>
                    </div>
                  )}
                </div>
                <span className="chat-timestamp">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing / Generating Indicator */}
            {(isLoading || isGenerating) && (
              <div className="chat-message-row assistant">
                <div className="chat-bubble">
                  <div className="typing-dots">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(244,239,227,0.7)', marginLeft: '8px' }}>
                    {isGenerating ? 'Grounding & generating itinerary...' : 'Refining journey...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Dynamic Contextual Suggestions */}
          {/* Dynamic Contextual Suggestions (Only rendered when assistant provides contextual options) */}
          {activeSuggestions.length > 0 && (
            <div className="assistant-suggestions" aria-label="Quick suggestions">
              {activeSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="suggestion-pill"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading || isGenerating}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Fixed Bottom Input Bar */}
          <div className="assistant-input-area">
            <form
              className="assistant-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className="assistant-text-input"
                placeholder="Where would you like to go?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading || isGenerating}
              />
              <button
                type="submit"
                className="assistant-send-btn"
                disabled={isLoading || isGenerating || !inputValue.trim()}
                aria-label="Send message"
              >
                &uarr;
              </button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
