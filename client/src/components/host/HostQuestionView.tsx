import React, { useEffect, useState } from 'react';
import { Clock, Users, FastForward, CheckCircle2 } from 'lucide-react';
import { Question } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

interface HostQuestionViewProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  answersReceived: number;
  totalParticipants: number;
  onTimeUp: () => void;
}

export const HostQuestionView: React.FC<HostQuestionViewProps> = ({
  question,
  questionIndex,
  totalQuestions,
  answersReceived,
  totalParticipants,
  onTimeUp
}) => {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit);

  useEffect(() => {
    setTimeLeft(question.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        if (prev <= 6) {
          soundEffects.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question]);

  // If everyone answered, finish immediately
  useEffect(() => {
    if (totalParticipants > 0 && answersReceived >= totalParticipants && timeLeft > 0) {
      const timeout = setTimeout(() => {
        onTimeUp();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [answersReceived, totalParticipants, timeLeft]);

  const percentage = (timeLeft / question.timeLimit) * 100;
  const strokeColor =
    percentage > 50 ? '#10b981' : percentage > 25 ? '#f59e0b' : '#ef4444';

  const optionStyles = [
    { bg: 'bg-kahoot-red', icon: 'shape-triangle', label: 'Triangle' },
    { bg: 'bg-kahoot-blue', icon: 'shape-diamond', label: 'Diamond' },
    { bg: 'bg-kahoot-yellow', icon: 'shape-circle', label: 'Circle' },
    { bg: 'bg-kahoot-green', icon: 'shape-square', label: 'Square' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[calc(100vh-8rem)]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
        </div>

        <button
          onClick={onTimeUp}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <FastForward className="w-4 h-4" />
          <span>Skip to Results</span>
        </button>
      </div>

      {/* Main Question Display */}
      <div className="my-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight font-heading">
          {question.questionText}
        </h2>
      </div>

      {/* Stats Counter & Timer Bar */}
      <div className="flex items-center justify-between gap-6 my-4 px-4">
        {/* Countdown Ring */}
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="currentColor"
              strokeWidth="6"
              className="text-slate-200 dark:text-slate-800"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke={strokeColor}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={213.6}
              strokeDashoffset={213.6 - (213.6 * percentage) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute text-2xl font-black text-slate-900 dark:text-white font-heading">
            {timeLeft}
          </div>
        </div>

        {/* Live Submissions Tracker */}
        <div className="flex-1 max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Answers Received</span>
          </div>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-heading">
            {answersReceived} <span className="text-lg text-slate-400 font-medium">/ {totalParticipants}</span>
          </div>
        </div>
      </div>

      {/* 4 MCQ Option Cards (Kahoot Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {question.options.map((opt, idx) => {
          const style = optionStyles[idx % 4];
          return (
            <div
              key={opt.id}
              className={`flex items-center gap-4 p-6 rounded-2xl text-white font-bold text-lg sm:text-xl shadow-lg transition-transform ${style.bg}`}
            >
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                <span className={style.icon} />
              </div>
              <div className="flex-1 truncate leading-tight">
                {opt.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
