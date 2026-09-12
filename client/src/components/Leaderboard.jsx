import React from 'react';
import '../styles/Leaderboard.css';

const Leaderboard = ({ leaderboard, currentUserId, onClose }) => {
  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-card">
        <button className="close-btn" onClick={onClose}>✕</button>

        <h2>🏆 Top Players</h2>

        <div className="leaderboard-list">
          {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((user, idx) => (
              <div
                key={user.id}
                className={`leaderboard-row ${user.id === currentUserId ? 'current-user' : ''}`}
              >
                <div className="rank">
                  {idx === 0 && '🥇'}
                  {idx === 1 && '🥈'}
                  {idx === 2 && '🥉'}
                  {idx > 2 && `#${idx + 1}`}
                </div>

                <div className="user-info">
                  <div className="name">{user.name}</div>
                  {user.id === currentUserId && <span className="badge">YOU</span>}
                </div>

                <div className="points">{user.points} pts</div>
              </div>
            ))
          ) : (
            <div className="empty">No data yet</div>
          )}
        </div>

        <button className="close-btn-bottom" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
