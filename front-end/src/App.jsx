import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { LanguageProvider } from './context/LanguageContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Marketplace from './pages/Marketplace';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import EmailBot from './pages/EmailBot';
import EmailForwarding from './pages/EmailForwarding';
import WhatsAppCampaign from './pages/WhatsAppCampaign';
import BotCreationPage from './pages/BotCreationPage';
import CreateMarketplaceBotPage from './pages/CreateMarketplaceBotPage';
import FAQPage from './pages/FAQPage';
import Unauthorized from './pages/Unauthorized';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading, getRoleName } = useAuth();

  // Helper component to redirect to appropriate dashboard
  const DashboardRedirect = () => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    const roleName = getRoleName(user.role_id);
    
    if (roleName === 'admin') {
      return <Navigate to="/dashboard/admin" replace />;
    } else if (roleName === 'seller') {
      return <Navigate to="/dashboard/seller" replace />;
    } else {
      return <Navigate to="/dashboard/buyer" replace />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Dashboard Redirect */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard/admin"
            element={
              <PrivateRoute allowedRoles={[1]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/seller"
            element={
              <PrivateRoute allowedRoles={[2]}>
                <SellerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/buyer"
            element={
              <PrivateRoute allowedRoles={[3]}>
                <BuyerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/email-bot"
            element={
              <PrivateRoute allowedRoles={[1, 2, 3]}>
                <EmailBot />
              </PrivateRoute>
            }
          />
          <Route
            path="/email-forwarding"
            element={
              <PrivateRoute allowedRoles={[2]}>
                <EmailForwarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/whatsapp-bot"
            element={
              <PrivateRoute allowedRoles={[1, 2, 3]}>
                <WhatsAppCampaign />
              </PrivateRoute>
            }
          />
          <Route
            path="/bot-creation"
            element={
              <PrivateRoute allowedRoles={[2]}>
                <BotCreationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller/create-bot"
            element={
              <PrivateRoute allowedRoles={[2]}>
                <CreateMarketplaceBotPage />
              </PrivateRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
