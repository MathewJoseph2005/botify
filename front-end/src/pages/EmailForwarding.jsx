import { useState, useEffect } from 'react';
import { botAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const EmailForwarding = () => {
  const { user } = useAuth();

  // ── Configuration Management State ──────────────────────────────────────
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // ── Form State ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    password: '',
    forward_label: 'forward',
    recipient_emails: '',
    enabled: true,
  });

  // ── UI State ────────────────────────────────────────────────────────────
  const [result, setResult] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, configId: null });

  const clearResult = () => setResult(null);

  // ── Fetch Configurations on Mount ──────────────────────────────────────
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await botAPI.getEmailForwardingConfigs();
      if (response.data.success) {
        setConfigs(response.data.configs || []);
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch email forwarding configurations.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Open Form for Create/Edit ──────────────────────────────────────────
  const handleOpenForm = (config = null) => {
    if (config) {
      setEditingId(config.id);
      setFormData({
        name: config.name,
        description: config.description || '',
        email: config.email,
        password: config.password || '',
        forward_label: config.forward_label || 'forward',
        recipient_emails: Array.isArray(config.recipient_emails) 
          ? config.recipient_emails.join(', ') 
          : config.recipient_emails || '',
        enabled: config.enabled,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        email: '',
        password: '',
        forward_label: 'forward',
        recipient_emails: '',
        enabled: true,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  // ── Submit Form Handler ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.recipient_emails) {
      setResult({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    const recipientEmails = formData.recipient_emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email);

    if (recipientEmails.length === 0) {
      setResult({ type: 'error', message: 'Please provide at least one recipient email.' });
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      email: formData.email,
      password: formData.password,
      forward_label: formData.forward_label,
      recipient_emails: recipientEmails,
      enabled: formData.enabled,
    };

    try {
      setIsSubmitting(true);

      if (editingId) {
        const response = await botAPI.updateEmailForwardingConfig(editingId, payload);
        if (response.data.success) {
          setResult({ type: 'success', message: 'Configuration updated successfully!' });
          await fetchConfigs();
          handleCloseForm();
        }
      } else {
        const response = await botAPI.createEmailForwardingConfig(payload);
        if (response.data.success) {
          setResult({ type: 'success', message: 'Configuration created successfully!' });
          await fetchConfigs();
          handleCloseForm();
        }
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save configuration.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Configuration Handler ───────────────────────────────────────
  const handleDeleteConfig = (configId) => {
    setDeleteModal({ open: true, configId });
  };

  const confirmDelete = async () => {
    const configId = deleteModal.configId;
    setDeleteModal({ open: false, configId: null });

    try {
      const response = await botAPI.deleteEmailForwardingConfig(configId);
      if (response.data.success) {
        setResult({ type: 'success', message: 'Configuration deleted successfully!' });
        await fetchConfigs();
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete configuration.',
      });
    }
  };

  // ── Toggle Configuration Status ────────────────────────────────────────
  const handleToggle = async (configId, currentStatus) => {
    try {
      const response = await botAPI.updateEmailForwardingConfig(configId, { enabled: !currentStatus });
      if (response.data.success) {
        await fetchConfigs();
        setResult({
          type: 'success',
          message: `Configuration ${!currentStatus ? 'enabled' : 'disabled'}.`,
        });
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update configuration.',
      });
    }
  };

  // ── Test Email Connection ──────────────────────────────────────────────
  const handleTestConnection = async (configId) => {
    try {
      setTestLoading(true);
      const response = await botAPI.testEmailForwarding(configId);
      if (response.data.success) {
        setResult({
          type: 'success',
          message: '✨ Connection successful! Email service is working.',
        });
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Connection test failed. Check your credentials.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  // ── Loading State ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email forwarding configurations...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Forwarding Bot</h1>
          <p className="text-gray-600 mt-2">
            Automatically forward emails with specific labels to your recipients. Powered by Supabase.
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
              <button onClick={clearResult} className="ml-4 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Configuration Management Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Forwarding Configurations</h2>
            <button
              onClick={() => handleOpenForm()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              disabled={configsLoading}
            >
              + Create Configuration
            </button>
          </div>

          {configs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📧</div>
              <p className="mb-4">No email forwarding configurations yet.</p>
              <button
                onClick={() => handleOpenForm()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition inline-block"
              >
                Create Your First Configuration
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      {config.description && (
                        <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">📧 {config.email}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        config.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {config.enabled ? '● Active' : '● Inactive'}
                    </span>
                  </div>

                  {/* Configuration Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-600 text-xs">Labels</p>
                      <p className="font-semibold text-gray-900">{config.forward_label}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-600 text-xs">Recipients</p>
                      <p className="font-semibold text-gray-900">{config.recipient_emails?.length || 0}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-gray-600 text-xs">Emails Checked</p>
                      <p className="font-semibold text-blue-600">{config.emails_checked || 0}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-gray-600 text-xs">Forwarded</p>
                      <p className="font-semibold text-green-600">{config.emails_forwarded || 0}</p>
                    </div>
                  </div>

                  {/* Last Check Info */}
                  <div className="text-xs text-gray-500 mb-4">
                    Last check: {config.last_check_at 
                      ? new Date(config.last_check_at).toLocaleString() 
                      : 'Never'}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleTestConnection(config.id)}
                      disabled={testLoading}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                    >
                      {testLoading ? 'Testing…' : '⚡ Test'}
                    </button>
                    <button
                      onClick={() => handleToggle(config.id, config.enabled)}
                      className={`px-3 py-1 text-sm rounded transition ${
                        config.enabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {config.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleOpenForm(config)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Form Card */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Configuration' : 'New Configuration'}
              </h2>

              <div className="space-y-4">
                {/* Name & Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Configuration Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Support Team Forwarder"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Forward support emails to team"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Email & Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your-email@gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Gmail, Outlook, Yahoo, or custom</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Your app-specific password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use app password, not account password</p>
                  </div>
                </div>

                {/* Label & Recipients */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Forward Label
                    </label>
                    <input
                      type="text"
                      value={formData.forward_label}
                      onChange={(e) => setFormData({ ...formData, forward_label: e.target.value })}
                      placeholder="forward"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Gmail label to monitor (case-insensitive)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Emails <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.recipient_emails}
                      onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
                      placeholder="email1@company.com, email2@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated recipient list</p>
                  </div>
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <label htmlFor="enabled" className="ml-3 block text-sm text-gray-700">
                    Enable this configuration immediately
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 font-semibold"
              >
                {isSubmitting ? 'Saving…' : '💾 Save Configuration'}
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, configId: null })}
        onConfirm={confirmDelete}
        title="Delete Configuration"
        message="Are you sure you want to delete this email forwarding configuration? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default EmailForwarding;
