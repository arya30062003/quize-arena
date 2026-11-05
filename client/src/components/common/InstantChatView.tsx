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
  Paperclip,
  Mic,
  Square,
  Trash2,
  CornerUpLeft,
  X,
  Phone,
  Video,
  Play,
  Pause,
  Key,
  FileText
} from 'lucide-react';
import { ChatMessage, InstantChatMember } from '../../types';
import { WhatsAppCallModal, CallState } from './WhatsAppCallModal';

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

// Google public STUN servers for WebRTC NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

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

  // Typing indicators state
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

  // Audio Voice Recording state
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
  const remoteCallerSocketIdRef = useRef<string>('');
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef<CallState>('idle');

  // Keep callStateRef synchronized
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play subtle incoming message chime
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

  // Socket listener for chat, typing, and WebRTC calls
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

    const handleTypingUpdate = (data: { senderId: string; senderNickname: string; isTyping: boolean }) => {
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
      // Don't ring self if channel broadcast echoes
      if (data.callerSocketId === socket.id || data.callerId === currentUser.id) return;

      if (callStateRef.current !== 'idle') {
        // Busy
        socket.emit('webrtc_reject_call', {
          targetSocketId: data.callerSocketId,
          callerId: data.callerId,
          reason: 'User is busy on another call.'
        });
        return;
      }

      remoteCallerSocketIdRef.current = data.callerSocketId;
      setRemoteCallerSocketId(data.callerSocketId);
      setRemoteCallerName(data.callerNickname || 'Remote User');
      setRemoteCallerEmoji(data.callerEmoji || '👤');
      setIsVideoCall(data.isVideo);
      setIsCaller(false);
      setCallState('incoming');
      setCallModalOpen(true);

      // Store offer for answering
      (window as any)._pendingOffer = data.offer;
    };

    const handleCallAnswered = async (data: {
      responderId: string;
      responderNickname: string;
      responderSocketId: string;
      answer: any;
    }) => {
      if (data.responderSocketId) {
        remoteCallerSocketIdRef.current = data.responderSocketId;
        setRemoteCallerSocketId(data.responderSocketId);
      }
      if (data.responderNickname) {
        setRemoteCallerName(data.responderNickname);
      }

      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          // Drain and add all queued ICE candidates received before the answer!
          while (iceCandidateQueueRef.current.length > 0) {
            const cand = iceCandidateQueueRef.current.shift();
            if (cand) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.warn('Queued ICE candidate error:', e));
            }
          }

          setCallState('connected');
        } catch (err) {
          console.error('Failed to set remote description on caller:', err);
        }
      }
    };

    const handleIceCandidate = async (data: { candidate: any }) => {
      if (!data.candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('addIceCandidate error:', e);
        }
      } else {
        // Queue candidate to safely apply as soon as remote description is set!
        iceCandidateQueueRef.current.push(data.candidate);
      }
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    const handleCallRejected = (data: { reason: string }) => {
      alert(`Call declined: ${data.reason}`);
      cleanupCall();
    };

    socket.on('instant_chat_message_received', handleMessageReceived);
    socket.on('instant_chat_members_update', handleMembersUpdate);
    socket.on('instant_chat_typing_update', handleTypingUpdate);
    socket.on('webrtc_incoming_call', handleIncomingCall);
    socket.on('webrtc_call_answered', handleCallAnswered);
    socket.on('webrtc_ice_candidate_received', handleIceCandidate);
    socket.on('webrtc_call_ended', handleCallEnded);
    socket.on('webrtc_call_rejected', handleCallRejected);

    return () => {
      socket.off('instant_chat_message_received', handleMessageReceived);
      socket.off('instant_chat_members_update', handleMembersUpdate);
      socket.off('instant_chat_typing_update', handleTypingUpdate);
      socket.off('webrtc_incoming_call', handleIncomingCall);
      socket.off('webrtc_call_answered', handleCallAnswered);
      socket.off('webrtc_ice_candidate_received', handleIceCandidate);
      socket.off('webrtc_call_ended', handleCallEnded);
      socket.off('webrtc_call_rejected', handleCallRejected);
    };
  }, [socket, chatKey, currentUser.id, soundEnabled, callState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

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
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    remoteCallerSocketIdRef.current = '';
    iceCandidateQueueRef.current = [];
    (window as any)._pendingOffer = null;
    setRemoteCallerSocketId('');
    setCallState('idle');
    setCallModalOpen(false);
  };

  // --- Start WebRTC Call (Caller) ---
  const startCall = async (video: boolean) => {
    if (!socket) return;
    try {
      cleanupCall();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: video
      });
      setLocalStream(stream);
      setIsVideoCall(video);
      setIsCaller(true);
      setRemoteCallerName(`Key Room (${chatKey})`);
      setCallState('calling');
      setCallModalOpen(true);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = event => {
        console.log('[WebRTC Caller] ontrack received:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          setRemoteStream(prev => {
            const s = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
            s.addTrack(event.track);
            return s;
          });
        }
      };

      pc.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            channel: `instant:${chatKey}`,
            candidate: event.candidate,
            targetSocketId: remoteCallerSocketIdRef.current || undefined
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_call_user', {
        channel: `instant:${chatKey}`,
        callerId: currentUser.id,
        callerNickname: currentUser.nickname,
        callerEmoji: currentUser.emoji,
        isVideo: video,
        offer
      });
    } catch (err) {
      console.error('Call failed to start:', err);
      alert('Could not access microphone or camera. Please check browser permissions.');
      cleanupCall();
    }
  };

  // --- Accept WebRTC Call (Recipient) ---
  const acceptCall = async () => {
    if (!socket) return;
    try {
      const offer = (window as any)._pendingOffer;
      if (!offer) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideoCall
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = event => {
        console.log('[WebRTC Recipient] ontrack received:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          setRemoteStream(prev => {
            const s = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
            s.addTrack(event.track);
            return s;
          });
        }
      };

      const targetId = remoteCallerSocketIdRef.current || remoteCallerSocketId;

      pc.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            targetSocketId: targetId,
            channel: `instant:${chatKey}`,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush all queued candidates received before user accepted!
      while (iceCandidateQueueRef.current.length > 0) {
        const cand = iceCandidateQueueRef.current.shift();
        if (cand) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.warn('Queued candidate error:', e));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer_call', {
        targetSocketId: targetId,
        responderId: currentUser.id,
        responderNickname: currentUser.nickname,
        answer,
        channel: `instant:${chatKey}`
      });

      setCallState('connected');
    } catch (err) {
      console.error('Failed to accept call:', err);
      alert('Could not access camera/microphone to accept the call.');
      cleanupCall();
    }
  };

  // --- End WebRTC Call ---
  const endCall = () => {
    if (socket) {
      socket.emit('webrtc_end_call', {
        targetSocketId: remoteCallerSocketIdRef.current || remoteCallerSocketId,
        channel: `instant:${chatKey}`
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

    socket.emit('instant_chat_typing_start', {
      chatKey,
      senderId: currentUser.id,
      senderNickname: currentUser.nickname
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('instant_chat_typing_stop', {
        chatKey,
        senderId: currentUser.id
      });
    }, 2000);
  };

  // --- File Upload / Attachment Handler ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 8MB)
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

  // --- Audio Voice Recording (Voice Notes) ---
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

    // Stop typing indicator immediately
    socket.emit('instant_chat_typing_stop', {
      chatKey,
      senderId: currentUser.id
    });

    const payload = {
      chatKey,
      text: trimmed,
      senderId: currentUser.id,
      senderNickname: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      senderEmoji: currentUser.emoji,
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

    socket.emit('send_instant_chat_message', payload);
    setInputText('');
    setPendingMedia(null);
    setReplyingTo(null);
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

  // Typing names array
  const typingNames = Array.from(typingUsers.values());

  return (
    <>
      <div className="w-full max-w-2xl mx-auto h-[640px] max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-[#EFEAE2] dark:bg-[#0B141A] transition-all animate-scale-up">
        {/* WhatsApp Teal Header */}
        <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#128C7E] flex items-center justify-center text-xl font-black shrink-0 shadow-inner">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base truncate leading-tight flex items-center gap-1.5">
                  <span>WhatsApp Chat</span>
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

          {/* Action Controls: Call Buttons, Share, Sound, Leave */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Voice Call Button */}
            <button
              onClick={() => startCall(false)}
              className="p-2 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Video Call Button */}
            <button
              onClick={() => startCall(true)}
              className="p-2 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
              title="Start Video Call"
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Share Key Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              title="Copy invitation link with Key"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full hover:bg-white/10 text-emerald-100 transition-colors"
              title={soundEnabled ? 'Mute chime' : 'Enable chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
            </button>

            <button
              onClick={onLeave}
              className="p-2 rounded-full hover:bg-rose-500/20 text-rose-200 hover:text-white transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connected Members Pills Bar */}
        <div className="bg-[#128C7E]/90 dark:bg-[#111B21] px-4 py-2 flex items-center gap-2 overflow-x-auto border-b border-[#075E54]/30 scrollbar-none text-xs">
          <Users className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
          <span className="text-[11px] font-bold text-white/80 shrink-0">Members:</span>
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

          {/* Key Notice Banner */}
          <div className="bg-amber-50 dark:bg-[#182229] border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-2.5 text-center text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center justify-center gap-2 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Real-time WhatsApp room for <strong>Key: {chatKey}</strong>. Send images, audio, video & calls!</span>
          </div>

          {messages.length === 0 ? (
            <div className="py-14 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Welcome to your Instant Chat Room!</p>
              <p className="max-w-xs mx-auto">
                Send text, voice notes, photos, or start a voice/video call! Press <strong>Enter ↵</strong> to send.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                >
                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
                      isMe
                        ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#202C33] text-slate-900 dark:text-white rounded-tl-none border border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    {/* Reply Action Trigger */}
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition-opacity"
                      title="Reply to message"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Sender nickname for other people */}
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 font-bold text-xs">
                        <span>{msg.senderEmoji || '👤'}</span>
                        <span className={getSenderColor(msg.senderNickname)}>
                          {msg.senderNickname}
                        </span>
                      </div>
                    )}

                    {/* Quoted Reply Card (If this message replies to another message) */}
                    {msg.replyTo && (
                      <div className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border-l-4 border-[#25D366] text-xs">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {msg.replyTo.senderNickname}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 truncate">
                          {msg.replyTo.text}
                        </div>
                      </div>
                    )}

                    {/* Media Attachments Preview */}
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={msg.mediaUrl}
                          alt={msg.mediaName || 'Image'}
                          className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(msg.mediaUrl, '_blank')}
                        />
                      </div>
                    )}

                    {msg.mediaType === 'video' && msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden shadow-sm">
                        <video
                          controls
                          src={msg.mediaUrl}
                          className="w-full max-h-64 object-cover"
                        />
                      </div>
                    )}

                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <div className="mb-2 py-1">
                        <audio controls src={msg.mediaUrl} className="w-full max-w-[260px] h-9" />
                      </div>
                    )}

                    {/* Message text content */}
                    {msg.text && (
                      <div className="leading-relaxed select-text font-medium text-sm">
                        {msg.text}
                      </div>
                    )}

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

          {/* Typing Indicator Bar */}
          {typingNames.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 w-fit text-xs text-slate-600 dark:text-slate-300 animate-pulse">
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

        {/* Replying Banner Above Input */}
        {replyingTo && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-[#1E2A30] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between animate-fade-in text-xs">
            <div className="border-l-4 border-[#25D366] pl-2 min-w-0">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Replying to {replyingTo.senderNickname}
              </span>
              <p className="text-slate-500 dark:text-slate-400 truncate">
                {replyingTo.text || `[${replyingTo.mediaType?.toUpperCase()}]`}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending Media Attachment Preview */}
        {pendingMedia && (
          <div className="p-3 bg-slate-100 dark:bg-[#1E2A30] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              {pendingMedia.type === 'image' && (
                <img src={pendingMedia.dataUrl} alt="preview" className="w-12 h-12 rounded-xl object-cover" />
              )}
              {pendingMedia.type === 'video' && (
                <video src={pendingMedia.dataUrl} className="w-12 h-12 rounded-xl object-cover" />
              )}
              {pendingMedia.type === 'audio' && (
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <Mic className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {pendingMedia.name}
                </span>
                <span className="text-[10px] text-emerald-600 uppercase font-black">
                  Ready to send
                </span>
              </div>
            </div>
            <button
              onClick={() => setPendingMedia(null)}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Reaction Emojis Drawer */}
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

        {/* Input Bar with Attachment, Voice Recorder & Enter Key Send */}
        <div className="bg-[#F0F2F5] dark:bg-[#202C33] p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800">
          {isRecording ? (
            /* Live Audio Recording Bar */
            <div className="flex items-center justify-between gap-3 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-full border border-rose-200 dark:border-rose-900 animate-pulse">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm pl-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                <span>Recording Voice Note... {recordingSeconds}s</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-2 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-600"
                  title="Cancel Recording"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
                  title="Finish & Attach"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Standard Input Bar */
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Media Attachment Paperclip Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
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

              {/* Text Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type message... (Press Enter to send ↵)"
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white dark:bg-[#111B21] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />

              {/* Voice Note Mic Button or Send Button */}
              {!inputText.trim() && !pendingMedia ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-10 h-10 rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white flex items-center justify-center shrink-0 shadow-md transition-all transform active:scale-95"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20BA5C] text-white flex items-center justify-center shrink-0 shadow-md transition-all transform active:scale-95"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              )}
            </form>
          )}
        </div>
      </div>

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
