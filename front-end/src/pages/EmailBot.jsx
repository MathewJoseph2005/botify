import { useState, useEffect } from 'react';
import { botAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const EmailBot = () => {
  const { user } = useAuth();

  // ── Bot Management State ────────────────────────────────────────────────
  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [showCreateBotModal, setShowCreateBotModal] = useState(false);
  const [showEditBotModal, setShowEditBotModal] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [deleteBotModal, setDeleteBotModal] = useState({ open: false, botId: null });

  // ── Create Bot Form State ───────────────────────────────────────────────
  const [createBotForm, setCreateBotForm] = useState({
    botName: '',
  });

  // ── Edit Bot Form State ─────────────────────────────────────────────────
  const [editBotForm, setEditBotForm] = useState({
    botName: '',
  });

  // ── Email Campaign State ────────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [attachment, setAttachment] = useState(null);

  // ── Campaign History State ──────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // ── UI State ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [botsLoading, setBotsLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [result, setResult] = useState(null);

  // ── Fetch Bots on Mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchBots();
    fetchCampaigns();
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
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch bots.',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => setResult(null);

  // ── Fetch Campaign History ─────────────────────────────────────────────
  const fetchCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const response = await botAPI.getCampaigns();
      if (response.data.success) {
        setCampaigns(response.data.campaigns);
      }
    } catch {
      // silently fail – campaigns are supplementary
    } finally {
      setCampaignsLoading(false);
    }
  };

  // ── Create Bot Handler ──────────────────────────────────────────────────
  const handleCreateBot = async (e) => {
    e.preventDefault();
    if (!createBotForm.botName) {
      setResult({ type: 'error', message: 'Bot name is required.' });
      return;
    }

    try {
      setBotsLoading(true);
      const response = await botAPI.createBot({
        botName: createBotForm.botName,
      });

      if (response.data.success) {
        setResult({ type: 'success', message: 'Bot created successfully!' });
        setCreateBotForm({ botName: '' });
        setShowCreateBotModal(false);
        await fetchBots();
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create bot.',
      });
    } finally {
      setBotsLoading(false);
    }
  };

  // ── Update Bot Handler ──────────────────────────────────────────────────
  const handleUpdateBot = async (e) => {
    e.preventDefault();
    if (!editBotForm.botName) {
      setResult({ type: 'error', message: 'Bot name is required.' });
      return;
    }

    try {
      setBotsLoading(true);
      const response = await botAPI.updateBot(editingBot.bot_id, {
        botName: editBotForm.botName,
      });

      if (response.data.success) {
        setResult({ type: 'success', message: 'Bot updated successfully!' });
        setShowEditBotModal(false);
        setEditingBot(null);
        await fetchBots();
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update bot.',
      });
    } finally {
      setBotsLoading(false);
    }
  };

  // ── Delete Bot Handler ──────────────────────────────────────────────────
  const handleDeleteBot = async (botId) => {
    setDeleteBotModal({ open: true, botId });
  };

  const confirmDeleteBot = async () => {
    const botId = deleteBotModal.botId;
    setDeleteBotModal({ open: false, botId: null });

    try {
      setBotsLoading(true);
      const response = await botAPI.deleteBot(botId);

      if (response.data.success) {
        setResult({ type: 'success', message: 'Bot deleted successfully!' });
        if (selectedBotId === botId) {
          setSelectedBotId(null);
        }
        await fetchBots();
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete bot.',
      });
    } finally {
      setBotsLoading(false);
    }
  };

  // ── Test Connection Handler ────────────────────────────────────────────
  const handleTestConnection = async () => {
    if (!selectedBotId) {
      setResult({ type: 'error', message: 'Please select a bot first.' });
      return;
    }

    try {
      setTestLoading(true);
      const response = await botAPI.testConnection(selectedBotId);
      if (response.data.success) {
        setResult({ type: 'success', message: response.data.message });
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Test connection failed.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  // ── Submit Campaign Handler ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBotId) {
      setResult({ type: 'error', message: 'Please select a bot first.' });
      return;
    }

    if (!subject || !messageBody || !excelFile) {
      setResult({ type: 'error', message: 'Subject, message, and recipient file are required.' });
      return;
    }

    try {
      setCampaignLoading(true);
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('messageBody', messageBody);
      if (scheduledTime) formData.append('scheduledTime', scheduledTime);
      formData.append('excelFile', excelFile);
      if (attachment) formData.append('attachment', attachment);

      const response = await botAPI.emailCampaign(selectedBotId, formData);
      if (response.data.success) {
        setResult({ type: 'success', message: response.data.message });
        setSubject('');
        setMessageBody('');
        setScheduledTime('');
        setExcelFile(null);
        setAttachment(null);
        fetchCampaigns(); // refresh campaign history
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to schedule campaign.',
      });
    } finally {
      setCampaignLoading(false);
    }
  };

  // ── Loading State ───────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Bot Manager</h1>
          <p className="text-gray-600 mt-2">
            Create and manage email bots to send bulk email campaigns.
          </p>
        </div>

        {/* Result Banner */}
        {result && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg border ${
              result.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{result.message}</span>
              <button onClick={clearResult} className="ml-4 text-lg leading-none">
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Bot Selection and Management Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Email Bots</h2>
            <button
              onClick={() => setShowCreateBotModal(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              disabled={botsLoading}
            >
              + Create Bot
            </button>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No bots yet. Create one to get started!</p>
              <button
                onClick={() => setShowCreateBotModal(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Create Your First Bot
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {bots.map((bot) => (
                <div
                  key={bot.bot_id}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedBotId === bot.bot_id
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBotId(bot.bot_id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{bot.bot_name}</h3>
                      <p className="text-sm text-gray-600">{bot.bot_email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBot(bot);
                          setEditBotForm({ botName: bot.bot_name });
                          setShowEditBotModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        disabled={botsLoading}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBot(bot.bot_id);
                        }}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                        disabled={botsLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(bot.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Form */}
        {selectedBot && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bot Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Active Bot:</strong> {selectedBot.bot_name} ({selectedBot.bot_email})
              </p>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testLoading}
                className="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition disabled:opacity-50 text-sm"
              >
                {testLoading ? 'Testing…' : '⚡ Test Bot Connection'}
              </button>
            </div>

            {/* Email Content Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Your campaign subject line"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Body <span className="text-gray-400 text-xs">(HTML supported)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="<h1>Hello!</h1><p>Your message here…</p>"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Files Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Files</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient List <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Excel/CSV with "Email" column</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attachment (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {attachment && (
                    <p className="text-xs text-gray-600 mt-1">✓ {attachment.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduling Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduling (Optional)</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Send At (Leave empty for immediate send)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={campaignLoading || !selectedBot}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 font-semibold"
              >
                {campaignLoading ? 'Sending…' : '📧 Send Campaign'}
              </button>
            </div>
          </form>
        )}

        {bots.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Create a bot first to send email campaigns.
          </div>
        )}

        {/* Campaign History */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Campaign History</h2>
              <button
                onClick={fetchCampaigns}
                disabled={campaignsLoading}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
              >
                {campaignsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {campaignsLoading && campaigns.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No campaigns sent yet. Send your first email campaign above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.bot_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-[200px] truncate">{c.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.recipient_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{c.sent_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{c.failed_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === 'completed' ? 'bg-green-100 text-green-800' :
                          c.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                          c.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()}{' '}
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Bot Modal */}
      {showCreateBotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Bot</h3>

            <form onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bot Name
                </label>
                <input
                  type="text"
                  required
                  value={createBotForm.botName}
                  onChange={(e) =>
                    setCreateBotForm({ ...createBotForm, botName: e.target.value })
                  }
                  placeholder="e.g., Sales Bot, Newsletter Bot"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Give your bot a unique name for easy identification
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateBotModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={botsLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
                  disabled={botsLoading}
                >
                  {botsLoading ? 'Creating…' : 'Create Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bot Modal */}
      {showEditBotModal && editingBot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Bot Name</h3>

            <form onSubmit={handleUpdateBot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bot Name
                </label>
                <input
                  type="text"
                  required
                  value={editBotForm.botName}
                  onChange={(e) =>
                    setEditBotForm({ ...editBotForm, botName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <p className="text-xs text-gray-600">
                Email: <strong>{editingBot.bot_email}</strong>
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditBotModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={botsLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
                  disabled={botsLoading}
                >
                  {botsLoading ? 'Updating…' : 'Update Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteBotModal.open}
        onClose={() => setDeleteBotModal({ open: false, botId: null })}
        onConfirm={confirmDeleteBot}
        title="Delete Bot"
        message="Are you sure you want to delete this bot? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default EmailBot;
