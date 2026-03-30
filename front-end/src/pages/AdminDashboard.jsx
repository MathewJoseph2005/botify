import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';

const TABS = ['Overview', 'Users', 'Marketplace', 'Transactions'];

const PLATFORM_ICONS = {
  email: '📧', whatsapp: '💬', telegram: '✈️', discord: '🎮', slack: '💼', instagram: '📸',
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User table states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSortBy, setUserSortBy] = useState('newest');

  // Marketplace filter
  const [listingStatusFilter, setListingStatusFilter] = useState('all');
  const [listingPlatformFilter, setListingPlatformFilter] = useState('all');

  // Modal states
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [banModal, setBanModal] = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [userDetailModal, setUserDetailModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role_id: 3 });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, listingsRes, purchasesRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getStats(),
        adminAPI.getMarketplaceListings(),
        adminAPI.getPurchases(),
      ]);
      if (usersRes.data.success) setUsers(usersRes.data.users);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (listingsRes.data.success) setListings(listingsRes.data.listings);
      if (purchasesRes.data.success) setPurchases(purchasesRes.data.purchases);
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Formatting helpers ----
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getRoleBadge = (role) => {
    const colors = { admin: 'bg-purple-100 text-purple-800', seller: 'bg-blue-100 text-blue-800', buyer: 'bg-green-100 text-green-800' };
    return colors[role?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const colors = { published: 'bg-green-100 text-green-700', draft: 'bg-yellow-100 text-yellow-700', archived: 'bg-gray-100 text-gray-600' };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getRoleNameFromId = (roleId) => ({ 1: 'admin', 2: 'seller', 3: 'buyer' }[roleId] || 'buyer');

  // ---- User filtering & sorting ----
  const filteredUsers = users
    .filter(u => {
      if (userRoleFilter !== 'all' && u.role_name !== userRoleFilter) return false;
      if (userStatusFilter === 'active' && u.is_banned) return false;
      if (userStatusFilter === 'banned' && !u.is_banned) return false;
      if (userSearch) {
        const q = userSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (userSortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (userSortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (userSortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  // ---- Marketplace filtering ----
  const filteredListings = listings
    .filter(l => {
      if (listingStatusFilter !== 'all' && l.status !== listingStatusFilter) return false;
      if (listingPlatformFilter !== 'all' && l.platform !== listingPlatformFilter) return false;
      return true;
    });

  // ---- User CRUD handlers ----
  const handleEditClick = (u) => {
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '', role_id: u.role_id });
    setEditModal({ open: true, user: u });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await adminAPI.updateUser(editModal.user.user_id, editForm);
      if (res.data.success) {
        setUsers(users.map(u => u.user_id === editModal.user.user_id ? { ...u, ...editForm, role_name: getRoleNameFromId(editForm.role_id) } : u));
        setEditModal({ open: false, user: null });
        setSuccess('User updated successfully.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
      setTimeout(() => setError(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanConfirm = async () => {
    setActionLoading(true);
    try {
      const newBanStatus = !banModal.user.is_banned;
      const res = await adminAPI.banUser(banModal.user.user_id, newBanStatus);
      if (res.data.success) {
        setUsers(users.map(u => u.user_id === banModal.user.user_id ? { ...u, is_banned: newBanStatus } : u));
        setBanModal({ open: false, user: null });
        setSuccess(newBanStatus ? 'User banned.' : 'User unbanned.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
      setTimeout(() => setError(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await adminAPI.deleteUser(deleteModal.user.user_id);
      if (res.data.success) {
        setUsers(users.filter(u => u.user_id !== deleteModal.user.user_id));
        setDeleteModal({ open: false, user: null });
        setSuccess('User deleted.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
      setTimeout(() => setError(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const s = stats || { users: {}, bots: {}, marketplace: {}, revenue: {} };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <button
            onClick={loadAll}
            className="mt-3 sm:mt-0 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-medium"
          >
            ↻ Refresh All
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-4 text-lg">&times;</button>
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-4 text-lg">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6 -mb-px">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/email-forwarding"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Email Forwarding
            </Link>
            <Link
              to="/email-bot"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200 text-center"
            >
              Manage Email Bots
            </Link>
            <button
              onClick={loadAll}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'Overview' && (
          <>
            {/* Primary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Users" value={s.users.total || 0} icon="👥" bg="bg-blue-50" />
              <StatCard label="Total Revenue" value={formatCurrency(s.revenue.total)} icon="💰" bg="bg-green-50" />
              <StatCard label="Marketplace Bots" value={s.marketplace.totalListings || 0} icon="🤖" bg="bg-purple-50" />
              <StatCard label="Total Purchases" value={s.revenue.totalPurchases || 0} icon="🛒" bg="bg-orange-50" />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Sellers" value={s.users.sellers || 0} icon="🏪" bg="bg-sky-50" sub={`of ${s.users.total} users`} />
              <StatCard label="Buyers" value={s.users.buyers || 0} icon="🛍️" bg="bg-emerald-50" sub={`of ${s.users.total} users`} />
              <StatCard label="New This Week" value={s.users.newThisWeek || 0} icon="📈" bg="bg-indigo-50" sub="user signups" />
              <StatCard label="Revenue This Month" value={formatCurrency(s.revenue.thisMonth)} icon="📊" bg="bg-teal-50" />
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Published Bots" value={s.marketplace.published || 0} icon="✅" bg="bg-green-50" />
              <StatCard label="Draft Bots" value={s.marketplace.drafts || 0} icon="📝" bg="bg-yellow-50" />
              <StatCard label="Email Bots" value={s.bots.total || 0} icon="📧" bg="bg-blue-50" sub={`${s.bots.active || 0} active`} />
              <StatCard label="Banned Users" value={s.users.banned || 0} icon="🚫" bg="bg-red-50" />
            </div>

            {/* Platform Breakdown + Recent Activity side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Platform Breakdown */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Platform Breakdown</h3>
                </div>
                <div className="p-5">
                  {s.marketplace.platformBreakdown && Object.keys(s.marketplace.platformBreakdown).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(s.marketplace.platformBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([platform, count]) => {
                          const total = s.marketplace.totalListings || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={platform}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {PLATFORM_ICONS[platform] || '🤖'} {platform}
                                </span>
                                <span className="text-sm text-gray-500">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">No marketplace listings yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Users */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {users.slice(0, 6).map(u => (
                    <div key={u.user_id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setUserDetailModal({ open: true, user: u })}>
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${u.is_banned ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getRoleBadge(u.role_name)}`}>
                          {u.role_name}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(u.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No users yet.</p>}
                </div>
              </div>
            </div>

            {/* Recent Transactions (real) */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <button onClick={() => setActiveTab('Transactions')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all →</button>
              </div>
              {purchases.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases.slice(0, 5).map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm text-gray-900">{p.buyer_name}</td>
                          <td className="px-5 py-3 text-sm text-gray-900">
                            {PLATFORM_ICONS[p.bot_platform] || '🤖'} {p.bot_name}
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{formatDate(p.purchased_at)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== USERS TAB ==================== */}
        {activeTab === 'Users' && (
          <>
            {/* Search & Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
                <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
                <select value={userSortBy} onChange={(e) => setUserSortBy(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">A-Z Name</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-2">{filteredUsers.length} of {users.length} users shown</p>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">No users match your filters.</td></tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.user_id} className={`hover:bg-gray-50 ${u.is_banned ? 'bg-red-50/50' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setUserDetailModal({ open: true, user: u })}>
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${u.is_banned ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'}`}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{u.phone || '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${getRoleBadge(u.role_name)}`}>{u.role_name}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${u.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {u.is_banned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                          <td className="px-5 py-3 text-sm">
                            <div className="flex gap-2">
                              <button onClick={() => handleEditClick(u)} className="text-primary-600 hover:text-primary-800 font-medium">Edit</button>
                              {u.role_name !== 'admin' && (
                                <>
                                  <button onClick={() => setBanModal({ open: true, user: u })} className={`font-medium ${u.is_banned ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}>
                                    {u.is_banned ? 'Unban' : 'Ban'}
                                  </button>
                                  <button onClick={() => setDeleteModal({ open: true, user: u })} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== MARKETPLACE TAB ==================== */}
        {activeTab === 'Marketplace' && (
          <>
            {/* Marketplace Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Listings" value={listings.length} icon="🤖" bg="bg-blue-50" />
              <StatCard label="Published" value={listings.filter(l => l.status === 'published').length} icon="✅" bg="bg-green-50" />
              <StatCard label="Drafts" value={listings.filter(l => l.status === 'draft').length} icon="📝" bg="bg-yellow-50" />
              <StatCard label="Total Sales" value={listings.reduce((s, l) => s + (l.total_sales || 0), 0)} icon="📦" bg="bg-purple-50" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={listingStatusFilter} onChange={(e) => setListingStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <select value={listingPlatformFilter} onChange={(e) => setListingPlatformFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Platforms</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="slack">Slack</option>
                  <option value="instagram">Instagram</option>
                </select>
                <span className="text-xs text-gray-400 self-center">{filteredListings.length} listings</span>
              </div>
            </div>

            {/* Listings Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredListings.length === 0 ? (
                      <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">No listings match your filters.</td></tr>
                    ) : (
                      filteredListings.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{PLATFORM_ICONS[l.platform] || '🤖'}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{l.name}</p>
                                {l.category && <p className="text-xs text-gray-500">{l.category}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-sm text-gray-900">{l.seller_name}</p>
                            <p className="text-xs text-gray-500">{l.seller_email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm capitalize text-gray-700">{l.platform}</span>
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(l.price)}</td>
                          <td className="px-5 py-3 text-sm text-gray-700">{l.total_sales || 0}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(l.status)}`}>{l.status}</span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500">{formatDate(l.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== TRANSACTIONS TAB ==================== */}
        {activeTab === 'Transactions' && (
          <>
            {/* Revenue Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Revenue" value={formatCurrency(s.revenue.total)} icon="💰" bg="bg-green-50" />
              <StatCard label="This Month" value={formatCurrency(s.revenue.thisMonth)} icon="📊" bg="bg-blue-50" />
              <StatCard label="This Week" value={formatCurrency(s.revenue.thisWeek)} icon="📈" bg="bg-indigo-50" />
              <StatCard label="Total Purchases" value={s.revenue.totalPurchases || 0} icon="🛒" bg="bg-orange-50" />
            </div>

            {/* Purchases Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-5 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
              </div>
              {purchases.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm font-mono text-primary-600">TXN-{String(p.id).padStart(6, '0')}</td>
                          <td className="px-5 py-3">
                            <p className="text-sm text-gray-900">{p.buyer_name}</p>
                            <p className="text-xs text-gray-500">{p.buyer_email}</p>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-900">{p.bot_name}</td>
                          <td className="px-5 py-3 text-sm capitalize text-gray-700">
                            {PLATFORM_ICONS[p.bot_platform] || ''} {p.bot_platform}
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-3">
                            <p className="text-sm text-gray-900">{formatDate(p.purchased_at)}</p>
                            <p className="text-xs text-gray-500">{formatTime(p.purchased_at)}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Edit User Modal */}
      {editModal.open && (
        <Modal onClose={() => setEditModal({ open: false, user: null })}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={editForm.role_id} onChange={(e) => setEditForm({ ...editForm, role_id: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none">
                <option value={1}>Admin</option>
                <option value={2}>Seller</option>
                <option value={3}>Buyer</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditModal({ open: false, user: null })} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Ban Modal */}
      {banModal.open && (
        <Modal onClose={() => setBanModal({ open: false, user: null })}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{banModal.user?.is_banned ? 'Unban User' : 'Ban User'}</h3>
          <p className="text-gray-600 mb-6">
            {banModal.user?.is_banned
              ? `Unban "${banModal.user?.name}"? They will regain platform access.`
              : `Ban "${banModal.user?.name}"? They will lose all platform access.`}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setBanModal({ open: false, user: null })} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">Cancel</button>
            <button onClick={handleBanConfirm} disabled={actionLoading} className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${banModal.user?.is_banned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {actionLoading ? 'Processing...' : banModal.user?.is_banned ? 'Unban' : 'Ban User'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
        <Modal onClose={() => setDeleteModal({ open: false, user: null })}>
          <h3 className="text-lg font-semibold text-red-600 mb-2">Delete User</h3>
          <p className="text-gray-600 mb-6">Permanently delete "{deleteModal.user?.name}"? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModal({ open: false, user: null })} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">Cancel</button>
            <button onClick={handleDeleteConfirm} disabled={actionLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50">
              {actionLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {/* User Detail Modal */}
      {userDetailModal.open && (
        <Modal onClose={() => setUserDetailModal({ open: false, user: null })}>
          {(() => {
            const u = userDetailModal.user;
            return (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold ${u.is_banned ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'}`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{u.name}</h3>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-sm font-medium capitalize">{u.role_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`text-sm font-medium ${u.is_banned ? 'text-red-600' : 'text-green-600'}`}>{u.is_banned ? 'Banned' : 'Active'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium">{u.phone || 'Not set'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="text-sm font-medium">{formatDate(u.created_at)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="text-sm font-mono">{u.user_id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setUserDetailModal({ open: false, user: null }); handleEditClick(u); }} className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-medium">Edit User</button>
                  {u.role_name !== 'admin' && (
                    <>
                      <button onClick={() => { setUserDetailModal({ open: false, user: null }); setBanModal({ open: true, user: u }); }} className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium text-white ${u.is_banned ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                      <button onClick={() => { setUserDetailModal({ open: false, user: null }); setDeleteModal({ open: true, user: u }); }} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium">Delete</button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
