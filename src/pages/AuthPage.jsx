import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  loginWithEmail,
  signupWithEmail,
  loginWithGoogle,
  sendPasswordReset,
  getFriendlyAuthErrorMessage
} from '../utils/auth';
import '../styles/signup.css';

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animClass, setAnimClass] = useState('');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupStyle, setSignupStyle] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupMsg, setSignupMsg] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || location.state?.from || '/plan';
  const splitLayoutRef = useRef(null);

  // Height measurement for mobile transitions
  useEffect(() => {
    function updateHeights() {
      if (window.innerWidth <= 900) {
        const visualCol = document.querySelector('.visual-column');
        const authCol = document.querySelector('.auth-column');
        if (visualCol && authCol) {
          document.documentElement.style.setProperty('--visual-height', `${visualCol.offsetHeight}px`);
          document.documentElement.style.setProperty('--auth-height', `${authCol.offsetHeight}px`);
        }
      }
    }
    updateHeights();
    window.addEventListener('resize', updateHeights);
    const timer = setTimeout(updateHeights, 150);
    return () => {
      window.removeEventListener('resize', updateHeights);
      clearTimeout(timer);
    };
  }, [isSignup]);

  const triggerCurtain = (direction, toSignup) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass(`curtain-animating-${direction}`);
    setIsSignup(toSignup);
    setLoginError('');
    setLoginMsg('');
    setSignupError('');
    setSignupMsg('');

    setTimeout(() => {
      setAnimClass('');
      setIsTransitioning(false);
    }, 1200);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginMsg('');

    const email = loginEmail.trim();
    const pass = loginPassword;

    if (!email) {
      setLoginError('Please enter your email address.');
      return;
    }
    if (!pass) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await loginWithEmail(email, pass);
      navigate('/plan');
    } catch (err) {
      setLoginError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupMsg('');

    const name = signupName.trim();
    const email = signupEmail.trim();
    const mobile = signupMobile.trim();
    const pass = signupPassword;
    const confirm = signupConfirm;
    const style = signupStyle;

    if (!name) {
      setSignupError('Please enter your full name.');
      return;
    }

    if (!email) {
      setSignupError('Please enter a valid email address.');
      return;
    }

    if (pass.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      return;
    }

    if (pass !== confirm) {
      setSignupError('Passwords do not match.');
      return;
    }

    setIsSigningUp(true);
    try {
      await signupWithEmail(email, pass, {
        name,
        mobile,
        travelStyle: style || 'Balanced'
      });
      navigate('/plan');
    } catch (err) {
      setSignupError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setSignupError('');
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      navigate('/plan');
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err);
      if (isSignup) {
        setSignupError(msg);
      } else {
        setLoginError(msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginMsg('');

    const email = loginEmail.trim();
    if (!email) {
      setLoginError('Please enter your email in the field above to reset your password.');
      return;
    }

    try {
      await sendPasswordReset(email);
      setLoginMsg(`A password reset link has been sent to ${email}. Check your inbox.`);
    } catch (err) {
      setLoginError(getFriendlyAuthErrorMessage(err));
    }
  };

  return (
    <div
      ref={splitLayoutRef}
      className={`split-layout ${isSignup ? 'signup-mode' : 'login-mode'} ${animClass}`}
    >
      {/* Center Premium Divider */}
      <div className="vertical-divider"></div>

      {/* Transition Curtain Overlay */}
      <div className="transition-curtain"></div>

      {/* LEFT: Visual Collage & Editorial */}
      <div className="visual-column">
        <Link className="header-back" to="/plan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to explore</span>
        </Link>

        <div className="visual-content-wrapper">
          <div className="image-collage">
            <div className="journal-photo img-main">
              <img src="/images/image1.jpg" alt="Destination Image" />
            </div>
            <div className="journal-photo img-secondary">
              <img src="/images/image2.jpg" alt="Journey Image" />
            </div>
          </div>

          <div className="editorial-text">
            <span className="eyebrow">DASTAAN &middot; YOUR JOURNEY AWAITS</span>
            <h1>YOUR NEXT JOURNEY<br />BEGINS HERE.</h1>
            <p>Tell us where you want to go.<br />We'll help turn the idea into a journey.</p>
          </div>
        </div>

        <div className="destination-label">
          <span className="label-tag">A JOURNEY WORTH REMEMBERING</span>
        </div>
      </div>

      {/* RIGHT: Auth Form */}
      <div className="auth-column">
        <div className="auth-container">
          <div className="auth-brand">
            <img className="logo-icon" src="/images/logo.png" alt="Dastaan Logo" width="48" height="48" />
            <div className="logo-text">
              <span className="logo-title">DASTAAN</span>
              <span className="logo-tagline">STORIES &bull; IDEAS &bull; EMOTIONS</span>
            </div>
          </div>

          <div className="auth-forms-wrapper">
            {/* LOGIN FORM */}
            <div className={`auth-form-view ${!isSignup ? 'active' : ''}`} id="login-view">
              <div className="form-header">
                <h2>WELCOME BACK</h2>
                <p>Continue your journey with Dastaan.</p>
              </div>

              <form id="login-form" className="dastaan-form" onSubmit={handleLoginSubmit}>
                <div className="field-group">
                  <label htmlFor="login-email">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    id="login-email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="login-password">PASSWORD</label>
                  <div className="password-wrapper">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      id="login-password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <svg className="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg className="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-footer">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="checkbox-text">REMEMBER ME</span>
                  </label>
                  <a href="#forgot" className="forgot-link" onClick={handleForgotPassword}>FORGOT PASSWORD?</a>
                </div>
                {loginError && <div className="form-error" id="login-error">{loginError}</div>}
                {loginMsg && <div style={{ color: '#D6B56D', fontSize: '0.85rem' }}>{loginMsg}</div>}
                <button type="submit" className="btn-primary" disabled={isLoggingIn || isGoogleLoading}>
                  {isLoggingIn ? 'SIGNING IN...' : 'SIGN IN SECURELY'} <span className="arrow">&rarr;</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(214, 181, 109, 0.2)' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '1.5px' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(214, 181, 109, 0.2)' }} />
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn || isGoogleLoading}
                  style={{
                    height: '46px',
                    borderColor: 'rgba(214, 181, 109, 0.2)',
                    fontSize: '0.75rem',
                    letterSpacing: '1.5px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                    <path fill="#EA4335" d="M12 5c1.57 0 2.98.54 4.1 1.6l3.07-3.07C17.31 1.8 14.86 1 12 1 7.6 1 3.8 3.5 2 7.15l3.75 2.91C6.65 7.1 9.09 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.83-.07-1.63-.2-2.3H12v4.6h6.48c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.7-4.95 3.7-8.75z"/>
                    <path fill="#FBBC05" d="M5.75 14.06c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L2 6.55C1.27 8 1 9.6 1 11.26c0 1.66.27 3.26 1 4.71l3.75-2.91z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.95-2.91l-3.7-2.87c-1.08.72-2.46 1.18-4.25 1.18-2.91 0-5.35-2.1-6.25-5.06L2 16.25C3.8 19.9 7.6 23 12 23z"/>
                  </svg>
                  {isGoogleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
                </button>
              </form>

              <div className="auth-switch">
                <p>NEW TO DASTAAN?</p>
                <button
                  type="button"
                  className="btn-switch"
                  id="go-to-signup"
                  onClick={() => triggerCurtain('right', true)}
                >
                  CREATE YOUR ACCOUNT <span className="arrow">&rarr;</span>
                </button>
              </div>
            </div>

            {/* SIGNUP FORM */}
            <div className={`auth-form-view ${isSignup ? 'active' : ''}`} id="signup-view">
              <div className="form-header">
                <h2>BEGIN YOUR JOURNEY</h2>
                <p>Create your Dastaan account and start planning your next escape.</p>
              </div>

              <form id="signup-form" className="dastaan-form" onSubmit={handleSignupSubmit}>
                <div className="field-group">
                  <label htmlFor="signup-name">FULL NAME</label>
                  <input
                    type="text"
                    id="signup-name"
                    placeholder="Enter your full name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="form-row">
                  <div className="field-group">
                    <label htmlFor="signup-email">EMAIL</label>
                    <input
                      type="email"
                      id="signup-email"
                      placeholder="Enter your email address"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="signup-mobile">MOBILE NUMBER</label>
                    <input
                      type="tel"
                      id="signup-mobile"
                      placeholder="Enter your mobile number"
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field-group">
                    <label htmlFor="signup-password">PASSWORD</label>
                    <div className="password-wrapper">
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        id="signup-password"
                        placeholder="Create a password (min. 6 characters)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? (
                          <svg className="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg className="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor="signup-confirm">CONFIRM PASSWORD</label>
                    <div className="password-wrapper">
                      <input
                        type={showSignupConfirm ? 'text' : 'password'}
                        id="signup-confirm"
                        placeholder="Confirm password"
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                      >
                        {showSignupConfirm ? (
                          <svg className="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg className="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="signup-style">PREFERRED TRAVEL STYLE</label>
                  <div className="select-wrapper">
                    <select
                      id="signup-style"
                      value={signupStyle}
                      onChange={(e) => setSignupStyle(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select your travel style</option>
                      <option value="RELAXED">RELAXED</option>
                      <option value="BALANCED">BALANCED</option>
                      <option value="PACKED">PACKED</option>
                    </select>
                    <svg className="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
                {signupError && <div className="form-error" id="signup-error">{signupError}</div>}
                {signupMsg && <div style={{ color: '#D6B56D', fontSize: '0.85rem' }}>{signupMsg}</div>}
                <button type="submit" className="btn-primary" disabled={isSigningUp || isGoogleLoading}>
                  {isSigningUp ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'} <span className="arrow">&rarr;</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(214, 181, 109, 0.2)' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '1.5px' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(214, 181, 109, 0.2)' }} />
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningUp || isGoogleLoading}
                  style={{
                    height: '46px',
                    borderColor: 'rgba(214, 181, 109, 0.2)',
                    fontSize: '0.75rem',
                    letterSpacing: '1.5px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                    <path fill="#EA4335" d="M12 5c1.57 0 2.98.54 4.1 1.6l3.07-3.07C17.31 1.8 14.86 1 12 1 7.6 1 3.8 3.5 2 7.15l3.75 2.91C6.65 7.1 9.09 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.83-.07-1.63-.2-2.3H12v4.6h6.48c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.7-4.95 3.7-8.75z"/>
                    <path fill="#FBBC05" d="M5.75 14.06c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L2 6.55C1.27 8 1 9.6 1 11.26c0 1.66.27 3.26 1 4.71l3.75-2.91z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.95-2.91l-3.7-2.87c-1.08.72-2.46 1.18-4.25 1.18-2.91 0-5.35-2.1-6.25-5.06L2 16.25C3.8 19.9 7.6 23 12 23z"/>
                  </svg>
                  {isGoogleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
                </button>
              </form>

              <div className="auth-switch">
                <p>ALREADY HAVE AN ACCOUNT?</p>
                <button
                  type="button"
                  className="btn-switch"
                  id="go-to-login"
                  onClick={() => triggerCurtain('left', false)}
                >
                  SIGN IN <span className="arrow">&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
