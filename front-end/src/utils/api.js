import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
};

// Admin API
export const adminAPI = {
  getUsers: () => api.get('/auth/users'),
  updateUser: (userId, userData) => api.put(`/auth/users/${userId}`, userData),
  banUser: (userId, is_banned) => api.patch(`/auth/users/${userId}/ban`, { is_banned }),
  deleteUser: (userId) => api.delete(`/auth/users/${userId}`),
  // New admin endpoints
  getStats: () => api.get('/admin/stats'),
  getMarketplaceListings: () => api.get('/admin/marketplace-listings'),
  updateListingStatus: (id, status) => api.patch(`/admin/marketplace-listings/${id}/status`, { status }),
  deleteListing: (id) => api.delete(`/admin/marketplace-listings/${id}`),
  getPurchases: () => api.get('/admin/purchases'),
  getEmailBots: () => api.get('/admin/email-bots'),
};

// Bot API
export const botAPI = {
  listBots: () => api.get('/bot/list'),
  createBot: (botData) => api.post('/bot/create', botData),
  updateBot: (botId, botData) => api.put(`/bot/update/${botId}`, botData),
  deleteBot: (botId) => api.delete(`/bot/delete/${botId}`),
  testConnection: (botId) => api.post(`/bot/test-connection/${botId}`),
  emailCampaign: (botId, formData) => api.post(`/bot/email-campaign/${botId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Marketplace API
export const marketplaceAPI = {
  // Seller endpoints
  createListing: (data) => api.post('/marketplace/create', data),
  getMyListings: () => api.get('/marketplace/my-listings'),
  updateListing: (id, data) => api.put(`/marketplace/update/${id}`, data),
  deleteListing: (id) => api.delete(`/marketplace/delete/${id}`),
  publishListing: (id, publish) => api.patch(`/marketplace/publish/${id}`, { publish }),

  // Public / Buyer endpoints
  browse: (params) => api.get('/marketplace/browse', { params }),
  getDetails: (id) => api.get(`/marketplace/details/${id}`),
  purchase: (id) => api.post(`/marketplace/purchase/${id}`),
  getMyPurchases: () => api.get('/marketplace/my-purchases'),
};

// Auth helper functions
export const authHelpers = {
  setToken: (token) => localStorage.setItem('token', token),
  getToken: () => localStorage.getItem('token'),
  removeToken: () => localStorage.removeItem('token'),
  
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  removeUser: () => localStorage.removeItem('user'),
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  getRoleName: (roleId) => {
    const roles = { 1: 'admin', 2: 'seller', 3: 'buyer' };
    return roles[roleId] || 'buyer';
  }
};

export default api;
