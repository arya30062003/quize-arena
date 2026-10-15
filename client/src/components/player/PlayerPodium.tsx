import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Award, RotateCcw, Sparkles } from 'lucide-react';
import { LeaderboardEntry } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

interface PlayerPodiumProps {
  myParticipantId: string;
  podium: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  onPlayAgain: () => void;
}

export const PlayerPodium: React.FC<PlayerPodiumProps> = ({
  myParticipantId,
  podium,
  leaderboard,
  onPlayAgain
}) => {
  const myEntry = leaderboard.find(e => e.participantId === myParticipantId);
  const isWinner = myEntry && myEntry.rank === 1;
  const isPodium = myEntry && myEntry.rank <= 3;

  useEffect(() => {
    if (isPodium) {
      soundEffects.playFanfare();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isPodium]);

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-6">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950">
          <Trophy className="w-10 h-10 text-amber-950" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Game Over
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-heading">
            {isWinner
              ? '🏆 Champion!'
              : isPodium
              ? '🎉 Podium Finish!'
              : 'Well Played!'}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Thank you for competing in QuizArena!
          </p>
        </div>

        {myEntry && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Your Final Standing
            </div>
            <div className="text-5xl font-black text-slate-900 dark:text-white font-heading">
              #{myEntry.rank}
            </div>
            <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              {myEntry.totalScore.toLocaleString()} Total Points
            </div>
          </div>
        )}

        <button
          onClick={onPlayAgain}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Another Quiz</span>
        </button>
      </div>
    </div>
  );
};
