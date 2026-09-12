import React, { useState, useEffect } from 'react';
import { calculateDistance } from '../utils/gps';
import '../styles/QuestCard.css';

// Downscale the photo client-side before sending — keeps the in-memory
// demo server light (no cloud storage in this quick-deploy version).
function resizeImage(file, maxDim = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const QuestCard = ({ quest, userLocation, onComplete, onClose }) => {
  const [distanceToQuest, setDistanceToQuest] = useState(null);
  const [isNearby, setIsNearby] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (userLocation) {
      const distance = calculateDistance(userLocation, quest.location);
      setDistanceToQuest(distance);
      setIsNearby(distance <= quest.radius);
    }
  }, [userLocation, quest]);

  const requiresPhoto = quest.action && quest.action.includes('chụp ảnh');

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const dataUrl = await resizeImage(file);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setErrorMsg('Không đọc được ảnh, thử ảnh khác.');
    }
  };

  const handleSubmit = async () => {
    if (requiresPhoto && !photoPreview) {
      setErrorMsg('Vui lòng chọn ảnh trước khi hoàn thành quest này.');
      return;
    }
    try {
      setUploading(true);
      setErrorMsg(null);
      await onComplete(photoPreview);
    } catch (error) {
      setErrorMsg('Không hoàn thành được quest: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="quest-card-overlay">
      <div className="quest-card">
        <button className="close-btn" onClick={onClose} disabled={uploading}>✕</button>

        <h2>{quest.name}</h2>

        <div className="quest-story">
          <p>📖 {quest.story}</p>
        </div>

        <div className="quest-info">
          <div className="info-item">
            <span className="label">Reward:</span>
            <span className="value">+{quest.reward} points</span>
          </div>
          {quest.badge && (
            <div className="info-item">
              <span className="label">Badge:</span>
              <span className="value">🏆 {quest.badge}</span>
            </div>
          )}
          {distanceToQuest !== null && (
            <div className="info-item">
              <span className="label">Distance:</span>
              <span className={`value ${isNearby ? 'nearby' : 'far'}`}>
                {distanceToQuest.toFixed(0)}m {isNearby ? '✅' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="quest-action">
          <p>📍 Action: {quest.action}</p>
        </div>

        {requiresPhoto && (
          <div className="photo-upload">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              id="photo-input"
              disabled={uploading}
            />
            <label htmlFor="photo-input" className="upload-btn">
              📸 {photoPreview ? 'Photo Selected ✓' : 'Choose Photo'}
            </label>
            {photoPreview && <img src={photoPreview} alt="preview" className="photo-preview" />}
          </div>
        )}

        {errorMsg && <div className="error-message">⚠️ {errorMsg}</div>}

        <button
          className={`complete-btn ${isNearby ? 'active' : 'disabled'}`}
          onClick={handleSubmit}
          disabled={!isNearby || uploading}
        >
          {uploading ? '⏳ Completing...' : isNearby ? '✨ Complete Quest' : '📍 Get Closer'}
        </button>

        {!isNearby && distanceToQuest && (
          <p className="distance-hint">Get within {quest.radius}m to complete</p>
        )}
      </div>
    </div>
  );
};

export default QuestCard;
