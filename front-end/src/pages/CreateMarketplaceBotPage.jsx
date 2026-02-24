import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = [
  { value: 'email', label: 'Email', icon: '📧', color: 'bg-blue-100 text-blue-700' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-700' },
  { value: 'telegram', label: 'Telegram', icon: '✈️', color: 'bg-sky-100 text-sky-700' },
  { value: 'discord', label: 'Discord', icon: '🎮', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'slack', label: 'Slack', icon: '💼', color: 'bg-purple-100 text-purple-700' },
  { value: 'instagram', label: 'Instagram', icon: '📸', color: 'bg-pink-100 text-pink-700' },
];

const CATEGORIES = [
  'Customer Support',
  'Marketing',
  'Sales',
  'Notifications',
  'Analytics',
  'Automation',
  'Social Media',
  'E-commerce',
  'Other',
];

const CreateMarketplaceBotPage = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    platform: '',
    price: '',
    features: '',
    category: '',
    image_url: '',
  });

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await marketplaceAPI.getMyListings();
      if (res.data.success) {
        setListings(res.data.listings);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch listings.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', platform: '', price: '', features: '', category: '', image_url: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.platform || !form.price) {
      setError('Name, platform, and price are required.');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      platform: form.platform,
      price: parseFloat(form.price),
      features: form.features
        ? form.features.split(',').map((f) => f.trim()).filter(Boolean)
        : [],
      category: form.category || null,
      image_url: form.image_url || null,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        const res = await marketplaceAPI.updateListing(editingId, payload);
        if (res.data.success) {
          setSuccess('Listing updated successfully!');
        }
      } else {
        const res = await marketplaceAPI.createListing(payload);
        if (res.data.success) {
          setSuccess('Listing created successfully!');
        }
      }
      resetForm();
      fetchListings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save listing.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (listing) => {
    setForm({
      name: listing.name,
      description: listing.description || '',
      platform: listing.platform,
      price: listing.price.toString(),
      features: listing.features ? listing.features.join(', ') : '',
      category: listing.category || '',
      image_url: listing.image_url || '',
    });
    setEditingId(listing.id);
    setShowForm(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await marketplaceAPI.deleteListing(id);
      if (res.data.success) {
        setSuccess('Listing deleted.');
        fetchListings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete listing.');
    }
  };

  const handlePublishToggle = async (id, currentStatus) => {
    try {
      const publish = currentStatus !== 'published';
      const res = await marketplaceAPI.publishListing(id, publish);
      if (res.data.success) {
        setSuccess(publish ? 'Bot published to marketplace!' : 'Bot unpublished.');
        fetchListings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const getPlatformInfo = (val) => PLATFORMS.find((p) => p.value === val) || { label: val, icon: '🤖', color: 'bg-gray-100 text-gray-700' };

  const publishedCount = listings.filter((l) => l.status === 'published').length;
  const draftCount = listings.filter((l) => l.status === 'draft').length;
  const totalSales = listings.reduce((sum, l) => sum + (l.total_sales || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Marketplace Listings</h1>
            <p className="text-gray-600 mt-1">Create and manage bots for the marketplace</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setError(''); setSuccess(''); }}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition font-medium"
          >
            {showForm ? 'Cancel' : '+ Create New Bot'}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-4 text-lg leading-none">&times;</button>
          </div>
        )}
        {success && (
          <div className="mb-6 px-4 py-3 rounded-lg border bg-green-50 border-green-200 text-green-700 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-4 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Total Listings</p>
            <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-primary-600">{totalSales}</p>
          </div>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Edit Bot Listing' : 'Create New Bot Listing'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Bot Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g. SmartMailer Pro"
                  required
                />
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, platform: p.value })}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition ${
                        form.platform === p.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1">{p.icon}</span>
                      <span className="text-xs font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe what your bot does, its capabilities, and use cases..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="29.99"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features <span className="text-gray-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Auto-reply, Scheduling, Analytics, Templates"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://example.com/bot-image.png"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg transition font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Listing' : 'Create Listing'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listings Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your Bot Listings</h2>
              <button
                onClick={fetchListings}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-5xl mb-4">🤖</div>
              <p className="text-lg mb-2">No listings yet</p>
              <p className="mb-4">Create your first bot listing to start selling on the marketplace!</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Create Your First Bot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {listings.map((listing) => {
                const platformInfo = getPlatformInfo(listing.platform);
                return (
                  <div key={listing.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">{platformInfo.icon}</span>
                          <h3 className="text-lg font-semibold text-gray-900">{listing.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${platformInfo.color}`}>
                            {platformInfo.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              listing.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : listing.status === 'archived'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {listing.status}
                          </span>
                        </div>
                        {listing.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-medium text-gray-900">${parseFloat(listing.price).toFixed(2)}</span>
                          {listing.category && <span>• {listing.category}</span>}
                          <span>• {listing.total_sales || 0} sales</span>
                          <span>• {new Date(listing.created_at).toLocaleDateString()}</span>
                        </div>
                        {listing.features && listing.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {listing.features.map((f, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePublishToggle(listing.id, listing.status)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition font-medium ${
                            listing.status === 'published'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {listing.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleEdit(listing)}
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMarketplaceBotPage;
