import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { botAPI, marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SellerDashboard = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBots();
    fetchListings();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await botAPI.listBots();
      if (response.data.success) {
        setBots(response.data.bots);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch bots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      const response = await marketplaceAPI.getMyListings();
      if (response.data.success) {
        setListings(response.data.listings);
      }
    } catch (err) {
      // silently fail for listings
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;
    try {
      const response = await botAPI.deleteBot(botId);
      if (response.data.success) {
        await fetchBots();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete bot.');
    }
  };

  const activeBots = bots.filter((b) => b.is_active).length;
  const publishedListings = listings.filter((l) => l.status === 'published').length;
  const totalSales = listings.reduce((sum, l) => sum + (l.total_sales || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-4 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Email Bots</p>
                <p className="text-2xl font-bold text-gray-900">{bots.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Bots</p>
                <p className="text-2xl font-bold text-gray-900">{activeBots}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Marketplace Listings</p>
                <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold text-green-600">{publishedListings}</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-primary-600">{totalSales}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/email-bot"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Manage Email Bots
            </Link>
            <Link
              to="/seller/create-bot"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Create Marketplace Bot
            </Link>
            <button
              onClick={() => { fetchBots(); fetchListings(); }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200"
            >
              Refresh All
            </button>
          </div>
        </div>

        {/* My Bots */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">My Bots</h2>
              <Link
                to="/email-bot"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm"
              >
                + Create Bot
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No bots yet. Create your first bot to get started!</p>
              <Link
                to="/email-bot"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Create Your First Bot
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bot Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bots.map((bot) => (
                    <tr key={bot.bot_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{bot.bot_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{bot.bot_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(bot.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            bot.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {bot.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link to="/email-bot" className="text-primary-600 hover:text-primary-900 mr-4">
                          Manage
                        </Link>
                        <button
                          onClick={() => handleDeleteBot(bot.bot_id)}
                          className="text-red-600 hover:text-red-900"
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
      </div>
    </div>
  );
};

export default SellerDashboard;
