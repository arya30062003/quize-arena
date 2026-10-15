"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizzes = getQuizzes;
exports.getQuizById = getQuizById;
exports.createQuiz = createQuiz;
exports.updateQuiz = updateQuiz;
exports.deleteQuiz = deleteQuiz;
const uuid_1 = require("uuid");
const firestoreService_1 = require("../services/firestoreService");
const firestoreService = firestoreService_1.FirestoreService.getInstance();
async function getQuizzes(req, res) {
    try {
        const quizzes = await firestoreService.getQuizzes();
        res.json({ success: true, data: quizzes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
async function getQuizById(req, res) {
    try {
        const { id } = req.params;
        const quiz = await firestoreService.getQuizById(id);
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        res.json({ success: true, data: quiz });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
async function createQuiz(req, res) {
    try {
        const body = req.body;
        const newQuiz = {
            id: (0, uuid_1.v4)(),
            title: body.title || 'Untitled Quiz',
            description: body.description || '',
            category: body.category || 'General',
            coverImage: body.coverImage || '',
            authorId: body.authorId || 'host-admin',
            isPublic: body.isPublic !== undefined ? body.isPublic : true,
            totalQuestions: body.questions ? body.questions.length : 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            questions: (body.questions || []).map((q, idx) => ({
                id: q.id || (0, uuid_1.v4)(),
                quizId: '',
                questionText: q.questionText,
                mediaUrl: q.mediaUrl,
                timeLimit: q.timeLimit || 20,
                points: q.points || 100,
                order: idx + 1,
                options: (q.options || []).map((opt) => ({
                    id: opt.id || (0, uuid_1.v4)(),
                    text: opt.text,
                    isCorrect: !!opt.isCorrect
                }))
            }))
        };
        // Link quizId to questions
        newQuiz.questions.forEach(q => {
            q.quizId = newQuiz.id;
        });
        const saved = await firestoreService.createQuiz(newQuiz);
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
async function updateQuiz(req, res) {
    try {
        const { id } = req.params;
        const updated = await firestoreService.updateQuiz(id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
async function deleteQuiz(req, res) {
    try {
        const { id } = req.params;
        const deleted = await firestoreService.deleteQuiz(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        res.json({ success: true, message: 'Quiz deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
