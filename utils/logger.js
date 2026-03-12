// Serverless-safe logger for Vercel deployment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.NODE_ENV === 'development';

const logger = {
  info: (message, meta = {}) => {
    const logData = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: 'saathghoomo-api',
      ...meta
    };
    
    if (isServerless) {
      console.log(JSON.stringify(logData));
    } else {
      // For local development, you can still use winston if needed
      console.log(`[INFO] ${message}`, meta);
    }
  },

  error: (message, error = null) => {
    const logData = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      service: 'saathghoomo-api',
      ...(error && { 
        stack: error.stack,
        name: error.name,
        message: error.message 
      })
    };
    
    if (isServerless) {
      console.error(JSON.stringify(logData));
    } else {
      console.error(`[ERROR] ${message}`, error);
    }
  },

  warn: (message, meta = {}) => {
    const logData = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      service: 'saathghoomo-api',
      ...meta
    };
    
    if (isServerless) {
      console.warn(JSON.stringify(logData));
    } else {
      console.warn(`[WARN] ${message}`, meta);
    }
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'production') return;
    
    const logData = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      service: 'saathghoomo-api',
      ...meta
    };
    
    if (isServerless) {
      console.debug(JSON.stringify(logData));
    } else {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};

export default logger;
