import React, { useState } from 'react';
import {
  X,
  Github,
  Mail,
  ExternalLink,
  Code2,
  Briefcase,
  Sparkles,
  Award,
  CheckCircle2,
  Camera,
  Heart,
  Globe,
  Terminal,
  Cpu,
  Layers,
  Database
} from 'lucide-react';

interface DeveloperPortfolioProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PHOTO = 'https://github.com/arya30062003.png';

export const DeveloperPortfolio: React.FC<DeveloperPortfolioProps> = ({ isOpen, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState(() => {
    return localStorage.getItem('developer_photo_url') || DEFAULT_PHOTO;
  });
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');

  if (!isOpen) return null;

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInputUrl.trim()) {
      setPhotoUrl(customInputUrl.trim());
      localStorage.setItem('developer_photo_url', customInputUrl.trim());
      setIsEditingPhoto(false);
      setCustomInputUrl('');
    }
  };

  const handleResetPhoto = () => {
    setPhotoUrl(DEFAULT_PHOTO);
    localStorage.removeItem('developer_photo_url');
    setIsEditingPhoto(false);
  };

  const skills = [
    { name: 'React 18 & TypeScript', category: 'Frontend', level: '95%' },
    { name: 'Node.js & Express', category: 'Backend', level: '90%' },
    { name: 'Socket.IO & WebSockets', category: 'Real-Time', level: '95%' },
    { name: 'Tailwind CSS & UI/UX', category: 'Design', level: '92%' },
    { name: 'Firebase & Firestore', category: 'Database', level: '88%' },
    { name: 'Docker & Render CI/CD', category: 'DevOps', level: '85%' },
  ];

  const projects = [
    {
      title: 'Quiz Arena - Real-Time Competition Platform',
      desc: 'High-concurrency multiplayer quiz arena featuring live synchronized countdowns, anti-cheat server timestamping, Web Audio synthesizer, and instant podium celebrations.',
      tags: ['React', 'TypeScript', 'Socket.IO', 'Tailwind', 'Node.js'],
      icon: '🏆',
      status: 'Live & Scalable'
    },
    {
      title: 'WhatsApp Real-Time Chat & Key Messaging',
      desc: 'Authentic WhatsApp messenger with room lounge group chats, 1-on-1 private direct messaging, secret Chat Keys, double blue ticks, quick emoji reactions, and audio chimes.',
      tags: ['WebSockets', 'WhatsApp UI', 'Real-Time', 'Audio API'],
      icon: '💬',
      status: 'Production Feature'
    },
    {
      title: 'Anti-Cheat Engine & Scoring Engine',
      desc: 'Sub-millisecond latency speed-scoring algorithm with atomic submission locks, zero premature answer leakage, and browser refresh recovery.',
      tags: ['TypeScript', 'Algorithms', 'Security', 'State Machine'],
      icon: '⚡',
      status: 'Core Architecture'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-scale-up my-auto">
        {/* Top Decorative Gradient Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30" />
          
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition-all transform hover:scale-110 active:scale-95"
            title="Close portfolio"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 right-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Available for Hire & Projects
            </span>
          </div>
        </div>

        {/* Profile Card Header with Photo */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-6 text-center sm:text-left">
            {/* Developer Photo Container */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-slate-800">
                <img
                  src={photoUrl}
                  alt="Aryan Kewte"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback to avatar if external image fails
                    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=AryanKewte';
                  }}
                />
              </div>

              {/* Verified Badge */}
              <div 
                className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-md"
                title="Verified Creator & Developer"
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>

              {/* Photo edit trigger */}
              <button
                onClick={() => setIsEditingPhoto(!isEditingPhoto)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                title="Change Photo URL"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Developer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
                  Aryan Kewte
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Lead Developer
                </span>
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">
                Full-Stack Developer & Real-Time Web Specialist
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>India • Building scalable interactive web platforms</span>
              </p>
            </div>

            {/* Social / Contact Links */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://github.com/arya30062003"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 text-xs font-bold transition-all transform hover:scale-105 shadow-md"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href="mailto:aryankewte@gmail.com"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all transform hover:scale-105 shadow-md shadow-indigo-500/20"
              >
                <Mail className="w-4 h-4" />
                <span>Contact</span>
              </a>
            </div>
          </div>

          {/* Photo URL Customizer Modal Dropdown */}
          {isEditingPhoto && (
            <form onSubmit={handleSavePhoto} className="mb-6 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 animate-fade-in space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Update Developer Photo URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customInputUrl}
                  onChange={(e) => setCustomInputUrl(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleResetPhoto}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-300 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          )}

          {/* About Bio Section */}
          <div className="mb-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>About Developer</span>
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Hello! I'm <strong>Aryan Kewte</strong>, an enthusiastic Full-Stack Developer passionate about crafting modern, real-time web experiences. I architected and developed <strong>Quiz Arena</strong> from the ground up, implementing high-concurrency WebSocket state synchronization, anti-cheat validation, responsive gamified UIs, and full-featured instant WhatsApp messaging with secret keys.
            </p>
          </div>

          {/* Technical Skills Grid */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>Core Tech Stack</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {skills.map((skill) => (
                <div
                  key={skill.name}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span>{skill.name}</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400">{skill.level}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                      style={{ width: skill.level }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Highlights */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-500" />
              <span>Key Innovations in Quiz Arena</span>
            </h3>
            <div className="space-y-2.5">
              {projects.map((proj) => (
                <div
                  key={proj.title}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {proj.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {proj.title}
                        </h4>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 shrink-0">
                          {proj.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {proj.desc}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {proj.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
              <span>by <strong>Aryan Kewte</strong></span>
            </div>

            <div className="flex items-center gap-3 font-semibold">
              <a
                href="https://github.com/arya30062003/quize-arena"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
              >
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
