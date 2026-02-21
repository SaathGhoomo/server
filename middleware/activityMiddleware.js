import ActivityLog from '../models/ActivityLog.js';

export const logActivity = (action) => {
  return async (req, res, next) => {
    // Store original res.json to intercept responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only log if action was successful (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        (async () => {
          try {
            const logData = {
              userId: req.user._id,
              action,
              metadata: {
                method: req.method,
                url: req.originalUrl,
                body: req.body,
                params: req.params,
                query: req.query,
                response: data
              },
              ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
            };

            await ActivityLog.create(logData);
            console.log(`Activity logged: ${action} for user ${req.user._id}`);
          } catch (error) {
            console.error('Activity logging error:', error);
            // Don't block the response if logging fails
          }
        })();
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};
