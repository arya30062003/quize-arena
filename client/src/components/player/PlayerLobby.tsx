import React from 'react';
import { Sparkles, Gamepad2 } from 'lucide-react';
import { Participant } from '../../types';

interface PlayerLobbyProps {
  participant: Participant;
  quizTitle: string;
  pin: string;
}

export const PlayerLobby: React.FC<PlayerLobbyProps> = ({ participant, quizTitle, pin }) => {
  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-6">
        {/* Animated Avatar */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-4xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
            {participant.nickname.slice(0, 1).toUpperCase()}
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>You're In!</span>
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-heading">
            {participant.nickname}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            See your name on the host's screen!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Joining Session
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {quizTitle}
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold tracking-wider">
            PIN: {pin}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Waiting for the host to start the game...</span>
        </div>
      </div>
    </div>
  );
};
