"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const quizController_1 = require("./controllers/quizController");
const sessionController_1 = require("./controllers/sessionController");
const quizSocketHandler_1 = require("./sockets/quizSocketHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';
// Socket.IO configuration with high-concurrency settings
const io = new socket_io_1.Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 20000,
    pingInterval: 10000
});
exports.io = io;
// Middleware
app.use((0, cors_1.default)({ origin: CLIENT_URL, credentials: true }));
app.use(express_1.default.json());
// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'QuizArena Backend Service'
    });
});
// Quiz Management Routes
app.get('/api/quizzes', quizController_1.getQuizzes);
app.get('/api/quizzes/:id', quizController_1.getQuizById);
app.post('/api/quizzes', quizController_1.createQuiz);
app.put('/api/quizzes/:id', quizController_1.updateQuiz);
app.delete('/api/quizzes/:id', quizController_1.deleteQuiz);
// Session Routes
app.post('/api/sessions', sessionController_1.createSession);
app.get('/api/sessions/pin/:pin', sessionController_1.getSessionByPin);
app.get('/api/sessions/:id/analytics', sessionController_1.getSessionAnalytics);
app.get('/api/sessions/:id/export/csv', sessionController_1.exportLeaderboardCSV);
app.get('/api/sessions/:id/export/excel', sessionController_1.exportLeaderboardExcel);
// Initialize WebSockets
(0, quizSocketHandler_1.setupQuizSockets)(io);
// Serve client static assets when deployed
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const clientBuildPath = path_1.default.resolve(__dirname, '../../client/dist');
if (fs_1.default.existsSync(clientBuildPath)) {
    console.log(`[Server] Serving production frontend build from ${clientBuildPath}`);
    app.use(express_1.default.static(clientBuildPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        const indexPath = path_1.default.join(clientBuildPath, 'index.html');
        if (fs_1.default.existsSync(indexPath)) {
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
