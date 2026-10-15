import React from 'react';
import { Trophy, ArrowRight, Flame, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '../../types';

interface HostLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentQuestionIndex: number;
  totalQuestions: number;
  onNextQuestion: () => void;
  onEndQuiz: () => void;
}

export const HostLeaderboard: React.FC<HostLeaderboardProps> = ({
  leaderboard,
  currentQuestionIndex,
  totalQuestions,
  onNextQuestion,
  onEndQuiz
}) => {
  const isFinal = currentQuestionIndex >= totalQuestions - 1;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/30">
            <Trophy className="w-5 h-5 text-amber-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 flex items-center justify-center font-black shadow-md">
            <Medal className="w-5 h-5 text-slate-700" />
          </div>
        );
      case 3:
        return (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-black shadow-md">
            <Award className="w-5 h-5 text-amber-100" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-black text-sm">
            #{rank}
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Current Standings
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            Live Leaderboard
          </h1>
        </div>

        <button
          onClick={isFinal ? onEndQuiz : onNextQuestion}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-105 active:scale-95"
        >
          <span>{isFinal ? 'Show Final Podium' : 'Next Question'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Leaderboard entries */}
      <div className="my-8 space-y-3">
        {leaderboard.map((entry, index) => {
          const isTop3 = entry.rank <= 3;
          return (
            <div
              key={entry.participantId}
              className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all transform hover:-translate-y-0.5 duration-200 ${
                entry.rank === 1
                  ? 'border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-950/30 shadow-md ring-1 ring-amber-400/50'
                  : entry.rank === 2
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60'
                  : entry.rank === 3
                  ? 'border-amber-700/50 dark:border-amber-900/50 bg-amber-500/5 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                {getRankBadge(entry.rank)}

                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                    <span>{entry.nickname}</span>
                    {entry.streak >= 2 && (
                      <span className="flex items-center gap-0.5 text-xs font-black text-amber-500 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60">
                        <Flame className="w-3.5 h-3.5 fill-amber-500" />
                        <span>{entry.streak}x</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    {entry.lastQuestionScore > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        +{entry.lastQuestionScore} pts last question
                      </span>
                    ) : (
                      <span>+0 pts</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Score */}
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-heading">
                  {entry.totalScore.toLocaleString()}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Points
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
