import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';

export default function DevApiStatus() {
  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  const [status, setStatus] = useState({ checking: true, connected: false, message: '', db: 'unknown' });
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    const performCheck = async () => {
      const res = await apiClient.checkHealth();
      if (!isMounted) return;

      if (res.success && res.data) {
        setStatus({
          checking: false,
          connected: true,
          message: 'Backend Connected',
          db: res.data.database?.status || 'connected'
        });
      } else {
        setStatus({
          checking: false,
          connected: false,
          message: 'Backend Offline',
          db: 'disconnected'
        });
        // Retry in 5 seconds if currently disconnected
        timer = setTimeout(performCheck, 5000);
      }
    };

    performCheck();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Subtle floating dev badge at bottom-right
  return (
    <aside
      aria-label="Development API Status"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        letterSpacing: '0.5px'
      }}
    >
      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          title="Show API Status"
          style={{
            background: status.connected ? '#173B35' : '#4a2c2c',
            color: status.connected ? '#DFBA73' : '#ff9999',
            border: `1px solid ${status.connected ? '#DFBA73' : '#ff6666'}`,
            borderRadius: '12px',
            padding: '4px 8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          API: {status.connected ? '●' : '○'}
        </button>
      ) : (
        <div
          style={{
            background: 'rgba(7, 29, 26, 0.95)',
            color: '#E8DCC7',
            border: '1px solid rgba(223, 186, 115, 0.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(8px)'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: status.checking ? '#e0a800' : status.connected ? '#28a745' : '#dc3545'
            }}
          ></span>
          <span>
            {status.checking ? 'Checking API...' : `${status.message} (DB: ${status.db})`}
          </span>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize API status indicator"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(232, 220, 199, 0.6)',
              cursor: 'pointer',
              marginLeft: '4px',
              padding: '0 2px',
              fontSize: '12px'
            }}
          >
            &times;
          </button>
        </div>
      )}
    </aside>
  );
}
