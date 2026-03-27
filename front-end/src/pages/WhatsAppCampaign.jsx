import { useState, useEffect, useRef, useCallback } from 'react';
import { whatsappAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ── Step indicator for QR loading ────────────────────────────────────────
const INIT_STEPS = [
  { key: 'launching', label: 'Launching browser' },
  { key: 'qr_ready', label: 'QR code ready' },
  { key: 'authenticated', label: 'Authenticated' },
  { key: 'loading_wa', label: 'Loading WhatsApp' },
  { key: 'ready', label: 'Connected' },
];

const WAITING_FACTS = [
  'WhatsApp Web uses end-to-end encryption just like chats on your phone.',
  'Using country code improves message delivery reliability.',
  'Shorter campaign messages usually get faster replies.',
  'Personalized messages with {{name}} tend to perform better than generic text.',
  'A small delay between messages helps reduce spam detection risk.',
  'Keeping contacts clean and deduplicated improves campaign quality.',
];

const StepIndicator = ({ currentStep }) => {
  const currentIdx = INIT_STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 mb-4 flex-wrap">
      {INIT_STEPS.map((step, i) => {
        const done = i <= currentIdx && currentIdx >= 0;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                done
                  ? 'bg-green-500 text-white'
                  : active
                  ? 'bg-green-400 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {done && !active ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
            {i < INIT_STEPS.length - 1 && (
              <div className={`w-6 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const WhatsAppCampaign = () => {
  const { user } = useAuth();

  // ── Connection / QR State ───────────────────────────────────────────────
  const [qrCode, setQrCode] = useState(null);
  const [waStatus, setWaStatus] = useState('Not initialized');
  const [waReady, setWaReady] = useState(false);
  const [waInitializing, setWaInitializing] = useState(false);
  const [initStep, setInitStep] = useState('');
  const [factIndex, setFactIndex] = useState(0);
  const qrPollRef = useRef(null);
  const factIntervalRef = useRef(null);

  // ── Campaign Form State ─────────────────────────────────────────────────
  const [campaignName, setCampaignName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageAttachment, setMessageAttachment] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // ── Campaign Progress ───────────────────────────────────────────────────
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [progress, setProgress] = useState(null);
  const progressPollRef = useRef(null);

  // ── Campaign History ────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // ── UI State ────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // ── Fetch campaigns on mount (fast – no WA dependency) ─────────────────
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
      setFactIndex((prev) => (prev + 1) % WAITING_FACTS.length);
    }, 3500);

    return () => clearInterval(factIntervalRef.current);
  }, [waInitializing]);

  // ── WhatsApp status check (fast endpoint) ──────────────────────────────
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
    } catch {
      // client not initialised yet
    }
  };

  // ── Apply poll data helper ─────────────────────────────────────────────
  const applyStatusData = (data) => {
    setQrCode(data.qrCode || null);
    setWaReady(data.isReady);
    setWaInitializing(data.isInitializing);
    setWaStatus(data.status);
    setInitStep(data.initStep || '');
  };

  // ── Initialize WhatsApp & start fast polling ───────────────────────────
  const handleInitWhatsApp = async () => {
    try {
      setResult(null);
      setWaInitializing(true);
      setInitStep('launching');
      setWaStatus('Launching browser…');

      const res = await whatsappAPI.init();
      if (res.data.success) {
        applyStatusData(res.data);
        // Poll every 1.5 s (faster than before) for QR/status
        clearInterval(qrPollRef.current);
        qrPollRef.current = setInterval(async () => {
          try {
            const qrRes = await whatsappAPI.getQR();
            if (qrRes.data.success) {
              applyStatusData(qrRes.data);
              if (qrRes.data.isReady) {
                clearInterval(qrPollRef.current);
              }
            }
          } catch {
            // ignore transient
          }
        }, 1500);
      }
    } catch (err) {
      setWaInitializing(false);
      setInitStep('');
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to init WhatsApp.' });
    }
  };

  // ── Logout / Destroy ───────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await whatsappAPI.logout();
      setWaReady(false);
      setWaInitializing(false);
      setQrCode(null);
      setInitStep('');
      setWaStatus('Disconnected');
      clearInterval(qrPollRef.current);
      setResult({ type: 'success', message: 'WhatsApp session disconnected.' });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to disconnect.' });
    }
  };

  // ── Fetch campaign history ─────────────────────────────────────────────
  const fetchCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const res = await whatsappAPI.getCampaigns();
      if (res.data.success) setCampaigns(res.data.campaigns);
    } catch {
      // silently fail
    } finally {
      setCampaignsLoading(false);
    }
  };

  // ── Poll campaign progress ─────────────────────────────────────────────
  const startProgressPolling = useCallback((campaignId) => {
    clearInterval(progressPollRef.current);
    progressPollRef.current = setInterval(async () => {
      try {
        const res = await whatsappAPI.getCampaign(campaignId);
        if (res.data.success) {
          setProgress(res.data.campaign);
          if (res.data.campaign.status === 'completed' || res.data.campaign.status === 'failed') {
            clearInterval(progressPollRef.current);
            setSending(false);
            fetchCampaigns();
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
  }, []);

  // ── File handlers ──────────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setExcelFile(file);
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) setExcelFile(e.target.files[0]);
  };

  const handleAttachmentSelect = (e) => {
    if (e.target.files.length) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Send campaign ─────────────────────────────────────────────────────
  const handleSendCampaign = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!messageBody.trim()) {
      return setResult({ type: 'error', message: 'Message body is required.' });
    }
    if (!excelFile) {
      return setResult({ type: 'error', message: 'Please upload an Excel/CSV file with recipients.' });
    }
    if (!waReady) {
      return setResult({ type: 'error', message: 'WhatsApp is not connected. Scan the QR code first.' });
    }

    const formData = new FormData();
    formData.append('excelFile', excelFile);
    attachments.forEach((file) => formData.append('attachment', file));
    formData.append('messageBody', messageBody);
    formData.append('campaignName', campaignName || 'Untitled Campaign');

    try {
      setSending(true);
      const res = await whatsappAPI.sendCampaign(formData);
      if (res.data.success) {
        setResult({ type: 'success', message: res.data.message });
        setActiveCampaignId(res.data.campaignId);
        setProgress({
          sent_count: 0,
          failed_count: 0,
          total_recipients: res.data.totalRecipients,
          status: 'sending',
        });
        startProgressPolling(res.data.campaignId);
        setCampaignName('');
        setMessageBody('');
        setExcelFile(null);
        setAttachments([]);
      }
    } catch (err) {
      setSending(false);
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to start campaign.' });
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const progressPercent = progress
    ? Math.round(((progress.sent_count + progress.failed_count) / Math.max(progress.total_recipients, 1)) * 100)
    : 0;

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      sending: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Bulk Messaging</h1>
      <p className="text-gray-500 mb-8">Send personalised WhatsApp messages to a list of contacts.</p>

      {/* Result Banner */}
      {result && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            result.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          <span>{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-4 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      {/* ── Section 1: WhatsApp Connection ─────────────────────────────── */}
      <section className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">📱</span> WhatsApp Connection
        </h2>

        {/* Status dot + text */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              waReady ? 'bg-green-500' : waInitializing ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm text-gray-600 font-medium">{waStatus}</span>
        </div>

        {/* Step indicator – shown while initializing */}
        {waInitializing && <StepIndicator currentStep={initStep} />}

        {waInitializing && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-800 mb-1">Did you know?</p>
            <p className="text-sm text-amber-700 transition-all duration-300">{WAITING_FACTS[factIndex]}</p>
          </div>
        )}

        {/* Loading skeleton while browser is launching (no QR yet) */}
        {waInitializing && !qrCode && initStep === 'launching' && (
          <div className="flex flex-col items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-64 h-64 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Starting browser…</p>
                <p className="text-xs text-gray-400 mt-1">This may take 10-20 seconds the first time</p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Area */}
        {!waReady && qrCode && (
          <div className="flex flex-col items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Scan this QR code with WhatsApp on your phone:</p>
            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg" />
            <p className="text-xs text-gray-400">Open WhatsApp &rarr; Settings &rarr; Linked Devices &rarr; Link a Device</p>
          </div>
        )}

        {waReady && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <p className="text-green-700 font-medium">WhatsApp is connected and ready to send messages.</p>
          </div>
        )}

        <div className="flex gap-3">
          {!waReady && (
            <button
              onClick={handleInitWhatsApp}
              disabled={waInitializing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2 rounded-lg transition font-medium"
            >
              {waInitializing ? 'Initializing…' : 'Connect WhatsApp'}
            </button>
          )}
          {(waReady || waInitializing) && (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition font-medium"
            >
              Disconnect
            </button>
          )}
        </div>
      </section>

      {/* ── Section 2: Campaign Form ──────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">✉️</span> New Campaign
        </h2>

        <form onSubmit={handleSendCampaign} className="space-y-5">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. March Promo Blast"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body <span className="text-gray-400">(use {'{{name}}'} for personalisation)</span>
            </label>
            <div className="relative">
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                placeholder={`Hi {{name}},\n\nWe have an exciting offer for you!`}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-y"
                required
              />
              {/* Attachment Icon Button */}
              <button
                type="button"
                onClick={() => document.getElementById('msg-attachment-input').click()}
                title="Attach file to message"
                className="absolute bottom-3 right-3 p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              {/* Hidden file input for message attachment */}
              <input
                id="msg-attachment-input"
                type="file"
                onChange={handleMessageAttachmentSelect}
                className="hidden"
              />
            </div>

            {/* Attached File Preview */}
            {messageAttachment && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getFileIcon(messageAttachment.name)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 break-words pr-2">{messageAttachment.name}</p>
                    <p className="text-xs text-gray-500">{(messageAttachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMessageAttachment(null)}
                  className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition"
                  title="Remove attachment"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Optional Attachment Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments <span className="text-gray-400">(Optional Images/Documents)</span>
            </label>
            <div className="flex flex-col gap-3">
              <label className="cursor-pointer bg-gray-50 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 transition self-start">
                <span>Choose Files</span>
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentSelect}
                  className="hidden"
                />
              </label>
              {attachments.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="truncate max-w-xs font-medium text-green-700 flex-1">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-red-500 hover:text-red-700 font-bold px-2"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Upload – drag-and-drop */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipients File <span className="text-gray-400">(.xlsx, .xls, .csv)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-green-500 bg-green-50'
                  : excelFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
              onClick={() => document.getElementById('wa-file-input').click()}
            >
              {excelFile ? (
                <div>
                  <p className="text-green-700 font-medium">{excelFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(excelFile.size / 1024).toFixed(1)} KB &middot;{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExcelFile(null); }}
                      className="text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <p className="text-gray-600 font-medium">Drag &amp; drop your file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                  <p className="text-xs text-gray-400 mt-2">Excel must contain <strong>name</strong> and <strong>whatsapp_number</strong> columns</p>
                </div>
              )}
              <input
                id="wa-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={sending || !waReady}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {sending ? 'Sending…' : 'Start Campaign'}
          </button>
        </form>
      </section>

      {/* ── Section 3: Live Progress ──────────────────────────────────── */}
      {progress && (
        <section className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> Campaign Progress
          </h2>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-5 mb-3 overflow-hidden">
            <div
              className={`h-5 rounded-full transition-all duration-500 ${
                progress.status === 'completed' ? 'bg-green-500' : progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>{progressPercent}% complete</span>
            <span>
              {progress.sent_count + progress.failed_count} / {progress.total_recipients}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{progress.sent_count}</p>
              <p className="text-xs text-gray-500">Sent</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{progress.failed_count}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{progress.total_recipients}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>

          {progress.status === 'completed' && (
            <p className="mt-4 text-green-600 font-medium text-center">Campaign completed successfully!</p>
          )}
          {progress.status === 'failed' && (
            <p className="mt-4 text-red-600 font-medium text-center">Campaign failed.</p>
          )}
        </section>
      )}

      {/* ── Section 4: Campaign History ───────────────────────────────── */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">📋</span> Campaign History
        </h2>

        {campaignsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No campaigns yet. Start your first one above!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 pr-4">Campaign</th>
                  <th className="py-3 pr-4">Recipients</th>
                  <th className="py-3 pr-4">Sent</th>
                  <th className="py-3 pr-4">Failed</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-800">{c.campaign_name}</td>
                    <td className="py-3 pr-4">{c.total_recipients}</td>
                    <td className="py-3 pr-4 text-green-600">{c.sent_count}</td>
                    <td className="py-3 pr-4 text-red-600">{c.failed_count}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default WhatsAppCampaign;
