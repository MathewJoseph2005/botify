import React, { useState } from 'react';
import { marketplaceAPI } from '../../utils/api';

const InstagramBotForm = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '', description: '', price: 0, features: '',
    account_id: '', access_token: '', webhook_url: '', message_templates: '',
    bot_script: '', github_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.account_id || !formData.access_token) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await marketplaceAPI.createListing({
        name: formData.name,
        description: formData.description,
        platform: 'instagram',
        price: parseFloat(formData.price) || 0,
        category: 'Instagram Bot',
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
        bot_script: formData.bot_script,
        github_link: formData.github_link,
        config_json: {
          account_id: formData.account_id,
          access_token: formData.access_token,
          webhook_url: formData.webhook_url,
          message_templates: formData.message_templates,
        },
      });

      if (response.data.success) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-5xl mb-2">📸</div>
              <h1 className="text-3xl font-bold text-gray-900">Create Instagram Bot</h1>
              <p className="text-gray-600 mt-2">Configure your Instagram DM automation</p>
            </div>
            <button onClick={onCancel} className="text-2xl">✕</button>
          </div>

          {error && <div className="mb-6 p-3 rounded text-red-700 bg-red-50">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Bot Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Bot Name" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" step="0.01" min="0" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
              </div>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" rows="2" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
              <textarea name="features" value={formData.features} onChange={handleChange} placeholder="Features (comma-separated)" rows="2" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Instagram Configuration *</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="account_id" value={formData.account_id} onChange={handleChange} placeholder="Account ID *" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                <input type="text" name="access_token" value={formData.access_token} onChange={handleChange} placeholder="Access Token *" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
              </div>
              <input type="url" name="webhook_url" value={formData.webhook_url} onChange={handleChange} placeholder="Webhook URL" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
              <textarea name="message_templates" value={formData.message_templates} onChange={handleChange} placeholder='Message Templates (JSON)' rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 font-mono text-sm" />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Code & Documentation</h2>
              <textarea name="bot_script" value={formData.bot_script} onChange={handleChange} placeholder="Bot script..." rows="6" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 font-mono text-sm" />
              <input type="url" name="github_link" value={formData.github_link} onChange={handleChange} placeholder="GitHub Link" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500" />
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <button type="button" onClick={onCancel} className="px-6 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create Bot'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InstagramBotForm;