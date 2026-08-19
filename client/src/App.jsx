import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import QuestCard from './components/QuestCard';
import Leaderboard from './components/Leaderboard';
import { trackUserLocation } from './utils/gps';
import { getQuests, getUser, createOrUpdateUser, completeQuest, getLeaderboard } from './utils/api';
import { initSocket, onLeaderboardUpdate, onQuestCompleted } from './utils/socket';
import './App.css';

function getLocalIdentity() {
  let userId = localStorage.getItem('aloUserId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('aloUserId', userId);
  }

  let userName = localStorage.getItem('aloUserName');
  if (!userName) {
    const input = window.prompt('Nhập tên của bạn để bắt đầu chơi:', 'Khách');
    userName = (input && input.trim()) || `Khách ${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('aloUserName', userName);
  }

  return { userId, userName };
}

function App() {
  const [identity] = useState(getLocalIdentity);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState([]);
  const [quests, setQuests] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const { userId, userName } = identity;

  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true);

        const backendQuests = await getQuests();
        setQuests(backendQuests || []);

        try {
          const user = await getUser(userId);
          setUserPoints(user.points || 0);
          setUserBadges(user.badges || []);
        } catch (err) {
          const created = await createOrUpdateUser(userId, userName);
          setUserPoints(created.points || 0);
          setUserBadges(created.badges || []);
        }

        initSocket(userId, userName);
        onLeaderboardUpdate((lb) => setLeaderboard(lb));
        onQuestCompleted((data) => {
          if (data.userId !== userId) {
            setToast(`🎉 ${data.userName} vừa hoàn thành "${data.questName}"!`);
            setTimeout(() => setToast(null), 4000);
          }
        });

        const lb = await getLeaderboard(10);
        setLeaderboard(lb);
        setError(null);
      } catch (err) {
        console.error('Init error:', err);
        setError('Không kết nối được server.');
      } finally {
        setLoading(false);
      }
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const watchId = trackUserLocation((location) => setUserLocation(location));
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleCompleteQuest = async (photoUrl) => {
    const quest = selectedQuest;
    if (!quest) return;

    try {
      const result = await completeQuest(userId, quest.id, photoUrl);
      setUserPoints(result.points ?? (userPoints + quest.reward));
      if (quest.badge) setUserBadges((prev) => [...new Set([...prev, quest.badge])]);

      alert(`🎉 Hoàn thành! +${quest.reward} điểm${quest.badge ? ` + huy hiệu ${quest.badge}` : ''}`);
      setSelectedQuest(null);
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Bạn đã hoàn thành quest này rồi!');
        setSelectedQuest(null);
        return;
      }
      throw err;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>⏳ Đang tải Alo Adventures...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <h1>🏡 Alo Adventures</h1>
        <div className="user-stats">
          <span>⭐ {userPoints} pts</span>
          <span>🏆 {userBadges.length} badges</span>
          <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="leaderboard-btn">
            🎯 Top 10
          </button>
        </div>
      </header>

      <main className="container">
        <Map
          quests={quests}
          userLocation={userLocation}
          selectedQuest={selectedQuest}
          onSelectQuest={setSelectedQuest}
        />

        {selectedQuest && (
          <QuestCard
            quest={selectedQuest}
            userLocation={userLocation}
            onComplete={handleCompleteQuest}
            onClose={() => setSelectedQuest(null)}
          />
        )}

        {showLeaderboard && (
          <Leaderboard
            leaderboard={leaderboard}
            currentUserId={userId}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        <div className="quest-list">
          <h2>🎯 Quests</h2>
          {quests.map((quest) => (
            <button
              key={quest.id}
              className={`quest-btn ${selectedQuest?.id === quest.id ? 'active' : ''}`}
              onClick={() => setSelectedQuest(quest)}
            >
              <span className="quest-name">{quest.name}</span>
              <span className="quest-reward">+{quest.reward}</span>
            </button>
          ))}
        </div>
      </main>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: 'white', padding: '10px 18px', borderRadius: '20px',
          fontSize: 14, zIndex: 2000,
        }}>
          {toast}
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed', bottom: 20, left: 20, background: '#f44336', color: 'white',
          padding: '12px 16px', borderRadius: '4px',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

export default App;
