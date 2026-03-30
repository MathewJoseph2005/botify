import React, { useState } from 'react';
import { marketplaceAPI } from '../../utils/api';

const SlackBotForm = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '', description: '', price: 0, features: '',
    bot_token: '', workspace_id: '', signing_secret: '', event_subscriptions: '',
    bot_script: '', github_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.bot_token || !formData.workspace_id) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await marketplaceAPI.createListing({
        name: formData.name,
        description: formData.description,
        platform: 'slack',
        price: parseFloat(formData.price) || 0,
        category: 'Slack Bot',
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
        bot_script: formData.bot_script,
        github_link: formData.github_link,
        config_json: {
          bot_token: formData.bot_token,
          workspace_id: formData.workspace_id,
          signing_secret: formData.signing_secret,
          event_subscriptions: formData.event_subscriptions,
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-5xl mb-2">💼</div>
              <h1 className="text-3xl font-bold text-gray-900">Create Slack Bot</h1>
              <p className="text-gray-600 mt-2">Configure your Slack workspace automation</p>
            </div>
            <button onClick={onCancel} className="text-2xl">✕</button>
          </div>

          {error && <div className="mb-6 p-3 rounded text-red-700 bg-red-50">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Bot Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Bot Name" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" step="0.01" min="0" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" rows="2" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              <textarea name="features" value={formData.features} onChange={handleChange} placeholder="Features (comma-separated)" rows="2" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Slack Configuration *</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="bot_token" value={formData.bot_token} onChange={handleChange} placeholder="Bot Token *" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                <input type="text" name="workspace_id" value={formData.workspace_id} onChange={handleChange} placeholder="Workspace ID *" className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <textarea name="signing_secret" value={formData.signing_secret} onChange={handleChange} placeholder='Signing Secret' rows="2" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
              <textarea name="event_subscriptions" value={formData.event_subscriptions} onChange={handleChange} placeholder='Event Subscriptions (comma-separated)' rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Code & Documentation</h2>
              <textarea name="bot_script" value={formData.bot_script} onChange={handleChange} placeholder="Bot script..." rows="6" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
              <input type="url" name="github_link" value={formData.github_link} onChange={handleChange} placeholder="GitHub Link" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <button type="button" onClick={onCancel} className="px-6 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create Bot'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SlackBotForm;