import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, onAuthStateChanged } from '../firebase';
import { getCurrentUser } from '../utils/auth';
import apiClient from '../services/api';
import { resolveImage } from '../data/itineraries';
import '../styles/navigation.css';
import '../styles/profile.css';

export default function ProfilePage() {
  const navigate = useNavigate();

  // User state
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [isAuthResolving, setIsAuthResolving] = useState(true);

  // Trips & profile data
  const [trips, setTrips] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripsError, setTripsError] = useState('');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editTravelStyle, setEditTravelStyle] = useState('Balanced');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');

  // Toast notification
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3500);
  };

  // 1. Session verification & Profile data loading
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      if (!fbUser && !getCurrentUser()) {
        // Redirect unauthenticated visitor to login with return redirect
        setIsAuthResolving(false);
        navigate('/auth?redirect=/profile');
        return;
      }

      setIsAuthResolving(false);

      // Fetch fresh profile from MongoDB Atlas backend
      try {
        const profileRes = await apiClient.getMe();
        if (isMounted && profileRes.success && profileRes.data?.user) {
          const profile = profileRes.data.user;
          setCurrentUser(profile);
          localStorage.setItem('dastaanUser', JSON.stringify(profile));
          window.dispatchEvent(new Event('dastaan-auth-change'));
        }
      } catch (err) {
        console.warn('[ProfilePage] Could not refresh profile from backend:', err);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  // 2. Fetch saved trips for authenticated user from MongoDB
  const fetchUserTrips = async () => {
    setIsLoadingTrips(true);
    setTripsError('');

    try {
      const res = await apiClient.getUserTrips();
      if (res.success && Array.isArray(res.data?.data)) {
        setTrips(res.data.data);
      } else {
        setTrips([]);
        if (!res.success && res.status !== 401) {
          setTripsError(res.error || 'Unable to load saved journeys.');
        }
      }
    } catch (err) {
      console.error('[ProfilePage] Error loading trips:', err);
      setTripsError('Network error connecting to database.');
    } finally {
      setIsLoadingTrips(false);
    }
  };

  useEffect(() => {
    if (!isAuthResolving && (auth.currentUser || currentUser)) {
      fetchUserTrips();
    }
  }, [isAuthResolving]);

  // 3. Compute Travel Statistics strictly from real saved data
  const stats = useMemo(() => {
    const totalJourneys = trips.length;

    // Unique destinations planned
    const uniqueDests = new Set(
      trips
        .map((t) => {
          const name = t.destination?.name || t.destination?.id || '';
          return name.trim().toLowerCase();
        })
        .filter(Boolean)
    );

    // Total planned travel days
    const totalDays = trips.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);

    return {
      totalJourneys,
      uniqueDestinations: uniqueDests.size,
      totalDays
    };
  }, [trips]);

  // 4. Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditName(currentUser?.name || auth.currentUser?.displayName || '');
    setEditTravelStyle(currentUser?.travelStyle || 'Balanced');
    setEditPhone(currentUser?.phoneNumber || currentUser?.mobile || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  // 5. Save Profile Updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditError('');

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Full name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const payload = {
        name: trimmedName,
        travelStyle: editTravelStyle,
        phoneNumber: editPhone.trim()
      };

      const res = await apiClient.updateProfile(payload);

      if (res.success && (res.data?.user || res.data?.data)) {
        const updated = res.data.user || res.data.data;
        setCurrentUser(updated);
        localStorage.setItem('dastaanUser', JSON.stringify(updated));
        window.dispatchEvent(new Event('dastaan-auth-change'));
        setIsEditModalOpen(false);
        showToast('Profile updated successfully.');
      } else {
        setEditError(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setEditError(err.message || 'Error updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 6. Delete Trip Flow (Backend scoped with confirmation)
  const handleDeleteTripConfirm = async () => {
    if (!tripToDelete?._id) return;

    setIsDeleting(true);

    try {
      const res = await apiClient.deleteTrip(tripToDelete._id);

      if (res.success) {
        // Remove locally from state only after backend confirms
        setTrips((prev) => prev.filter((t) => t._id !== tripToDelete._id));

        // If this trip was cached in localStorage, clear it
        try {
          const localSaved = localStorage.getItem('dastaanTrip');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (parsed._id === tripToDelete._id) {
              localStorage.removeItem('dastaanTrip');
              localStorage.removeItem('dastaanSavedJourney');
            }
          }
        } catch {
          // Ignore
        }

        showToast(`Journey to ${tripToDelete.destination?.name || 'Destination'} removed.`);
        setTripToDelete(null);
      } else {
        showToast(res.error || 'Failed to delete journey.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting journey.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. View Journey Handler (Loads persisted trip from MongoDB)
  const handleViewJourney = (trip) => {
    // Persist full trip to localStorage so ItineraryPage loads it smoothly
    localStorage.setItem('dastaanTrip', JSON.stringify(trip));
    navigate(`/itinerary?id=${trip._id}`);
  };

  // User details fallback
  const userName = currentUser?.name || auth.currentUser?.displayName || 'Traveler';
  const userEmail = currentUser?.email || auth.currentUser?.email || '';
  const userInitials = (userName.trim().charAt(0) || 'T').toUpperCase();
  const travelStyle = currentUser?.travelStyle || 'Balanced';
  const userPhone = currentUser?.phoneNumber || currentUser?.mobile || 'Not provided';
  const isEmailVerified = Boolean(currentUser?.emailVerified || auth.currentUser?.emailVerified);

  // Loading Screen while resolving initial auth
  if (isAuthResolving) {
    return (
      <div className="profile-page-body">
        <Navbar isFixed={true} />
        <main className="profile-main">
          <div className="profile-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                border: '3px solid rgba(214, 181, 109, 0.25)',
                borderTopColor: '#D6B56D',
                borderRadius: '50%',
                animation: 'skeletonPulse 1s linear infinite',
                margin: '0 auto 24px'
              }}
            ></div>
            <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#D6B56D', letterSpacing: '2px' }}>
              ACCESSING YOUR PROFILE
            </h2>
            <p style={{ color: '#E8DCC7', opacity: 0.8, marginTop: '8px', fontSize: '14px' }}>
              Verifying your credentials and preparing your travel archive...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-page-body">
      <Navbar isFixed={true} />

      <main className="profile-main">
        <div className="profile-bg-glow" aria-hidden="true"></div>

        <div className="profile-container">
          {/* PROFILE HEADER CARD */}
          <section className="profile-hero">
            <div className="profile-header-flex">
              <div className="profile-identity-group">
                {currentUser?.photoURL || auth.currentUser?.photoURL ? (
                  <img
                    src={currentUser?.photoURL || auth.currentUser?.photoURL}
                    alt={userName}
                    className="profile-avatar-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="profile-avatar-large" aria-hidden="true">
                    {userInitials}
                  </div>
                )}

                <div className="profile-meta-info">
                  <span className="profile-eyebrow-tag">AUTHENTICATED EXPLORER</span>
                  <h1 className="profile-user-name">{userName}</h1>
                  <div className="profile-email-badge">
                    <span>{userEmail}</span>
                    {isEmailVerified ? (
                      <span className="email-verified-pill">&bull; Verified</span>
                    ) : (
                      <span className="email-verified-pill" style={{ borderColor: 'rgba(200, 121, 85, 0.4)', color: '#C87955' }}>
                        Account
                      </span>
                    )}
                  </div>
                  <p className="profile-welcome-motto">Your journeys, all in one place.</p>
                </div>
              </div>

              <div className="profile-header-actions">
                <button
                  type="button"
                  className="btn-profile-edit"
                  onClick={handleOpenEditModal}
                  aria-label="Edit Profile Details"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit Profile</span>
                </button>

                <Link to="/plan" className="btn-profile-plan">
                  <span>Plan a Trip &rarr;</span>
                </Link>
              </div>
            </div>
          </section>

          {/* TRAVEL STATISTICS SECTION */}
          <section className="profile-stats-grid" aria-label="Travel Statistics">
            <div className="profile-stat-card">
              <div className="stat-icon-wrap" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalJourneys}</span>
                <span className="stat-label">Saved Journeys</span>
                <span className="stat-subtext">Curated travel itineraries</span>
              </div>
            </div>

            <div className="profile-stat-card">
              <div className="stat-icon-wrap" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.uniqueDestinations}</span>
                <span className="stat-label">Destinations Planned</span>
                <span className="stat-subtext">Unique cities & escapes</span>
              </div>
            </div>

            <div className="profile-stat-card">
              <div className="stat-icon-wrap" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalDays}</span>
                <span className="stat-label">Total Planned Days</span>
                <span className="stat-subtext">Across all itineraries</span>
              </div>
            </div>
          </section>

          {/* PERSONAL INFORMATION SECTION */}
          <section className="profile-details-card" aria-label="Personal Details">
            <div className="details-header">
              <h2 className="details-title-serif">
                <span>Personal Information</span>
                <span className="dot">&bull;</span>
                <span style={{ fontSize: '0.8rem', color: '#D6B56D', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  Preferences
                </span>
              </h2>
              <button
                type="button"
                onClick={handleOpenEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D6B56D',
                  fontSize: '0.8rem',
                  letterSpacing: '1px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                Modify &rarr;
              </button>
            </div>

            <div className="personal-info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{userName}</span>
                <span className="info-subnote">Public traveler identifier</span>
              </div>

              <div className="info-item">
                <span className="info-label">Primary Email</span>
                <span className="info-value">{userEmail}</span>
                <span className="info-subnote">Managed via Firebase Authentication</span>
              </div>

              <div className="info-item">
                <span className="info-label">Travel Style Preference</span>
                <span className="info-value">
                  <span className="info-badge">{travelStyle}</span>
                </span>
                <span className="info-subnote">Default pacing for new itineraries</span>
              </div>

              <div className="info-item">
                <span className="info-label">Contact Mobile / Phone</span>
                <span className="info-value">{userPhone}</span>
                <span className="info-subnote">For booking assistance & itinerary alerts</span>
              </div>

              <div className="info-item">
                <span className="info-label">Member Role</span>
                <span className="info-value">
                  <span
                    className="info-badge"
                    style={{ background: 'rgba(244, 239, 227, 0.08)', color: '#F4EFE3', borderColor: 'rgba(244, 239, 227, 0.2)' }}
                  >
                    {(currentUser?.role || 'user').toUpperCase()}
                  </span>
                </span>
                <span className="info-subnote">Standard member privileges</span>
              </div>

              <div className="info-item">
                <span className="info-label">Identity Provider</span>
                <span className="info-value">
                  {auth.currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google Account' : 'Email & Password'}
                </span>
                <span className="info-subnote">Secure cryptographic verification</span>
              </div>
            </div>
          </section>

          {/* MY JOURNEYS SECTION */}
          <section className="journeys-section-wrap" aria-label="My Saved Journeys">
            <div className="journeys-section-header">
              <div className="journeys-title-group">
                <span className="journeys-eyebrow">CHAPTER 03 &middot; ARCHIVE</span>
                <h2 className="journeys-heading">
                  MY JOURNEYS
                  <span className="journeys-count-tag">({trips.length})</span>
                </h2>
              </div>

              {trips.length > 0 && (
                <Link to="/plan" className="btn-profile-plan" style={{ padding: '8px 18px', fontSize: '0.72rem' }}>
                  <span>+ Plan New Journey</span>
                </Link>
              )}
            </div>

            {/* Error Banner */}
            {tripsError && (
              <div className="profile-error-banner" role="alert">
                <span>{tripsError}</span>
                <button type="button" className="btn-retry" onClick={fetchUserTrips}>
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoadingTrips ? (
              <div className="journeys-grid">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="journey-card" style={{ height: '380px' }}>
                    <div className="skeleton-box" style={{ height: '200px', width: '100%' }}></div>
                    <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="skeleton-box" style={{ height: '24px', width: '60%' }}></div>
                      <div className="skeleton-box" style={{ height: '16px', width: '40%' }}></div>
                      <div className="skeleton-box" style={{ height: '50px', width: '100%' }}></div>
                      <div className="skeleton-box" style={{ height: '36px', width: '100%', marginTop: 'auto' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : trips.length === 0 ? (
              /* EMPTY STATE */
              <div className="profile-empty-state">
                <div className="empty-state-compass" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                </div>
                <span className="empty-state-eyebrow">YOUR TRAVEL ARCHIVE IS EMPTY</span>
                <h3 className="empty-state-heading">WHERE WILL YOUR NEXT DASTAAN BEGIN?</h3>
                <p className="empty-state-desc">
                  You have not saved any journeys yet. Explore curated destinations across India and beyond, configure your ideal
                  schedule, and save your personal itineraries right here.
                </p>
                <div className="empty-state-actions">
                  <Link to="/plan" className="btn-profile-plan">
                    <span>Plan a Trip &rarr;</span>
                  </Link>
                  <Link
                    to="/discover"
                    className="btn-profile-edit"
                    style={{ textDecoration: 'none' }}
                  >
                    <span>Discover Destinations</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* JOURNEY CARDS GRID */
              <div className="journeys-grid">
                {trips.map((trip) => {
                  const destId = trip.destination?.id || '';
                  const destName = trip.destination?.name || 'Destination';
                  const country = trip.destination?.country || 'India';
                  const duration = trip.duration || 3;
                  const budget = trip.budget || 8000;
                  const style = trip.travelStyle || 'Balanced';
                  const interests = Array.isArray(trip.interests) ? trip.interests : [];

                  const imgSrc = resolveImage(
                    destId,
                    resolveImage(destName, trip.destination?.image)
                  ) || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80';

                  const summary =
                    trip.itinerary?.tagline ||
                    trip.itinerary?.overview ||
                    `A curated ${style.toLowerCase()} journey crafted with personalized routes, local culinary stops, and authentic cultural experiences.`;

                  return (
                    <article key={trip._id} className="journey-card">
                      <div className="journey-card-image-wrap">
                        <img
                          src={imgSrc}
                          alt={destName}
                          className="journey-card-image"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80';
                          }}
                        />
                        <div className="journey-image-gradient"></div>

                        <div className="journey-badge-row">
                          <span className="journey-badge-style">{style}</span>
                          <span className="journey-badge-budget">₹{budget.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="journey-dest-overlay">
                          <h3 className="journey-dest-title">{destName}</h3>
                          <span className="journey-dest-sub">{country}</span>
                        </div>
                      </div>

                      <div className="journey-card-body">
                        <div className="journey-meta-bar">
                          <div className="journey-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>{duration} DAYS</span>
                          </div>
                          <span>&bull;</span>
                          <div className="journey-meta-item">
                            <span>₹{Math.round(budget / duration).toLocaleString('en-IN')}/day</span>
                          </div>
                        </div>

                        <p className="journey-summary-text">"{summary}"</p>

                        {interests.length > 0 && (
                          <div className="journey-interests-wrap">
                            {interests.slice(0, 4).map((interest, idx) => (
                              <span key={idx} className="interest-tag">
                                {interest}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="journey-card-actions">
                          <button
                            type="button"
                            className="btn-view-journey"
                            onClick={() => handleViewJourney(trip)}
                          >
                            <span>View Journey &rarr;</span>
                          </button>

                          <button
                            type="button"
                            className="btn-delete-journey"
                            title="Delete this journey"
                            aria-label={`Delete ${destName} journey`}
                            onClick={() => setTripToDelete(trip)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3 id="modal-edit-title" className="modal-title-serif">
                  Edit Personal Details
                </h3>
                <p className="modal-subtitle">Update your profile information and travel style preference.</p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {editError && (
              <div
                style={{
                  background: 'rgba(200, 121, 85, 0.15)',
                  border: '1px solid #C87955',
                  color: '#F4EFE3',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '0.85rem'
                }}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="edit-name">
                  Full Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="modal-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label" htmlFor="edit-email">
                  Email Address
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="modal-input"
                  value={userEmail}
                  disabled
                />
                <span className="modal-input-hint">
                  Email is linked to your Firebase Authentication identity and cannot be altered here.
                </span>
              </div>

              <div className="modal-form-group">
                <label className="modal-label" htmlFor="edit-style">
                  Preferred Travel Style
                </label>
                <select
                  id="edit-style"
                  className="modal-input"
                  value={editTravelStyle}
                  onChange={(e) => setEditTravelStyle(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Relaxed" style={{ background: '#071D1A', color: '#F4EFE3' }}>
                    Relaxed &bull; Slow-paced, leisurely exploration
                  </option>
                  <option value="Balanced" style={{ background: '#071D1A', color: '#F4EFE3' }}>
                    Balanced &bull; Best mix of highlights & free time
                  </option>
                  <option value="Packed" style={{ background: '#071D1A', color: '#F4EFE3' }}>
                    Packed &bull; Maximum sightseeing, dawn to dusk
                  </option>
                </select>
              </div>

              <div className="modal-form-group">
                <label className="modal-label" htmlFor="edit-phone">
                  Contact Number
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  className="modal-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
                <span className="modal-input-hint">Optional. Used for trip concierge and updates.</span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {tripToDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-del-title">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ borderColor: 'rgba(200, 121, 85, 0.3)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#C87955', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>
                  CONFIRM DELETION
                </span>
                <h3 id="modal-del-title" className="modal-title-serif" style={{ marginTop: '4px' }}>
                  Remove {tripToDelete.destination?.name || 'Journey'}?
                </h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setTripToDelete(null)}
                aria-label="Cancel deletion"
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#E8DCC7', lineHeight: '1.6', marginBottom: '20px' }}>
              Are you sure you want to delete your <strong>{tripToDelete.destination?.name}</strong> itinerary (
              {tripToDelete.duration} days)? This will permanently remove it from your Dastaan account. This action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setTripToDelete(null)}
                disabled={isDeleting}
              >
                Keep Journey
              </button>
              <button
                type="button"
                className="btn-modal-delete"
                onClick={handleDeleteTripConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST BANNER */}
      {toast.visible && (
        <div className={`profile-toast ${toast.type === 'error' ? 'error' : ''}`} role="status">
          <span style={{ color: toast.type === 'error' ? '#C87955' : '#D6B56D', fontWeight: 'bold' }}>
            {toast.type === 'error' ? '!' : '\u2713'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
