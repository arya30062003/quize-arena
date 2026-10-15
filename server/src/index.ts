import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz
} from './controllers/quizController';
import {
  createSession,
  getSessionByPin,
  getSessionAnalytics,
  exportLeaderboardCSV,
  exportLeaderboardExcel
} from './controllers/sessionController';
import { setupQuizSockets } from './sockets/quizSocketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Socket.IO configuration with high-concurrency settings
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 20000,
  pingInterval: 10000
});

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'QuizArena Backend Service'
  });
});

// Quiz Management Routes
app.get('/api/quizzes', getQuizzes);
app.get('/api/quizzes/:id', getQuizById);
app.post('/api/quizzes', createQuiz);
app.put('/api/quizzes/:id', updateQuiz);
app.delete('/api/quizzes/:id', deleteQuiz);

// Session Routes
app.post('/api/sessions', createSession);
app.get('/api/sessions/pin/:pin', getSessionByPin);
app.get('/api/sessions/:id/analytics', getSessionAnalytics);
app.get('/api/sessions/:id/export/csv', exportLeaderboardCSV);
app.get('/api/sessions/:id/export/excel', exportLeaderboardExcel);

// Initialize WebSockets
setupQuizSockets(io);

// Serve client static assets when deployed
import path from 'path';
import fs from 'fs';

const clientBuildPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientBuildPath)) {
  console.log(`[Server] Serving production frontend build from ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(clientBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 QuizArena Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for live competition events`);
  console.log(`===============================================`);
});

export { app, server, io };
