import React from 'react';
import { Sparkles, Trophy, UserPlus, Gamepad2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { useSocket } from '../../context/SocketContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: 'join' | 'dashboard' | 'editor') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { isConnected } = useSocket();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => onNavigate('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400 bg-clip-text text-transparent font-heading">
              QuizArena
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              PRO
            </span>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-2 mr-2">
            <button
              onClick={() => onNavigate('join')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'join'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Join Quiz</span>
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'dashboard' || currentView === 'editor'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Host Arena</span>
            </button>
          </nav>

          {/* Connection Status Indicator */}
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            title={isConnected ? 'Live WebSocket Connected' : 'Connecting to real-time server...'}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="hidden md:inline">{isConnected ? 'Live' : 'Connecting'}</span>
          </div>

          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
