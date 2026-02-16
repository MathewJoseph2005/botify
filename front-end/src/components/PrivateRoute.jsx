import { Navigate } from 'react-router-dom';
import { authHelpers } from '../utils/api';

const PrivateRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = authHelpers.isAuthenticated();
  const user = authHelpers.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role_id)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PrivateRoute;
