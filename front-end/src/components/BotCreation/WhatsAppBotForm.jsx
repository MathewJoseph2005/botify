import React, { useState } from 'react';
import { marketplaceAPI } from '../../utils/api';

const WhatsAppBotForm = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    features: '',
    phone_number: '',
    account_sid: '',
    auth_token: '',
    webhook_url: '',
    message_templates: '',
    bot_script: '',
    github_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone_number || !formData.account_sid) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const features = formData.features
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f);

      const payload = {
        name: formData.name,
        description: formData.description,
        platform: 'whatsapp',
        price: parseFloat(formData.price) || 0,
        category: 'WhatsApp Automation',
        features,
        bot_script: formData.bot_script,
        github_link: formData.github_link,
        config_json: {
          phone_number: formData.phone_number,
          account_sid: formData.account_sid,
          auth_token: formData.auth_token,
          webhook_url: formData.webhook_url,
          message_templates: formData.message_templates,
        },
      };

      const response = await marketplaceAPI.createListing(payload);

      if (response.data.success) {
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-5xl mb-2">💬</div>
              <h1 className="text-3xl font-bold text-gray-900">Create WhatsApp Bot</h1>
              <p className="text-gray-600 mt-2">Configure your WhatsApp automation bot</p>
            </div>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Bot Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Bot Name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Price ($)"
                  step="0.01"
                  min="0"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <textarea
                name="features"
                value={formData.features}
                onChange={handleChange}
                placeholder="Features (comma-separated)"
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">WhatsApp Configuration *</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="Phone Number *"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  name="account_sid"
                  value={formData.account_sid}
                  onChange={handleChange}
                  placeholder="Account SID *"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <textarea
                name="auth_token"
                value={formData.auth_token}
                onChange={handleChange}
                placeholder="Auth Token"
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
              <input
                type="url"
                name="webhook_url"
                value={formData.webhook_url}
                onChange={handleChange}
                placeholder="Webhook URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <textarea
                name="message_templates"
                value={formData.message_templates}
                onChange={handleChange}
                placeholder='Message Templates (JSON)'
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Bot Code & Documentation</h2>
              <textarea
                name="bot_script"
                value={formData.bot_script}
                onChange={handleChange}
                placeholder="// Your bot script here..."
                rows="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500">💡 Only visible to buyers who purchase this bot</p>
              <input
                type="url"
                name="github_link"
                value={formData.github_link}
                onChange={handleChange}
                placeholder="GitHub Repository Link"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBotForm;
