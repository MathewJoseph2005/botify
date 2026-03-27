import { useState, useEffect } from 'react';
import { botAPI, whatsappAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

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
        setResult({ type: 'success', message: 'WhatsApp bot created!' });
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
      setResult({ type: 'error', message: 'Message and recipient file are required.' });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bots...</p>
        </div>
      </div>
    );
  }

  const selectedBot = bots.find((b) => b.bot_id === selectedBotId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Bot Manager</h1>
          <p className="text-gray-600 mt-2">Create and manage WhatsApp bots to send bulk messages.</p>
        </div>

        {result && (
          <div className={`mb-6 px-4 py-3 rounded-lg border ${result.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <div className="flex items-center justify-between">
              <span>{result.message}</span>
              <button onClick={() => setResult(null)} className="ml-4 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your WhatsApp Bots</h2>
            <button onClick={() => setShowCreateBotModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition">+ Create Bot</button>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No WhatsApp bots yet. Create one to get started!</p>
              <button onClick={() => setShowCreateBotModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition">Create Your First WhatsApp Bot</button>
            </div>
          ) : (
            <div className="grid gap-3">
              {bots.map((bot) => (
                <div key={bot.bot_id} className={`p-4 border rounded-lg`}> 
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{bot.bot_name}</h3>
                      <p className="text-sm text-gray-600">Bot ID: {bot.bot_id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Created: {new Date(bot.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedBot && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700"><strong>Active Bot:</strong> {selectedBot.bot_name}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Content</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body <span className="text-red-500">*</span></label>
                <textarea required rows={6} value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Hello! Your message here…" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Files</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient List <span className="text-red-500">*</span></label>
                <input type="file" required accept=".xlsx,.xls,.csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">Excel/CSV with "Phone" column</p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Optional)</label>
                <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                {attachment && <p className="text-xs text-gray-600 mt-1">✓ {attachment.name}</p>}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduling (Optional)</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Send At (Leave empty for immediate send)</label>
                <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={campaignLoading || !selectedBot} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 font-semibold">{campaignLoading ? 'Sending…' : '📱 Send Campaign'}</button>
            </div>
          </form>
        )}

        {bots.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Create a WhatsApp bot first to send campaigns.</div>
        )}

        {showCreateBotModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New WhatsApp Bot</h3>
              <form onSubmit={handleCreateBot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bot Name</label>
                  <input type="text" required value={createBotForm.botName} onChange={(e) => setCreateBotForm({ ...createBotForm, botName: e.target.value })} placeholder="e.g., Sales WA Bot" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateBotModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" disabled={botsLoading}>{botsLoading ? 'Creating…' : 'Create Bot'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppBot;
