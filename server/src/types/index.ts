export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ClientQuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  mediaUrl?: string;
  timeLimit: number; // in seconds (e.g., 20)
  points: number; // multiplier / base
  options: QuestionOption[];
  order: number;
}

export interface ClientQuestion {
  id: string;
  quizId: string;
  questionText: string;
  mediaUrl?: string;
  timeLimit: number;
  points: number;
  options: ClientQuestionOption[]; // No isCorrect field sent to clients during question
  order: number;
  questionIndex: number;
  totalQuestions: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage?: string;
  authorId: string;
  isPublic: boolean;
  totalQuestions: number;
  createdAt: number;
  updatedAt: number;
  questions: Question[];
}

export interface Participant {
  id: string;
  socketId: string;
  sessionId: string;
  pin: string;
  nickname: string;
  avatar: string;
  emoji: string; // unique participant emoji
  score: number;
  rank: number;
  streak: number;
  lastScore: number;
  lastCorrect: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface ParticipantResponse {
  id: string;
  sessionId: string;
  questionId: string;
  participantId: string;
  nickname: string;
  selectedOptionId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsEarned: number;
  submittedAt: number;
}

export type SessionStatus = 'lobby' | 'countdown' | 'question' | 'review' | 'leaderboard' | 'ended';

export interface QuestionDistribution {
  optionId: string;
  text: string;
  count: number;
  isCorrect: boolean;
  percentage: number;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  lastQuestionScore: number;
  streak: number;
  isConnected: boolean;
}

export interface ActiveSession {
  id: string;
  pin: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  hostSocketId: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  questions: Question[];
  participants: Map<string, Participant>; // participantId -> Participant
  responses: Map<string, ParticipantResponse[]>; // questionId -> ParticipantResponse[]
  questionStartTime: number; // timestamp when current question became active
  questionEndTime: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  usedEmojis: Set<string>; // Track assigned emojis in this session
}

export interface SessionAnalytics {
  sessionId: string;
  quizTitle: string;
  totalParticipants: number;
  questionsCompleted: number;
  averageResponseTimeSec: number;
  overallAccuracyPercent: number;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  topPerformers: LeaderboardEntry[];
  questionStats: {
    questionIndex: number;
    questionText: string;
    correctCount: number;
    incorrectCount: number;
    accuracyPercent: number;
    averageTimeSec: number;
  }[];
}
