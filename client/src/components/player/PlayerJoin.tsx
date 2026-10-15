import React, { useState, useEffect } from 'react';
import { Gamepad2, ArrowRight, Sparkles, User, Hash } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { soundEffects } from '../../utils/soundEffects';

interface PlayerJoinProps {
  initialPin?: string;
  onJoined: (data: {
    sessionId: string;
    pin: string;
    participant: any;
    quizTitle: string;
    totalQuestions: number;
  }) => void;
}

export const PlayerJoin: React.FC<PlayerJoinProps> = ({ initialPin = '', onJoined }) => {
  const { socket, isConnected } = useSocket();
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
    }
  }, [initialPin]);

  useEffect(() => {
    if (!socket) return;

    const handleSessionJoined = (data: any) => {
      setJoining(false);
      soundEffects.playCorrect();
      // Save session in local storage for refresh recovery
      localStorage.setItem(
        'quizarena_player_session',
        JSON.stringify({
          pin: data.pin,
          participantId: data.participant.id,
          nickname: data.participant.nickname
        })
      );
      onJoined(data);
    };

    const handleError = (data: { message: string }) => {
      setJoining(false);
      setError(data.message);
      soundEffects.playIncorrect();
    };

    socket.on('session_joined', handleSessionJoined);
    socket.on('error_message', handleError);

    return () => {
      socket.off('session_joined', handleSessionJoined);
      socket.off('error_message', handleError);
    };
  }, [socket, onJoined]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isConnected) {
      setError('Connecting to game server... please wait a moment.');
      return;
    }

    if (!pin.trim() || pin.trim().length < 4) {
      setError('Please enter a valid 6-digit Game PIN.');
      return;
    }

    if (!nickname.trim()) {
      setError('Please choose a nickname.');
      return;
    }

    setError(null);
    setJoining(true);
    soundEffects.playLockIn();

    socket.emit('join_session', {
      pin: pin.trim(),
      nickname: nickname.trim(),
      avatar: selectedAvatar
    });
  };

  const avatars = [
    { id: 'avatar-1', emoji: '🦊', label: 'Fox' },
    { id: 'avatar-2', emoji: '🚀', label: 'Rocket' },
    { id: 'avatar-3', emoji: '⚡', label: 'Bolt' },
    { id: 'avatar-4', emoji: '🦁', label: 'Lion' },
    { id: 'avatar-5', emoji: '🎯', label: 'Target' },
    { id: 'avatar-6', emoji: '🦄', label: 'Unicorn' }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-500/5">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            Join Quiz Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter the host PIN to compete in real-time!
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Game PIN
            </label>
            <div className="relative">
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full text-center text-3xl sm:text-4xl tracking-widest font-black py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-heading"
              />
              <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Your Nickname
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Enter player name"
                required
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:border-indigo-500"
              />
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Choose Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {avatars.map(av => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    selectedAvatar === av.id
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-110 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={av.label}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={joining || !isConnected}
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <span>{joining ? 'Entering Arena...' : 'Join Game'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
