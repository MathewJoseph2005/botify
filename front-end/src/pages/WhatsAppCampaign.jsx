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

  const [qrCode, setQrCode]             = useState(null);
  const [waStatus, setWaStatus]         = useState('Not initialized');
  const [waReady, setWaReady]           = useState(false);
  const [waInitializing, setWaInitializing] = useState(false);
  const [initStep, setInitStep]         = useState('');
  const [factIndex, setFactIndex]       = useState(0);
  const qrPollRef     = useRef(null);
  const factIntervalRef = useRef(null);

  const [campaignName, setCampaignName]           = useState('');
  const [messageBody, setMessageBody]             = useState('');
  const [messageAttachment, setMessageAttachment] = useState(null);
  const [excelFile, setExcelFile]                 = useState(null);
  const [attachments, setAttachments]             = useState([]);
  const [dragOver, setDragOver]                   = useState(false);
  const [campaignMode, setCampaignMode]           = useState('file'); 
  const [manualRecipients, setManualRecipients]   = useState([{ name: '', phone: '' }]);

  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [progress, setProgress]                 = useState(null);
  const progressPollRef = useRef(null);

  const [campaigns, setCampaigns]         = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

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
    } catch { /* ignored */ }
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
          } catch { /* ignore */ }
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
    
    if (campaignMode === 'file') {
      if (!excelFile) return setResult({ type: 'error', message: 'Please upload a recipients file.' });
    } else {
      if (manualRecipients.length === 0 || manualRecipients.some(r => !r.phone || !r.name)) {
        return setResult({ type: 'error', message: 'Please enter valid manual recipients.' });
      }
    }
    
    if (!waReady) return setResult({ type: 'error', message: 'WhatsApp not connected.' });

    const formData = new FormData();
    formData.append('messageBody', messageBody);
    formData.append('campaignName', campaignName || 'WhatsApp Campaign');
    
    if (campaignMode === 'file') {
      formData.append('excelFile', excelFile);
    } else {
      formData.append('manualRecipients', JSON.stringify(manualRecipients));
    }

    if (messageAttachment) formData.append('messageAttachment', messageAttachment);
    attachments.forEach(f => formData.append('attachment', f));

    try {
      setSending(true);
      const res = await whatsappAPI.sendCampaign(formData);
      if (res.data.success) {
        setResult({ type: 'success', message: res.data.message });
        setActiveCampaignId(res.data.campaignId);
        setProgress({ sent_count: 0, failed_count: 0, total_recipients: res.data.totalRecipients || 1, status: 'sending' });
        startProgressPolling(res.data.campaignId);
        setCampaignName(''); setMessageBody(''); setExcelFile(null); setAttachments([]); setMessageAttachment(null);
        setManualRecipients([{ name: '', phone: '' }]);
      }
    } catch (err) {
      setSending(false);
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to start campaign.' });
    }
  };

  const progressPercent = progress ? Math.round(((progress.sent_count + progress.failed_count) / Math.max(progress.total_recipients, 1)) * 100) : 0;

  const statusDotColor = { completed: 'bg-green-400', sending: 'bg-blue-400', scheduled: 'bg-purple-400', failed: 'bg-red-400', pending: 'bg-yellow-400' };
  const statusTextColor = { completed: 'text-green-400', sending: 'text-blue-400', scheduled: 'text-purple-400', failed: 'text-red-400', pending: 'text-yellow-400' };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{WA_STYLES}</style>
      <Starfield />

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pt-16 relative z-10">
        <div className="mb-12 fade-up">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mb-3">Botify · WhatsApp Engine</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">WhatsApp <span className="text-[#25d366] wa-glow">Bulk</span> Messaging</h1>
          <p className="text-white/30 text-sm max-w-lg leading-relaxed">Connect, compose, and dispatch intelligent campaigns at global scale.</p>
        </div>

        {result && (
          <div className={`mb-8 px-6 py-4 rounded-2xl glass-card flex items-center justify-between fade-up ${
            result.type === 'success' ? 'border-green-500/20 bg-green-500/5 text-green-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
             <div className="flex items-center gap-3">
               <div className={`w-1.5 h-1.5 rounded-full ${result.type === 'success' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
               <span className="text-sm font-medium">{result.message}</span>
             </div>
             <button onClick={() => setResult(null)} className="opacity-40 hover:opacity-100">&times;</button>
          </div>
        )}

        <section className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Session Link</h2>
              <p className="text-white/20 text-[10px] uppercase tracking-widest">Linked Terminal Status</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${waReady ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/5 text-white/20'}`}>
              {waReady ? 'Ready' : 'Offline'}
            </div>
          </div>

          {waInitializing && <StepIndicator currentStep={initStep} />}
          {waInitializing && (
             <div className="mb-6 p-4 rounded-xl bg-[#25d366]/5 border border-[#25d366]/10">
               <p className="text-[9px] font-bold text-[#25d366]/60 uppercase tracking-widest mb-1">Grid Log</p>
               <p className="text-xs text-white/40 italic">{WAITING_FACTS[factIndex]}</p>
             </div>
          )}

          {!waReady && qrCode && (
            <div className="flex flex-col items-center gap-4 py-6">
               <div className="p-3 bg-white rounded-2xl">
                 <img src={qrCode} alt="QR" className="w-52 h-52 rounded-lg" />
               </div>
               <p className="text-[10px] text-white/20 uppercase tracking-widest">Scan to synchronise terminal</p>
            </div>
          )}

          <div className="flex gap-3">
             {!waReady && (
               <button onClick={handleInitWhatsApp} disabled={waInitializing} className="wa-btn">
                 {waInitializing ? 'Linking...' : 'Connect WhatsApp'}
               </button>
             )}
             {(waReady || waInitializing) && (
               <button onClick={handleLogout} className="px-6 py-2 rounded-xl border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest">Disconnect</button>
             )}
          </div>
        </section>

        <section className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSendCampaign} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                 <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Campaign Designation</label>
                 <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Nexus Protocol V1" className="w-full px-5 py-3 rounded-xl input-glass text-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Transmission Mode</label>
                  <div className="flex gap-2 p-1 rounded-xl bg-black/20 w-fit">
                    <button type="button" onClick={() => setCampaignMode('file')} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${campaignMode === 'file' ? 'bg-[#25d366] text-white' : 'text-white/30'}`}>File</button>
                    <button type="button" onClick={() => setCampaignMode('manual')} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${campaignMode === 'manual' ? 'bg-[#25d366] text-white' : 'text-white/30'}`}>Manual</button>
                  </div>
               </div>
            </div>

            <div>
               <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Neural Message Content</label>
               <div className="relative">
                 <textarea required rows={5} value={messageBody} onChange={e => setMessageBody(e.target.value)} placeholder="Define intelligence parameters..." className="w-full px-5 py-4 rounded-2xl input-glass text-sm" />
                 <button type="button" onClick={() => document.getElementById('msg-file').click()} className="absolute bottom-3 right-3 p-2 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-[#25d366]">📎</button>
                 <input id="msg-file" type="file" onChange={handleMessageAttachSelect} className="hidden" />
               </div>
               {messageAttachment && <p className="text-[9px] text-[#25d366] mt-2 uppercase font-bold tracking-widest">✓ {messageAttachment.name}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Recipient Intelligence</label>
              {campaignMode === 'file' ? (
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop} onClick={() => document.getElementById('main-file').click()}
                  className={`drop-zone p-10 text-center ${dragOver ? 'drag-active' : ''}`}>
                   {excelFile ? (
                     <p className="text-[#25d366] font-bold text-sm uppercase tracking-widest">✓ {excelFile.name}</p>
                   ) : (
                     <div className="opacity-30">
                        <p className="text-sm font-bold uppercase tracking-tighter mb-1">Drop Manifest Here</p>
                        <p className="text-[9px] uppercase tracking-widest">Excel / CSV with name & phone</p>
                     </div>
                   )}
                   <input id="main-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                </div>
              ) : (
                <div className="space-y-3">
                   <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {manualRecipients.map((r, i) => (
                        <div key={i} className="flex gap-2">
                           <input type="text" placeholder="Name" value={r.name} onChange={e => { const n = [...manualRecipients]; n[i].name = e.target.value; setManualRecipients(n); }} className="flex-1 px-4 py-2 rounded-xl input-glass text-xs" />
                           <input type="tel" placeholder="Phone" value={r.phone} onChange={e => { const n = [...manualRecipients]; n[i].phone = e.target.value; setManualRecipients(n); }} className="flex-1 px-4 py-2 rounded-xl input-glass text-xs" />
                           <button type="button" onClick={() => setManualRecipients(manualRecipients.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">&times;</button>
                        </div>
                      ))}
                   </div>
                   <button type="button" onClick={() => setManualRecipients([...manualRecipients, { name: '', phone: '' }])} className="text-[10px] font-black text-[#25d366] uppercase tracking-[0.2em]">+ Add Recipient</button>
                </div>
              )}
            </div>

            <button type="submit" disabled={sending || !waReady} className="wa-btn w-fit px-12 py-4 text-xs">
              {sending ? 'Transmitting...' : 'Launch Network Campaign'}
            </button>
          </form>
        </section>

        {progress && (
          <section className="glass-card p-8 mb-8 fade-up">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              Live Deployment Progress
            </h2>
            <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
               <div className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_12px_rgba(96,165,250,0.4)]" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4">
               {[
                 { label: 'Sent', value: progress.sent_count, color: 'text-green-400' },
                 { label: 'Failed', value: progress.failed_count, color: 'text-red-400' },
                 { label: 'Total', value: progress.total_recipients, color: 'text-white/40' }
               ].map(s => (
                 <div key={s.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mt-1">{s.label}</p>
                 </div>
               ))}
            </div>
          </section>
        )}

        <section className="glass-card overflow-hidden fade-up" style={{ animationDelay: '0.3s' }}>
           <div className="p-8 border-b border-white/5 flex justify-between items-center">
             <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Campaign Archive</h2>
             <button onClick={fetchCampaigns} className="text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors">Sync records</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Manifest', 'Domain', 'Sent', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-8 py-4 text-[9px] font-bold text-white/10 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {campaigns.map(c => (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                       <td className="px-8 py-5 text-xs font-bold text-white/70 group-hover:text-white">{c.campaign_name}</td>
                       <td className="px-8 py-5 text-xs text-white/30">{c.total_recipients} Nodes</td>
                       <td className="px-8 py-5 text-xs font-bold text-green-400">{c.sent_count}</td>
                       <td className="px-8 py-5">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${statusTextColor[c.status] || 'text-white/20'}`}>{c.status}</span>
                       </td>
                       <td className="px-8 py-5 text-[10px] text-white/20">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </section>
      </div>
    </div>
  );
};

export default WhatsAppCampaign;
