import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import {
  MessageCircle,
  X,
  Send,
  Smile,
  ChevronLeft,
  Users,
  User,
  CheckCheck,
  Lock,
  Volume2,
  VolumeX,
  Search
} from 'lucide-react';
import { ChatMessage, Participant } from '../../types';

interface WhatsAppChatProps {
  pin: string;
  currentUser: {
    id: string;
    nickname: string;
    avatar?: string;
    emoji?: string;
    isHost?: boolean;
  };
  participants: Participant[];
  socket: Socket | null;
}

const QUICK_EMOJIS = ['😂', '🔥', '👏', '🎉', '🚀', '❤️', '😭', '🤯', '👍', '⚡', '🏆', '💯', '🤔', '👀'];

// Generate consistent WhatsApp-style sender name colors
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
  const index = Math.abs(hash) % SENDER_COLORS.length;
  return SENDER_COLORS[index];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  pin,
  currentUser,
  participants,
  socket
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'group' | 'dm'>('group');
  const [selectedRecipient, setSelectedRecipient] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dmSearch, setDmSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play subtle WhatsApp-like chime for incoming messages
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

  // Socket listener for chat messages and history
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (msg: ChatMessage) => {
      if (msg.pin !== pin) return;

      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Increment unread count and play sound if not sent by me
      if (msg.senderId !== currentUser.id) {
        playChime();
        if (!isOpen) {
          setUnreadCount(c => c + 1);
        }
      }
    };

    const handleChatHistory = (data: { messages: ChatMessage[] }) => {
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    };

    socket.on('chat_message_received', handleMessageReceived);
    socket.on('chat_history', handleChatHistory);

    // Request initial history
    socket.emit('get_chat_history', { pin, participantId: currentUser.id });

    return () => {
      socket.off('chat_message_received', handleMessageReceived);
      socket.off('chat_history', handleChatHistory);
    };
  }, [socket, pin, currentUser.id, isOpen, soundEnabled]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab, selectedRecipient]);

  // Reset unread count when opened
  const toggleOpen = () => {
    if (!isOpen) {
      setUnreadCount(0);
    }
    setIsOpen(!isOpen);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !socket) return;

    const isDirect = activeTab === 'dm' && selectedRecipient !== null;

    const payload = {
      pin,
      senderId: currentUser.id,
      senderNickname: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      senderEmoji: currentUser.emoji,
      text: trimmed,
      recipientId: isDirect ? selectedRecipient?.id : undefined,
      recipientNickname: isDirect ? selectedRecipient?.nickname : undefined
    };

    socket.emit('send_chat_message', payload);
    setInputText('');
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Filter messages for current view
  const currentMessages = messages.filter(msg => {
    if (activeTab === 'group') {
      return !msg.recipientId;
    } else {
      if (!selectedRecipient) return false;
      return (
        (msg.senderId === currentUser.id && msg.recipientId === selectedRecipient.id) ||
        (msg.senderId === selectedRecipient.id && msg.recipientId === currentUser.id)
      );
    }
  });

  // Filter other participants for 1-on-1 DM list
  const availableParticipants = participants.filter(p => p.id !== currentUser.id && p.nickname.toLowerCase().includes(dmSearch.toLowerCase()));

  // Unread DM messages calculation
  const dmMessagesCount = messages.filter(m => m.recipientId === currentUser.id).length;

  return (
    <>
      {/* Floating WhatsApp Action Button */}
      <button
        onClick={toggleOpen}
        aria-label="Open WhatsApp Chat"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold shadow-2xl shadow-emerald-600/40 transform hover:scale-105 active:scale-95 transition-all duration-200 group"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 fill-white stroke-[#25D366]" />
          {unreadCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 bg-rose-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="hidden sm:inline font-heading text-sm font-black tracking-wide">
          WhatsApp Chat
        </span>
      </button>

      {/* WhatsApp Window Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[94vw] sm:w-[400px] h-[560px] max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-[#EFEAE2] dark:bg-[#0B141A] transition-all animate-scale-up">
          {/* WhatsApp Header */}
          <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeTab === 'dm' && selectedRecipient ? (
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  title="Back to participants"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : null}

              {/* Avatar or Group Icon */}
              <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center text-lg font-black shrink-0 shadow-inner">
                {activeTab === 'group' ? (
                  <Users className="w-5 h-5 text-white" />
                ) : selectedRecipient ? (
                  <span>{selectedRecipient.emoji || '👤'}</span>
                ) : (
                  <MessageCircle className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Title & Status */}
              <div className="min-w-0">
                <h3 className="font-bold text-sm truncate leading-tight">
                  {activeTab === 'group'
                    ? `Quiz Lounge (PIN: ${pin})`
                    : selectedRecipient
                    ? selectedRecipient.nickname
                    : 'Direct Messages'}
                </h3>
                <p className="text-[11px] text-emerald-200/90 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block animate-pulse" />
                  {activeTab === 'group'
                    ? `${participants.length} players online`
                    : selectedRecipient
                    ? 'online'
                    : 'Select a player to chat privately'}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-emerald-100"
                title={soundEnabled ? 'Mute notification sounds' : 'Enable sounds'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-emerald-100"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* WhatsApp Navigation Tabs (Lounge vs Direct Messages) */}
          <div className="bg-[#128C7E] dark:bg-[#111B21] flex border-b border-[#075E54]/30 text-xs font-bold text-white/80">
            <button
              onClick={() => {
                setActiveTab('group');
                setSelectedRecipient(null);
              }}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'group'
                  ? 'border-white text-white bg-white/10'
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Room Lounge</span>
            </button>
            <button
              onClick={() => setActiveTab('dm')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all relative ${
                activeTab === 'dm'
                  ? 'border-white text-white bg-white/10'
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Private DMs</span>
              {dmMessagesCount > 0 && (
                <span className="bg-[#25D366] text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                  {dmMessagesCount}
                </span>
              )}
            </button>
          </div>

          {/* View Body */}
          {activeTab === 'dm' && !selectedRecipient ? (
            /* DM Participant Selector Screen */
            <div className="flex-1 flex flex-col bg-white dark:bg-[#111B21] overflow-hidden">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={dmSearch}
                    onChange={e => setDmSearch(e.target.value)}
                    placeholder="Search participant..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#202C33] text-slate-900 dark:text-white border-none focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                {availableParticipants.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {participants.length <= 1
                      ? 'Waiting for other participants to join the lobby...'
                      : 'No participants matched your search.'}
                  </div>
                ) : (
                  availableParticipants.map(participant => {
                    const lastMsg = messages
                      .filter(
                        m =>
                          (m.senderId === currentUser.id && m.recipientId === participant.id) ||
                          (m.senderId === participant.id && m.recipientId === currentUser.id)
                      )
                      .slice(-1)[0];

                    return (
                      <button
                        key={participant.id}
                        onClick={() => setSelectedRecipient(participant)}
                        className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#202C33] rounded-2xl transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-xl shrink-0">
                            {participant.emoji || '👤'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {participant.nickname}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                              {lastMsg ? (
                                <span>{lastMsg.text}</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tap to start private chat</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {lastMsg && (
                            <span className="text-[10px] text-slate-400">
                              {formatTime(lastMsg.timestamp)}
                            </span>
                          )}
                          <div className="w-2 h-2 rounded-full bg-emerald-500 ml-auto mt-1" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* WhatsApp Chat Conversation Messages */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Message scroll container with WhatsApp warm background */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {/* Date separator pill */}
                <div className="text-center my-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-[#182229] px-3 py-1 rounded-full shadow-sm uppercase tracking-wider">
                    Today
                  </span>
                </div>

                {/* Privacy Banner */}
                {activeTab === 'dm' && selectedRecipient && (
                  <div className="bg-amber-50 dark:bg-[#182229] border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2.5 text-center text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center justify-center gap-1.5 shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Private 1-on-1 chat with {selectedRecipient.nickname}. Only you two can see these messages.</span>
                  </div>
                )}

                {currentMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
                    <MessageCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No messages yet!</p>
                    <p>Say hi or react to the quiz questions! 👋</p>
                  </div>
                ) : (
                  currentMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                      >
                        <div
                          className={`relative max-w-[82%] px-3.5 py-2 rounded-2xl shadow-sm text-sm break-words ${
                            isMe
                              ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-white rounded-tr-none'
                              : 'bg-white dark:bg-[#202C33] text-slate-900 dark:text-white rounded-tl-none border border-slate-200/60 dark:border-slate-800'
                          }`}
                        >
                          {/* Sender name for received messages in group */}
                          {!isMe && (
                            <div className="flex items-center gap-1.5 mb-1 font-bold text-xs">
                              <span>{msg.senderEmoji || '👤'}</span>
                              <span className={getSenderColor(msg.senderNickname)}>
                                {msg.senderNickname}
                              </span>
                            </div>
                          )}

                          {/* Message Text */}
                          <div className="leading-relaxed select-text font-medium">
                            {msg.text}
                          </div>

                          {/* Timestamp & Double Checkmarks */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-300 select-none">
                            <span>{formatTime(msg.timestamp)}</span>
                            {isMe && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Emojis Tray */}
              {showEmojiPicker && (
                <div className="bg-white dark:bg-[#202C33] border-t border-slate-200 dark:border-slate-800 p-2 flex flex-wrap gap-1.5 justify-center shadow-inner animate-fade-in">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleAddEmoji(emoji)}
                      className="text-xl p-1.5 hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* WhatsApp Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="bg-[#F0F2F5] dark:bg-[#202C33] p-2.5 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
                  title="Emoji reactions"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={
                    activeTab === 'group'
                      ? 'Message everyone...'
                      : selectedRecipient
                      ? `Message ${selectedRecipient.nickname}...`
                      : 'Type a message...'
                  }
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white dark:bg-[#111B21] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20BA5C] disabled:opacity-40 disabled:hover:bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md transition-all transform active:scale-95"
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};
