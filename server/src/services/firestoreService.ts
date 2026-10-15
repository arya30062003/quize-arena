import * as admin from 'firebase-admin';
import { Quiz, ParticipantResponse, LeaderboardEntry } from '../types';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';

export class FirestoreService {
  private static instance: FirestoreService;
  private db: admin.firestore.Firestore | null = null;
  private isFirebaseInitialized: boolean = false;

  // In-memory fallback caches
  private memoryQuizzes: Map<string, Quiz> = new Map();
  private memoryResponses: Map<string, ParticipantResponse[]> = new Map();
  private memoryLeaderboards: Map<string, LeaderboardEntry[]> = new Map();

  private constructor() {
    this.initFirebase();
    this.seedMemoryData();
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  private initFirebase() {
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
      } else {
        console.log('[FirestoreService] Running with in-memory persistence fallback (no Firebase credentials supplied).');
      }
    } catch (err) {
      console.warn('[FirestoreService] Notice: Firebase initialization skipped, running in-memory store.', (err as Error).message);
      this.isFirebaseInitialized = false;
      this.db = null;
    }
  }

  private seedMemoryData() {
    for (const quiz of SAMPLE_QUIZZES) {
      this.memoryQuizzes.set(quiz.id, quiz);
    }
  }

  // --- Quiz Operations ---
  public async getQuizzes(): Promise<Quiz[]> {
    if (this.isFirebaseInitialized && this.db) {
      try {
        const snapshot = await this.db.collection('quizzes').get();
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
        }
      } catch (err) {
        console.warn('[FirestoreService] Error reading from Firestore, falling back to memory:', err);
      }
    }
    return Array.from(this.memoryQuizzes.values());
  }

  public async getQuizById(id: string): Promise<Quiz | null> {
    if (this.isFirebaseInitialized && this.db) {
      try {
        const doc = await this.db.collection('quizzes').doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as Quiz;
        }
      } catch (err) {
        console.warn(`[FirestoreService] Error fetching quiz ${id} from Firestore:`, err);
      }
    }
    return this.memoryQuizzes.get(id) || null;
  }

  public async createQuiz(quiz: Quiz): Promise<Quiz> {
    this.memoryQuizzes.set(quiz.id, quiz);
    if (this.isFirebaseInitialized && this.db) {
      try {
        await this.db.collection('quizzes').doc(quiz.id).set(quiz);
      } catch (err) {
        console.warn('[FirestoreService] Failed to persist quiz to Firestore:', err);
      }
    }
    return quiz;
  }

  public async updateQuiz(id: string, quiz: Partial<Quiz>): Promise<Quiz | null> {
    const existing = this.memoryQuizzes.get(id);
    if (!existing) return null;

    const updated: Quiz = { ...existing, ...quiz, updatedAt: Date.now() };
    this.memoryQuizzes.set(id, updated);

    if (this.isFirebaseInitialized && this.db) {
      try {
        await this.db.collection('quizzes').doc(id).set(updated, { merge: true });
      } catch (err) {
        console.warn(`[FirestoreService] Failed to update quiz ${id} in Firestore:`, err);
      }
    }
    return updated;
  }

  public async deleteQuiz(id: string): Promise<boolean> {
    const exists = this.memoryQuizzes.has(id);
    this.memoryQuizzes.delete(id);

    if (this.isFirebaseInitialized && this.db) {
      try {
        await this.db.collection('quizzes').doc(id).delete();
      } catch (err) {
        console.warn(`[FirestoreService] Failed to delete quiz ${id} in Firestore:`, err);
      }
    }
    return exists;
  }

  // --- Session & Response Persistence ---
  public async saveResponse(response: ParticipantResponse): Promise<void> {
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
      } catch (err) {
        console.warn('[FirestoreService] Failed to persist response in Firestore:', err);
      }
    }
  }

  public async saveFinalLeaderboard(sessionId: string, leaderboard: LeaderboardEntry[]): Promise<void> {
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
      } catch (err) {
        console.warn('[FirestoreService] Failed to persist leaderboard in Firestore:', err);
      }
    }
  }

  public getSessionResponses(sessionId: string): ParticipantResponse[] {
    return this.memoryResponses.get(sessionId) || [];
  }

  public getLeaderboard(sessionId: string): LeaderboardEntry[] {
    return this.memoryLeaderboards.get(sessionId) || [];
  }
}
