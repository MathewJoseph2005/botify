import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './context/AuthContext';

// Lazy-load every page so only the current route's bundle is parsed on load
const LandingPage            = lazy(() => import('./pages/LandingPage'));
const Login                  = lazy(() => import('./pages/Login'));
const Signup                 = lazy(() => import('./pages/Signup'));
const Marketplace            = lazy(() => import('./pages/Marketplace'));
const AdminDashboard         = lazy(() => import('./pages/AdminDashboard'));
const SellerDashboard        = lazy(() => import('./pages/SellerDashboard'));
const BuyerDashboard         = lazy(() => import('./pages/BuyerDashboard'));
const EmailBot               = lazy(() => import('./pages/EmailBot'));
const EmailForwarding        = lazy(() => import('./pages/EmailForwarding'));
const WhatsAppCampaign       = lazy(() => import('./pages/WhatsAppCampaign'));
const BotCreationPage        = lazy(() => import('./pages/BotCreationPage'));
const CreateMarketplaceBotPage = lazy(() => import('./pages/CreateMarketplaceBotPage'));
const FAQPage                = lazy(() => import('./pages/FAQPage'));
const VibeCode               = lazy(() => import('./pages/VibeCode'));
const VibeCredits            = lazy(() => import('./pages/VibeCredits'));
const Unauthorized           = lazy(() => import('./pages/Unauthorized'));
const ForgotPassword         = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword          = lazy(() => import('./pages/ResetPassword'));

// Minimal spinner shown while a lazy chunk loads
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050505]">
    <div className="w-10 h-10 rounded-full border-2 border-[#ffd700]/20 border-t-[#ffd700] animate-spin" />
  </div>
);

function App() {
  const { user, loading, getRoleName } = useAuth();

  const DashboardRedirect = () => {
    if (!user) return <Navigate to="/login" replace />;
    const roleName = getRoleName(user.role_id);
    if (roleName === 'admin')  return <Navigate to="/dashboard/admin"  replace />;
    if (roleName === 'seller') return <Navigate to="/dashboard/seller" replace />;
    return <Navigate to="/dashboard/buyer" replace />;
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"                element={user ? <DashboardRedirect /> : <LandingPage />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/signup"          element={<Signup />} />
            <Route path="/marketplace"     element={<Marketplace />} />
            <Route path="/faq"             element={<FAQPage />} />
            <Route path="/unauthorized"    element={<Unauthorized />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* Dashboard redirect */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Protected */}
            <Route path="/dashboard/admin" element={
              <PrivateRoute allowedRoles={[1]}><AdminDashboard /></PrivateRoute>
            } />
            <Route path="/dashboard/seller" element={
              <PrivateRoute allowedRoles={[2]}><SellerDashboard /></PrivateRoute>
            } />
            <Route path="/dashboard/buyer" element={
              <PrivateRoute allowedRoles={[3]}><BuyerDashboard /></PrivateRoute>
            } />
            <Route path="/email-bot" element={
              <PrivateRoute allowedRoles={[1, 2, 3]}><EmailBot /></PrivateRoute>
            } />
            <Route path="/email-forwarding" element={
              <PrivateRoute allowedRoles={[2, 3]}><EmailForwarding /></PrivateRoute>
            } />
            <Route path="/whatsapp-bot" element={
              <PrivateRoute allowedRoles={[1, 2, 3]}><WhatsAppCampaign /></PrivateRoute>
            } />
            <Route path="/bot-creation" element={
              <PrivateRoute allowedRoles={[2]}><BotCreationPage /></PrivateRoute>
            } />
            <Route path="/seller/create-bot" element={
              <PrivateRoute allowedRoles={[2]}><CreateMarketplaceBotPage /></PrivateRoute>
            } />
            <Route path="/vibe-code" element={
              <PrivateRoute allowedRoles={[1, 2, 3]}><VibeCode /></PrivateRoute>
            } />
            <Route path="/vibe-code/credits" element={
              <PrivateRoute allowedRoles={[1, 2, 3]}><VibeCredits /></PrivateRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
