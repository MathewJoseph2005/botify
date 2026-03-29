import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, role_id, email }
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

/**
 * Middleware that requires the authenticated user to be an admin (role_id === 1).
 * Must be used AFTER verifyToken in the middleware chain.
 */
const isAdmin = (req, res, next) => {
  if (req.user.role_id !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
  next();
};

/**
 * Middleware factory that requires specific role(s).
 * Usage: auth.requireRole(2) for sellers, auth.requireRole(3) for buyers
 * Role IDs: 1=Admin, 2=Seller, 3=Buyer
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role_id !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role ${requiredRole} required.`,
      });
    }
    next();
  };
};

export default verifyToken;
export { isAdmin, requireRole };
