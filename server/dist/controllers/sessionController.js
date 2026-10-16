"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSessionByPin = getSessionByPin;
exports.getSessionAnalytics = getSessionAnalytics;
exports.exportLeaderboardCSV = exportLeaderboardCSV;
exports.exportLeaderboardExcel = exportLeaderboardExcel;
const sessionManager_1 = require("../services/sessionManager");
const firestoreService_1 = require("../services/firestoreService");
const exportService_1 = require("../services/exportService");
const sessionManager = sessionManager_1.SessionManager.getInstance();
const firestoreService = firestoreService_1.FirestoreService.getInstance();
async function createSession(req, res) {
    try {
        const { quizId, hostId } = req.body;
        if (!quizId) {
            return res.status(400).json({ success: false, error: 'quizId is required' });
        }
        const quiz = await firestoreService.getQuizById(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        // Ensure only the quiz creator can host this session
        if (hostId && hostId !== quiz.authorId) {
            return res.status(403).json({ success: false, error: 'Only the quiz creator can host this quiz' });
        }
        const session = sessionManager.createSession(quiz, hostId || 'host-admin', 'pending-socket');
        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                pin: session.pin,
                quizTitle: session.quizTitle,
                totalQuestions: session.questions.length
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
function getSessionByPin(req, res) {
    try {
        const { pin } = req.params;
        const session = sessionManager.getSessionByPin(pin);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Quiz PIN not found' });
        }
        res.json({
            success: true,
            data: {
                sessionId: session.id,
                pin: session.pin,
                quizTitle: session.quizTitle,
                status: session.status,
                participantsCount: session.participants.size,
                totalQuestions: session.questions.length
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
function getSessionAnalytics(req, res) {
    try {
        const { id } = req.params;
        const analytics = sessionManager.getAnalytics(id);
        if (!analytics) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        res.json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
function exportLeaderboardCSV(req, res) {
    try {
        const { id } = req.params;
        const session = sessionManager.getSessionById(id);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        const leaderboard = sessionManager.getLeaderboard(id);
        const csvData = exportService_1.ExportService.generateLeaderboardCSV(session, leaderboard);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="QuizArena-${session.pin}-Leaderboard.csv"`);
        res.send(csvData);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
function exportLeaderboardExcel(req, res) {
    try {
        const { id } = req.params;
        const session = sessionManager.getSessionById(id);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        const leaderboard = sessionManager.getLeaderboard(id);
        const excelBuffer = exportService_1.ExportService.generateExcelWorkbook(session, leaderboard);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="QuizArena-${session.pin}-Report.xlsx"`);
        res.send(excelBuffer);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
