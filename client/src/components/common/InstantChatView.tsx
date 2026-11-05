import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import {
  MessageCircle,
  Send,
  Smile,
  Copy,
  Check,
  Users,
  CheckCheck,
  Lock,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
  Key
} from 'lucide-react';
import { ChatMessage, InstantChatMember } from '../../types';

interface InstantChatViewProps {
  chatKey: string;
  currentUser: InstantChatMember;
  initialMembers: InstantChatMember[];
  initialMessages: ChatMessage[];
  socket: Socket | null;
  onLeave: () => void;
}

const QUICK_EMOJIS = ['😂', '🔥', '👏', '🎉', '🚀', '❤️', '😭', '🤯', '👍', '⚡', '🏆', '💯', '🤔', '👀'];

const SENDER_COLORS = [
  'text-emerald-600 dark:text-emerald-400',
  'text-blue-600 dark:text-blue-400',
  'text-purple-600 dark:text-purple-400',
  'text-pink-600 dark:text-pink-400',
  'text-amber-600 dark:text-amber-400',
  'text-teal-600 dark:text-teal-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-rose-600 dark:text-rose-400'
];

function getSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const InstantChatView: React.FC<InstantChatViewProps> = ({
  chatKey,
  currentUser,
  initialMembers,
  initialMessages,
  socket,
  onLeave
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [members, setMembers] = useState<InstantChatMember[]>(initialMembers);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play subtle WhatsApp chime on incoming message
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1050, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (msg: ChatMessage) => {
      if (msg.pin !== chatKey) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (msg.senderId !== currentUser.id) {
        playChime();
      }
    };

    const handleMembersUpdate = (data: { chatKey: string; count: number; members: InstantChatMember[] }) => {
      if (data.chatKey === chatKey && Array.isArray(data.members)) {
        setMembers(data.members);
      }
    };

    socket.on('instant_chat_message_received', handleMessageReceived);
    socket.on('instant_chat_members_update', handleMembersUpdate);

    return () => {
      socket.off('instant_chat_message_received', handleMessageReceived);
      socket.off('instant_chat_members_update', handleMembersUpdate);
    };
  }, [socket, chatKey, currentUser.id, soundEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !socket) return;

    socket.emit('send_instant_chat_message', {
      chatKey,
      text: trimmed,
      senderId: currentUser.id,
      senderNickname: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      senderEmoji: currentUser.emoji
    });

    setInputText('');
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?chatKey=${encodeURIComponent(chatKey)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[620px] max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-[#EFEAE2] dark:bg-[#0B141A] transition-all animate-scale-up">
      {/* WhatsApp Teal Header */}
      <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-[#128C7E] flex items-center justify-center text-xl font-black shrink-0 shadow-inner">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base truncate leading-tight flex items-center gap-1.5">
                <span>WhatsApp Instant Chat</span>
                <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                  <Key className="w-2.5 h-2.5" />
                  {chatKey}
                </span>
              </h2>
            </div>
            <p className="text-xs text-emerald-200/90 truncate flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block animate-pulse" />
              <span>{members.length} {members.length === 1 ? 'user' : 'users'} online</span>
              <span className="text-emerald-400/60">•</span>
              <span className="text-[11px] truncate">You are {currentUser.nickname} {currentUser.emoji}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            title="Copy invitation link with Key"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Key'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
            title={soundEnabled ? 'Mute notification sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
          </button>

          <button
            onClick={onLeave}
            className="p-2 rounded-full hover:bg-rose-500/20 text-rose-200 hover:text-white transition-colors"
            title="Leave Chat Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connected Members Pills Bar */}
      <div className="bg-[#128C7E]/90 dark:bg-[#111B21] px-4 py-2 flex items-center gap-2 overflow-x-auto border-b border-[#075E54]/30 scrollbar-none text-xs">
        <Users className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
        <span className="text-[11px] font-bold text-white/80 shrink-0">Active Members:</span>
        <div className="flex items-center gap-1.5">
          {members.map(m => (
            <span
              key={m.id}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                m.id === currentUser.id
                  ? 'bg-emerald-400 text-slate-950 ring-1 ring-white/50'
                  : 'bg-white/15 text-white'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.nickname}</span>
              {m.id === currentUser.id && <span className="text-[10px] opacity-80">(You)</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Date separator pill */}
        <div className="text-center my-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-[#182229] px-3.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
            Today
          </span>
        </div>

        {/* Security & Key Banner */}
        <div className="bg-amber-50 dark:bg-[#182229] border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-3 text-center text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center justify-center gap-2 shadow-sm">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Instant real-time room for <strong>Key: {chatKey}</strong>. Share this key with anyone to chat instantly!
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="py-14 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
            <MessageCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Welcome to your Instant Chat Room!</p>
            <p className="max-w-xs mx-auto">
              Type a message below or send an emoji reaction. Hit <strong>Enter ↵</strong> on your keyboard to send instantly!
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
                    isMe
                      ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#202C33] text-slate-900 dark:text-white rounded-tl-none border border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  {/* Sender nickname for other people */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 font-bold text-xs">
                      <span>{msg.senderEmoji || '👤'}</span>
                      <span className={getSenderColor(msg.senderNickname)}>
                        {msg.senderNickname}
                      </span>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="leading-relaxed select-text font-medium text-sm">
                    {msg.text}
                  </div>

                  {/* Timestamp & Double Checkmarks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-300 select-none">
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis Drawer */}
      {showEmojiPicker && (
        <div className="bg-white dark:bg-[#202C33] border-t border-slate-200 dark:border-slate-800 p-2.5 flex flex-wrap gap-2 justify-center shadow-inner animate-fade-in">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleAddEmoji(emoji)}
              className="text-2xl p-1.5 hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp Message Input Bar with Instant Enter Key Sending */}
      <form
        onSubmit={handleSendMessage}
        className="bg-[#F0F2F5] dark:bg-[#202C33] p-3 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
          title="Choose reaction emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type a message... (Press Enter to send ↵)"
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white dark:bg-[#111B21] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20BA5C] disabled:opacity-40 disabled:hover:bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md transition-all transform active:scale-95"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
};
