export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Optional on client side (hidden during active question)
}

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  mediaUrl?: string;
  timeLimit: number; // in seconds
  points: number;
  options: QuestionOption[];
  order: number;
  questionIndex?: number;
  totalQuestions?: number;
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
  nickname: string;
  avatar: string;
  score: number;
  rank: number;
  streak: number;
  isConnected: boolean;
  emoji: string; // unique emoji for participant
}

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
