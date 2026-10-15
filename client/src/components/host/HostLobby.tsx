import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Play, Copy, Check, QrCode, UserX, Share2, Sparkles } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { Participant } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

interface HostLobbyProps {
  sessionId: string;
  pin: string;
  quizTitle: string;
  participants: Participant[];
  onStartQuiz: () => void;
}

export const HostLobby: React.FC<HostLobbyProps> = ({
  sessionId,
  pin,
  quizTitle,
  participants,
  onStartQuiz
}) => {
  const { socket } = useSocket();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const joinUrl = `${window.location.origin}/?pin=${pin}`;

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    soundEffects.playLockIn();
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    soundEffects.playLockIn();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = (participantId: string) => {
    if (socket) {
      socket.emit('host_kick_participant', { sessionId, participantId });
    }
  };

  const handleStart = () => {
    soundEffects.playLockIn();
    onStartQuiz();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner with Quiz Title & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-300 text-sm font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Live Competition Lobby</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading">{quizTitle}</h1>
          <p className="text-indigo-200 text-sm mt-1">
            Invite players to join from their phone or browser.
          </p>
        </div>

        {/* Start Button */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleStart}
            disabled={participants.length === 0}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
              participants.length > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/30'
                : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>Start Game</span>
          </button>
        </div>
      </div>

      {/* Hero Join Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        {/* Game PIN Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Join At: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{window.location.host}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Copy shareable link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Share Link'}</span>
              </button>
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQR ? 'Hide QR' : 'Show QR'}</span>
              </button>
            </div>
          </div>

          <div className="text-center py-4">
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
              Game PIN
            </div>
            <div
              onClick={copyPin}
              className="text-6xl sm:text-7xl font-black tracking-widest text-indigo-600 dark:text-indigo-400 cursor-pointer font-heading select-all hover:scale-105 transition-transform"
              title="Click to copy PIN"
            >
              {pin}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <span>Click PIN to copy</span>
          </div>
        </div>

        {/* QR Code / Direct Scan Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700">
            <QRCodeSVG value={joinUrl} size={150} level="M" />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
            Scan with phone camera to join instantly
          </p>
        </div>
      </div>

      {/* Joined Participants Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Joined Participants
              </h2>
              <p className="text-xs text-slate-500">
                {participants.length} {participants.length === 1 ? 'player' : 'players'} waiting in lobby
              </p>
            </div>
          </div>

          {participants.length === 0 && (
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
              Waiting for players to enter PIN...
            </div>
          )}
        </div>

        {participants.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              No players joined yet. Share the PIN or QR code!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
            {participants.map(p => (
              <div
                key={p.id}
                className="group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm animate-scale-up"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow">
                  {p.nickname.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {p.nickname}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Ready</span>
                  </div>
                </div>

                {/* Kick Button */}
                <button
                  onClick={() => handleKick(p.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 transition-all"
                  title="Kick player"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
