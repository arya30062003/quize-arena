import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  ExternalLink,
  Users
} from 'lucide-react';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface WhatsAppCallModalProps {
  isOpen: boolean;
  isVideo: boolean;
  isCaller: boolean;
  remoteName: string;
  remoteEmoji?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: CallState;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onAcceptCall: () => void;
  onEndCall: () => void;
}

export const WhatsAppCallModal: React.FC<WhatsAppCallModalProps> = ({
  isOpen,
  isVideo,
  isCaller,
  remoteName,
  remoteEmoji = '👤',
  localStream,
  remoteStream,
  callState,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onAcceptCall,
  onEndCall
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const miniRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const miniLocalVideoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Bind video streams to video elements whenever streams or minimized state change
  useEffect(() => {
    if (localStream) {
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      if (miniLocalVideoRef.current) miniLocalVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen, isVideo, isMinimized]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      if (miniRemoteVideoRef.current) miniRemoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isOpen, isVideo, callState, isMinimized]);

  // Keep audio & video continuous when minimizing tab / switching windows
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && callState === 'connected' && isVideo) {
        // Auto-request Picture-in-Picture if user switched away from app and browser supports it
        try {
          const videoEl = remoteVideoRef.current || miniRemoteVideoRef.current;
          if (videoEl && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
            await videoEl.requestPictureInPicture();
          }
        } catch (e) {
          // Ignore if user hasn't interacted or browser blocks auto-PiP
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callState, isVideo]);

  // Trigger Native Picture-in-Picture window (floating outside browser)
  const toggleNativePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        const videoEl = remoteVideoRef.current || miniRemoteVideoRef.current;
        if (videoEl && document.pictureInPictureEnabled) {
          await videoEl.requestPictureInPicture();
        }
      }
    } catch (e) {
      console.warn('Native Picture-in-Picture error:', e);
    }
  };

  // Call duration timer
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      setDuration(0);
      setIsMinimized(false);
    }
    return () => clearInterval(interval);
  }, [callState]);

  if (!isOpen || callState === 'idle') return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- MINIMIZED FLOATING PiP MINI WIDGET ---
  if (isMinimized && callState !== 'incoming') {
    return (
      <div className="fixed bottom-6 left-6 z-50 w-72 sm:w-80 h-48 sm:h-52 rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500 bg-slate-900 group animate-scale-up flex flex-col justify-between">
        {/* Live Video or Avatar Background */}
        <div className="absolute inset-0 z-0">
          {isVideo && callState === 'connected' && remoteStream ? (
            <video
              ref={miniRemoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white">
              <span className="text-4xl mb-1">{remoteEmoji}</span>
              <span className="font-bold text-xs">{remoteName}</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {callState === 'connected' ? formatDuration(duration) : 'Calling...'}
              </span>
            </div>
          )}
        </div>

        {/* Mini Local Video PIP */}
        {isVideo && localStream && (
          <div className="absolute top-2 right-2 z-10 w-20 h-24 rounded-xl overflow-hidden border border-white/40 shadow-lg bg-black">
            <video
              ref={miniLocalVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[9px] text-white">
                Off
              </div>
            )}
          </div>
        )}

        {/* Top Header Overlay in Mini Widget */}
        <div className="relative z-20 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent text-white">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-xs truncate max-w-[110px]">{remoteName}</span>
            <span className="text-[10px] font-mono text-emerald-300">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Native PiP Button (Outside Browser) */}
            {isVideo && (
              <button
                onClick={toggleNativePiP}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Pop out video outside browser (PiP)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Maximize Back to Full Call Modal */}
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
              title="Expand call to full screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Floating Mini Controls (Visible on hover or touch) */}
        <div className="relative z-20 p-2 flex items-center justify-center gap-3 bg-gradient-to-t from-black/90 to-transparent">
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-full transition-all ${
              isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onEndCall}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-transform active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>

          {isVideo && (
            <button
              onClick={onToggleVideo}
              className={`p-2 rounded-full transition-all ${
                isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- FULL CALL SCREEN MODAL ---
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-2xl h-[580px] max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Top Call Header */}
        <div className="p-4 z-20 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              WhatsApp {isVideo ? 'Video' : 'Voice'} Call
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold text-slate-300">
              {callState === 'connected' ? formatDuration(duration) : callState}
            </div>

            {/* Native Picture-in-Picture Button (Floating Outside Browser) */}
            {isVideo && callState === 'connected' && (
              <button
                onClick={toggleNativePiP}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-300 transition-colors"
                title="Pop out video outside browser (PiP)"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Minimize Call Modal Button (Keep Playing in Background) */}
            {callState !== 'incoming' && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
                title="Minimize call (continue playing while using app)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Video / Call Stage */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {isVideo && callState === 'connected' && remoteStream ? (
            /* Remote Video Stream */
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            /* Voice or Connecting Screen */
            <div className="text-center space-y-4 animate-scale-up z-10 px-4">
              <div className="relative mx-auto w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shadow-emerald-500/25">
                <span>{remoteEmoji}</span>
                {callState === 'calling' && (
                  <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-40" />
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {remoteName}
                </h2>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  {callState === 'calling' && 'Ringing...'}
                  {callState === 'incoming' && `Incoming ${isVideo ? 'Video' : 'Voice'} Call...`}
                  {callState === 'connected' && 'Call in progress'}
                  {callState === 'ended' && 'Call Ended'}
                </p>
              </div>
            </div>
          )}

          {/* Picture-in-Picture Local Camera Stream (If Video Mode) */}
          {isVideo && localStream && (
            <div className="absolute top-4 right-4 z-20 w-28 sm:w-36 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-xs font-bold">
                  Camera Off
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Actions */}
        <div className="p-6 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center gap-4 sm:gap-6">
          {callState === 'incoming' ? (
            /* Incoming Call Controls (Accept / Decline) */
            <div className="flex items-center gap-8 animate-bounce">
              <button
                onClick={onEndCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform transform hover:scale-110 active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={onAcceptCall}
                className="w-16 h-16 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform transform hover:scale-110 active:scale-95"
                title="Accept Call"
              >
                <Phone className="w-7 h-7" />
              </button>
            </div>
          ) : (
            /* Active / Outgoing Call Controls */
            <>
              {/* Toggle Microphone */}
              <button
                onClick={onToggleMute}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={onEndCall}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/50 transition-transform transform hover:scale-110 active:scale-95"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* Toggle Video Camera (If Video mode) */}
              {isVideo && (
                <button
                  onClick={onToggleVideo}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                    isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
