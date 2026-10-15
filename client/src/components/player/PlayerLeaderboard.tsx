import React from 'react';
import { Trophy, Medal, Award, Flame, Sparkles } from 'lucide-react';
import { LeaderboardEntry } from '../../types';

interface PlayerLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  myParticipantId: string;
}

export const PlayerLeaderboard: React.FC<PlayerLeaderboardProps> = ({
  leaderboard,
  myParticipantId
}) => {
  const myEntry = leaderboard.find(e => e.participantId === myParticipantId);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* My Rank Summary */}
      {myEntry && (
        <div className="p-6 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl text-center space-y-2">
          <div className="text-xs font-black uppercase tracking-widest text-indigo-200">
            Your Placement
          </div>
          <div className="text-4xl font-black font-heading">
            #{myEntry.rank}
          </div>
          <div className="text-xl font-bold">
            {myEntry.totalScore.toLocaleString()} pts
          </div>
        </div>
      )}

      {/* Top 5 Standings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Top Arena Standings
        </h3>

        <div className="space-y-2.5">
          {leaderboard.slice(0, 5).map(entry => {
            const isMe = entry.participantId === myParticipantId;
            return (
              <div
                key={entry.participantId}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isMe
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : entry.rank === 2
                        ? 'bg-slate-300 text-slate-800'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate block max-w-[130px]">
                      {entry.nickname} {isMe && '(You)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {entry.totalScore.toLocaleString()} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs font-bold text-slate-400 animate-pulse flex items-center justify-center gap-1.5">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span>Get ready for the next question...</span>
      </div>
    </div>
  );
};
