import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Trophy, Flame, Zap } from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface PlayerAnswerFeedbackProps {
  isCorrect: boolean;
  pointsEarned: number;
  streak: number;
  currentRank: number;
  totalScore: number;
}

export const PlayerAnswerFeedback: React.FC<PlayerAnswerFeedbackProps> = ({
  isCorrect,
  pointsEarned,
  streak,
  currentRank,
  totalScore
}) => {
  useEffect(() => {
    if (isCorrect) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
    }
  }, [isCorrect]);

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-8">
      <div
        className={`w-full max-w-md rounded-3xl p-8 text-center text-white shadow-2xl transition-all duration-300 animate-scale-up ${
          isCorrect
            ? 'bg-gradient-to-b from-emerald-600 to-teal-800 shadow-emerald-500/20'
            : 'bg-gradient-to-b from-rose-600 to-red-800 shadow-rose-500/20'
        }`}
      >
        {/* Status Icon */}
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4 shadow-inner">
          {isCorrect ? (
            <CheckCircle2 className="w-12 h-12 text-white" />
          ) : (
            <XCircle className="w-12 h-12 text-white" />
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black font-heading">
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </h1>

        {/* Points Banner */}
        <div className="my-6 p-4 rounded-2xl bg-black/20 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-widest font-black text-white/80">
            Points Earned
          </div>
          <div className="text-4xl sm:text-5xl font-black font-heading mt-1">
            +{pointsEarned}
          </div>
          {isCorrect && pointsEarned > 100 && (
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-300 mt-1">
              <Zap className="w-3.5 h-3.5 fill-amber-300" />
              <span>Includes +{pointsEarned - 100} speed bonus!</span>
            </div>
          )}
        </div>

        {/* Current Standing & Streak */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-white/80 font-bold mb-0.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Current Rank</span>
            </div>
            <div className="text-2xl font-black font-heading">
              #{currentRank}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-white/80 font-bold mb-0.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Streak</span>
            </div>
            <div className="text-2xl font-black font-heading">
              {streak}x
            </div>
          </div>
        </div>

        {/* Total Score */}
        <div className="mt-6 text-sm font-bold text-white/80">
          Total Score: <span className="text-white font-black text-lg">{totalScore.toLocaleString()}</span> pts
        </div>
      </div>
    </div>
  );
};
