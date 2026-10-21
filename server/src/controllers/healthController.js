import { getDbStatus } from '../config/db.js';

export const getHealth = (req, res) => {
  const dbStatus = getDbStatus();

  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'Dastaan API is operating normally',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbStatus.status,
      connected: dbStatus.status === 'connected',
      ...(dbStatus.status === 'connected' && { name: dbStatus.database }),
      ...(dbStatus.error && { notice: dbStatus.error })
    },
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
};
