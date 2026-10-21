import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';

// Resolve current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env if present, or parent .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = parseInt(process.env.PORT, 10) || 5000;

const startServer = async () => {
  console.log('--------------------------------------------------');
  console.log(`[Dastaan API] Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  // Attempt database connection
  await connectDB();

  // Start Express server
  const server = app.listen(PORT, () => {
    console.log(`[Dastaan API] Express server running on port: ${PORT}`);
    console.log(`[Dastaan API] Health check endpoint: http://localhost:${PORT}/api/health`);
    console.log('--------------------------------------------------');
  });

  // Handle server-level port errors specifically
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Dastaan API] Conflict: Port ${PORT} is already in use by another application.`);
      console.error(`[Dastaan API] Please stop the process using port ${PORT} or configure a different PORT in server/.env.`);
      process.exit(1);
    } else {
      console.error(`[Dastaan API] Server error:`, err);
      process.exit(1);
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Dastaan API] Gracefully shutting down server...');
    server.close(() => {
      console.log('[Dastaan API] Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('unhandledRejection', (reason) => {
    console.warn('[Dastaan API] Unhandled Promise Rejection:', reason?.message || reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Dastaan API] Uncaught Exception:', err?.message || err);
  });
};

startServer();
