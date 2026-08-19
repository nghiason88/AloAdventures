const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '8mb' })); // allow base64 photo payloads

// ==================== IN-MEMORY "DATABASE" ====================
// NOTE: This resets whenever the server restarts. Fine for a one-time
// test with a small group. The Firebase version delivered earlier keeps
// data permanently — use that for real production launch.

const quests = [
  {
    id: 'quest_1',
    name: 'Tìm cây cà phê cổ thụ',
    location: { lat: 10.8231, lng: 106.7298 },
    story: 'Cách đây 20 năm, cây này bị sét đánh. Có 1 cặp tình nhân lặn lội tìm thấy nó và đã chăm sóc cho tới hôm nay. Một câu chuyện tâm linh về yêu thương...',
    action: 'Chụp ảnh + tag vị trí',
    reward: 10,
    badge: 'Coffee Lover',
    radius: 50,
  },
  {
    id: 'quest_2',
    name: 'Bánh tráng nướng tại quán bà Ngoại',
    location: { lat: 10.8250, lng: 106.7310 },
    story: 'Quán bà Ngoại đã hoạt động 50 năm. Bà hướng dẫn tự nướng bánh tráng từ nguyên liệu địa phương. Hãy học cách làm nước mắm, mè nếp...',
    action: 'Check-in + học nướng + rate',
    reward: 15,
    badge: null,
    radius: 40,
  },
  {
    id: 'quest_3',
    name: 'Bình minh từ view đồi',
    location: { lat: 10.8270, lng: 106.7280 },
    story: 'Từ điểm cao nhất của villa, anh/chị sẽ chứng kiến bình minh đẹp nhất Đà Lạt. Ánh nắng từ từ chiếu sáng các ngọn núi đá vôi xung quanh...',
    action: 'Chụp ảnh sunrise',
    reward: 20,
    badge: 'Sunrise Chaser',
    radius: 50,
  },
];

const users = new Map();      // userId -> { id, name, points, badges }
const progress = new Map();   // `${userId}_${questId}` -> { status, photo, completed_at }
const messages = [];          // { id, sender_id, sender_name, quest_id, text, created_at }

function getLeaderboard(limit = 10) {
  return [...users.values()]
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((u, idx) => ({ rank: idx + 1, ...u }));
}

function broadcastLeaderboard() {
  io.emit('leaderboard_updated', getLeaderboard(10));
}

// ==================== WEBSOCKET ====================
io.on('connection', (socket) => {
  console.log(`👤 connected: ${socket.id}`);

  socket.on('user_join', (data) => {
    io.emit('user_online', data);
  });

  socket.on('send_message', (data) => {
    const message = {
      id: `msg_${Date.now()}`,
      sender_id: data.userId,
      sender_name: data.userName,
      quest_id: data.questId || null,
      text: data.text,
      created_at: new Date().toISOString(),
    };
    messages.push(message);
    io.emit('new_message', message);
  });

  socket.on('request_leaderboard', () => broadcastLeaderboard());

  socket.on('disconnect', () => console.log(`❌ disconnected: ${socket.id}`));
});

// ==================== REST API ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), mode: 'quick-demo (in-memory)' });
});

app.get('/api/quests', (req, res) => res.json(quests));

app.get('/api/quests/:questId', (req, res) => {
  const quest = quests.find(q => q.id === req.params.questId);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });
  res.json(quest);
});

app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId and name required' });

  const existing = users.get(userId);
  if (existing) {
    existing.name = name;
    return res.json(existing);
  }

  const user = { id: userId, name, points: 0, badges: [] };
  users.set(userId, user);
  res.json(user);
});

app.get('/api/progress/:userId/:questId', (req, res) => {
  const key = `${req.params.userId}_${req.params.questId}`;
  const p = progress.get(key);
  if (!p) return res.status(404).json({ status: 'not_started' });
  res.json(p);
});

app.post('/api/progress/complete', (req, res) => {
  const { userId, questId, photoUrl } = req.body;
  if (!userId || !questId) return res.status(400).json({ error: 'userId and questId required' });

  const key = `${userId}_${questId}`;
  if (progress.get(key)?.status === 'completed') {
    return res.status(409).json({ error: 'Quest already completed', ...progress.get(key) });
  }

  const quest = quests.find(q => q.id === questId);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });

  let user = users.get(userId);
  if (!user) {
    user = { id: userId, name: 'Khách', points: 0, badges: [] };
    users.set(userId, user);
  }

  user.points += quest.reward;
  if (quest.badge && !user.badges.includes(quest.badge)) {
    user.badges.push(quest.badge);
  }

  const progressData = {
    user_id: userId,
    quest_id: questId,
    status: 'completed',
    photo_url: photoUrl || null, // base64 dataURL, kept in memory only
    completed_at: new Date().toISOString(),
  };
  progress.set(key, progressData);

  io.emit('quest_completed_event', {
    userId, userName: user.name, questId, questName: quest.name, reward: quest.reward,
  });
  broadcastLeaderboard();

  res.json({ ...progressData, points: user.points });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(getLeaderboard(parseInt(req.query.limit) || 10));
});

app.get('/api/leaderboard/rank/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const higher = [...users.values()].filter(u => u.points > user.points).length;
  res.json({ rank: higher + 1, points: user.points, name: user.name });
});

app.get('/api/messages/:questId', (req, res) => {
  res.json(messages.filter(m => m.quest_id === req.params.questId).slice(-50));
});

// ==================== SERVE FRONTEND ====================
const clientBuildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Alo Adventures (quick-demo) running on port ${PORT}`);
});
