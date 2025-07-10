import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

// Middleware to protect routes - checks for valid token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request object, excluding password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to authorize based on role(s)
// roles can be a single role string or an array of roles
const authorize = (roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role; // User should be attached by 'protect' middleware
    if (!userRole) {
        return res.status(403).json({ message: 'User role not found. Authorization denied.' });
    }

    const rolesArray = Array.isArray(roles) ? roles : [roles];

    if (rolesArray.includes(userRole)) {
      next(); // User has one of the required roles
    } else {
      res.status(403).json({ message: `User role '${userRole}' is not authorized to access this resource. Required roles: ${rolesArray.join(', ')}.` });
    }
  };
};

export { protect, authorize };
