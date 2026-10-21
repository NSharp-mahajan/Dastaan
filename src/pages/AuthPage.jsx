import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hashPassword, getUsers, setUsers, createSession } from '../utils/auth';
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

  const navigate = useNavigate();
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
    setSignupError('');

    setTimeout(() => {
      setAnimClass('');
      setIsTransitioning(false);
    }, 1200);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const identifier = loginEmail.trim().toLowerCase();
    const pass = loginPassword;

    const users = getUsers();
    const user = users.find(u => u.email === identifier || u.mobile === identifier);

    if (!user) {
      setLoginError('No account found with that email or mobile number.');
      return;
    }

    const hash = await hashPassword(pass);
    if (user.passwordHash !== hash) {
      setLoginError('Incorrect password.');
      return;
    }

    createSession(user);
    navigate('/plan');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();
    const mobile = signupMobile.trim();
    const pass = signupPassword;
    const confirm = signupConfirm;
    const style = signupStyle;

    if (pass !== confirm) {
      setSignupError('Passwords do not match.');
      return;
    }

    const users = getUsers();
    if (users.some(u => u.email === email)) {
      setSignupError('An account with this email already exists.');
      return;
    }

    const passwordHash = await hashPassword(pass);
    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
      fullName: name,
      email: email,
      mobile: mobile,
      passwordHash: passwordHash,
      travelStyle: style,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    setUsers(users);
    createSession(newUser);
    navigate('/plan');
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
                  <label htmlFor="login-email">EMAIL OR MOBILE NUMBER</label>
                  <input
                    type="text"
                    id="login-email"
                    placeholder="Your email or mobile"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
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
                  <a href="#forgot" className="forgot-link">FORGOT PASSWORD?</a>
                </div>
                {loginError && <div className="form-error" id="login-error">{loginError}</div>}
                <button type="submit" className="btn-primary">
                  SIGN IN SECURELY <span className="arrow">&rarr;</span>
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
                      required
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
                        placeholder="Create a password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
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
                <button type="submit" className="btn-primary">
                  CREATE ACCOUNT <span className="arrow">&rarr;</span>
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
