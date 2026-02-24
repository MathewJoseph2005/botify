import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" onClick={closeMobile}>
            <span className="text-2xl font-bold text-primary-600">Botify</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/marketplace"
              className="text-gray-700 hover:text-primary-600 transition duration-200"
            >
              Marketplace
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-primary-600 transition duration-200"
              >
                Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/email-bot"
                className="text-gray-700 hover:text-primary-600 transition duration-200"
              >
                Email Bot
              </Link>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  Welcome, <span className="font-semibold">{user?.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-700 font-medium transition duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-2">
            <Link
              to="/marketplace"
              onClick={closeMobile}
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition"
            >
              Marketplace
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  onClick={closeMobile}
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/email-bot"
                  onClick={closeMobile}
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition"
                >
                  Email Bot
                </Link>
              </>
            )}
            <hr className="border-gray-200" />
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 text-sm text-gray-600">
                  Signed in as <span className="font-semibold">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="block px-3 py-2 rounded-lg text-primary-600 font-medium hover:bg-primary-50 transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobile}
                  className="block px-3 py-2 rounded-lg bg-primary-600 text-white text-center hover:bg-primary-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
