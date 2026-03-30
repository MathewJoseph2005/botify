import React, { useState } from 'react';
import { marketplaceAPI } from '../../utils/api';

const EmailBotForm = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Email Automation',
    features: '',
    // Email-specific
    smtp_host: '',
    smtp_port: 587,
    email_address: '',
    template_html: '',
    reply_rules: '',
    // Script
    bot_script: '',
    github_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    if (!formData.name || !formData.smtp_host || !formData.email_address) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Parse features from comma-separated string
      const features = formData.features
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f);

      const payload = {
        name: formData.name,
        description: formData.description,
        platform: 'email',
        price: parseFloat(formData.price) || 0,
        category: formData.category,
        features,
        bot_script: formData.bot_script,
        github_link: formData.github_link,
        config_json: {
          smtp_host: formData.smtp_host,
          smtp_port: parseInt(formData.smtp_port),
          email_address: formData.email_address,
          template_html: formData.template_html,
          reply_rules: formData.reply_rules,
        },
      };

      const response = await marketplaceAPI.createListing(payload);

      if (response.data.success) {
        setSuccess('✅ Email bot created successfully!');
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-5xl mb-2">📧</div>
              <h1 className="text-3xl font-bold text-gray-900">Create Email Bot</h1>
              <p className="text-gray-600 mt-2">Configure your automated email bot</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 px-4 py-3 rounded-lg border bg-green-50 border-green-200 text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Bot Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="My Awesome Email Bot"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price ($) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="9.99"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what your bot does..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features (comma-separated)</label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleChange}
                  placeholder="Auto-reply, Bulk send, Template support, Scheduled emails"
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email Configuration */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">SMTP Configuration *</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host *</label>
                  <input
                    type="text"
                    name="smtp_host"
                    value={formData.smtp_host}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port *</label>
                  <input
                    type="number"
                    name="smtp_port"
                    value={formData.smtp_port}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  name="email_address"
                  value={formData.email_address}
                  onChange={handleChange}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Template (HTML)</label>
                <textarea
                  name="template_html"
                  value={formData.template_html}
                  onChange={handleChange}
                  placeholder="<html><body><h1>Hello {{name}}</h1></body></html>"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reply Rules (JSON)</label>
                <textarea
                  name="reply_rules"
                  value={formData.reply_rules}
                  onChange={handleChange}
                  placeholder='{"keyword": "reply_content"}'
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            </div>

            {/* Script & GitHub */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Bot Code & Documentation</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bot Script Code</label>
                <textarea
                  name="bot_script"
                  value={formData.bot_script}
                  onChange={handleChange}
                  placeholder="// Your bot script here..."
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">💡 This code will only be visible to buyers who purchase this bot</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Repository Link</label>
                <input
                  type="url"
                  name="github_link"
                  value={formData.github_link}
                  onChange={handleChange}
                  placeholder="https://github.com/username/email-bot"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">💡 Only visible to buyers after purchase</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
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

export default EmailBotForm;
