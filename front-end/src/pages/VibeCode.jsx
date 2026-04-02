import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/* ── Inline Styles ──────────────────────────────────────────────────────── */
const VIBE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap');

  @keyframes vibeGlow {
    0%, 100% { box-shadow: 0 0 30px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.05); }
    50% { box-shadow: 0 0 50px rgba(139,92,246,0.3), 0 0 100px rgba(139,92,246,0.1); }
  }
  .vibe-glow { animation: vibeGlow 3s ease-in-out infinite; }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .gradient-shift {
    background: linear-gradient(135deg, #8b5cf6, #06b6d4, #f59e0b, #8b5cf6);
    background-size: 300% 300%;
    animation: gradientShift 6s ease infinite;
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
  .pulse-ring::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    border: 2px solid rgba(139,92,246,0.4);
    animation: pulse-ring 2s ease-out infinite;
  }

  @keyframes typewriter {
    from { width: 0; }
    to { width: 100%; }
  }

  @keyframes blink-caret {
    from, to { border-color: transparent; }
    50% { border-color: #8b5cf6; }
  }

  .code-block {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
    tab-size: 2;
  }

  .code-block::-webkit-scrollbar { width: 6px; height: 6px; }
  .code-block::-webkit-scrollbar-track { background: transparent; }
  .code-block::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
  .code-block::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }

  @keyframes slideInFromRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .slide-in-right { animation: slideInFromRight 0.4s ease-out forwards; }

  @keyframes shimmer {
    from { background-position: -200px 0; }
    to { background-position: calc(200px + 100%) 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.08) 50%, transparent 100%);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .step-dot {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .feature-chip {
    transition: all 0.2s ease;
  }
  .feature-chip:hover {
    transform: translateY(-1px);
  }
`;

/* ── Platform configs ──────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    gradient: 'from-indigo-600 to-purple-600',
    color: '#5865F2',
    description: 'Server automation, moderation & commands',
    languages: ['javascript', 'python'],
    features: [
      { id: 'moderation', label: 'Moderation', icon: '🛡️' },
      { id: 'music', label: 'Music Player', icon: '🎵' },
      { id: 'logging', label: 'Server Logging', icon: '📝' },
      { id: 'custom-commands', label: 'Custom Commands', icon: '⚡' },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    gradient: 'from-sky-500 to-blue-600',
    color: '#0088cc',
    description: 'Commands, inline keyboards & handlers',
    languages: ['javascript', 'python'],
    features: [
      { id: 'polls', label: 'Polls', icon: '📊' },
      { id: 'reminders', label: 'Reminders', icon: '⏰' },
      { id: 'inline-keyboards', label: 'Inline Keyboards', icon: '🎹' },
      { id: 'file-uploads', label: 'File Uploads', icon: '📁' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    gradient: 'from-green-500 to-emerald-600',
    color: '#25D366',
    description: 'Messaging automation & support',
    languages: ['javascript'],
    features: [
      { id: 'auto-reply', label: 'Auto Reply', icon: '💬' },
      { id: 'media-support', label: 'Media Support', icon: '🖼️' },
      { id: 'group-management', label: 'Group Management', icon: '👥' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💼',
    gradient: 'from-purple-500 to-pink-600',
    color: '#4A154B',
    description: 'Workspace automation & integration',
    languages: ['javascript'],
    features: [
      { id: 'slash-commands', label: 'Slash Commands', icon: '/' },
      { id: 'message-posting', label: 'Message Posting', icon: '📤' },
      { id: 'event-handling', label: 'Event Handling', icon: '⚡' },
    ],
  },
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    gradient: 'from-amber-500 to-orange-600',
    color: '#F59E0B',
    description: 'Automated email sending & processing',
    languages: ['javascript', 'python'],
    features: [
      { id: 'smtp', label: 'SMTP', icon: '📮' },
      { id: 'templates', label: 'Templates', icon: '📄' },
      { id: 'auto-reply', label: 'Auto Reply', icon: '↩️' },
      { id: 'bulk-send', label: 'Bulk Send', icon: '📨' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    gradient: 'from-pink-500 to-rose-600',
    color: '#E4405F',
    description: 'DM automation & engagement',
    languages: ['javascript'],
    features: [
      { id: 'auto-reply', label: 'Auto Reply', icon: '💬' },
      { id: 'dm-automation', label: 'DM Automation', icon: '✉️' },
      { id: 'story-interactions', label: 'Story Interactions', icon: '📖' },
    ],
  },
];

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', icon: '🟨', ext: '.js' },
  { id: 'python', name: 'Python', icon: '🐍', ext: '.py' },
];

/* ── File Icon Helper ──────────────────────────────────────────────────── */
function getFileIcon(path) {
  if (path.endsWith('.js')) return '🟨';
  if (path.endsWith('.py')) return '🐍';
  if (path.endsWith('.json')) return '📦';
  if (path.endsWith('.md')) return '📖';
  if (path.endsWith('.env') || path.includes('.env')) return '🔐';
  if (path.endsWith('.txt')) return '📄';
  if (path.endsWith('.gitignore')) return '🚫';
  return '📄';
}

/* ── Syntax Highlight Helper (basic) ──────────────────────────────────── */
function highlightCode(code, filename) {
  if (!code) return '';
  
  // HTML-escape first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const isJS = filename?.endsWith('.js') || filename?.endsWith('.json');
  const isPy = filename?.endsWith('.py');
  const isMd = filename?.endsWith('.md');
  const isEnv = filename?.includes('.env');

  if (isEnv) {
    escaped = escaped.replace(/(#.*)/g, '<span style="color:#6b7280">$1</span>');
    escaped = escaped.replace(/^([A-Z_]+)(=)/gm, '<span style="color:#c084fc">$1</span><span style="color:#fbbf24">$2</span>');
    return escaped;
  }

  if (isMd) {
    escaped = escaped.replace(/^(#{1,3}\s.+)$/gm, '<span style="color:#c084fc;font-weight:bold">$1</span>');
    escaped = escaped.replace(/`([^`]+)`/g, '<span style="color:#fbbf24">`$1`</span>');
    escaped = escaped.replace(/^(\s*[-*]\s)/gm, '<span style="color:#06b6d4">$1</span>');
    return escaped;
  }

  if (isJS) {
    // Strings
    escaped = escaped.replace(/(&#39;[^&#]*(?:&#39;)?|'[^']*')/g, '<span style="color:#a5f3fc">$1</span>');
    escaped = escaped.replace(/(&quot;[^&]*(?:&quot;)?|"[^"]*")/g, '<span style="color:#a5f3fc">$1</span>');
    escaped = escaped.replace(/(`[^`]*`)/g, '<span style="color:#a5f3fc">$1</span>');
    // Keywords
    escaped = escaped.replace(/\b(const|let|var|function|return|if|else|for|while|async|await|try|catch|require|import|export|from|module|new|class|extends|this|throw|switch|case|break|default)\b/g,
      '<span style="color:#c084fc">$1</span>');
    // Comments
    escaped = escaped.replace(/(\/\/.*)/g, '<span style="color:#6b7280">$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span style="color:#fbbf24">$1</span>');
    return escaped;
  }

  if (isPy) {
    // Strings
    escaped = escaped.replace(/(&#39;[^&#]*(?:&#39;)?|'[^']*')/g, '<span style="color:#a5f3fc">$1</span>');
    escaped = escaped.replace(/(&quot;[^&]*(?:&quot;)?|"[^"]*")/g, '<span style="color:#a5f3fc">$1</span>');
    // Keywords
    escaped = escaped.replace(/\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|async|await|yield|raise|pass|break|continue|and|or|not|in|is|None|True|False|self|print)\b/g,
      '<span style="color:#c084fc">$1</span>');
    // Comments
    escaped = escaped.replace(/(#.*)/g, '<span style="color:#6b7280">$1</span>');
    // Decorators
    escaped = escaped.replace(/(@\w+)/g, '<span style="color:#fbbf24">$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span style="color:#fbbf24">$1</span>');
    return escaped;
  }

  return escaped;
}

/* ══════════════════════════════════════════════════════════════════════════ */
const VibeCode = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard state
  const [step, setStep] = useState(1); // 1=Describe, 2=Configure, 3=Generate, 4=Result
  const [botName, setBotName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState(null);
  const [language, setLanguage] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(0);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const textareaRef = useRef(null);

  // Reset language when platform changes
  useEffect(() => {
    if (platform) {
      const p = PLATFORMS.find(pl => pl.id === platform);
      if (p && !p.languages.includes(language)) {
        setLanguage(p.languages[0]);
      }
      setSelectedFeatures([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const toggleFeature = (featureId) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const canProceedStep1 = botName.trim().length >= 2 && description.trim().length >= 10;
  const canProceedStep2 = platform && language;

  /* ── Generate Bot Code ────────────────────────────────────────────────── */
  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await api.post('/vibecode/generate', {
        botName: botName.trim(),
        description: description.trim(),
        platform,
        language,
        structure: 'monorepo',
        features: selectedFeatures,
      });

      if (response.data.success) {
        setGeneratedFiles(response.data.files);
        setSelectedFile(0);
        setStep(4);
      } else {
        setError(response.data.message || 'Failed to generate bot code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ── Copy to clipboard ────────────────────────────────────────────────── */
  const copyToClipboard = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch {
      setCopySuccess('Failed');
    }
  }, []);

  /* ── Download all files ───────────────────────────────────────────────── */
  const downloadAll = useCallback(() => {
    generatedFiles.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.path.split('/').pop();
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [generatedFiles]);

  const currentPlatform = PLATFORMS.find(p => p.id === platform);

  const steps = [
    { num: 1, label: 'Describe' },
    { num: 2, label: 'Configure' },
    { num: 3, label: 'Generate' },
    { num: 4, label: 'Code' },
  ];

  return (
    <>
      <style>{VIBE_STYLES}</style>

      <div className="min-h-screen bg-[#030303] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* ── Hero Header ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
            <div className="absolute top-20 right-1/4 w-[400px] h-[400px] opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)' }} />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
            {/* Badge */}
            <div className="flex justify-center mb-6 fade-in-up">
              <div className="px-4 py-2 rounded-full border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400">
                  ✨ Vibe Code Studio
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-center text-4xl md:text-6xl font-black tracking-tight mb-4 fade-in-up"
              style={{ animationDelay: '0.1s' }}>
              Describe your bot.{' '}
              <span className="bg-clip-text text-transparent gradient-shift">
                We build it.
              </span>
            </h1>
            <p className="text-center text-white/40 text-sm md:text-base max-w-2xl mx-auto mb-10 fade-in-up"
              style={{ animationDelay: '0.2s' }}>
              Tell us what you want, pick your platform and features, and get production-ready bot code instantly.
              No AI API key needed — just pure vibes.
            </p>

            {/* ── Progress Steps ────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-12 fade-in-up"
              style={{ animationDelay: '0.3s' }}>
              {steps.map((s, i) => (
                <React.Fragment key={s.num}>
                  {i > 0 && (
                    <div className={`w-8 sm:w-16 h-px transition-colors duration-500 ${
                      step >= s.num ? 'bg-purple-500' : 'bg-white/10'
                    }`} />
                  )}
                  <button
                    onClick={() => {
                      if (s.num < step) setStep(s.num);
                    }}
                    disabled={s.num > step}
                    className={`step-dot relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      step === s.num
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
                        : step > s.num
                        ? 'bg-white/[0.04] text-white/60 border border-white/10 cursor-pointer hover:bg-white/[0.08]'
                        : 'bg-white/[0.02] text-white/20 border border-white/5 cursor-default'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      step > s.num
                        ? 'bg-purple-500 text-white'
                        : step === s.num
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'bg-white/10 text-white/30'
                    }`}>
                      {step > s.num ? '✓' : s.num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 fade-in-up">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 1: DESCRIBE */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto fade-in-up">
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-xl">
                      💡
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Describe Your Bot</h2>
                      <p className="text-xs text-white/40">Give your bot a name and tell us what it should do</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Bot Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      Bot Name
                    </label>
                    <input
                      id="vibe-bot-name"
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="e.g. HelperBot, GuildGuard, SalesEngine..."
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-all"
                      maxLength={40}
                    />
                    <p className="mt-1 text-[11px] text-white/30">{botName.length}/40 characters</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      What should your bot do?
                    </label>
                    <textarea
                      id="vibe-bot-description"
                      ref={textareaRef}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your bot's purpose in natural language... e.g. 'A Discord bot that moderates my server, has custom welcome messages, and can play music in voice channels'"
                      rows={5}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/20 text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-all"
                      maxLength={500}
                    />
                    <p className="mt-1 text-[11px] text-white/30">{description.length}/500 characters</p>
                  </div>

                  {/* Prompt suggestions */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/30 mb-3">
                      Need inspiration? Try these:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'A moderation bot for my Discord server',
                        'A Telegram bot that sends reminders',
                        'A WhatsApp customer support bot',
                        'An email bot for marketing campaigns',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            setDescription(prompt);
                            if (!botName) {
                              const words = prompt.split(' ');
                              setBotName(words.slice(1, 3).join(' ').replace(/[^a-zA-Z\s]/g, '') + ' Bot');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] text-white/40 bg-white/[0.03] border border-white/[0.06] hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/20 transition-all"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 sm:p-8 border-t border-white/[0.06] flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                      canProceedStep1
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                    }`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 2: CONFIGURE */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="max-w-4xl mx-auto fade-in-up">
              {/* Platform Selection */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-1">Choose Your Platform</h2>
                <p className="text-sm text-white/40 mb-6">Select where your bot will live</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`relative p-5 rounded-2xl border text-left transition-all duration-300 group overflow-hidden ${
                        platform === p.id
                          ? 'border-purple-500/40 bg-purple-500/[0.08] shadow-lg shadow-purple-500/10'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                      }`}
                    >
                      {/* Selected indicator */}
                      {platform === p.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <span className="text-[10px] text-white font-black">✓</span>
                        </div>
                      )}
                      <div className="text-3xl mb-3">{p.icon}</div>
                      <h3 className={`text-sm font-bold mb-1 transition-colors ${
                        platform === p.id ? 'text-purple-300' : 'text-white/80'
                      }`}>{p.name}</h3>
                      <p className="text-[11px] text-white/30 leading-relaxed">{p.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              {platform && (
                <div className="mb-8 slide-in-right">
                  <h2 className="text-xl font-bold mb-1">Choose Language</h2>
                  <p className="text-sm text-white/40 mb-6">Pick your preferred programming language</p>

                  <div className="flex gap-3">
                    {LANGUAGES.filter(l => currentPlatform?.languages.includes(l.id)).map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLanguage(l.id)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${
                          language === l.id
                            ? 'border-purple-500/40 bg-purple-500/[0.08] text-purple-300 shadow-lg shadow-purple-500/10'
                            : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.04] hover:border-white/10'
                        }`}
                      >
                        <span className="text-2xl">{l.icon}</span>
                        <span className="font-bold text-sm">{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {platform && language && (
                <div className="mb-8 slide-in-right" style={{ animationDelay: '0.1s' }}>
                  <h2 className="text-xl font-bold mb-1">Select Features</h2>
                  <p className="text-sm text-white/40 mb-6">Choose what capabilities your bot should have</p>

                  <div className="flex flex-wrap gap-2">
                    {currentPlatform?.features.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => toggleFeature(f.id)}
                        className={`feature-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          selectedFeatures.includes(f.id)
                            ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm shadow-purple-500/10'
                            : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.05] hover:text-white/70'
                        }`}
                      >
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                        {selectedFeatures.includes(f.id) && (
                          <span className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center ml-1">
                            <span className="text-[8px] text-white font-black">✓</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary & Generate */}
              {canProceedStep2 && (
                <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 slide-in-right"
                  style={{ animationDelay: '0.2s' }}>
                  <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Bot</p>
                      <p className="text-sm font-bold text-white/90">{botName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Platform</p>
                      <p className="text-sm font-bold text-white/90">{currentPlatform?.icon} {currentPlatform?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Language</p>
                      <p className="text-sm font-bold text-white/90">
                        {LANGUAGES.find(l => l.id === language)?.icon} {LANGUAGES.find(l => l.id === language)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Features</p>
                      <p className="text-sm font-bold text-white/90">
                        {selectedFeatures.length > 0 ? selectedFeatures.length : 'Base'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-3 rounded-xl text-sm font-medium text-white/50 border border-white/10 hover:bg-white/[0.04] transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => { setStep(3); handleGenerate(); }}
                      className="flex-1 sm:flex-none px-8 py-3 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      🚀 Generate My Bot
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 3: GENERATING (Loading) */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 3 && generating && (
            <div className="max-w-lg mx-auto text-center py-24 fade-in-up">
              {/* Animated orb */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full gradient-shift opacity-20 blur-xl" />
                <div className="absolute inset-4 rounded-full bg-purple-500/10 border border-purple-500/30 vibe-glow flex items-center justify-center">
                  <span className="text-4xl" style={{ animation: 'float 2s ease-in-out infinite' }}>
                    {currentPlatform?.icon || '🤖'}
                  </span>
                </div>
                {/* Spinning ring */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
              </div>

              <h2 className="text-2xl font-bold mb-3">Generating Your Bot...</h2>
              <p className="text-sm text-white/40 mb-8">
                Crafting production-ready code for your {currentPlatform?.name} bot
              </p>

              {/* Progress indicators */}
              <div className="space-y-3 text-left max-w-xs mx-auto">
                {['Analyzing requirements', 'Building file structure', 'Writing source code', 'Adding configurations'].map((label, i) => (
                  <div key={i} className="flex items-center gap-3 fade-in-up" style={{ animationDelay: `${i * 0.3}s` }}>
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    </div>
                    <span className="text-sm text-white/50">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 4: RESULT (Code View) */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 4 && generatedFiles.length > 0 && (
            <div className="fade-in-up">
              {/* Header bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    <span className="text-purple-400">{currentPlatform?.icon}</span> {botName}
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    {generatedFiles.length} files generated • {LANGUAGES.find(l => l.id === language)?.name} • {currentPlatform?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setStep(2); setGeneratedFiles([]); }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/50 border border-white/10 hover:bg-white/[0.04] transition-all"
                  >
                    ← Reconfigure
                  </button>
                  <button
                    onClick={downloadAll}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    ⬇️ Download All
                  </button>
                </div>
              </div>

              {/* IDE-like layout */}
              <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0a0a0f]" style={{ minHeight: '600px' }}>
                <div className="flex flex-col lg:flex-row h-full" style={{ minHeight: '600px' }}>

                  {/* File Explorer (sidebar) */}
                  <div className="lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-white/[0.01]">
                    <div className="p-3 border-b border-white/[0.06]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Explorer</p>
                    </div>
                    <div className="p-2 overflow-y-auto" style={{ maxHeight: '560px' }}>
                      {generatedFiles.map((file, idx) => {
                        const parts = file.path.split('/');
                        const fileName = parts[parts.length - 1];
                        const indent = parts.length - 1;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedFile(idx)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-[12px] ${
                              selectedFile === idx
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70 border border-transparent'
                            }`}
                            style={{ paddingLeft: `${12 + indent * 12}px` }}
                          >
                            <span className="text-sm flex-shrink-0">{getFileIcon(fileName)}</span>
                            <span className="truncate font-medium">{fileName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Code View (main) */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Tab bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getFileIcon(generatedFiles[selectedFile]?.path)}</span>
                        <span className="text-xs font-medium text-white/70">
                          {generatedFiles[selectedFile]?.path}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedFiles[selectedFile]?.content, generatedFiles[selectedFile]?.path)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.07] transition-all flex items-center gap-1.5"
                      >
                        {copySuccess === generatedFiles[selectedFile]?.path ? (
                          <>
                            <span className="text-green-400">✓</span> Copied!
                          </>
                        ) : (
                          <>
                            📋 Copy
                          </>
                        )}
                      </button>
                    </div>

                    {/* Code content */}
                    <div className="flex-1 overflow-auto p-0">
                      <pre className="code-block p-4 overflow-x-auto">
                        <code>
                          {generatedFiles[selectedFile]?.content.split('\n').map((line, lineNum) => (
                            <div key={lineNum} className="flex hover:bg-white/[0.02] -mx-4 px-4">
                              <span className="w-10 flex-shrink-0 text-right pr-4 text-white/15 select-none text-[12px]">
                                {lineNum + 1}
                              </span>
                              <span
                                className="flex-1 text-white/80"
                                dangerouslySetInnerHTML={{
                                  __html: highlightCode(line, generatedFiles[selectedFile]?.path) || ' ',
                                }}
                              />
                            </div>
                          ))}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  🚀 Quick Start
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-sm mb-3">1</div>
                    <h4 className="text-sm font-bold mb-1">Download Files</h4>
                    <p className="text-xs text-white/40">Click "Download All" to get your bot files</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-sm mb-3">2</div>
                    <h4 className="text-sm font-bold mb-1">Configure</h4>
                    <p className="text-xs text-white/40">Copy <code className="text-purple-400">.env.example</code> to <code className="text-purple-400">.env</code> and add your tokens</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-sm mb-3">3</div>
                    <h4 className="text-sm font-bold mb-1">Run</h4>
                    <p className="text-xs text-white/40">
                      {language === 'javascript' ? (
                        <>Run <code className="text-purple-400">npm install</code> then <code className="text-purple-400">npm start</code></>
                      ) : (
                        <>Run <code className="text-purple-400">pip install -r requirements.txt</code> then <code className="text-purple-400">python bot.py</code></>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* New Bot button */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setStep(1);
                    setBotName('');
                    setDescription('');
                    setPlatform(null);
                    setLanguage(null);
                    setSelectedFeatures([]);
                    setGeneratedFiles([]);
                    setSelectedFile(0);
                  }}
                  className="px-6 py-3 rounded-xl text-sm font-medium text-white/40 border border-white/10 hover:bg-white/[0.04] hover:text-white/70 transition-all"
                >
                  + Create Another Bot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VibeCode;
