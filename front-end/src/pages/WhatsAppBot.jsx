import { useState, useEffect, memo } from 'react';
import { botAPI, whatsappAPI } from '../utils/api';
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
  .glass-card {
    background: rgba(255,255,255,0.035);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    transition: all 0.4s ease;
  }
  .glass-card-hover:hover {
    background: rgba(255,255,255,0.055);
    border-color: rgba(37,211,102,0.2);
    transform: translateY(-2px);
  }
  .glass-card-selected {
    background: rgba(37,211,102,0.06) !important;
    border-color: rgba(37,211,102,0.35) !important;
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
  .wa-glow { text-shadow: 0 0 15px rgba(37,211,102,0.4); }
  .file-input-glass {
    background: rgba(255,255,255,0.04);
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 12px;
    transition: all 0.3s ease;
    color: rgba(255,255,255,0.4);
    padding: 10px 14px;
    width: 100%;
    cursor: pointer;
    font-size: 13px;
  }
  .file-input-glass:hover { border-color: rgba(37,211,102,0.3); color: rgba(255,255,255,0.7); }
  .file-input-glass::-webkit-file-upload-button {
    background: rgba(37,211,102,0.1);
    color: #25d366;
    border: 1px solid rgba(37,211,102,0.2);
    border-radius: 8px;
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-right: 12px;
  }
  .wa-btn {
    background: linear-gradient(135deg, rgba(37,211,102,0.85), rgba(18,140,60,0.9));
    color: white;
    font-weight: 900;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border: none;
    border-radius: 14px;
    transition: all 0.25s ease;
    box-shadow: 0 0 20px rgba(37,211,102,0.15);
  }
  .wa-btn:hover { transform: scale(1.04); box-shadow: 0 0 28px rgba(37,211,102,0.3); }
  .wa-btn:disabled { opacity: 0.5; transform: none; }
`;

const WhatsAppBot = () => {
  const { user } = useAuth();

  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [showCreateBotModal, setShowCreateBotModal] = useState(false);
  const [createBotForm, setCreateBotForm] = useState({ botName: '' });

  const [messageBody, setMessageBody] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [attachment, setAttachment] = useState(null);

  const [campaignMode, setCampaignMode] = useState('file'); // 'file' or 'manual'
  const [manualRecipients, setManualRecipients] = useState([
    { name: '', phone: '' }
  ]);

  const [loading, setLoading] = useState(true);
  const [botsLoading, setBotsLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await botAPI.listBots();
      if (response.data.success) {
        setBots(response.data.bots);
        if (response.data.bots.length > 0 && !selectedBotId) {
          setSelectedBotId(response.data.bots[0].bot_id);
        }
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to fetch bots.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBot = async (e) => {
    e.preventDefault();
    if (!createBotForm.botName) {
      setResult({ type: 'error', message: 'Bot name is required.' });
      return;
    }
    try {
      setBotsLoading(true);
      const response = await botAPI.createBot({ botName: createBotForm.botName, type: 'whatsapp' });
      if (response.data.success) {
        setResult({ type: 'success', message: 'WhatsApp agent deployed successfully!' });
        setCreateBotForm({ botName: '' });
        setShowCreateBotModal(false);
        await fetchBots();
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to create bot.' });
    } finally {
      setBotsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBotId) {
      setResult({ type: 'error', message: 'Please select a bot first.' });
      return;
    }
    if (!messageBody) {
      setResult({ type: 'error', message: 'Message body is required.' });
      return;
    }

    if (campaignMode === 'file') {
      if (!excelFile) {
        setResult({ type: 'error', message: 'Recipient file is required.' });
        return;
      }
    } else {
      if (manualRecipients.length === 0 || manualRecipients.some(r => !r.phone || !r.name)) {
        setResult({ type: 'error', message: 'Please enter at least one recipient with name and phone number.' });
        return;
      }
    }

    try {
      setCampaignLoading(true);
      const formData = new FormData();
      formData.append('messageBody', messageBody);
      const selBot = bots.find(b => b.bot_id === selectedBotId);
      formData.append('campaignName', selBot?.bot_name || 'WA Campaign');
      if (scheduledTime) formData.append('scheduledTime', scheduledTime);
      
      if (campaignMode === 'file') {
        formData.append('excelFile', excelFile);
      } else {
        formData.append('manualRecipients', JSON.stringify(manualRecipients));
      }
      
      if (attachment) formData.append('attachment', attachment);

      const response = await whatsappAPI.sendCampaign(formData);
      if (response.data.success) {
        setResult({ type: 'success', message: response.data.message });
        setMessageBody('');
        setScheduledTime('');
        setExcelFile(null);
        setAttachment(null);
        setManualRecipients([{ name: '', phone: '' }]);
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to schedule campaign.' });
    } finally {
      setCampaignLoading(false);
    }
  };

  const selectedBot = bots.find(b => b.bot_id === selectedBotId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <style>{WA_STYLES}</style>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#25d366]/20 border-t-[#25d366] animate-spin-slow mx-auto mb-4" />
          <p className="text-white/30 text-sm uppercase tracking-widest font-semibold">Launching agents…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{WA_STYLES}</style>
      <Starfield />

      <div className="absolute top-[-5%] right-[-8%] w-[480px] h-[480px] opacity-[0.07] pointer-events-none">
        <FluidOrb />
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pt-16 relative z-10">
        <div className="mb-12 fade-up">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mb-3">Botify · WhatsApp Engine</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            WhatsApp <span className="text-[#25d366] wa-glow">Campaign</span> Hub
          </h1>
          <p className="text-white/30 text-sm max-w-lg leading-relaxed">
            Deploy intelligent bulk WhatsApp campaigns. Select an agent, craft your message, and reach thousands in seconds.
          </p>
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

        <div className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Bot Registry</h2>
              <p className="text-white/20 text-xs mt-1">{bots.length} agent{bots.length !== 1 ? 's' : ''} configured</p>
            </div>
            <button onClick={() => setShowCreateBotModal(true)} className="wa-btn px-6 py-2.5 rounded-xl">+ New Agent</button>
          </div>

          <div className="grid gap-3">
            {bots.length === 0 ? (
               <p className="text-white/20 text-center py-10 italic text-sm">No WhatsApp agents deployed yet.</p>
            ) : bots.map(bot => (
              <div key={bot.bot_id} onClick={() => setSelectedBotId(bot.bot_id)}
                className={`glass-card glass-card-hover p-4 cursor-pointer flex justify-between items-center ${selectedBotId === bot.bot_id ? 'glass-card-selected' : ''}`}>
                <div className="flex items-center gap-4">
                   <div className={`w-2 h-2 rounded-full ${selectedBotId === bot.bot_id ? 'bg-[#25d366] shadow-[0_0_10px_rgba(37,211,102,0.6)]' : 'bg-white/10'}`} />
                   <div>
                     <p className={`font-bold text-sm ${selectedBotId === bot.bot_id ? 'text-[#25d366]' : 'text-white/80'}`}>{bot.bot_name}</p>
                     <p className="text-[10px] text-white/20 uppercase tracking-widest mt-0.5">ID: {bot.bot_id}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedBot && (
          <form onSubmit={handleSubmit} className="space-y-6 fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                Message Content
              </h2>
              <textarea required rows={6} value={messageBody} onChange={e => setMessageBody(e.target.value)}
                placeholder="Hello! Personalise with {{name}}..."
                className="w-full px-5 py-3.5 rounded-2xl input-glass text-sm font-mono resize-none placeholder-white/10" />
            </div>

            <div className="glass-card p-8">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                    Target Contacts
                  </h2>
                  <div className="flex gap-1 p-1 rounded-xl bg-black/20">
                    <button type="button" onClick={() => setCampaignMode('file')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${campaignMode === 'file' ? 'bg-[#25d366] text-white' : 'text-white/30 hover:text-white'}`}>File Upload</button>
                    <button type="button" onClick={() => setCampaignMode('manual')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${campaignMode === 'manual' ? 'bg-[#25d366] text-white' : 'text-white/30 hover:text-white'}`}>Manual Entry</button>
                  </div>
               </div>

               {campaignMode === 'file' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Recipient List (XLSX, CSV)</label>
                      <input type="file" required accept=".xlsx,.xls,.csv" onChange={e => setExcelFile(e.target.files?.[0] || null)} className="file-input-glass" />
                      {excelFile && <p className="text-[10px] text-[#25d366] mt-2 font-bold uppercase tracking-widest">✓ {excelFile.name}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Attachment (Optional)</label>
                      <input type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} className="file-input-glass" />
                      {attachment && <p className="text-[10px] text-[#25d366] mt-2 font-bold uppercase tracking-widest">✓ {attachment.name}</p>}
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mb-4">Add recipients below (e.g. +1234567890)</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                       {manualRecipients.map((r, i) => (
                         <div key={i} className="flex gap-3 items-center group">
                            <input type="text" placeholder="Name" value={r.name} onChange={e => { const n = [...manualRecipients]; n[i].name = e.target.value; setManualRecipients(n); }}
                              className="flex-1 px-4 py-2.5 rounded-xl input-glass text-xs" />
                            <input type="tel" placeholder="Phone" value={r.phone} onChange={e => { const n = [...manualRecipients]; n[i].phone = e.target.value; setManualRecipients(n); }}
                              className="flex-1 px-4 py-2.5 rounded-xl input-glass text-xs" />
                            <button type="button" onClick={() => setManualRecipients(manualRecipients.filter((_, idx) => idx !== i))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">&times;</button>
                         </div>
                       ))}
                    </div>
                    <button type="button" onClick={() => setManualRecipients([...manualRecipients, { name: '', phone: '' }])}
                      className="text-[10px] font-black text-[#25d366] uppercase tracking-widest hover:text-white transition-colors">+ Add Entry</button>
                 </div>
               )}
            </div>

            <div className="glass-card p-8">
               <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                 Dispatch Schedule
               </h2>
               <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl input-glass text-sm" style={{ colorScheme: 'dark' }} />
               <p className="text-[10px] text-white/10 mt-3 font-bold uppercase tracking-widest italic">Leave empty for immediate network transmission.</p>
            </div>

            <button type="submit" disabled={campaignLoading} className="wa-btn px-12 py-4 rounded-2xl flex items-center justify-center gap-3 w-fit">
               {campaignLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin-slow rounded-full" /> : <span>📱</span>}
               {campaignLoading ? 'Transmitting...' : 'Launch Network Campaign'}
            </button>
          </form>
        )}
      </div>

      {showCreateBotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl">
             <h3 className="text-xl font-bold mb-2">Deploy <span className="text-[#25d366]">Agent</span></h3>
             <p className="text-white/20 text-[11px] mb-8 uppercase tracking-widest">Initialise a new WhatsApp automation node</p>
             <form onSubmit={handleCreateBot} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Agent Designation</label>
                   <input type="text" required autoFocus value={createBotForm.botName} onChange={e => setCreateBotForm({ ...createBotForm, botName: e.target.value })}
                    placeholder="e.g. Global Support Bot" className="w-full px-5 py-3.5 rounded-xl input-glass text-sm" />
                </div>
                <div className="flex gap-4 pt-2">
                   <button type="button" onClick={() => setShowCreateBotModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/30 text-xs font-bold uppercase tracking-widest hover:bg-white/5">Cancel</button>
                   <button type="submit" disabled={botsLoading} className="flex-1 wa-btn px-4 py-3 rounded-xl flex items-center justify-center gap-2">
                     {botsLoading ? <div className="w-3 h-3 border-2 border-white/20 border-t-white animate-spin-slow rounded-full" /> : 'Deploy'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppBot;
