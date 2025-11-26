// backend/src/middleware/verifyFallToken.js

/**
 * Middleware to verify Fall Detection API token
 * Checks X-API-KEY header against FALL_ALERT_TOKEN in .env
 */
export const verifyFallDetectionToken = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No API key provided. Include X-API-KEY header.' 
      });
    }

    const validToken = process.env.FALL_ALERT_TOKEN;

    if (!validToken) {
      console.error('FALL_ALERT_TOKEN not configured in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Fall alert token not configured' 
      });
    }

    if (apiKey !== validToken) {
      console.warn('Invalid fall detection token attempt');
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid API key' 
      });
    }

    // Token is valid, proceed
    next();

  } catch (error) {
    console.error('Error in verifyFallDetectionToken:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    });
  }
};

export default verifyFallDetectionToken;