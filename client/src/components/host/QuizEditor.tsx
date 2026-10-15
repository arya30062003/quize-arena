import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Save, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Quiz, Question, QuestionOption } from '../../types';
import { fetchQuizById, createQuiz, updateQuiz } from '../../services/api';

interface QuizEditorProps {
  quizId?: string;
  onBack: () => void;
  onSaved: (quiz: Quiz) => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quizId, onBack, onSaved }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-new-1',
      quizId: '',
      questionText: 'What is the capital of France?',
      timeLimit: 20,
      points: 100,
      order: 1,
      options: [
        { id: 'opt1', text: 'London', isCorrect: false },
        { id: 'opt2', text: 'Paris', isCorrect: true },
        { id: 'opt3', text: 'Rome', isCorrect: false },
        { id: 'opt4', text: 'Berlin', isCorrect: false }
      ]
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId) {
      setLoading(true);
      fetchQuizById(quizId)
        .then(q => {
          setTitle(q.title);
          setDescription(q.description || '');
          setCategory(q.category || 'General');
          setQuestions(q.questions || []);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [quizId]);

  const addQuestion = () => {
    const newQ: Question = {
      id: `q-temp-${Date.now()}`,
      quizId: quizId || '',
      questionText: `New Question #${questions.length + 1}`,
      timeLimit: 20,
      points: 100,
      order: questions.length + 1,
      options: [
        { id: `opt-1-${Date.now()}`, text: 'Option A', isCorrect: true },
        { id: `opt-2-${Date.now()}`, text: 'Option B', isCorrect: false },
        { id: `opt-3-${Date.now()}`, text: 'Option C', isCorrect: false },
        { id: `opt-4-${Date.now()}`, text: 'Option D', isCorrect: false }
      ]
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const updateTimeLimit = (index: number, timeLimit: number) => {
    const updated = [...questions];
    updated[index].timeLimit = timeLimit;
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = text;
    setQuestions(updated);
  };

  const setCorrectOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.map((opt, i) => ({
      ...opt,
      isCorrect: i === optIndex
    }));
    setQuestions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a quiz title.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        questions: questions.map((q, idx) => ({
          ...q,
          order: idx + 1
        }))
      };

      let saved: Quiz;
      if (quizId) {
        saved = await updateQuiz(quizId, payload);
      } else {
        saved = await createQuiz(payload);
      }
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const optionColors = [
    'border-red-500 bg-red-50 dark:bg-red-950/20',
    'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
    'border-amber-500 bg-amber-50 dark:bg-amber-950/20',
    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-600">
        <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {quizId ? 'Edit Quiz' : 'Create New Quiz'}
        </h1>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="mt-6 space-y-8">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quiz Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. World History & Wonders"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="General">General Trivia</option>
                <option value="Technology">Technology & Web</option>
                <option value="Science">Science & Math</option>
                <option value="Geography">Geography & History</option>
                <option value="Languages">Languages & Arts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description for participants"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Questions ({questions.length})
            </h2>

            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div
              key={q.id || qIndex}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                  Question {qIndex + 1}
                </span>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    <select
                      value={q.timeLimit}
                      onChange={e => updateTimeLimit(qIndex, Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                    >
                      <option value={10}>10 Seconds</option>
                      <option value={15}>15 Seconds</option>
                      <option value={20}>20 Seconds</option>
                      <option value={30}>30 Seconds</option>
                      <option value={45}>45 Seconds</option>
                      <option value={60}>60 Seconds</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={q.questionText}
                  onChange={e => updateQuestionText(qIndex, e.target.value)}
                  placeholder="Enter your question prompt here..."
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 4 MCQ Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {q.options.map((opt, optIndex) => (
                  <div
                    key={opt.id || optIndex}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      optionColors[optIndex % 4]
                    } ${opt.isCorrect ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-90'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectOption(qIndex, optIndex)}
                      className={`p-1.5 rounded-full transition-colors ${
                        opt.isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 border border-slate-300 dark:border-slate-700'
                      }`}
                      title={opt.isCorrect ? 'Correct Answer' : 'Click to make correct answer'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => updateOptionText(qIndex, optIndex, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                      required
                      className="flex-1 bg-transparent border-none text-slate-900 dark:text-white font-semibold text-sm focus:outline-none"
                    />

                    {opt.isCorrect && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Save Action */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all text-base"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving Quiz...' : 'Save & Finish'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
