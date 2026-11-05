import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ScreenShare,
  ScreenShareOff,
  Tv
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
  isScreenSharing?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onAcceptCall: () => void;
  onEndCall: () => void;
}

// Copy styles and stylesheets to external floating PiP window
const copyStylesToWindow = (sourceDoc: Document, targetDoc: Document) => {
  // Transfer stylesheet links
  sourceDoc.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const newLink = targetDoc.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.href = (link as HTMLLinkElement).href;
    targetDoc.head.appendChild(newLink);
  });

  // Transfer style tags (including Vite injected CSS)
  sourceDoc.head.querySelectorAll('style').forEach(style => {
    const newStyle = targetDoc.createElement('style');
    newStyle.textContent = style.textContent;
    targetDoc.head.appendChild(newStyle);
  });

  // Transfer CSS rules
  Array.from(sourceDoc.styleSheets).forEach(sheet => {
    try {
      if (sheet.cssRules) {
        const style = targetDoc.createElement('style');
        Array.from(sheet.cssRules).forEach(rule => {
          style.appendChild(targetDoc.createTextNode(rule.cssText));
        });
        targetDoc.head.appendChild(style);
      }
    } catch (e) {
      // Cross-origin styles handled by <link>
    }
  });

  targetDoc.body.style.margin = '0';
  targetDoc.body.style.padding = '0';
  targetDoc.body.style.backgroundColor = '#0b141a';
  targetDoc.body.style.color = '#ffffff';
  targetDoc.body.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  targetDoc.body.style.overflow = 'hidden';
};

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
  isScreenSharing = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onAcceptCall,
  onEndCall
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const miniRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const miniLocalVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const miniRemoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // Bind video streams to video elements whenever streams or modal state changes
  useEffect(() => {
    if (localStream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }
      if (miniLocalVideoRef.current) {
        miniLocalVideoRef.current.srcObject = localStream;
        miniLocalVideoRef.current.play().catch(() => {});
      }
    }
  }, [localStream, isOpen, isVideo, isMinimized]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (miniRemoteVideoRef.current) {
        miniRemoteVideoRef.current.srcObject = remoteStream;
        miniRemoteVideoRef.current.play().catch(() => {});
      }
      // Ensure audio element is also bound and playing so voice calls (and video calls) ALWAYS output audio!
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.warn('Audio playback error:', e));
      }
      if (miniRemoteAudioRef.current) {
        miniRemoteAudioRef.current.srcObject = remoteStream;
        miniRemoteAudioRef.current.play().catch(e => console.warn('Mini audio playback error:', e));
      }
    }
  }, [remoteStream, isOpen, isVideo, callState, isMinimized]);

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

  // Clean up floating window when call closes or ends
  useEffect(() => {
    if (!isOpen || callState === 'idle' || callState === 'ended') {
      if (pipWindow) {
        try {
          pipWindow.close();
        } catch (e) {}
        setPipWindow(null);
      }
    }
  }, [isOpen, callState, pipWindow]);

  useEffect(() => {
    return () => {
      if (pipWindow) {
        try {
          pipWindow.close();
        } catch (e) {}
      }
    };
  }, [pipWindow]);

  // Helper to enter standard HTMLVideoElement PiP
  const enterVideoPiP = async (targetVideo: HTMLVideoElement): Promise<boolean> => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return true;
      }
      if (targetVideo.paused) {
        await targetVideo.play().catch(() => {});
      }
      if (targetVideo.readyState === 0) {
        await new Promise<void>(resolve => {
          const handler = () => {
            targetVideo.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          targetVideo.addEventListener('loadedmetadata', handler);
          setTimeout(resolve, 800);
        });
      }
      await targetVideo.requestPictureInPicture();
      return true;
    } catch (err) {
      console.warn('Standard video PiP failed:', err);
      return false;
    }
  };

  // Trigger floating window outside browser (Document PiP, Video PiP, or Popup fallback)
  const togglePopOut = async () => {
    // If floating PiP window is currently active, close it and return
    if (pipWindow) {
      try {
        pipWindow.close();
      } catch (e) {}
      setPipWindow(null);
      return;
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      return;
    }

    // Tier 1: Modern Document Picture-in-Picture API (Chrome 116+, Edge 116+)
    // Provides full floating always-on-top window with video, caller info, and controls!
    if ('documentPictureInPicture' in window && (window as any).documentPictureInPicture?.requestWindow) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 380,
          height: 520
        });
        copyStylesToWindow(document, pipWin.document);
        pipWin.document.title = `Arena Call - ${remoteName}`;
        pipWin.addEventListener('pagehide', () => {
          setPipWindow(null);
        });
        setPipWindow(pipWin);
        return;
      } catch (err) {
        console.warn('documentPictureInPicture request failed, attempting video fallback:', err);
      }
    }

    // Tier 2: HTMLVideoElement Picture-in-Picture
    // Checks remote stream first, then local stream (so it works even if only 1 user is on camera)
    const targetVideo =
      (remoteStream && remoteVideoRef.current) ||
      (localStream && localVideoRef.current) ||
      miniRemoteVideoRef.current ||
      miniLocalVideoRef.current;

    if (targetVideo && (document.pictureInPictureEnabled || (targetVideo as any).requestPictureInPicture)) {
      const success = await enterVideoPiP(targetVideo);
      if (success) return;
    }

    // Tier 3: Standalone Popup Window Fallback (Firefox, Safari, and other browsers)
    try {
      const popup = window.open(
        '',
        `QuizArenaCall_${Date.now()}`,
        'width=380,height=520,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
      );
      if (popup) {
        copyStylesToWindow(document, popup.document);
        popup.document.title = `Arena Call - ${remoteName}`;
        popup.addEventListener('pagehide', () => {
          setPipWindow(null);
        });
        setPipWindow(popup);
        return;
      }
    } catch (popupErr) {
      console.error('Failed to open popup window:', popupErr);
    }

    alert('Unable to pop out video window. Please enable pop-ups for this site or use Chrome / Edge.');
  };

  if (!isOpen || callState === 'idle') return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- MINIMIZED IN-APP FLOATING MINI WIDGET ---
  if (isMinimized && callState !== 'incoming') {
    return (
      <>
        <div className="fixed bottom-6 left-6 z-50 w-72 sm:w-80 h-48 sm:h-52 rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500 bg-slate-900 group animate-scale-up flex flex-col justify-between">
          {/* Live Video or Avatar Background */}
          <div className="absolute inset-0 z-0">
            {isVideo && (remoteStream || localStream) ? (
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

          {/* Hidden Audio Tag for Guaranteed Audio Playback in Minimized Mode */}
          <audio ref={miniRemoteAudioRef} autoPlay playsInline className="hidden" />

          {/* Mini Local Video PIP */}
          {isVideo && remoteStream && localStream && (
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
              <span className="font-bold text-xs truncate max-w-[100px]">{remoteName}</span>
              <span className="text-[10px] font-mono text-emerald-300">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Pop Out Outside Browser Button */}
              <button
                onClick={togglePopOut}
                className="p-1.5 rounded-full hover:bg-white/20 text-emerald-300 transition-colors"
                title="Pop out video outside browser (Always on top)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Maximize Back to Full Call Modal */}
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Expand call to full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Floating Mini Controls */}
          <div className="relative z-20 p-2 flex items-center justify-center gap-2.5 bg-gradient-to-t from-black/90 to-transparent">
            <button
              onClick={onToggleMute}
              className={`p-2 rounded-full transition-all ${
                isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Screen Share in Mini Card */}
            {isVideo && onToggleScreenShare && (
              <button
                onClick={onToggleScreenShare}
                className={`p-2 rounded-full transition-all ${
                  isScreenSharing
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
              >
                {isScreenSharing ? <ScreenShareOff className="w-3.5 h-3.5" /> : <ScreenShare className="w-3.5 h-3.5" />}
              </button>
            )}

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

        {/* Portal for external floating PiP window if opened from minimized state */}
        {renderFloatingPortal()}
      </>
    );
  }

  // --- FLOATING PiP WINDOW CONTENT (OUTSIDE BROWSER) ---
  function renderFloatingPortal() {
    if (!pipWindow) return null;
    return createPortal(
      <div className="w-screen h-screen flex flex-col justify-between bg-slate-950 text-white select-none relative overflow-hidden font-sans">
        {/* Floating Window Header */}
        <div className="p-3 z-20 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold truncate max-w-[140px] text-emerald-400">
              {remoteName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-300">
              {callState === 'connected' ? formatDuration(duration) : 'Calling...'}
            </span>
            <button
              onClick={() => {
                try {
                  pipWindow.close();
                } catch (e) {}
                setPipWindow(null);
              }}
              className="p-1 rounded-full hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Return to main window"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hidden Audio Tag in Desktop PiP Window */}
        <audio
          ref={el => {
            if (el && remoteStream) {
              el.srcObject = remoteStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          className="hidden"
        />

        {/* Live Video or Avatar Display */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-900">
          {isVideo && (remoteStream || localStream) ? (
            <video
              ref={el => {
                if (el) {
                  el.srcObject = remoteStream || localStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/20 mb-3">
                {remoteEmoji}
              </div>
              <span className="font-bold text-base">{remoteName}</span>
              <span className="text-xs text-emerald-400 font-mono mt-1">
                {callState === 'connected' ? 'Call in progress' : 'Calling...'}
              </span>
            </div>
          )}

          {/* Mini Local Video PIP (if remote video is also available) */}
          {isVideo && remoteStream && localStream && (
            <div className="absolute top-2 right-2 z-10 w-24 h-28 rounded-xl overflow-hidden border-2 border-white/40 shadow-lg bg-black">
              <video
                ref={el => {
                  if (el) {
                    el.srcObject = localStream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[10px] text-white">
                  Off
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Controls Footer */}
        <div className="p-3 z-20 flex items-center justify-center gap-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
          <button
            onClick={onToggleMute}
            className={`p-3 rounded-full transition-all ${
              isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {isVideo && onToggleScreenShare && (
            <button
              onClick={onToggleScreenShare}
              className={`p-3 rounded-full transition-all ${
                isScreenSharing
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
            >
              {isScreenSharing ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => {
              try {
                pipWindow.close();
              } catch (e) {}
              setPipWindow(null);
              onEndCall();
            }}
            className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>

          {isVideo && (
            <button
              onClick={onToggleVideo}
              className={`p-3 rounded-full transition-all ${
                isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>,
      pipWindow.document.body
    );
  }

  // --- FULL CALL SCREEN MODAL ---
  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 animate-fade-in">
        <div className="relative w-full max-w-2xl h-[92vh] sm:h-[580px] sm:max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
          {/* Top Call Header */}
          <div className="p-3 sm:p-4 z-20 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Arena {isVideo ? 'Video' : 'Voice'} Call
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-xs font-mono font-bold text-slate-300">
                {callState === 'connected' ? formatDuration(duration) : callState}
              </div>

              {/* Pop Out Outside Browser Button (with visible badge) */}
              {callState !== 'incoming' && (
                <button
                  onClick={togglePopOut}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors text-xs font-semibold"
                  title="Pop out call outside browser into floating window (Always on top)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pop Out</span>
                </button>
              )}

              {/* Minimize Call to In-App Mini Card */}
              {callState !== 'incoming' && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="Minimize call to corner (continue using app)"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Banner if Call is Currently Popped Out Outside Browser */}
          {pipWindow && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center text-white animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mb-4 animate-pulse shadow-xl shadow-emerald-500/30">
                <ExternalLink className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black mb-1">Call Floating Outside Browser</h3>
              <p className="text-sm text-slate-300 max-w-sm mb-6">
                Your call with <span className="font-bold text-white">{remoteName}</span> is currently popped out in a separate, always-on-top window on your desktop.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    try {
                      pipWindow.close();
                    } catch (e) {}
                    setPipWindow(null);
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Bring Call Back Here</span>
                </button>
                <button
                  onClick={onEndCall}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              </div>
            </div>
          )}

          {/* Video / Call Stage */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            {/* Always-on Audio Element for Remote Audio in Voice and Video Calls */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {isVideo && (remoteStream || (localStream && callState === 'connected')) ? (
              /* Remote Video Stream or Local fallback */
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

            {/* Screen Sharing Indicator */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-emerald-600/90 text-white backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-bold animate-pulse border border-emerald-400/40">
                <ScreenShare className="w-4 h-4 text-white" />
                <span>You are sharing your screen</span>
                {onToggleScreenShare && (
                  <button
                    onClick={onToggleScreenShare}
                    className="ml-1 underline text-emerald-200 hover:text-white"
                  >
                    Stop
                  </button>
                )}
              </div>
            )}

            {/* Picture-in-Picture Local Camera Stream (If Video Mode) */}
            {isVideo && localStream && remoteStream && (
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
          <div className="p-3 sm:p-6 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center gap-2 sm:gap-6">
            {callState === 'incoming' ? (
              /* Incoming Call Controls (Accept / Decline) */
              <div className="flex items-center gap-6 sm:gap-8 animate-bounce">
                <button
                  onClick={onEndCall}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform transform hover:scale-110 active:scale-95"
                  title="Decline Call"
                >
                  <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                <button
                  onClick={onAcceptCall}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform transform hover:scale-110 active:scale-95"
                  title="Accept Call"
                >
                  <Phone className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>
            ) : (
              /* Active / Outgoing Call Controls */
              <>
                {/* Toggle Microphone */}
                <button
                  onClick={onToggleMute}
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                    isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                {/* Share Screen Button */}
                {isVideo && onToggleScreenShare && (
                  <button
                    onClick={onToggleScreenShare}
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                      isScreenSharing
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/40 shadow-lg shadow-emerald-500/30'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
                  >
                    {isScreenSharing ? <ScreenShareOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <ScreenShare className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                )}

                {/* Pop Out Outside Browser Button in Bottom Bar */}
                <button
                  onClick={togglePopOut}
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all shadow-lg"
                  title="Pop out video outside browser (Always on top)"
                >
                  <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* End Call Button */}
                <button
                  onClick={onEndCall}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/50 transition-transform transform hover:scale-110 active:scale-95"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                {/* Toggle Video Camera (If Video mode) */}
                {isVideo && (
                  <button
                    onClick={onToggleVideo}
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                      isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Portal for external floating PiP window */}
      {renderFloatingPortal()}
    </>
  );
};
