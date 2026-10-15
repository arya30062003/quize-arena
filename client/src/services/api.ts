import { Quiz, SessionAnalytics } from '../types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const API_BASE = `${SERVER_URL}/api`;

export async function fetchQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${API_BASE}/quizzes`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch quizzes');
  return data.data;
}

export async function fetchQuizById(id: string): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch quiz');
  return data.data;
}

export async function createQuiz(quiz: Partial<Quiz>): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to create quiz');
  return data.data;
}

export async function updateQuiz(id: string, quiz: Partial<Quiz>): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to update quiz');
  return data.data;
}

export async function deleteQuiz(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to delete quiz');
}

export async function createSession(quizId: string, hostId: string = 'host-admin'): Promise<{
  sessionId: string;
  pin: string;
  quizTitle: string;
  totalQuestions: number;
}> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId, hostId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to launch session');
  return data.data;
}

export async function checkSessionPin(pin: string): Promise<{
  sessionId: string;
  pin: string;
  quizTitle: string;
  status: string;
  participantsCount: number;
  totalQuestions: number;
}> {
  const res = await fetch(`${API_BASE}/sessions/pin/${pin}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Invalid PIN');
  return data.data;
}

export async function fetchSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/analytics`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch analytics');
  return data.data;
}

export function getCSVExportUrl(sessionId: string): string {
  return `${API_BASE}/sessions/${sessionId}/export/csv`;
}

export function getExcelExportUrl(sessionId: string): string {
  return `${API_BASE}/sessions/${sessionId}/export/excel`;
}
