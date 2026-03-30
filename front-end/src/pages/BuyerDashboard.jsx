import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { botAPI, marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BotTable from '../components/BotTable';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessModal, setAccessModal] = useState({ open: false, loading: false, bot: null, resource: null });
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    fetchBots();
    fetchPurchases();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await botAPI.listBots();
      if (response.data.success) {
        setBots(response.data.bots || []);
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
      setError(err.response?.data?.message || 'Failed to fetch bots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await marketplaceAPI.getMyPurchases();
      if (response.data.success) {
        setPurchases(response.data.purchases || []);
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
      // silently fail for purchases
    }
  };

  const handleViewPurchasedBot = async (purchase) => {
    const bot = purchase?.marketplace_bots;
    const botId = purchase?.marketplace_bot_id || bot?.id;

    if (!botId) {
      setError('Unable to open bot details. Missing bot id.');
      return;
    }

    setAccessError('');
    setAccessModal({ open: true, loading: true, bot, resource: null });

    try {
      const res = await marketplaceAPI.getBotAccess(botId);
      if (res.data.success) {
        setAccessModal({ open: true, loading: false, bot, resource: res.data.bot });
      } else {
        setAccessModal({ open: true, loading: false, bot, resource: null });
      }
    } catch (err) {
      setAccessError(err.response?.data?.message || 'Failed to load purchased bot access details.');
      setAccessModal({ open: true, loading: false, bot, resource: null });
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
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/marketplace"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Browse Marketplace
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
              <div className="flex gap-2">
                <Link
                  to="/email-forwarding"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm flex items-center gap-1 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  Email Forwarding
                </Link>
                <Link
                  to="/email-bot"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-medium"
                >
                  + Create Bot
                </Link>
              </div>
            </div>
          </div>

          {loading ? (
            <BotTable bots={[]} loading={true} />
          ) : (
            <BotTable
              bots={bots}
              loading={false}
              emptyMessage="No bots yet. Create one from the Email Bot page!"
              emptyLinkText="Go to Email Bot"
              emptyLinkTo="/email-bot"
              showManage={true}
              onDelete={null}
            />
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
                const featureList = Array.isArray(bot?.features) ? bot.features : [];
                return (
                  <button
                    key={purchase.id}
                    type="button"
                    onClick={() => handleViewPurchasedBot(purchase)}
                    className="w-full p-6 hover:bg-gray-50 text-left transition"
                  >
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

                    <div className="mt-3 ml-11">
                      {bot?.description && (
                        <p className="text-sm text-gray-700 mb-2">{bot.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {bot?.category && (
                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                            {bot.category}
                          </span>
                        )}
                        {bot?.status && (
                          <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                            {bot.status}
                          </span>
                        )}
                      </div>

                      {featureList.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {featureList.map((feature, idx) => (
                            <span key={`${purchase.id}-feature-${idx}`} className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">
                          View access details
                          <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Purchased Bot Access Modal */}
        {accessModal.open && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setAccessModal({ open: false, loading: false, bot: null, resource: null });
              setAccessError('');
            }}
          >
            <div
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{accessModal.bot?.name || 'Purchased Bot'}</h3>
                  <p className="text-sm text-gray-500">Access details provided by the seller</p>
                </div>
                <button
                  onClick={() => {
                    setAccessModal({ open: false, loading: false, bot: null, resource: null });
                    setAccessError('');
                  }}
                  className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-5">
                {accessError && (
                  <div className="px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
                    {accessError}
                  </div>
                )}

                {accessModal.loading ? (
                  <div className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading bot details...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-700">
                        {accessModal.bot?.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {accessModal.bot?.category && (
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          {accessModal.bot.category}
                        </span>
                      )}
                      {accessModal.bot?.status && (
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                          {accessModal.bot.status}
                        </span>
                      )}
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        {accessModal.bot?.platform || accessModal.resource?.platform || 'unknown'}
                      </span>
                    </div>

                    {Array.isArray(accessModal.bot?.features) && accessModal.bot.features.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Features</h4>
                        <div className="flex flex-wrap gap-2">
                          {accessModal.bot.features.map((feature, idx) => (
                            <span key={`modal-feature-${idx}`} className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">GitHub Link</h4>
                      {accessModal.resource?.github_link ? (
                        <a
                          href={accessModal.resource.github_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {accessModal.resource.github_link}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">No GitHub link provided.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Script</h4>
                      {accessModal.resource?.bot_script ? (
                        <pre className="text-xs bg-gray-900 text-green-200 p-4 rounded-lg overflow-auto max-h-72 whitespace-pre-wrap">
                          {accessModal.resource.bot_script}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500">No script provided.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Configuration</h4>
                      {accessModal.resource?.config_json && Object.keys(accessModal.resource.config_json).length > 0 ? (
                        <pre className="text-xs bg-gray-100 text-gray-800 p-4 rounded-lg overflow-auto max-h-72 whitespace-pre-wrap">
                          {JSON.stringify(accessModal.resource.config_json, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500">No additional configuration provided.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
