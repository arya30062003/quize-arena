import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

export const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());

  const handleToggle = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEffects.playLockIn();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Toggle Sound"
      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
    >
      {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
    </button>
  );
};
