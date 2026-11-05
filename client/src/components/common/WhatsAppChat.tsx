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
  Search,
  Paperclip,
  Mic,
  Trash2,
  CornerUpLeft,
  Phone,
  Video
} from 'lucide-react';
import { ChatMessage, Participant } from '../../types';
import { WhatsAppCallModal, CallState } from './WhatsAppCallModal';

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

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

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

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<any>(null);

  // Replying state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Media Attachment state
  const [pendingMedia, setPendingMedia] = useState<{
    dataUrl: string;
    type: 'image' | 'audio' | 'video';
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // WebRTC Calling state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteCallerName, setRemoteCallerName] = useState('');
  const [remoteCallerEmoji, setRemoteCallerEmoji] = useState('👤');
  const [remoteCallerSocketId, setRemoteCallerSocketId] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subtle WhatsApp message chime
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
      if (msg.pin !== pin) return;

      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

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

    const handleTypingUpdate = (data: { senderId: string; senderNickname: string; isTyping: boolean; recipientId?: string }) => {
      if (data.senderId === currentUser.id) return;
      setTypingUsers(prev => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.senderId, data.senderNickname);
        } else {
          next.delete(data.senderId);
        }
        return next;
      });
    };

    // --- WebRTC Incoming Signaling ---
    const handleIncomingCall = (data: {
      callerId: string;
      callerNickname: string;
      callerEmoji?: string;
      callerSocketId: string;
      isVideo: boolean;
      offer: any;
      channel: string;
    }) => {
      if (callState !== 'idle') {
        socket.emit('webrtc_reject_call', {
          targetSocketId: data.callerSocketId,
          callerId: data.callerId,
          reason: 'User is busy.'
        });
        return;
      }

      setRemoteCallerName(data.callerNickname);
      setRemoteCallerEmoji(data.callerEmoji || '👤');
      setRemoteCallerSocketId(data.callerSocketId);
      setIsVideoCall(data.isVideo);
      setIsCaller(false);
      setCallState('incoming');
      setCallModalOpen(true);

      (window as any)._pendingOffer = data.offer;
    };

    const handleCallAnswered = async (data: { answer: any }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState('connected');
      }
    };

    const handleIceCandidate = async (data: { candidate: any }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      }
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    const handleCallRejected = (data: { reason: string }) => {
      alert(`Call declined: ${data.reason}`);
      cleanupCall();
    };

    socket.on('chat_message_received', handleMessageReceived);
    socket.on('chat_history', handleChatHistory);
    socket.on('chat_typing_update', handleTypingUpdate);
    socket.on('webrtc_incoming_call', handleIncomingCall);
    socket.on('webrtc_call_answered', handleCallAnswered);
    socket.on('webrtc_ice_candidate_received', handleIceCandidate);
    socket.on('webrtc_call_ended', handleCallEnded);
    socket.on('webrtc_call_rejected', handleCallRejected);

    socket.emit('get_chat_history', { pin, participantId: currentUser.id });

    return () => {
      socket.off('chat_message_received', handleMessageReceived);
      socket.off('chat_history', handleChatHistory);
      socket.off('chat_typing_update', handleTypingUpdate);
      socket.off('webrtc_incoming_call', handleIncomingCall);
      socket.off('webrtc_call_answered', handleCallAnswered);
      socket.off('webrtc_ice_candidate_received', handleIceCandidate);
      socket.off('webrtc_call_ended', handleCallEnded);
      socket.off('webrtc_call_rejected', handleCallRejected);
    };
  }, [socket, pin, currentUser.id, isOpen, soundEnabled, callState]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab, selectedRecipient, typingUsers]);

  const toggleOpen = () => {
    if (!isOpen) {
      setUnreadCount(0);
    }
    setIsOpen(!isOpen);
  };

  // Clean up WebRTC active call
  const cleanupCall = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    originalCameraTrackRef.current = null;
    setIsScreenSharing(false);

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop());
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    (window as any)._pendingOffer = null;
    setCallState('idle');
    setCallModalOpen(false);
  };

  // --- Start WebRTC Call ---
  const startCall = async (video: boolean) => {
    if (!socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video
      });
      setLocalStream(stream);
      setIsVideoCall(video);
      setIsCaller(true);
      setRemoteCallerName(selectedRecipient ? selectedRecipient.nickname : `Room (${pin})`);
      setCallState('calling');
      setCallModalOpen(true);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const inboundStream = new MediaStream();
      setRemoteStream(inboundStream);
      pc.ontrack = event => {
        event.streams[0]?.getTracks().forEach(track => inboundStream.addTrack(track));
      };

      pc.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            channel: `quiz:${pin}`,
            candidate: event.candidate,
            targetSocketId: selectedRecipient ? (selectedRecipient as any).socketId : undefined
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_call_user', {
        channel: `quiz:${pin}`,
        callerId: currentUser.id,
        callerNickname: currentUser.nickname,
        callerEmoji: currentUser.emoji,
        recipientId: selectedRecipient ? selectedRecipient.id : undefined,
        isVideo: video,
        offer
      });
    } catch (err) {
      alert('Could not access microphone or camera. Please check browser permissions.');
      cleanupCall();
    }
  };

  // --- Accept WebRTC Call ---
  const acceptCall = async () => {
    if (!socket) return;
    try {
      const offer = (window as any)._pendingOffer;
      if (!offer) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const inboundStream = new MediaStream();
      setRemoteStream(inboundStream);
      pc.ontrack = event => {
        event.streams[0]?.getTracks().forEach(track => inboundStream.addTrack(track));
      };

      pc.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            targetSocketId: remoteCallerSocketId,
            channel: `quiz:${pin}`,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer_call', {
        targetSocketId: remoteCallerSocketId,
        responderId: currentUser.id,
        responderNickname: currentUser.nickname,
        answer,
        channel: `quiz:${pin}`
      });

      setCallState('connected');
    } catch (err) {
      alert('Could not access camera/microphone to accept the call.');
      cleanupCall();
    }
  };

  const endCall = () => {
    if (socket) {
      socket.emit('webrtc_end_call', {
        targetSocketId: remoteCallerSocketId,
        channel: `quiz:${pin}`
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = screenStream;

      // Preserve current webcam video track if available
      if (localStream) {
        const currentCamTrack = localStream.getVideoTracks()[0];
        if (currentCamTrack) {
          originalCameraTrackRef.current = currentCamTrack;
        }
      }

      // Replace track on WebRTC sender seamlessly
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      // Listen for browser native "Stop sharing" action
      screenTrack.onended = () => {
        stopScreenShare();
      };

      // Update local stream preview with screen track
      if (localStream) {
        const oldTracks = localStream.getVideoTracks();
        oldTracks.forEach(t => localStream.removeTrack(t));
        localStream.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStream.getTracks()));
      }

      setIsScreenSharing(true);
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  };

  const stopScreenShare = async () => {
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }

      let cameraTrack = originalCameraTrackRef.current;
      if (!cameraTrack || cameraTrack.readyState === 'ended') {
        try {
          const newCamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          cameraTrack = newCamStream.getVideoTracks()[0];
          originalCameraTrackRef.current = cameraTrack;
        } catch (e) {
          console.warn('Could not re-acquire camera track:', e);
        }
      }

      if (cameraTrack && peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }

      if (localStream && cameraTrack) {
        const screenTracks = localStream.getVideoTracks();
        screenTracks.forEach(t => localStream.removeTrack(t));
        localStream.addTrack(cameraTrack);
        setLocalStream(new MediaStream(localStream.getTracks()));
      }

      setIsScreenSharing(false);
    } catch (err) {
      console.error('Error stopping screen share:', err);
      setIsScreenSharing(false);
    }
  };

  // --- Typing handler with debounce ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket) return;

    socket.emit('chat_typing_start', {
      pin,
      senderId: currentUser.id,
      senderNickname: currentUser.nickname,
      recipientId: selectedRecipient ? selectedRecipient.id : undefined
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat_typing_stop', {
        pin,
        senderId: currentUser.id,
        recipientId: selectedRecipient ? selectedRecipient.id : undefined
      });
    }, 2000);
  };

  // --- File Upload / Attachment Handler ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit. Please select a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let type: 'image' | 'audio' | 'video' = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      setPendingMedia({
        dataUrl: reader.result as string,
        type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --- Voice Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPendingMedia({
            dataUrl: reader.result as string,
            type: 'audio',
            name: `Voice_Note_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // --- Send Message ---
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingMedia) || !socket) return;

    const isDirect = activeTab === 'dm' && selectedRecipient !== null;

    socket.emit('chat_typing_stop', {
      pin,
      senderId: currentUser.id,
      recipientId: isDirect ? selectedRecipient?.id : undefined
    });

    const payload = {
      pin,
      senderId: currentUser.id,
      senderNickname: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      senderEmoji: currentUser.emoji,
      text: trimmed,
      recipientId: isDirect ? selectedRecipient?.id : undefined,
      recipientNickname: isDirect ? selectedRecipient?.nickname : undefined,
      mediaType: pendingMedia?.type,
      mediaUrl: pendingMedia?.dataUrl,
      mediaName: pendingMedia?.name,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderNickname: replyingTo.senderNickname,
            text: replyingTo.text || (replyingTo.mediaType ? `[${replyingTo.mediaType.toUpperCase()}]` : ''),
            mediaType: replyingTo.mediaType
          }
        : undefined
    };

    socket.emit('send_chat_message', payload);
    setInputText('');
    setPendingMedia(null);
    setReplyingTo(null);
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

  const availableParticipants = participants.filter(
    p => p.id !== currentUser.id && p.nickname.toLowerCase().includes(dmSearch.toLowerCase())
  );
  const dmMessagesCount = messages.filter(m => m.recipientId === currentUser.id).length;
  const typingNames = Array.from(typingUsers.values());

  return (
    <>
      {/* Floating WhatsApp Action Button */}
      <button
        onClick={toggleOpen}
        aria-label="Open WhatsApp Chat"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold shadow-2xl shadow-emerald-600/40 transform hover:scale-105 active:scale-95 transition-all duration-200 group"
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
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 w-[94vw] sm:w-[420px] h-[600px] max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-[#EFEAE2] dark:bg-[#0B141A] transition-all animate-scale-up">
          {/* WhatsApp Header */}
          <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeTab === 'dm' && selectedRecipient ? (
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : null}

              <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center text-lg font-black shrink-0 shadow-inner">
                {activeTab === 'group' ? (
                  <Users className="w-5 h-5 text-white" />
                ) : selectedRecipient ? (
                  <span>{selectedRecipient.emoji || '👤'}</span>
                ) : (
                  <MessageCircle className="w-5 h-5 text-white" />
                )}
              </div>

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

            {/* Calling & Controls Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => startCall(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={() => startCall(true)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
                title={soundEnabled ? 'Mute chime' : 'Enable chime'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* WhatsApp Navigation Tabs */}
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
            /* Contact Selector View */
            <div className="flex-1 flex flex-col bg-white dark:bg-[#111B21] overflow-hidden">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={dmSearch}
                    onChange={e => setDmSearch(e.target.value)}
                    placeholder="Search player..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#202C33] text-slate-900 dark:text-white border-none focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                {availableParticipants.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {participants.length <= 1
                      ? 'Waiting for other players to join...'
                      : 'No players match search.'}
                  </div>
                ) : (
                  availableParticipants.map(participant => (
                    <button
                      key={participant.id}
                      onClick={() => setSelectedRecipient(participant)}
                      className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#202C33] rounded-2xl transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-xl shrink-0">
                          {participant.emoji || '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {participant.nickname}
                          </div>
                          <div className="text-xs text-slate-400 truncate">Tap to chat privately</div>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Chat Conversation */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                <div className="text-center my-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-[#182229] px-3 py-1 rounded-full shadow-sm uppercase tracking-wider">
                    Today
                  </span>
                </div>

                {activeTab === 'dm' && selectedRecipient && (
                  <div className="bg-amber-50 dark:bg-[#182229] border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2.5 text-center text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center justify-center gap-1.5 shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Private 1-on-1 with {selectedRecipient.nickname}. Only you two can see these messages.</span>
                  </div>
                )}

                {currentMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
                    <MessageCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No messages yet!</p>
                    <p>Send text, voice notes, photos, or start a call! 👋</p>
                  </div>
                ) : (
                  currentMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                      >
                        <div
                          className={`relative max-w-[82%] px-3.5 py-2 rounded-2xl shadow-sm text-sm break-words ${
                            isMe
                              ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-white rounded-tr-none'
                              : 'bg-white dark:bg-[#202C33] text-slate-900 dark:text-white rounded-tl-none border border-slate-200/60 dark:border-slate-800'
                          }`}
                        >
                          {/* Reply trigger button */}
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition-opacity"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-3 h-3" />
                          </button>

                          {!isMe && (
                            <div className="flex items-center gap-1.5 mb-1 font-bold text-xs">
                              <span>{msg.senderEmoji || '👤'}</span>
                              <span className={getSenderColor(msg.senderNickname)}>
                                {msg.senderNickname}
                              </span>
                            </div>
                          )}

                          {/* Quoted Reply Card */}
                          {msg.replyTo && (
                            <div className="mb-2 p-1.5 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-[#25D366] text-xs">
                              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                {msg.replyTo.senderNickname}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 truncate">
                                {msg.replyTo.text}
                              </div>
                            </div>
                          )}

                          {/* Media Rendering */}
                          {msg.mediaType === 'image' && msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden">
                              <img
                                src={msg.mediaUrl}
                                alt="Shared"
                                className="w-full max-h-52 object-cover cursor-pointer"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            </div>
                          )}

                          {msg.mediaType === 'video' && msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden">
                              <video controls src={msg.mediaUrl} className="w-full max-h-52 object-cover" />
                            </div>
                          )}

                          {msg.mediaType === 'audio' && msg.mediaUrl && (
                            <div className="mb-2 py-0.5">
                              <audio controls src={msg.mediaUrl} className="w-full max-w-[220px] h-8" />
                            </div>
                          )}

                          {msg.text && (
                            <div className="leading-relaxed select-text font-medium">
                              {msg.text}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-300 select-none">
                            <span>{formatTime(msg.timestamp)}</span>
                            {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {typingNames.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 w-fit text-xs text-slate-600 dark:text-slate-300 animate-pulse">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {typingNames.join(', ')}
                    </span>
                    <span>is typing</span>
                    <span className="flex gap-1 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-200" />
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Replying Banner */}
              {replyingTo && (
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#1E2A30] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="border-l-4 border-[#25D366] pl-2 min-w-0">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Replying to {replyingTo.senderNickname}
                    </span>
                    <p className="text-slate-500 truncate">
                      {replyingTo.text || `[${replyingTo.mediaType?.toUpperCase()}]`}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pending Media Preview */}
              {pendingMedia && (
                <div className="p-2.5 bg-slate-100 dark:bg-[#1E2A30] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {pendingMedia.type === 'image' && (
                      <img src={pendingMedia.dataUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    {pendingMedia.type === 'video' && (
                      <video src={pendingMedia.dataUrl} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    {pendingMedia.type === 'audio' && (
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Mic className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 text-xs">
                      <span className="font-bold block truncate">{pendingMedia.name}</span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">Ready to send</span>
                    </div>
                  </div>
                  <button onClick={() => setPendingMedia(null)} className="p-1 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Emojis Drawer */}
              {showEmojiPicker && (
                <div className="bg-white dark:bg-[#202C33] border-t border-slate-200 dark:border-slate-800 p-2 flex flex-wrap gap-1.5 justify-center">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleAddEmoji(emoji)}
                      className="text-xl p-1 hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Input Bar */}
              <div className="bg-[#F0F2F5] dark:bg-[#202C33] p-2 border-t border-slate-200 dark:border-slate-800">
                {isRecording ? (
                  <div className="flex items-center justify-between gap-2 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-full border border-rose-200 animate-pulse text-xs">
                    <span className="text-rose-600 font-bold pl-1">Recording... {recordingSeconds}s</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={cancelRecording} className="p-1.5 text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-3 py-1 bg-rose-600 text-white font-bold rounded-full text-xs shadow-sm"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
                      title="Attach Image, Audio or Video"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Type a message... (Enter ↵)"
                      className="flex-1 px-3.5 py-2 text-xs rounded-full bg-white dark:bg-[#111B21] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                    />

                    {!inputText.trim() && !pendingMedia ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-9 h-9 rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white flex items-center justify-center shrink-0 shadow-sm"
                        title="Hold/Tap to record voice"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20BA5C] text-white flex items-center justify-center shrink-0 shadow-md"
                        title="Send"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WebRTC Audio & Video Calling Modal */}
      <WhatsAppCallModal
        isOpen={callModalOpen}
        isVideo={isVideoCall}
        isCaller={isCaller}
        remoteName={remoteCallerName}
        remoteEmoji={remoteCallerEmoji}
        localStream={localStream}
        remoteStream={remoteStream}
        callState={callState}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onAcceptCall={acceptCall}
        onEndCall={endCall}
      />
    </>
  );
};
