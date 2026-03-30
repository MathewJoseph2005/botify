import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { whatsappAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import FluidOrb from '../components/FluidOrb';

/* ── Starfield ─────────────────────────────────────────────────── */
const Starfield = memo(() => {
  const [stars] = useState(() =>
    Array.from({ length: 120 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 1.8 + 0.4}px`,
      animDelay: `${Math.random() * 5}s`,
      animDur: `${Math.random() * 4 + 2}s`,
      opacity: Math.random() * 0.4 + 0.3,
    }))
  );
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
      {stars.map(s => (
        <div key={s.id} className="absolute bg-white rounded-full animate-twinkle"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size,
            opacity: s.opacity, animationDelay: s.animDelay, animationDuration: s.animDur }} />
      ))}
    </div>
  );
});

const WA_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  @keyframes twinkle { 0%,100%{opacity:0.1;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.1);box-shadow:0 0 8px 1px rgba(255,255,255,0.3)} }
  .animate-twinkle { animation: twinkle ease-in-out infinite; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(25px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.8s cubic-bezier(.16,1,.3,1) both; }
  @keyframes spin-slow { to { transform: rotate(360deg); } }
  .animate-spin-slow { animation: spin-slow 1.2s linear infinite; }
  @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,0.4)} 50%{box-shadow:0 0 0 8px rgba(37,211,102,0)} }
  .pulse-green { animation: pulse-green 2s ease-in-out infinite; }
  .glass-card {
    background: rgba(255,255,255,0.035);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    transition: all 0.4s ease;
  }
  .input-glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.3s ease;
    color: white;
  }
  .input-glass:focus {
    background: rgba(255,255,255,0.08);
    border-color: rgba(37,211,102,0.4);
    box-shadow: 0 0 0 4px rgba(37,211,102,0.05);
    outline: none;
  }
  .input-glass::placeholder { color: rgba(255,255,255,0.12); }
  .wa-glow { text-shadow: 0 0 20px rgba(37,211,102,0.5); }
  .wa-btn {
    background: linear-gradient(135deg, rgba(37,211,102,0.9), rgba(18,140,60,0.95));
    color: white;
    font-weight: 900;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border: none;
    border-radius: 14px;
    transition: all 0.25s ease;
    box-shadow: 0 0 20px rgba(37,211,102,0.15);
    padding: 11px 24px;
    cursor: pointer;
  }
  .wa-btn:hover:not(:disabled) { transform: scale(1.04); box-shadow: 0 0 28px rgba(37,211,102,0.35); }
  .wa-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .drop-zone {
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 16px;
    background: rgba(255,255,255,0.02);
    transition: all 0.3s ease;
    cursor: pointer;
  }
  .drop-zone:hover, .drop-zone.drag-active { border-color: rgba(37,211,102,0.4); background: rgba(37,211,102,0.04); }
  .drop-zone.has-file { border-color: rgba(37,211,102,0.3); background: rgba(37,211,102,0.05); }
  .step-done { background: rgba(37,211,102,0.15); border-color: rgba(37,211,102,0.3); color: #25d366; }
  .step-active { background: rgba(37,211,102,0.08); border-color: rgba(37,211,102,0.2); color: rgba(37,211,102,0.7); }
  .step-pending { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); color: rgba(255,255,255,0.2); }
  .file-pill {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
  }
  .file-pill:hover { border-color: rgba(255,255,255,0.12); }
`;

const INIT_STEPS = [
  { key: 'launching',      label: 'Launching browser' },
  { key: 'qr_ready',       label: 'QR ready'          },
  { key: 'authenticated',  label: 'Authenticated'     },
  { key: 'loading_wa',     label: 'Loading WA'        },
  { key: 'ready',          label: 'Connected'         },
];

const WAITING_FACTS = [
  'WhatsApp Web uses end-to-end encryption just like chats on your phone.',
  'Using country code improves message delivery reliability.',
  'Shorter campaign messages usually get faster replies.',
  'Personalised messages with {{name}} tend to perform better than generic text.',
  'A small delay between messages helps reduce spam detection risk.',
  'Keeping contacts clean and deduplicated improves campaign quality.',
];

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return '🎬';
  if (['mp3','wav','ogg','aac'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📄';
  if (['xlsx','xls','csv'].includes(ext)) return '📊';
  if (['docx','doc'].includes(ext)) return '📝';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return '🗜️';
  return '📎';
};

/* ── Step Indicator ────────────────────────────────────────────── */
const StepIndicator = ({ currentStep }) => {
  const currentIdx = INIT_STEPS.findIndex(s => s.key === currentStep);
  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      {INIT_STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
              done ? 'step-done' : active ? 'step-active' : 'step-pending'
            }`}>
              <span>{done ? '✓' : i + 1}</span>
              <span>{step.label}</span>
            </div>
            {i < INIT_STEPS.length - 1 && (
              <div className={`w-4 h-px ${done ? 'bg-[#25d366]/40' : 'bg-white/5'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const WhatsAppCampaign = () => {
  const { user } = useAuth();

  /* connection / QR */
  const [qrCode, setQrCode]             = useState(null);
  const [waStatus, setWaStatus]         = useState('Not initialized');
  const [waReady, setWaReady]           = useState(false);
  const [waInitializing, setWaInitializing] = useState(false);
  const [initStep, setInitStep]         = useState('');
  const [factIndex, setFactIndex]       = useState(0);
  const qrPollRef     = useRef(null);
  const factIntervalRef = useRef(null);

  /* form */
  const [campaignName, setCampaignName]           = useState('');
  const [messageBody, setMessageBody]             = useState('');
  const [messageAttachment, setMessageAttachment] = useState(null);
  const [excelFile, setExcelFile]                 = useState(null);
  const [attachments, setAttachments]             = useState([]);
  const [dragOver, setDragOver]                   = useState(false);

  /* progress */
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [progress, setProgress]                 = useState(null);
  const progressPollRef = useRef(null);

  /* history */
  const [campaigns, setCampaigns]         = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  /* ui */
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    fetchCampaigns();
    checkStatus();
    return () => {
      clearInterval(qrPollRef.current);
      clearInterval(progressPollRef.current);
      clearInterval(factIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    clearInterval(factIntervalRef.current);
    if (!waInitializing) return;
    setFactIndex(0);
    factIntervalRef.current = setInterval(() => {
      setFactIndex(prev => (prev + 1) % WAITING_FACTS.length);
    }, 3500);
    return () => clearInterval(factIntervalRef.current);
  }, [waInitializing]);

  const checkStatus = async () => {
    try {
      const res = await whatsappAPI.getStatus();
      if (res.data.success) {
        setWaReady(res.data.isReady);
        setWaInitializing(res.data.isInitializing);
        setWaStatus(res.data.status);
        setQrCode(res.data.qrCode || null);
        setInitStep(res.data.initStep || '');
      }
    } catch { /* not yet initialised */ }
  };

  const applyStatusData = (data) => {
    setQrCode(data.qrCode || null);
    setWaReady(data.isReady);
    setWaInitializing(data.isInitializing);
    setWaStatus(data.status);
    setInitStep(data.initStep || '');
  };

  const handleInitWhatsApp = async () => {
    try {
      setResult(null);
      setWaInitializing(true);
      setInitStep('launching');
      setWaStatus('Launching browser…');
      const res = await whatsappAPI.init();
      if (res.data.success) {
        applyStatusData(res.data);
        clearInterval(qrPollRef.current);
        qrPollRef.current = setInterval(async () => {
          try {
            const qrRes = await whatsappAPI.getQR();
            if (qrRes.data.success) {
              applyStatusData(qrRes.data);
              if (qrRes.data.isReady) clearInterval(qrPollRef.current);
            }
          } catch { /* ignore transient */ }
        }, 1500);
      }
    } catch (err) {
      setWaInitializing(false);
      setInitStep('');
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to init WhatsApp.' });
    }
  };

  const handleLogout = async () => {
    try {
      await whatsappAPI.logout();
      setWaReady(false); setWaInitializing(false);
      setQrCode(null); setInitStep('');
      setWaStatus('Disconnected');
      clearInterval(qrPollRef.current);
      setResult({ type: 'success', message: 'WhatsApp session disconnected.' });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to disconnect.' });
    }
  };

  const fetchCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const res = await whatsappAPI.getCampaigns();
      if (res.data.success) setCampaigns(res.data.campaigns);
    } catch { /* silent */ } finally {
      setCampaignsLoading(false);
    }
  };

  const startProgressPolling = useCallback((campaignId) => {
    clearInterval(progressPollRef.current);
    progressPollRef.current = setInterval(async () => {
      try {
        const res = await whatsappAPI.getCampaign(campaignId);
        if (res.data.success) {
          setProgress(res.data.campaign);
          if (['completed','failed'].includes(res.data.campaign.status)) {
            clearInterval(progressPollRef.current);
            setSending(false);
            fetchCampaigns();
          }
        }
      } catch { /* ignore */ }
    }, 2000);
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setExcelFile(file);
  };
  const handleFileSelect           = (e) => { if (e.target.files[0]) setExcelFile(e.target.files[0]); };
  const handleAttachmentSelect     = (e) => { if (e.target.files.length) setAttachments(prev => [...prev, ...Array.from(e.target.files)]); };
  const handleMessageAttachSelect  = (e) => { if (e.target.files[0]) setMessageAttachment(e.target.files[0]); };
  const removeAttachment           = (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const handleSendCampaign = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!messageBody.trim()) return setResult({ type: 'error', message: 'Message body is required.' });
    if (!excelFile)          return setResult({ type: 'error', message: 'Please upload a recipients file.' });
    if (!waReady)            return setResult({ type: 'error', message: 'WhatsApp is not connected. Scan the QR code first.' });

    const formData = new FormData();
    formData.append('excelFile', excelFile);
    attachments.forEach(f => formData.append('attachment', f));
    formData.append('messageBody', messageBody);
    formData.append('campaignName', campaignName || 'Untitled Campaign');

    try {
      setSending(true);
      const res = await whatsappAPI.sendCampaign(formData);
      if (res.data.success) {
        setResult({ type: 'success', message: res.data.message });
        setActiveCampaignId(res.data.campaignId);
        setProgress({ sent_count: 0, failed_count: 0, total_recipients: res.data.totalRecipients, status: 'sending' });
        startProgressPolling(res.data.campaignId);
        setCampaignName(''); setMessageBody(''); setExcelFile(null); setAttachments([]);
      }
    } catch (err) {
      setSending(false);
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to start campaign.' });
    }
  };

  const progressPercent = progress
    ? Math.round(((progress.sent_count + progress.failed_count) / Math.max(progress.total_recipients, 1)) * 100)
    : 0;

  const statusDotColor = {
    completed: 'bg-green-400',
    sending:   'bg-blue-400',
    scheduled: 'bg-purple-400',
    failed:    'bg-red-400',
    pending:   'bg-yellow-400',
  };
  const statusTextColor = {
    completed: 'text-green-400',
    sending:   'text-blue-400',
    scheduled: 'text-purple-400',
    failed:    'text-red-400',
    pending:   'text-yellow-400',
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{WA_STYLES}</style>
      <Starfield />

      {/* Ambient orbs */}
      <div className="absolute top-[-5%] right-[-8%] w-[500px] h-[500px] opacity-[0.07] pointer-events-none"><FluidOrb /></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[380px] h-[380px] opacity-[0.04] pointer-events-none"><FluidOrb /></div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pt-16 relative z-10">

        {/* ── Header ── */}
        <div className="mb-12 fade-up">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mb-3">Botify · WhatsApp Engine</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            WhatsApp <span className="text-[#25d366] wa-glow">Bulk</span> Messaging
          </h1>
          <p className="text-white/30 text-sm max-w-lg leading-relaxed">
            Connect your WhatsApp account, compose a personalised message, upload your contact list and launch campaigns at scale.
          </p>
        </div>

        {/* ── Result Banner ── */}
        {result && (
          <div className={`mb-8 px-6 py-4 rounded-2xl glass-card flex items-center justify-between fade-up ${
            result.type === 'success' ? 'border-green-500/20 bg-green-500/5 text-green-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${result.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ boxShadow: result.type === 'success' ? '0 0 8px rgba(74,222,128,0.5)' : '0 0 8px rgba(248,113,113,0.5)' }} />
              <span className="text-sm font-medium">{result.message}</span>
            </div>
            <button onClick={() => setResult(null)} className="opacity-40 hover:opacity-100 text-lg leading-none transition-opacity ml-4 shrink-0">&times;</button>
          </div>
        )}

        {/* ── Section 1: WhatsApp Connection ── */}
        <section className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-1 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                Session Link
              </h2>
              <p className="text-white/20 text-xs">Connect your WhatsApp account via QR scan</p>
            </div>
            {/* Connection status pill */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
              waReady
                ? 'bg-[#25d366]/10 border-[#25d366]/30 text-[#25d366]'
                : waInitializing
                ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                : 'bg-white/[0.03] border-white/5 text-white/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                waReady ? 'bg-[#25d366] pulse-green' : waInitializing ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'
              }`} />
              {waReady ? 'Connected' : waInitializing ? 'Initializing' : 'Offline'}
            </div>
          </div>

          {/* Step Indicator during init */}
          {waInitializing && <StepIndicator currentStep={initStep} />}

          {/* Waiting fact */}
          {waInitializing && (
            <div className="mb-6 px-5 py-4 rounded-2xl" style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.08)' }}>
              <p className="text-[10px] font-bold text-[#ffd700]/60 uppercase tracking-widest mb-1">Did you know?</p>
              <p className="text-sm text-white/40 leading-relaxed">{WAITING_FACTS[factIndex]}</p>
            </div>
          )}

          {/* Browser launching skeleton */}
          {waInitializing && !qrCode && initStep === 'launching' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-48 h-48 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#25d366]/20 border-t-[#25d366] animate-spin-slow mx-auto mb-3" />
                  <p className="text-xs text-white/30">Starting browser…</p>
                  <p className="text-[10px] text-white/15 mt-1">First launch: 10–20 seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          {!waReady && qrCode && (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Scan with WhatsApp</p>
              <div className="p-3 rounded-2xl" style={{ background: 'white' }}>
                <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg" />
              </div>
              <p className="text-[10px] text-white/25 text-center">
                WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
          )}

          {/* Connected state */}
          {waReady && (
            <div className="flex items-center gap-3 py-4 px-5 rounded-2xl mb-4" style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)' }}>
              <div className="w-2 h-2 rounded-full bg-[#25d366] shrink-0 pulse-green" />
              <div>
                <p className="text-sm font-bold text-[#25d366]">WhatsApp Connected</p>
                <p className="text-xs text-white/30 mt-0.5">Your session is active and ready to send messages</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {!waReady && (
              <button onClick={handleInitWhatsApp} disabled={waInitializing} className="wa-btn">
                {waInitializing
                  ? <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin-slow inline-block" />Initializing…</span>
                  : '⚡ Connect WhatsApp'}
              </button>
            )}
            {(waReady || waInitializing) && (
              <button onClick={handleLogout}
                className="px-6 py-2.5 rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 font-bold text-[10px] uppercase tracking-widest transition-all">
                Disconnect
              </button>
            )}
            {!waReady && !waInitializing && (
              <button onClick={checkStatus}
                className="px-6 py-2.5 rounded-xl border border-white/5 text-white/25 hover:text-white/50 hover:border-white/15 font-bold text-[10px] uppercase tracking-widest transition-all">
                ↻ Check Status
              </button>
            )}
          </div>
        </section>

        {/* ── Section 2: Campaign Form ── */}
        <section className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#25d366]" />
              New Campaign
            </h2>
            <p className="text-white/20 text-xs mt-1">Compose and dispatch your WhatsApp campaign</p>
          </div>

          <form onSubmit={handleSendCampaign} className="space-y-6">

            {/* Campaign Name */}
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Campaign Name</label>
              <input
                type="text" value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. March Promo Blast"
                className="w-full px-5 py-3.5 rounded-xl input-glass text-sm"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                Message Body <span className="text-[#25d366]">*</span>
                <span className="ml-2 text-white/15 normal-case font-normal tracking-normal">use {'{{name}}'} for personalisation</span>
              </label>
              <div className="relative">
                <textarea
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  rows={5}
                  placeholder={`Hi {{name}},\n\nWe have an exciting offer for you!`}
                  className="w-full px-5 py-3.5 pr-14 rounded-xl input-glass text-sm resize-y"
                  required
                />
                {/* Attachment icon */}
                <button
                  type="button"
                  onClick={() => document.getElementById('msg-attach-input').click()}
                  title="Attach file to message"
                  className="absolute bottom-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all text-white/25 hover:text-[#25d366]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input id="msg-attach-input" type="file" onChange={handleMessageAttachSelect} className="hidden" />
              </div>
              <p className="text-[10px] text-white/20 mt-2">Supports *bold*, _italic_, ~strikethrough~ formatting</p>

              {/* Message attachment preview */}
              {messageAttachment && (
                <div className="mt-3 file-pill">
                  <span className="text-xl">{getFileIcon(messageAttachment.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white/70 truncate">{messageAttachment.name}</p>
                    <p className="text-[10px] text-white/25">{(messageAttachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={() => setMessageAttachment(null)}
                    className="text-red-400/40 hover:text-red-400 font-bold text-base transition-colors">×</button>
                </div>
              )}
            </div>

            {/* Additional Attachments */}
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
                Attachments <span className="text-white/15 font-normal tracking-normal normal-case">— optional images / documents</span>
              </label>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Files
                <input type="file" multiple onChange={handleAttachmentSelect} className="hidden" />
              </label>
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="file-pill">
                      <span className="text-base">{getFileIcon(file.name)}</span>
                      <span className="text-xs text-white/50 truncate flex-1">{file.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)}
                        className="text-red-400/40 hover:text-red-400 font-bold text-base transition-colors ml-2">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recipients File – Drag & Drop */}
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
                Recipients File <span className="text-[#25d366]">*</span>
                <span className="ml-2 text-white/15 font-normal tracking-normal normal-case">.xlsx · .xls · .csv</span>
              </label>
              <div
                className={`drop-zone p-8 text-center ${dragOver ? 'drag-active' : excelFile ? 'has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('wa-file-input').click()}
              >
                {excelFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📊</span>
                    <p className="text-sm font-bold text-[#25d366]">{excelFile.name}</p>
                    <p className="text-[11px] text-white/25">{(excelFile.size / 1024).toFixed(1)} KB</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setExcelFile(null); }}
                      className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-colors">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.12)' }}>
                      <svg className="w-5 h-5 text-[#25d366]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-white/50 font-medium">Drag & drop your file here</p>
                      <p className="text-xs text-white/25 mt-1">or click to browse</p>
                    </div>
                    <p className="text-[10px] text-white/15">Must contain <strong className="text-white/30">name</strong> and <strong className="text-white/30">whatsapp_number</strong> columns</p>
                  </div>
                )}
                <input id="wa-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={sending || !waReady} className="wa-btn w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2">
              {sending
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />Dispatching Campaign…</>
                : '📱 Launch Campaign'}
            </button>

            {!waReady && (
              <p className="text-center text-[11px] text-white/25">Connect WhatsApp above before launching a campaign</p>
            )}
          </form>
        </section>

        {/* ── Section 3: Live Progress ── */}
        {progress && (
          <section className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.25s' }}>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              Live Progress
            </h2>

            {/* Progress Bar */}
            <div className="w-full rounded-full h-2 mb-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${progressPercent}%`,
                  background: progress.status === 'completed'
                    ? 'linear-gradient(90deg, #25d366, #1abe5d)'
                    : progress.status === 'failed'
                    ? '#f87171'
                    : 'linear-gradient(90deg, #60a5fa, #818cf8)',
                  boxShadow: progress.status === 'completed' ? '0 0 12px rgba(37,211,102,0.4)' : '0 0 12px rgba(96,165,250,0.3)',
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-white/30 mb-6">
              <span>{progressPercent}% complete</span>
              <span>{progress.sent_count + progress.failed_count} / {progress.total_recipients} contacts</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Sent',  value: progress.sent_count,        color: 'text-green-400',  bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.12)' },
                { label: 'Failed', value: progress.failed_count,     color: 'text-red-400',    bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.12)' },
                { label: 'Total', value: progress.total_recipients,  color: 'text-white/60',   bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)' },
              ].map(s => (
                <div key={s.label} className="p-5 rounded-2xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {progress.status === 'completed' && (
              <p className="mt-5 text-center text-sm font-bold text-[#25d366]">✓ Campaign completed successfully</p>
            )}
            {progress.status === 'failed' && (
              <p className="mt-5 text-center text-sm font-bold text-red-400">✕ Campaign encountered errors</p>
            )}
          </section>
        )}

        {/* ── Section 4: Campaign History ── */}
        <section className="glass-card overflow-hidden fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Campaign History</h2>
              <p className="text-white/20 text-xs mt-1">{campaigns.length} record{campaigns.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={fetchCampaigns} disabled={campaignsLoading}
              className="px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white border border-white/5 hover:border-white/15 transition-all disabled:opacity-40">
              {campaignsLoading ? 'Syncing…' : '↻ Refresh'}
            </button>
          </div>

          {campaignsLoading && campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#25d366]/20 border-t-[#25d366] animate-spin-slow mx-auto mb-3" />
              <p className="text-white/25 text-xs uppercase tracking-widest">Loading records…</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-white/20 text-sm">No campaigns yet. Start your first one above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Campaign', 'Recipients', 'Sent', 'Failed', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {campaigns.map(c => (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-white/80 group-hover:text-white max-w-[180px] truncate">{c.campaign_name}</td>
                      <td className="px-6 py-4 text-sm text-white/40">{c.total_recipients}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-400">{c.sent_count}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-400">{c.failed_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor[c.status] || 'bg-white/20'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${statusTextColor[c.status] || 'text-white/30'}`}>{c.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-white/25">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default WhatsAppCampaign;
