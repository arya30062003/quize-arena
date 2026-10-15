import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Award, Download, FileSpreadsheet, BarChart2, RotateCcw } from 'lucide-react';
import { LeaderboardEntry } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { getCSVExportUrl, getExcelExportUrl } from '../../services/api';

interface HostPodiumProps {
  sessionId: string;
  podium: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  onViewAnalytics: () => void;
  onRestart: () => void;
}

export const HostPodium: React.FC<HostPodiumProps> = ({
  sessionId,
  podium,
  leaderboard,
  onViewAnalytics,
  onRestart
}) => {
  const first = podium[0];
  const second = podium[1];
  const third = podium[2];

  useEffect(() => {
    soundEffects.playFanfare();

    // Trigger celebratory confetti burst
    const end = Date.now() + 3000;
    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="text-center mb-10">
        <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Tournament Complete
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mt-2 font-heading">
          Winner Podium
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Congratulations to our champion and top performers!
        </p>
      </div>

      {/* 3-Tier Olympic Podium */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 my-12 px-2 max-w-2xl mx-auto">
        {/* 2nd Place (Silver) */}
        {second && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black mb-2 shadow-md">
              <Medal className="w-6 h-6 text-slate-500" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate max-w-[120px]">
              {second.nickname}
            </div>
            <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-2">
              {second.totalScore.toLocaleString()} pts
            </div>

            <div className="w-full h-36 sm:h-44 rounded-t-2xl bg-gradient-to-t from-slate-400 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-lg border-t-4 border-slate-300">
              <span className="text-4xl sm:text-5xl font-black text-slate-600 dark:text-slate-400 font-heading">
                2
              </span>
            </div>
          </div>
        )}

        {/* 1st Place (Gold Champion) */}
        {first && (
          <div className="flex-1 flex flex-col items-center -mt-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black mb-2 shadow-xl shadow-amber-400/40 animate-bounce-short">
              <Trophy className="w-8 h-8 text-amber-950" />
            </div>
            <div className="font-black text-slate-900 dark:text-white text-base sm:text-lg truncate max-w-[140px]">
              {first.nickname}
            </div>
            <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mb-2">
              {first.totalScore.toLocaleString()} pts
            </div>

            <div className="w-full h-48 sm:h-60 rounded-t-2xl bg-gradient-to-t from-amber-500 via-yellow-400 to-yellow-300 flex items-center justify-center shadow-2xl border-t-4 border-yellow-200">
              <span className="text-5xl sm:text-6xl font-black text-amber-950 font-heading">
                1
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {third && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-800 text-white flex items-center justify-center font-black mb-2 shadow-md">
              <Award className="w-6 h-6 text-amber-200" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate max-w-[120px]">
              {third.nickname}
            </div>
            <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-2">
              {third.totalScore.toLocaleString()} pts
            </div>

            <div className="w-full h-28 sm:h-36 rounded-t-2xl bg-gradient-to-t from-amber-900 to-amber-700 flex items-center justify-center shadow-md border-t-4 border-amber-600">
              <span className="text-3xl sm:text-4xl font-black text-amber-200 font-heading">
                3
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Export & Analytics */}
      <div className="flex flex-wrap items-center justify-center gap-4 my-8 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <a
          href={getExcelExportUrl(sessionId)}
          download
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all transform hover:scale-105"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel (.xlsx)</span>
        </a>

        <a
          href={getCSVExportUrl(sessionId)}
          download
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-sm shadow-md transition-all transform hover:scale-105"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </a>

        <button
          onClick={onViewAnalytics}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all transform hover:scale-105"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics Dashboard</span>
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Back to Quizzes</span>
        </button>
      </div>

      {/* Complete Final Standings List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mt-8">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Complete Final Standings ({leaderboard.length} players)
        </h3>
        <div className="space-y-2">
          {leaderboard.map(entry => (
            <div
              key={entry.participantId}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center">
                  #{entry.rank}
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {entry.nickname}
                </span>
              </div>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                {entry.totalScore.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
