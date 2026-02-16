import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Marketplace from './pages/Marketplace';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import Unauthorized from './pages/Unauthorized';
import { authHelpers } from './utils/api';

function App() {
  // Helper component to redirect to appropriate dashboard
  const DashboardRedirect = () => {
    const user = authHelpers.getUser();
    
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    const roleName = authHelpers.getRoleName(user.role_id);
    
    if (roleName === 'admin') {
      return <Navigate to="/dashboard/admin" replace />;
    } else if (roleName === 'seller') {
      return <Navigate to="/dashboard/seller" replace />;
    } else {
      return <Navigate to="/dashboard/buyer" replace />;
    }
  };

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
          <Route path="/unauthorized" element={<Unauthorized />} />

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

          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
