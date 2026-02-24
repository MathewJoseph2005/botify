import { useState, useEffect } from 'react';
import { marketplaceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = [
  { value: '', label: 'All Platforms', icon: '🌐' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'slack', label: 'Slack', icon: '💼' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const Marketplace = () => {
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purchasing, setPurchasing] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);

  // Filters
  const [platform, setPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchListings();
  }, [platform, sort]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (platform) params.platform = platform;
      if (search) params.search = search;
      if (sort) params.sort = sort;

      const res = await marketplaceAPI.browse(params);
      if (res.data.success) {
        setListings(res.data.listings);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load marketplace.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const handlePurchase = async (botId) => {
    if (!isAuthenticated) {
      setError('Please log in to purchase bots.');
      return;
    }
    if (user?.role_id !== 3) {
      setError('Only buyers can purchase bots. Please sign up as a buyer.');
      return;
    }
    if (!confirm('Are you sure you want to purchase this bot?')) return;

    try {
      setPurchasing(botId);
      setError('');
      const res = await marketplaceAPI.purchase(botId);
      if (res.data.success) {
        setSuccess('Bot purchased successfully! Check your Buyer Dashboard.');
        fetchListings();
        setSelectedBot(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Purchase failed.');
    } finally {
      setPurchasing(null);
    }
  };

  const getPlatformInfo = (val) => PLATFORMS.find((p) => p.value === val) || { label: val, icon: '🤖' };

  const getPlatformColor = (val) => {
    const colors = {
      email: 'bg-blue-100 text-blue-700',
      whatsapp: 'bg-green-100 text-green-700',
      telegram: 'bg-sky-100 text-sky-700',
      discord: 'bg-indigo-100 text-indigo-700',
      slack: 'bg-purple-100 text-purple-700',
      instagram: 'bg-pink-100 text-pink-700',
    };
    return colors[val] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Bot Marketplace</h1>
          <p className="text-primary-100 text-lg mb-6">
            Discover powerful bots for every platform. Built by sellers, ready for you.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bots by name or description..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-white focus:outline-none"
            />
            <button
              type="submit"
              className="bg-white text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Platform Filter Pills */}
          <div className="flex flex-wrap gap-2 flex-1">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  platform === p.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-400'
                }`}
              >
                <span className="mr-1">{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* Sort Select */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            {listings.length} bot{listings.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Bot Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading marketplace...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bots found</h3>
            <p className="text-gray-500">
              {search || platform ? 'Try adjusting your filters or search query.' : 'No bots have been published yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((bot) => {
              const pInfo = getPlatformInfo(bot.platform);
              return (
                <div
                  key={bot.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 overflow-hidden flex flex-col"
                >
                  {/* Card Header / Image */}
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    {bot.image_url ? (
                      <img
                        src={bot.image_url}
                        alt={bot.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-6xl">{pInfo.icon}</span>
                    )}
                    <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold rounded-full ${getPlatformColor(bot.platform)}`}>
                      {pInfo.label}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{bot.name}</h3>
                    <p className="text-sm text-gray-500 mb-1">by {bot.seller_name}</p>
                    {bot.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bot.description}</p>
                    )}

                    {/* Features */}
                    {bot.features && bot.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {bot.features.slice(0, 3).map((f, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {f}
                          </span>
                        ))}
                        {bot.features.length > 3 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                            +{bot.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 mt-auto">
                      {bot.category && <span>{bot.category}</span>}
                      <span>{bot.total_sales || 0} sales</span>
                    </div>

                    {/* Price + Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-2xl font-bold text-gray-900">
                        {parseFloat(bot.price) === 0 ? 'Free' : `$${parseFloat(bot.price).toFixed(2)}`}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedBot(selectedBot?.id === bot.id ? null : bot)}
                          className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handlePurchase(bot.id)}
                          disabled={purchasing === bot.id}
                          className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50"
                        >
                          {purchasing === bot.id ? 'Buying...' : 'Buy Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bot Detail Modal */}
        {selectedBot && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBot(null)}>
            <div
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative rounded-t-2xl">
                {selectedBot.image_url ? (
                  <img src={selectedBot.image_url} alt={selectedBot.name} className="w-full h-full object-cover rounded-t-2xl" />
                ) : (
                  <span className="text-7xl">{getPlatformInfo(selectedBot.platform).icon}</span>
                )}
                <button
                  onClick={() => setSelectedBot(null)}
                  className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 transition"
                >
                  &times;
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getPlatformColor(selectedBot.platform)}`}>
                    {getPlatformInfo(selectedBot.platform).label}
                  </span>
                  {selectedBot.category && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                      {selectedBot.category}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedBot.name}</h2>
                <p className="text-sm text-gray-500 mb-4">by {selectedBot.seller_name}</p>

                {selectedBot.description && (
                  <p className="text-gray-700 mb-4">{selectedBot.description}</p>
                )}

                {selectedBot.features && selectedBot.features.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Features</h4>
                    <ul className="space-y-1">
                      {selectedBot.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <span>{selectedBot.total_sales || 0} sales</span>
                  <span>Listed {new Date(selectedBot.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-3xl font-bold text-gray-900">
                    {parseFloat(selectedBot.price) === 0 ? 'Free' : `$${parseFloat(selectedBot.price).toFixed(2)}`}
                  </span>
                  <button
                    onClick={() => handlePurchase(selectedBot.id)}
                    disabled={purchasing === selectedBot.id}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50"
                  >
                    {purchasing === selectedBot.id ? 'Processing...' : 'Purchase Bot'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
