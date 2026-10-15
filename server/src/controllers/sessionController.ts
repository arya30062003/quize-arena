import { Request, Response } from 'express';
import { SessionManager } from '../services/sessionManager';
import { FirestoreService } from '../services/firestoreService';
import { ExportService } from '../services/exportService';

const sessionManager = SessionManager.getInstance();
const firestoreService = FirestoreService.getInstance();

export async function createSession(req: Request, res: Response) {
  try {
    const { quizId, hostId } = req.body;
    if (!quizId) {
      return res.status(400).json({ success: false, error: 'quizId is required' });
    }

    const quiz = await firestoreService.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
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
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export function getSessionByPin(req: Request, res: Response) {
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
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export function getSessionAnalytics(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const analytics = sessionManager.getAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export function exportLeaderboardCSV(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const session = sessionManager.getSessionById(id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const leaderboard = sessionManager.getLeaderboard(id);
    const csvData = ExportService.generateLeaderboardCSV(session, leaderboard);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="QuizArena-${session.pin}-Leaderboard.csv"`);
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export function exportLeaderboardExcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const session = sessionManager.getSessionById(id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const leaderboard = sessionManager.getLeaderboard(id);
    const excelBuffer = ExportService.generateExcelWorkbook(session, leaderboard);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="QuizArena-${session.pin}-Report.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
