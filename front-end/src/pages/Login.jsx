import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import RoleSelectModal from '../components/RoleSelectModal';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = location.state?.message;
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth role selection state
  const [heldGoogleToken, setHeldGoogleToken] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isProcessingGoogleRole, setIsProcessingGoogleRole] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  // Handle role selection from modal (only for new users)
  const handleRoleSelect = async (roleId) => {
    if (!heldGoogleToken || isProcessingGoogleRole) return;

    setIsProcessingGoogleRole(true);
    setError('');

    try {
      // Call Google auth endpoint with role_id parameter
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await axios.post(`${API_URL}/auth/google?role_id=${roleId}`, { id_token: heldGoogleToken });

      if (res.data.success) {
        login(res.data.token, res.data.user);
        setShowRoleModal(false);
        setHeldGoogleToken(null);
        
        const roleName = res.data.user.role_name;
        if (roleName === 'admin') navigate('/dashboard/admin');
        else if (roleName === 'seller') navigate('/dashboard/seller');
        else navigate('/dashboard/buyer');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete Google sign-up. Please try again.');
    } finally {
      setIsProcessingGoogleRole(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      
      if (response.data.success) {
        // Store token and user info via auth context
        login(response.data.token, response.data.user);

        // Redirect based on role
        const roleName = response.data.user.role_name;
        if (roleName === 'admin') {
          navigate('/dashboard/admin');
        } else if (roleName === 'seller') {
          navigate('/dashboard/seller');
        } else {
          navigate('/dashboard/buyer');
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services
  const [googleReady, setGoogleReady] = useState(false);
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && window.google.accounts && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            const id_token = response?.credential;
            if (!id_token) return;
            
            // Hold the token and show role selection modal for new users
            setHeldGoogleToken(id_token);
            setError('');
            
            // First, we need to check if this is a new user
            // We'll do this by attempting login without role_id
            setLoading(true);
            try {
              const res = await authAPI.googleSignIn({ id_token });
              if (res.data.success) {
                // Check if this is a new user
                if (res.data.isNewUser) {
                  // Show role modal for new user to select buyer or seller
                  setShowRoleModal(true);
                } else {
                  // Existing user - complete login immediately
                  login(res.data.token, res.data.user);
                  const roleName = res.data.user.role_name;
                  if (roleName === 'admin') navigate('/dashboard/admin');
                  else if (roleName === 'seller') navigate('/dashboard/seller');
                  else navigate('/dashboard/buyer');
                }
              }
            } catch (err) {
              setError(err.response?.data?.message || 'Google sign-in failed.');
              setHeldGoogleToken(null);
            } finally {
              setLoading(false);
            }
          }
        });

        // Render button into container
        const container = document.getElementById('googleSignInDiv');
        if (container) {
          window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large' });
        }
        setGoogleReady(true);
      }
    };

    script.onerror = () => {
      setError('Failed to load Google Identity Services script.');
    };

    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Sign in to your Botify account
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <div id="googleSignInDiv" className="flex justify-center mb-3" />
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
      
      {/* Role Selection Modal for new Google users */}
      <RoleSelectModal 
        isOpen={showRoleModal} 
        onSelectRole={handleRoleSelect} 
        isLoading={isProcessingGoogleRole}
      />
    </div>
  );
};

export default Login;
