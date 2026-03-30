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
  .gold-glow { text-shadow: 0 0 15px rgba(255,215,0,0.4); }
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
  .file-input-glass::-webkit-file-upload-button:hover {
    background: rgba(37,211,102,0.2);
  }
  .tag-pill {
    background: rgba(37,211,102,0.08);
    border: 1px solid rgba(37,211,102,0.15);
    color: rgba(37,211,102,0.7);
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 10px;
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
    if (!messageBody || !excelFile) {
      setResult({ type: 'error', message: 'Message body and recipient file are required.' });
      return;
    }
    try {
      setCampaignLoading(true);
      const formData = new FormData();
      formData.append('messageBody', messageBody);
      formData.append('campaignName', selectedBot?.bot_name || 'WA Campaign');
      if (scheduledTime) formData.append('scheduledTime', scheduledTime);
      formData.append('excelFile', excelFile);
      if (attachment) formData.append('attachment', attachment);

      const response = await whatsappAPI.sendCampaign(formData);
      if (response.data.success) {
        setResult({ type: 'success', message: response.data.message });
        setMessageBody('');
        setScheduledTime('');
        setExcelFile(null);
        setAttachment(null);
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to schedule campaign.' });
    } finally {
      setCampaignLoading(false);
    }
  };

  const selectedBot = bots.find(b => b.bot_id === selectedBotId);

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
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

      {/* Ambient orbs */}
      <div className="absolute top-[-5%] right-[-8%] w-[480px] h-[480px] opacity-[0.07] pointer-events-none">
        <FluidOrb />
      </div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] opacity-[0.04] pointer-events-none">
        <FluidOrb />
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pt-16 relative z-10">

        {/* ── Header ── */}
        <div className="mb-12 fade-up">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mb-3">Botify · WhatsApp Engine</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            WhatsApp <span className="text-[#25d366] wa-glow">Campaign</span> Hub
          </h1>
          <p className="text-white/30 text-sm max-w-lg leading-relaxed">
            Deploy intelligent bulk WhatsApp campaigns. Select an agent, craft your message, and reach thousands in seconds.
          </p>
        </div>

        {/* ── Result Banner ── */}
        {result && (
          <div className={`mb-8 px-6 py-4 rounded-2xl glass-card flex items-center justify-between fade-up ${
            result.type === 'success'
              ? 'border-green-500/20 bg-green-500/5 text-green-400'
              : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              <div
                className={`w-1.5 h-1.5 rounded-full ${result.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ boxShadow: result.type === 'success' ? '0 0 8px rgba(74,222,128,0.5)' : '0 0 8px rgba(248,113,113,0.5)' }}
              />
              <span className="text-sm font-medium">{result.message}</span>
            </div>
            <button
              onClick={() => setResult(null)}
              className="opacity-40 hover:opacity-100 text-lg leading-none transition-opacity"
            >&times;</button>
          </div>
        )}

        {/* ── Bot Registry ── */}
        <div className="glass-card p-8 mb-8 fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Bot Registry</h2>
              <p className="text-white/20 text-xs mt-1">{bots.length} agent{bots.length !== 1 ? 's' : ''} configured</p>
            </div>
            <button
              onClick={() => setShowCreateBotModal(true)}
              disabled={botsLoading}
              className="wa-btn px-6 py-2.5 rounded-xl"
            >
              + New Agent
            </button>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-white/30 text-sm mb-6">No WhatsApp bots deployed. Create one to begin.</p>
              <button
                onClick={() => setShowCreateBotModal(true)}
                className="wa-btn px-8 py-3 rounded-2xl"
              >
                Initialise First Agent
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {bots.map(bot => (
                <div
                  key={bot.bot_id}
                  onClick={() => setSelectedBotId(bot.bot_id)}
                  className={`glass-card glass-card-hover p-5 cursor-pointer flex justify-between items-center group ${
                    selectedBotId === bot.bot_id ? 'glass-card-selected' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${selectedBotId === bot.bot_id ? 'bg-[#25d366]' : 'bg-white/10'}`}
                      style={selectedBotId === bot.bot_id ? { boxShadow: '0 0 10px rgba(37,211,102,0.6)' } : {}}
                    />
                    <div>
                      <p className={`font-bold text-sm transition-colors ${selectedBotId === bot.bot_id ? 'text-[#25d366]' : 'text-white/80'}`}>
                        {bot.bot_name}
                      </p>
                      <p className="text-xs text-white/25 mt-0.5">ID: {bot.bot_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="tag-pill">{new Date(bot.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Campaign Form ── */}
        {selectedBot && (
          <form onSubmit={handleSubmit} className="space-y-6 fade-up" style={{ animationDelay: '0.2s' }}>

            {/* Active Bot Banner */}
            <div
              className="glass-card p-5 flex items-center gap-4"
              style={{ borderColor: 'rgba(37,211,102,0.2)', background: 'rgba(37,211,102,0.04)' }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full bg-[#25d366] shrink-0"
                style={{ boxShadow: '0 0 12px rgba(37,211,102,0.7)' }}
              />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Active Agent</p>
                <p className="text-sm font-bold text-[#25d366]">{selectedBot.bot_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#25d366]/40 uppercase tracking-widest">Live</span>
              </div>
            </div>

            {/* Message Content */}
            <div className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                Message Composition
              </h2>
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Message Body <span className="text-[#25d366]">*</span>
                </label>
                <textarea
                  required rows={6}
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Hello! Your message here…&#10;&#10;Use {{name}} for personalisation."
                  className="w-full px-5 py-3.5 rounded-xl input-glass text-sm font-mono resize-none"
                />
                <p className="text-[10px] text-white/20 mt-2">Supports basic WhatsApp formatting: *bold*, _italic_, ~strikethrough~</p>
              </div>
            </div>

            {/* Files */}
            <div className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                Payload Files
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                    Recipient List <span className="text-[#25d366]">*</span>
                  </label>
                  <input
                    type="file" required accept=".xlsx,.xls,.csv"
                    onChange={e => setExcelFile(e.target.files?.[0] || null)}
                    className="file-input-glass"
                  />
                  <p className="text-[10px] text-white/20 mt-2">Excel / CSV with "Phone" column</p>
                  {excelFile && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
                      <span className="text-[10px] text-green-400 font-bold truncate">{excelFile.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                    Attachment <span className="text-white/20 font-normal tracking-normal normal-case">— optional</span>
                  </label>
                  <input
                    type="file"
                    onChange={e => setAttachment(e.target.files?.[0] || null)}
                    className="file-input-glass"
                  />
                  {attachment && (
                    <div className="mt-2 flex items-center justify-between px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[11px] text-white/50 truncate">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="text-red-400/50 hover:text-red-400 font-bold ml-2 text-sm transition-colors"
                      >&times;</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="glass-card p-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#25d366]" />
                Scheduling <span className="text-white/20 font-normal normal-case tracking-normal text-xs ml-1">— optional</span>
              </h2>
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Dispatch Time (leave empty for immediate)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl input-glass text-sm"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={campaignLoading || !selectedBot}
                className="wa-btn px-10 py-4 rounded-2xl flex items-center gap-2"
              >
                {campaignLoading
                  ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />
                      Dispatching…
                    </>
                  )
                  : '📱 Launch Campaign'}
              </button>
            </div>
          </form>
        )}

        {bots.length === 0 && !loading && (
          <div className="glass-card p-12 text-center fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-white/25 text-sm">Create a WhatsApp agent above to start sending campaigns.</p>
          </div>
        )}
      </div>

      {/* ── Create Bot Modal ── */}
      {showCreateBotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-md fade-up" style={{ background: 'rgba(10,10,10,0.92)' }}>

            {/* Modal header accent */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.2)' }}>
                💬
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">Deploy WhatsApp Agent</h3>
                <p className="text-white/30 text-[11px]">Configure a new messaging bot</p>
              </div>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                  Agent Designation
                </label>
                <input
                  type="text" required autoFocus
                  value={createBotForm.botName}
                  onChange={e => setCreateBotForm({ ...createBotForm, botName: e.target.value })}
                  placeholder="e.g., Sales WA Bot, Support Agent"
                  className="w-full px-5 py-3.5 rounded-xl input-glass text-sm"
                />
                <p className="text-[10px] text-white/20 mt-2">Assign a unique name for easy identification</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBotModal(false)}
                  disabled={botsLoading}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/40 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={botsLoading}
                  className="flex-1 wa-btn px-4 py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  {botsLoading
                    ? <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />Creating…</>
                    : 'Deploy Agent'}
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
