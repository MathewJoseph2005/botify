import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { botAPI, marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBots();
    fetchPurchases();
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

  const fetchPurchases = async () => {
    try {
      const response = await marketplaceAPI.getMyPurchases();
      if (response.data.success) {
        setPurchases(response.data.purchases);
      }
    } catch (err) {
      // silently fail
    }
  };

  const activeBots = bots.filter((b) => b.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Bots</p>
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
                <p className="text-sm text-gray-600">Purchased Bots</p>
                <p className="text-2xl font-bold text-purple-600">{purchases.length}</p>
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
                <p className="text-sm text-gray-600">Inactive Bots</p>
                <p className="text-2xl font-bold text-gray-900">{bots.length - activeBots}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
              to="/marketplace"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Browse Marketplace
            </Link>
            <Link
              to="/email-bot"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Email Bot Manager
            </Link>
            <button
              onClick={fetchBots}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition duration-200"
            >
              Refresh Bots
            </button>
          </div>
        </div>

        {/* My Bots Table */}
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
              <p className="mb-4">No bots yet. Create one from the Email Bot page!</p>
              <Link
                to="/email-bot"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Go to Email Bot
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
                        <Link to="/email-bot" className="text-primary-600 hover:text-primary-900">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Purchased Bots from Marketplace */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Purchased from Marketplace</h2>
              <Link
                to="/marketplace"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>

          {purchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No marketplace purchases yet.</p>
              <Link
                to="/marketplace"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Explore the Marketplace
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {purchases.map((purchase) => {
                const bot = purchase.marketplace_bots;
                const platformIcons = { email: '📧', whatsapp: '💬', telegram: '✈️', discord: '🎮', slack: '💼', instagram: '📸' };
                return (
                  <div key={purchase.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{platformIcons[bot?.platform] || '🤖'}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{bot?.name || 'Unknown Bot'}</h3>
                          <p className="text-sm text-gray-500">
                            {bot?.platform} • Purchased {new Date(purchase.purchased_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        ${parseFloat(purchase.amount).toFixed(2)}
                      </span>
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

export default BuyerDashboard;
