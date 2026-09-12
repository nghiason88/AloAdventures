import axios from 'axios';

// Same origin in production (Express serves both API + frontend from one URL).
// In local dev, client/package.json "proxy" forwards /api to localhost:5000.
const api = axios.create({ baseURL: '/api', timeout: 10000 });

export const getQuests = async () => (await api.get('/quests')).data;
export const getUser = async (userId) => (await api.get(`/users/${userId}`)).data;
export const createOrUpdateUser = async (userId, name) =>
  (await api.post('/users', { userId, name })).data;
export const completeQuest = async (userId, questId, photoUrl = null) =>
  (await api.post('/progress/complete', { userId, questId, photoUrl })).data;
export const getLeaderboard = async (limit = 10) =>
  (await api.get(`/leaderboard?limit=${limit}`)).data;

export default api;
