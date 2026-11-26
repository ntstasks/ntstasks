const jwt = require('jsonwebtoken');
const { User, Employee, Department } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'nts-task-management-secret-key-2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Employee,
          as: 'employee'
        }
      ]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User account is inactive or no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid or malformed authentication token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied: You do not have permission to perform this action.'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  JWT_SECRET
};

