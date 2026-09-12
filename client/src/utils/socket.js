import io from 'socket.io-client';

let socket = null;

// No URL passed = connects to the same origin the page was loaded from.
// Works both in production (single Render URL) and local dev via CRA proxy.
export const initSocket = (userId, userName) => {
  if (socket) return socket;

  socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    socket.emit('user_join', { userId, userName });
  });

  return socket;
};

export const sendMessage = (userId, userName, questId, text) => {
  if (!socket) return;
  socket.emit('send_message', { userId, userName, questId, text });
};

export const onNewMessage = (callback) => {
  if (!socket) return;
  socket.on('new_message', (message) => callback(message));
};

export const onLeaderboardUpdate = (callback) => {
  if (!socket) return;
  socket.on('leaderboard_updated', (data) => callback(data));
};

export const onQuestCompleted = (callback) => {
  if (!socket) return;
  socket.on('quest_completed_event', (data) => callback(data));
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
