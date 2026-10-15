import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from '../services/firestoreService';
import { Quiz } from '../types';

const firestoreService = FirestoreService.getInstance();

export async function getQuizzes(req: Request, res: Response) {
  try {
    const quizzes = await firestoreService.getQuizzes();
    res.json({ success: true, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export async function getQuizById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const quiz = await firestoreService.getQuizById(id);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export async function createQuiz(req: Request, res: Response) {
  try {
    const body = req.body;
    const newQuiz: Quiz = {
      id: uuidv4(),
      title: body.title || 'Untitled Quiz',
      description: body.description || '',
      category: body.category || 'General',
      coverImage: body.coverImage || '',
      authorId: body.authorId || 'host-admin',
      isPublic: body.isPublic !== undefined ? body.isPublic : true,
      totalQuestions: body.questions ? body.questions.length : 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      questions: (body.questions || []).map((q: any, idx: number) => ({
        id: q.id || uuidv4(),
        quizId: '',
        questionText: q.questionText,
        mediaUrl: q.mediaUrl,
        timeLimit: q.timeLimit || 20,
        points: q.points || 100,
        order: idx + 1,
        options: (q.options || []).map((opt: any) => ({
          id: opt.id || uuidv4(),
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
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export async function updateQuiz(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await firestoreService.updateQuiz(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export async function deleteQuiz(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await firestoreService.deleteQuiz(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
