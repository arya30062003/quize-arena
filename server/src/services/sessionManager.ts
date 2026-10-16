import { v4 as uuidv4 } from 'uuid';
import {
  ActiveSession,
  ClientQuestion,
  LeaderboardEntry,
  Participant,
  ParticipantResponse,
  Question,
  QuestionDistribution,
  Quiz,
  SessionAnalytics,
  SessionStatus
} from '../types';
import { ScoringService } from './scoringService';
import { FirestoreService } from './firestoreService';

// List of emojis to assign to participants uniquely per session
const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🦁','🐷','🐻','🐼','🐸','🐵','🦉','🦇','🐔','🐧','🐦','🐤','🐣','🦢','🦜','🦩','🦚','🦞','🦐','🦑','🐙','🦈','🐬','🐳','🦖','🦕'];

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, ActiveSession> = new Map(); // sessionId -> ActiveSession
  private pinIndex: Map<string, string> = new Map(); // pin -> sessionId
  private socketToParticipant: Map<string, { sessionId: string; participantId: string }> = new Map();
  private hostSockets: Map<string, string> = new Map(); // socketId -> sessionId

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Generates a 6-digit numeric game PIN
   */
  private generatePin(): string {
    let pin: string;
    let attempts = 0;
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
    } while (this.pinIndex.has(pin) && attempts < 100);
    return pin;
  }

  /**
   * Creates a new live quiz session
   */
  public createSession(quiz: Quiz, hostId: string, hostSocketId: string): ActiveSession {
    const sessionId = uuidv4();
    const pin = this.generatePin();

    const session: ActiveSession = {
      id: sessionId,
      pin,
      quizId: quiz.id,
      quizTitle: quiz.title,
      hostId,
      hostSocketId,
      status: 'lobby',
      currentQuestionIndex: -1,
      questions: JSON.parse(JSON.stringify(quiz.questions)), // deep copy
      participants: new Map(),
      responses: new Map(),
      questionStartTime: 0,
      questionEndTime: 0,
      createdAt: Date.now(), usedEmojis: new Set()
    };

    this.sessions.set(sessionId, session);
    this.pinIndex.set(pin, sessionId);
    this.hostSockets.set(hostSocketId, sessionId);

    console.log(`[SessionManager] Created session ${sessionId} with PIN ${pin} for quiz "${quiz.title}"`);
    return session;
  }

  public getSessionById(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getSessionByPin(pin: string): ActiveSession | undefined {
    const sessionId = this.pinIndex.get(pin.trim());
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  public getSessionByHostSocket(socketId: string): ActiveSession | undefined {
    const sessionId = this.hostSockets.get(socketId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Participant joins the lobby
   */
  public joinSession(
    pin: string,
    nickname: string,
    socketId: string,
    avatar?: string
  ): { participant: Participant; session: ActiveSession } | { error: string } {
    const session = this.getSessionByPin(pin);
    if (!session) {
      return { error: 'Quiz PIN not found. Please check the code.' };
    }

    if (session.status === 'ended') {
      return { error: 'This quiz has already ended.' };
    }

    const cleanName = nickname.trim().slice(0, 25);
    if (!cleanName) {
      return { error: 'Please enter a valid nickname.' };
    }

    // Ensure unique display name in room
    let finalNickname = cleanName;
    let counter = 2;
    const existingNicknames = new Set(
      Array.from(session.participants.values()).map(p => p.nickname.toLowerCase())
    );
    while (existingNicknames.has(finalNickname.toLowerCase())) {
      finalNickname = `${cleanName} (${counter++})`;
    }

    const participantId = uuidv4();
    // Assign a unique emoji for the participant
    const availableEmojis = EMOJIS.filter(e => !session.usedEmojis.has(e));
    const emoji = availableEmojis.length ? availableEmojis[Math.floor(Math.random() * availableEmojis.length)] : '🙂';
    // Record used emoji
    session.usedEmojis.add(emoji);
    const participant: Participant = {
      id: participantId,
      socketId,
      sessionId: session.id,
      pin: session.pin,
      nickname: finalNickname,
      avatar: avatar || `avatar-${Math.floor(Math.random() * 8) + 1}`,
      emoji,
      score: 0,
      rank: session.participants.size + 1,
      streak: 0,
      lastScore: 0,
      lastCorrect: false,
      isConnected: true,
      joinedAt: Date.now()
    };

    session.participants.set(participantId, participant);
    this.socketToParticipant.set(socketId, { sessionId: session.id, participantId });

    return { participant, session };
  }

  /**
   * Participant reconnects after page reload or network drop
   */
  public reconnectParticipant(
    pin: string,
    participantId: string,
    newSocketId: string
  ): { participant: Participant; session: ActiveSession } | { error: string } {
    const session = this.getSessionByPin(pin);
    if (!session) {
      return { error: 'Session no longer active.' };
    }

    const participant = session.participants.get(participantId);
    if (!participant) {
      return { error: 'Participant not recognized in session.' };
    }

    // Update socket mapping
    participant.socketId = newSocketId;
    participant.isConnected = true;
    this.socketToParticipant.set(newSocketId, { sessionId: session.id, participantId });

    return { participant, session };
  }

  /**
   * Host starts the quiz countdown
   */
  public startQuiz(sessionId: string): { success: boolean; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.status = 'countdown';
    session.startedAt = Date.now();
    return { success: true };
  }

  /**
   * Progress to next question
   */
  public nextQuestion(sessionId: string): {
    question: ClientQuestion | null;
    fullQuestion: Question | null;
    questionIndex: number;
    totalQuestions: number;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { question: null, fullQuestion: null, questionIndex: -1, totalQuestions: 0, error: 'Session not found' };

    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex >= session.questions.length) {
      return { question: null, fullQuestion: null, questionIndex: nextIndex, totalQuestions: session.questions.length, error: 'No more questions' };
    }

    session.currentQuestionIndex = nextIndex;
    session.status = 'question';
    session.questionStartTime = Date.now();
    const fullQuestion = session.questions[nextIndex];
    session.questionEndTime = session.questionStartTime + fullQuestion.timeLimit * 1000;

    // Reset last question scores
    session.participants.forEach(p => {
      p.lastScore = 0;
    });

    // Anti-cheat client representation (isCorrect stripped)
    const clientQuestion: ClientQuestion = {
      id: fullQuestion.id,
      quizId: fullQuestion.quizId,
      questionText: fullQuestion.questionText,
      mediaUrl: fullQuestion.mediaUrl,
      timeLimit: fullQuestion.timeLimit,
      points: fullQuestion.points,
      options: fullQuestion.options.map(opt => ({ id: opt.id, text: opt.text })),
      order: fullQuestion.order,
      questionIndex: nextIndex,
      totalQuestions: session.questions.length
    };

    return {
      question: clientQuestion,
      fullQuestion,
      questionIndex: nextIndex,
      totalQuestions: session.questions.length
    };
  }

  /**
   * Submit an answer with server-side validation and anti-cheat
   */
  public submitAnswer(
    sessionId: string,
    participantId: string,
    optionId: string
  ): {
    success: boolean;
    error?: string;
    alreadySubmitted?: boolean;
    pointsEarned?: number;
    isCorrect?: boolean;
    streak?: number;
    answersReceived?: number;
    totalConnected?: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    if (session.status !== 'question') {
      return { success: false, error: 'Question is not active' };
    }

    const participant = session.participants.get(participantId);
    if (!participant) return { success: false, error: 'Participant not found' };

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) return { success: false, error: 'Active question not found' };

    // Check if already submitted for this question
    const questionResponses = session.responses.get(currentQuestion.id) || [];
    const hasAlreadyAnswered = questionResponses.some(r => r.participantId === participantId);
    if (hasAlreadyAnswered) {
      return { success: false, alreadySubmitted: true, error: 'Answer already recorded' };
    }

    // Anti-cheat: verify submission within time window (+ 750ms grace period for network transit)
    const submissionTime = Date.now();
    const responseTimeMs = submissionTime - session.questionStartTime;
    const maxTimeWithGrace = (currentQuestion.timeLimit + 0.75) * 1000;

    if (responseTimeMs > maxTimeWithGrace) {
      return { success: false, error: 'Time limit exceeded' };
    }

    // Determine correctness
    const selectedOption = currentQuestion.options.find(o => o.id === optionId);
    const isCorrect = selectedOption?.isCorrect === true;

    // Calculate score using formula
    const scoreResult = ScoringService.calculateScore(
      isCorrect,
      currentQuestion.timeLimit,
      responseTimeMs
    );

    // Update participant state
    participant.score += scoreResult.totalPoints;
    participant.lastScore = scoreResult.totalPoints;
    participant.lastCorrect = isCorrect;
    participant.streak = isCorrect ? participant.streak + 1 : 0;

    // Record response
    const response: ParticipantResponse = {
      id: uuidv4(),
      sessionId,
      questionId: currentQuestion.id,
      participantId,
      nickname: participant.nickname,
      selectedOptionId: optionId,
      isCorrect,
      responseTimeMs,
      pointsEarned: scoreResult.totalPoints,
      submittedAt: submissionTime
    };

    questionResponses.push(response);
    session.responses.set(currentQuestion.id, questionResponses);

    // Async firestore persistence
    FirestoreService.getInstance().saveResponse(response);

    // Count answers
    const answersReceived = questionResponses.length;
    const totalConnected = Array.from(session.participants.values()).filter(p => p.isConnected).length;

    return {
      success: true,
      pointsEarned: scoreResult.totalPoints,
      isCorrect,
      streak: participant.streak,
      answersReceived,
      totalConnected
    };
  }

  /**
   * End current question and generate option distribution
   */
  public endQuestion(sessionId: string): {
    distribution: QuestionDistribution[];
    correctOptionId: string;
    totalAnswers: number;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { distribution: [], correctOptionId: '', totalAnswers: 0, error: 'Session not found' };

    session.status = 'review';
    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) return { distribution: [], correctOptionId: '', totalAnswers: 0, error: 'Question not found' };

    const questionResponses = session.responses.get(currentQuestion.id) || [];
    const totalAnswers = questionResponses.length;

    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const correctOptionId = correctOption ? correctOption.id : '';

    const distribution: QuestionDistribution[] = currentQuestion.options.map(opt => {
      const count = questionResponses.filter(r => r.selectedOptionId === opt.id).length;
      const percentage = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
      return {
        optionId: opt.id,
        text: opt.text,
        count,
        isCorrect: opt.isCorrect,
        percentage
      };
    });

    this.recalculateRanks(session);

    return {
      distribution,
      correctOptionId,
      totalAnswers
    };
  }

  /**
   * Generate current live leaderboard
   */
  public getLeaderboard(sessionId: string): LeaderboardEntry[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    this.recalculateRanks(session);

    const sorted = Array.from(session.participants.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.joinedAt - b.joinedAt;
    });

    return sorted.map((p, index) => ({
      rank: index + 1,
      participantId: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      totalScore: p.score,
      lastQuestionScore: p.lastScore,
      streak: p.streak,
      isConnected: p.isConnected
    }));
  }

  /**
   * End the entire quiz session and declare winners
   */
  public endQuiz(sessionId: string): { podium: LeaderboardEntry[]; fullLeaderboard: LeaderboardEntry[] } {
    const session = this.sessions.get(sessionId);
    if (!session) return { podium: [], fullLeaderboard: [] };

    session.status = 'ended';
    session.endedAt = Date.now();

    const fullLeaderboard = this.getLeaderboard(sessionId);
    const podium = fullLeaderboard.slice(0, 3);

    // Save final standings
    FirestoreService.getInstance().saveFinalLeaderboard(sessionId, fullLeaderboard);

    return { podium, fullLeaderboard };
  }

  /**
   * Recalculates 1-based ranks
   */
  private recalculateRanks(session: ActiveSession) {
    const participants = Array.from(session.participants.values());
    participants.sort((a, b) => b.score - a.score);
    participants.forEach((p, idx) => {
      p.rank = idx + 1;
    });
  }

  /**
   * Kick participant from session
   */
  public kickParticipant(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(participantId);
    if (participant) {
      this.socketToParticipant.delete(participant.socketId);
      session.participants.delete(participantId);
      this.recalculateRanks(session);
      return true;
    }
    return false;
  }

  /**
   * Handle socket disconnection gracefully
   */
  public handleDisconnect(socketId: string): { sessionId?: string; participant?: Participant } {
    const mapping = this.socketToParticipant.get(socketId);
    if (mapping) {
      const { sessionId, participantId } = mapping;
      const session = this.sessions.get(sessionId);
      if (session) {
        const participant = session.participants.get(participantId);
        if (participant) {
          participant.isConnected = false;
          return { sessionId, participant };
        }
      }
    }
    return {};
  }

  /**
   * Generate complete dashboard analytics
   */
  public getAnalytics(sessionId: string): SessionAnalytics | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const participants = Array.from(session.participants.values());
    const totalParticipants = participants.length;
    const questionsCompleted = Math.max(0, session.currentQuestionIndex + 1);

    let allResponses: ParticipantResponse[] = [];
    session.responses.forEach(respList => {
      allResponses = allResponses.concat(respList);
    });

    const totalResponses = allResponses.length;
    const totalCorrect = allResponses.filter(r => r.isCorrect).length;
    const overallAccuracyPercent = totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0;

    const totalResponseTimeMs = allResponses.reduce((acc, r) => acc + r.responseTimeMs, 0);
    const averageResponseTimeSec = totalResponses > 0 ? parseFloat((totalResponseTimeMs / totalResponses / 1000).toFixed(2)) : 0;

    // Score distribution histogram
    const maxScore = Math.max(...participants.map(p => p.score), 100);
    const bucketSize = Math.max(100, Math.ceil(maxScore / 5));
    const buckets: { [key: string]: number } = {
      '0 - 200': 0,
      '201 - 500': 0,
      '501 - 800': 0,
      '801 - 1200': 0,
      '1201+': 0
    };

    participants.forEach(p => {
      if (p.score <= 200) buckets['0 - 200']++;
      else if (p.score <= 500) buckets['201 - 500']++;
      else if (p.score <= 800) buckets['501 - 800']++;
      else if (p.score <= 1200) buckets['801 - 1200']++;
      else buckets['1201+']++;
    });

    const scoreDistribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    // Question stats
    const questionStats = session.questions.slice(0, questionsCompleted).map((q, idx) => {
      const qResp = session.responses.get(q.id) || [];
      const correct = qResp.filter(r => r.isCorrect).length;
      const incorrect = qResp.length - correct;
      const acc = qResp.length > 0 ? Math.round((correct / qResp.length) * 100) : 0;
      const timeMs = qResp.reduce((acc, r) => acc + r.responseTimeMs, 0);
      const avgTime = qResp.length > 0 ? parseFloat((timeMs / qResp.length / 1000).toFixed(2)) : 0;

      return {
        questionIndex: idx + 1,
        questionText: q.questionText,
        correctCount: correct,
        incorrectCount: incorrect,
        accuracyPercent: acc,
        averageTimeSec: avgTime
      };
    });

    const topPerformers = this.getLeaderboard(sessionId).slice(0, 5);

    return {
      sessionId,
      quizTitle: session.quizTitle,
      totalParticipants,
      questionsCompleted,
      averageResponseTimeSec,
      overallAccuracyPercent,
      scoreDistribution,
      topPerformers,
      questionStats
    };
  }
}
