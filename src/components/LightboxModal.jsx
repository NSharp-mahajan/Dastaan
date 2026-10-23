import React, { useState, useEffect } from 'react';

export default function LightboxModal({ isOpen, onClose, data }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [data?.imgSrc]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const { title, desc, cat, destBadge, imgSrc, imgLabel } = data;

  return (
    <div className={`lightbox-modal active`} role="dialog" aria-modal="true" aria-label="Place image viewer">
      <div className="lightbox-backdrop" onClick={onClose}></div>
      <div className="lightbox-container">
        <button
          type="button"
          className="lightbox-close-btn"
          aria-label="Close image viewer"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="lightbox-media-wrap">
          {imgSrc && !imgError ? (
            <img
              src={imgSrc}
              alt={title || 'Place View'}
              className="lightbox-img"
              style={{ display: 'block' }}
              onError={() => {
                console.warn(`[LightboxModal] Failed to load image: ${imgSrc}`);
                setImgError(true);
              }}
            />
          ) : (
            <div className="lightbox-placeholder-box" style={{ display: 'flex' }}>
              <span className="placeholder-badge">[ {imgLabel || (title || '').toUpperCase()} ]</span>
            </div>
          )}
        </div>

        <div className="lightbox-info-panel">
          <div className="lightbox-meta">
            <span className="lightbox-cat-tag">{cat || 'EXPLORE'}</span>
            <span className="lightbox-dest-badge">{destBadge || 'DESTINATION'}</span>
          </div>
          <h3 className="lightbox-title">{title}</h3>
          <p className="lightbox-desc">{desc}</p>
        </div>
      </div>
    </div>
  );
}
