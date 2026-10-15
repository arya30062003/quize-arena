"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreService = void 0;
const admin = __importStar(require("firebase-admin"));
const sampleQuizzes_1 = require("../data/sampleQuizzes");
class FirestoreService {
    static instance;
    db = null;
    isFirebaseInitialized = false;
    // In-memory fallback caches
    memoryQuizzes = new Map();
    memoryResponses = new Map();
    memoryLeaderboards = new Map();
    constructor() {
        this.initFirebase();
        this.seedMemoryData();
    }
    static getInstance() {
        if (!FirestoreService.instance) {
            FirestoreService.instance = new FirestoreService();
        }
        return FirestoreService.instance;
    }
    initFirebase() {
        try {
            if (admin.apps.length > 0) {
                this.db = admin.firestore();
                this.isFirebaseInitialized = true;
                console.log('[FirestoreService] Connected to existing Firebase Admin app.');
                return;
            }
            // Check for environment credentials or emulator
            if (process.env.FIRESTORE_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                admin.initializeApp({
                    projectId: process.env.FIREBASE_PROJECT_ID || 'quiz-arena-default'
                });
                this.db = admin.firestore();
                this.isFirebaseInitialized = true;
                console.log('[FirestoreService] Successfully initialized Firebase Admin.');
            }
            else {
                console.log('[FirestoreService] Running with in-memory persistence fallback (no Firebase credentials supplied).');
            }
        }
        catch (err) {
            console.warn('[FirestoreService] Notice: Firebase initialization skipped, running in-memory store.', err.message);
            this.isFirebaseInitialized = false;
            this.db = null;
        }
    }
    seedMemoryData() {
        for (const quiz of sampleQuizzes_1.SAMPLE_QUIZZES) {
            this.memoryQuizzes.set(quiz.id, quiz);
        }
    }
    // --- Quiz Operations ---
    async getQuizzes() {
        if (this.isFirebaseInitialized && this.db) {
            try {
                const snapshot = await this.db.collection('quizzes').get();
                if (!snapshot.empty) {
                    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
            }
            catch (err) {
                console.warn('[FirestoreService] Error reading from Firestore, falling back to memory:', err);
            }
        }
        return Array.from(this.memoryQuizzes.values());
    }
    async getQuizById(id) {
        if (this.isFirebaseInitialized && this.db) {
            try {
                const doc = await this.db.collection('quizzes').doc(id).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            }
            catch (err) {
                console.warn(`[FirestoreService] Error fetching quiz ${id} from Firestore:`, err);
            }
        }
        return this.memoryQuizzes.get(id) || null;
    }
    async createQuiz(quiz) {
        this.memoryQuizzes.set(quiz.id, quiz);
        if (this.isFirebaseInitialized && this.db) {
            try {
                await this.db.collection('quizzes').doc(quiz.id).set(quiz);
            }
            catch (err) {
                console.warn('[FirestoreService] Failed to persist quiz to Firestore:', err);
            }
        }
        return quiz;
    }
    async updateQuiz(id, quiz) {
        const existing = this.memoryQuizzes.get(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...quiz, updatedAt: Date.now() };
        this.memoryQuizzes.set(id, updated);
        if (this.isFirebaseInitialized && this.db) {
            try {
                await this.db.collection('quizzes').doc(id).set(updated, { merge: true });
            }
            catch (err) {
                console.warn(`[FirestoreService] Failed to update quiz ${id} in Firestore:`, err);
            }
        }
        return updated;
    }
    async deleteQuiz(id) {
        const exists = this.memoryQuizzes.has(id);
        this.memoryQuizzes.delete(id);
        if (this.isFirebaseInitialized && this.db) {
            try {
                await this.db.collection('quizzes').doc(id).delete();
            }
            catch (err) {
                console.warn(`[FirestoreService] Failed to delete quiz ${id} in Firestore:`, err);
            }
        }
        return exists;
    }
    // --- Session & Response Persistence ---
    async saveResponse(response) {
        const sessionResponses = this.memoryResponses.get(response.sessionId) || [];
        sessionResponses.push(response);
        this.memoryResponses.set(response.sessionId, sessionResponses);
        if (this.isFirebaseInitialized && this.db) {
            try {
                await this.db
                    .collection('quiz_sessions')
                    .doc(response.sessionId)
                    .collection('responses')
                    .doc(response.id)
                    .set(response);
            }
            catch (err) {
                console.warn('[FirestoreService] Failed to persist response in Firestore:', err);
            }
        }
    }
    async saveFinalLeaderboard(sessionId, leaderboard) {
        this.memoryLeaderboards.set(sessionId, leaderboard);
        if (this.isFirebaseInitialized && this.db) {
            try {
                await this.db
                    .collection('quiz_sessions')
                    .doc(sessionId)
                    .collection('leaderboards')
                    .doc('final')
                    .set({
                    sessionId,
                    entries: leaderboard,
                    savedAt: Date.now()
                });
            }
            catch (err) {
                console.warn('[FirestoreService] Failed to persist leaderboard in Firestore:', err);
            }
        }
    }
    getSessionResponses(sessionId) {
        return this.memoryResponses.get(sessionId) || [];
    }
    getLeaderboard(sessionId) {
        return this.memoryLeaderboards.get(sessionId) || [];
    }
}
exports.FirestoreService = FirestoreService;
