import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Lock } from 'lucide-react';
import { Question } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

interface PlayerQuestionViewProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  hasSubmitted: boolean;
  selectedOptionId?: string;
  onSubmitAnswer: (optionId: string) => void;
}

export const PlayerQuestionView: React.FC<PlayerQuestionViewProps> = ({
  question,
  questionIndex,
  totalQuestions,
  hasSubmitted,
  selectedOptionId: initialSelectedId,
  onSubmitAnswer
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [timeLeft, setTimeLeft] = useState(question.timeLimit);

  useEffect(() => {
    setSelectedId(initialSelectedId || null);
    setTimeLeft(question.timeLimit);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        if (prev <= 5) {
          soundEffects.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question, initialSelectedId]);

  const handleSelect = (optionId: string) => {
    if (hasSubmitted || selectedId !== null || timeLeft <= 0) return;

    setSelectedId(optionId);
    soundEffects.playLockIn();
    onSubmitAnswer(optionId);
  };

  const optionStyles = [
    { bg: 'bg-kahoot-red hover:bg-red-700 active:bg-red-800', icon: 'shape-triangle' },
    { bg: 'bg-kahoot-blue hover:bg-blue-700 active:bg-blue-800', icon: 'shape-diamond' },
    { bg: 'bg-kahoot-yellow hover:bg-yellow-600 active:bg-yellow-700', icon: 'shape-circle' },
    { bg: 'bg-kahoot-green hover:bg-green-700 active:bg-green-800', icon: 'shape-square' }
  ];

  const percentage = (timeLeft / question.timeLimit) * 100;
  const timerColor = percentage > 50 ? 'bg-emerald-500' : percentage > 25 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="max-w-xl mx-auto px-4 py-4 flex flex-col justify-between min-h-[calc(100vh-5rem)] select-none">
      {/* Top Header Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          <span>Question {questionIndex + 1} of {totalQuestions}</span>
          <span className="flex items-center gap-1 font-mono text-sm font-black text-slate-800 dark:text-white">
            <Clock className="w-4 h-4 text-indigo-500" />
            {timeLeft}s
          </span>
        </div>

        {/* Progress bar countdown */}
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-4">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="text-center py-4 px-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading leading-snug">
            {question.questionText}
          </h2>
        </div>
      </div>

      {/* Answer Locked Status Banner */}
      {(hasSubmitted || selectedId !== null) && (
        <div className="my-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-indigo-500" />
          <span>Answer locked in! Waiting for time up...</span>
        </div>
      )}

      {/* 4 Big Kahoot-Style Touch Action Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 my-auto pt-2 pb-6">
        {question.options.map((opt, idx) => {
          const style = optionStyles[idx % 4];
          const isSelected = selectedId === opt.id;
          const isOtherSelected = selectedId !== null && !isSelected;

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={hasSubmitted || selectedId !== null || timeLeft <= 0}
              className={`flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] p-4 rounded-3xl text-white font-bold shadow-xl transition-all duration-200 transform active:scale-95 ${
                style.bg
              } ${
                isSelected
                  ? 'ring-4 ring-white shadow-2xl scale-105 z-10'
                  : isOtherSelected
                  ? 'opacity-40 grayscale-[40%] scale-95'
                  : 'hover:scale-[1.02]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center mb-3">
                <span className={style.icon} />
              </div>
              <span className="text-sm sm:text-base font-extrabold text-center line-clamp-3">
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
