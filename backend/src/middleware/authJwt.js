import jwt from 'jsonwebtoken';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ 
      error: 'No token provided',
      message: 'Access denied. Please login.' 
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ 
      error: 'Invalid token format',
      message: 'Token should be in format: Bearer <token>' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Authentication failed.' 
    });
  }
};

// Middleware to check if user is caregiver
export const isCaregiver = (req, res, next) => {
  if (req.user.role !== 'caregiver') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This action requires caregiver role' 
    });
  }
  next();
};

// Middleware to check if user is elderly
export const isElderly = (req, res, next) => {
  if (req.user.role !== 'elderly') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This action requires elderly role' 
    });
  }
  next();
};