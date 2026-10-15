import React, { useEffect, useState } from 'react';
import { Play, Plus, BookOpen, Trash2, Edit3, Sparkles, HelpCircle, Users, BarChart2 } from 'lucide-react';
import { Quiz } from '../../types';
import { fetchQuizzes, deleteQuiz, createSession } from '../../services/api';

interface HostDashboardProps {
  onStartSession: (sessionData: { sessionId: string; pin: string; quizTitle: string; totalQuestions: number }) => void;
  onEditQuiz: (quizId?: string) => void;
  onViewAnalytics?: (sessionId: string) => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ onStartSession, onEditQuiz }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await fetchQuizzes();
      setQuizzes(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleLaunch = async (quiz: Quiz) => {
    try {
      setLaunchingId(quiz.id);
      const session = await createSession(quiz.id);
      onStartSession(session);
    } catch (err) {
      alert(`Failed to launch quiz: ${(err as Error).message}`);
    } finally {
      setLaunchingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteQuiz(id);
        setQuizzes(prev => prev.filter(q => q.id !== id));
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading">
            Host Game Control Center
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Select a quiz to host live with your class, audience, or team in real-time.
          </p>
        </div>

        <button
          onClick={() => onEditQuiz()}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          <span>Create Custom Quiz</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{quizzes.length}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Quizzes</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">500+</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Concurrency Ready</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">Instant</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sub-ms Sockets</div>
          </div>
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span>Your Quiz Library</span>
          <span className="text-sm font-normal text-slate-500">({quizzes.length} quizzes)</span>
        </h2>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-600">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No quizzes found</h3>
            <p className="text-slate-500 mt-1">Get started by creating your very first interactive quiz!</p>
            <button
              onClick={() => onEditQuiz()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
            >
              Create Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => (
              <div
                key={quiz.id}
                className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {quiz.category || 'General'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {quiz.questions.length} Questions
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {quiz.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {quiz.description || 'Interactive live quiz competition set with speed-bonus points.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditQuiz(quiz.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Quiz"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id, quiz.title)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleLaunch(quiz)}
                    disabled={launchingId === quiz.id || quiz.questions.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{launchingId === quiz.id ? 'Launching...' : 'Host Live'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
