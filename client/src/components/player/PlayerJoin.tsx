import React, { useState, useEffect } from 'react';
import { Gamepad2, ArrowRight, MessageCircle, User, Hash, Key, Shuffle, Sparkles } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { soundEffects } from '../../utils/soundEffects';
import { InstantChatView } from '../common/InstantChatView';
import { ChatMessage, InstantChatMember } from '../../types';

interface PlayerJoinProps {
  initialPin?: string;
  initialChatKey?: string;
  onJoined: (data: {
    sessionId: string;
    pin: string;
    participant: any;
    quizTitle: string;
    totalQuestions: number;
  }) => void;
}

export const PlayerJoin: React.FC<PlayerJoinProps> = ({
  initialPin = '',
  initialChatKey = '',
  onJoined
}) => {
  const { socket, isConnected } = useSocket();

  // Mode: 'quiz' for game PIN join, 'chat' for instant WhatsApp chat by key
  const [activeTab, setActiveTab] = useState<'quiz' | 'chat'>(initialChatKey ? 'chat' : 'quiz');

  // Quiz Form State
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Instant Chat State
  const [chatKey, setChatKey] = useState(initialChatKey);
  const [chatNickname, setChatNickname] = useState('');
  const [chatAvatar, setChatAvatar] = useState('avatar-1');
  const [chatJoining, setChatJoining] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Active Instant Chat Room session
  const [activeChat, setActiveChat] = useState<{
    chatKey: string;
    member: InstantChatMember;
    members: InstantChatMember[];
    messages: ChatMessage[];
  } | null>(null);

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
      setActiveTab('quiz');
    }
  }, [initialPin]);

  useEffect(() => {
    if (initialChatKey) {
      setChatKey(initialChatKey.toUpperCase());
      setActiveTab('chat');
    }
  }, [initialChatKey]);

  // Quiz socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleSessionJoined = (data: any) => {
      setJoining(false);
      soundEffects.playCorrect();
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

  // Instant Chat socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleInstantChatJoined = (data: {
      chatKey: string;
      member: InstantChatMember;
      members: InstantChatMember[];
      messages: ChatMessage[];
    }) => {
      setChatJoining(false);
      setChatError(null);
      soundEffects.playCorrect();
      setActiveChat(data);
    };

    const handleInstantChatError = (data: { message: string }) => {
      setChatJoining(false);
      setChatError(data.message);
      soundEffects.playIncorrect();
    };

    socket.on('instant_chat_joined', handleInstantChatJoined);
    socket.on('instant_chat_error', handleInstantChatError);

    return () => {
      socket.off('instant_chat_joined', handleInstantChatJoined);
      socket.off('instant_chat_error', handleInstantChatError);
    };
  }, [socket]);

  const avatars = [
    { id: 'avatar-1', emoji: '🦊', label: 'Fox' },
    { id: 'avatar-2', emoji: '🚀', label: 'Rocket' },
    { id: 'avatar-3', emoji: '⚡', label: 'Bolt' },
    { id: 'avatar-4', emoji: '🦁', label: 'Lion' },
    { id: 'avatar-5', emoji: '🎯', label: 'Target' },
    { id: 'avatar-6', emoji: '🦄', label: 'Unicorn' }
  ];

  // Handle Quiz Join
  const handleQuizSubmit = (e: React.FormEvent) => {
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

  // Handle Instant Chat Join
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isConnected) {
      setChatError('Connecting to server... please wait a moment.');
      return;
    }

    const cleanKey = chatKey.trim().toUpperCase();
    if (!cleanKey) {
      setChatError('Please enter a Chat Key or generate a random key.');
      return;
    }

    const cleanNick = chatNickname.trim();
    if (!cleanNick) {
      setChatError('Please choose your nickname.');
      return;
    }

    setChatError(null);
    setChatJoining(true);
    soundEffects.playLockIn();

    const chosenEmoji = avatars.find(a => a.id === chatAvatar)?.emoji || '💬';

    socket.emit('join_instant_chat', {
      chatKey: cleanKey,
      nickname: cleanNick,
      avatar: chatAvatar,
      emoji: chosenEmoji
    });
  };

  // Generate random chat key
  const generateRandomKey = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const key = `CHAT-${randomNum}`;
    setChatKey(key);
  };

  const handleLeaveChat = () => {
    if (socket) {
      socket.emit('leave_instant_chat');
    }
    setActiveChat(null);
  };

  // If currently active in an instant chat room, display the full WhatsApp chat room!
  if (activeChat) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-3 sm:px-4 py-6">
        <InstantChatView
          chatKey={activeChat.chatKey}
          currentUser={activeChat.member}
          initialMembers={activeChat.members}
          initialMessages={activeChat.messages}
          socket={socket}
          onLeave={handleLeaveChat}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-500/5">
        {/* Navigation Switcher Tabs */}
        <div className="flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('quiz');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'quiz'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Join Quiz</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('chat');
              setChatError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all relative ${
              activeTab === 'chat'
                ? 'bg-[#25D366] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>WhatsApp Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 animate-pulse" />
          </button>
        </div>

        {/* TAB 1: JOIN QUIZ ARENA */}
        {activeTab === 'quiz' && (
          <div>
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

            <form onSubmit={handleQuizSubmit} className="space-y-4">
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
        )}

        {/* TAB 2: WHATSAPP INSTANT CHAT BY KEY */}
        {activeTab === 'chat' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/25">
                <MessageCircle className="w-7 h-7 fill-current" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
                Instant WhatsApp Chat
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter any <strong>Chat Key</strong> to chat in real-time instantly!
              </p>
            </div>

            {chatError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 text-center animate-shake">
                {chatError}
              </div>
            )}

            <form onSubmit={handleChatSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Secret Chat Key
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomKey}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Random Key</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={15}
                    value={chatKey}
                    onChange={e => setChatKey(e.target.value.toUpperCase())}
                    placeholder="E.G. CHAT-7742"
                    required
                    className="w-full text-center text-xl sm:text-2xl tracking-wider font-black py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366] font-heading"
                  />
                  <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Your Name / Nickname
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={20}
                    value={chatNickname}
                    onChange={e => setChatNickname(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:border-[#25D366]"
                  />
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Chat Avatar Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Choose Avatar Emoji
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {avatars.map(av => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setChatAvatar(av.id)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        chatAvatar === av.id
                          ? 'bg-[#25D366] text-white ring-2 ring-emerald-400 scale-110 shadow-md'
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
                disabled={chatJoining || !isConnected}
                className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5c] text-white font-black text-lg shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>{chatJoining ? 'Connecting to Room...' : 'Start Chat (Enter ↵)'}</span>
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                💡 Anyone who enters this <strong>Key</strong> will join the same WhatsApp chat room instantly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
