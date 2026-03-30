import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EditBotModal from '../components/EditBotModal';

const CreateMarketplaceBotPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingListing, setEditingListing] = useState(null);
  const [loadingListing, setLoadingListing] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await marketplaceAPI.getMyListings();
      if (response.data.success) {
        setListings(response.data.listings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch listings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await marketplaceAPI.deleteListing(id);
      await fetchListings();
    } catch (err) {
      setError('Failed to delete listing');
    }
  };

  const handlePublish = async (id, publish) => {
    try {
      await marketplaceAPI.publishListing(id, publish);
      await fetchListings();
    } catch (err) {
      setError('Failed to update listing');
    }
  };

  const handleEdit = async (listing) => {
    try {
      setLoadingListing(true);
      const response = await marketplaceAPI.getListing(listing.id);
      if (response.data.success) {
        setEditingListing(response.data.listing);
      }
    } catch (err) {
      setError('Failed to load bot details');
    } finally {
      setLoadingListing(false);
    }
  };

  const getPlatformEmoji = (platform) => {
    const emojis = {
      email: '📧',
      whatsapp: '💬',
      telegram: '✈️',
      discord: '🎮',
      slack: '💼',
      instagram: '📸',
    };
    return emojis[platform] || '🤖';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Marketplace Listings</h1>
            <p className="text-gray-600 mt-2">Manage your published bots</p>
          </div>
          <button
            onClick={() => navigate('/bot-creation')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            + Create New Bot
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Listings</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{listings.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{listings.filter(l => l.status === 'published').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{listings.filter(l => l.status === 'draft').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{listings.reduce((sum, l) => sum + (l.total_sales || 0), 0)}</p>
          </div>
        </div>

        {/* Listings Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No bots created yet</p>
            <button
              onClick={() => navigate('/bot-creation')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Create Your First Bot
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Bot</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Platform</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Price</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Sales</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{listing.name}</div>
                      <div className="text-sm text-gray-500">{listing.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-2xl">{getPlatformEmoji(listing.platform)}</span> {listing.platform}
                    </td>
                    <td className="px-6 py-4 font-semibold">${listing.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        listing.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{listing.total_sales || 0}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(listing)}
                        className="text-sm px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePublish(listing.id, listing.status !== 'published')}
                        className="text-sm px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        {listing.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Bot Modal */}
      {editingListing && (
        <EditBotModal
          listing={editingListing}
          isLoading={loadingListing}
          onClose={() => setEditingListing(null)}
          onUpdate={fetchListings}
        />
      )}
    </div>
  );
};

export default CreateMarketplaceBotPage;
