// Serverless-compatible socket handler for Vercel
import { authenticateSocket, handleConnection } from '../utils/socketHandlers.js';
import logger from '../utils/logger.js';

// For serverless environments, we need to handle WebSocket connections differently
export const handleSocketConnection = async (req, res) => {
  // Vercel doesn't support WebSocket connections in serverless functions
  // This is a limitation - real-time features won't work in Vercel deployment
  logger.warn('WebSocket connection attempted in serverless environment - not supported');
  
  return res.status(501).json({
    success: false,
    message: 'Real-time features (chat, notifications) are not available in serverless deployment'
  });
};

export default handleSocketConnection;
