import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { botAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EmailForwarding = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Configuration Management State ──────────────────────────────────────
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
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
    fetchLogs();

    // Check for OAuth Code in URL
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, [location.search]);

  const fetchLogs = async () => {
    try {
      const response = await botAPI.getEmailForwardingLogs();
      if (response.data.success) {
        setLogs(response.data.logs || []);
        processChartData(response.data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processChartData = (data) => {
    const grouped = {};
    data.forEach(log => {
      const date = new Date(log.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { date, success: 0, failed: 0 };
      if (log.status === 'success') grouped[date].success += log.recipients_count || 1;
      else grouped[date].failed += 1;
    });
    setChartData(Object.values(grouped).reverse());
  };

  const handleOAuthCallback = async (code) => {
    try {
      setLoading(true);
      const res = await botAPI.exchangeOAuthCode(code);
      if (res.data.success && res.data.tokens.refresh_token) {
        setFormData(prev => ({ ...prev, password: res.data.tokens.refresh_token }));
        setShowForm(true);
        setResult({ type: 'success', message: 'Google Account successfully linked! Finish your configuration.' });
      }
      navigate('/email-forwarding', { replace: true });
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to authenticate with Google.' });
      navigate('/email-forwarding', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await botAPI.getOAuthURL();
      if (res.data.success) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to connect to Google.' });
    }
  };

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
    <div className="min-h-screen relative overflow-hidden bg-[#FEFDF7]">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-yellow-300/20 to-transparent pointer-events-none animate-pulse-slow" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-300/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-yellow-400/20 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Email Forwarding Hub</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Monitor, securely authorize, and automate your inbox streams.
          </p>
        </div>

        {/* Result Banner */}
        {result && (
          <div
            className={`mb-6 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-sm ${
              result.type === 'success'
                ? 'bg-green-50/80 border-green-200 text-green-700'
                : 'bg-red-50/80 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{result.message}</span>
              <button onClick={clearResult} className="ml-4 text-2xl leading-none opacity-60 hover:opacity-100 transition">&times;</button>
            </div>
          </div>
        )}

        {/* Dashboard Analytics Card */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-black/5 p-6 mb-8 mt-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
              Activity Overview
            </h2>
            <div className="h-72 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000015" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSuccess)" name="Successful Forwards" />
                    <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorFailed)" name="Failed Attempts" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex bg-gray-100/30 rounded-2xl items-center justify-center h-full text-gray-500 border border-dashed border-gray-300">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Insufficient routing data to plot charts.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Management Card */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-black/5 p-6 mb-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Configurations</h2>
            <button
              onClick={() => handleOpenForm()}
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition flex items-center gap-2 shadow-md hover:shadow-lg shadow-black/10"
              disabled={configsLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Create New
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

              {/* OAuth Recommendation Banner */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 000-2H8zm0 3a1 1 0 000 2h3a1 1 0 000-2H8z" clipRule="evenodd"/>
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">🔒 Use Google OAuth (Recommended)</p>
                    <p className="text-blue-700">Google no longer accepts regular passwords for third-party apps. Click &quot;Secure: Connect with Google OAuth&quot; below for the safest, easiest setup.</p>
                  </div>
                </div>
              </div>

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
                      className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
                    />
                    <p className="text-xs text-gray-500 mt-1">Gmail or Custom Domain</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Authentication <span className="text-red-500">*</span>
                    </label>
                    {formData.password && formData.password.startsWith('1//') ? (
                       <div className="w-full px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-between font-medium">
                          <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Google Account Linked ✓
                          </span>
                          <button type="button" onClick={() => setFormData({ ...formData, password: '' })} className="text-sm underline hover:text-green-800">Change</button>
                       </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-xl flex items-center justify-center gap-2 transition font-medium shadow-sm"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          🔒 Secure: Connect with Google OAuth
                        </button>
                        
                        <details className="cursor-pointer">
                          <summary className="text-xs text-gray-600 hover:text-gray-700 font-medium py-2">
                            📝 Alternative: Use App Password (Less Secure)
                          </summary>
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                            <p className="text-xs text-amber-800">⚠️ Gmail App Passwords are less secure and deprecated. Google OAuth is recommended.</p>
                            <input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="16-character app password"
                              className="w-full px-4 py-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                            />
                            <p className="text-xs text-gray-600">Get app password: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">myaccount.google.com/apppasswords</a></p>
                          </div>
                        </details>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Recommended: Use Google OAuth for secure, password-free access.</p>
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
