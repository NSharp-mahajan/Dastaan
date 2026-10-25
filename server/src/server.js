import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';

// Configure public DNS resolvers to handle mongodb+srv SRV record resolution across all networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if unsupported in environment
}

// Resolve current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env if present, or parent .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Global process exception handlers established early to prevent unhandled aborts
process.on('unhandledRejection', (reason) => {
  console.warn('[Dastaan API] Unhandled Promise Rejection (non-fatal):', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Dastaan API] Uncaught Exception (non-fatal):', err?.message || err);
});

/**
 * Probes if an existing process on port is an active, healthy Dastaan API backend.
 */
export async function probeHealthyDastaanInstance(port, fetchFn = fetch) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetchFn(`http://127.0.0.1:${port}/api/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.message?.includes('Dastaan API') || data.status === 'ok')) {
        return { isHealthy: true, data };
      }
    }
    return { isHealthy: false };
  } catch (err) {
    return { isHealthy: false, error: err.message };
  }
}

/**
 * Returns formatted port conflict diagnostic message.
 */
export function formatPortConflictDiagnostic(port, isHealthyDastaan = false, details = {}) {
  if (isHealthyDastaan) {
    return [
      `[Dastaan API] Notice: Port ${port} is already in use by an active, healthy Dastaan API instance.`,
      `[Dastaan API] Uptime: ${details.uptime ?? 'unknown'}s | Database: ${details.database?.status ?? 'connected'}.`,
      `[Dastaan API] Reusing existing backend service at http://localhost:${port}. Duplicate server startup avoided.`
    ].join('\n');
  }

  return [
    `[Dastaan API] Conflict: Port ${port} is already in use by another application.`,
    `[Dastaan API] Health check failed: No responsive Dastaan API found on port ${port}.`,
    `[Dastaan API] Resolution: Stop the conflicting application holding port ${port} or configure a different PORT in server/.env.`
  ].join('\n');
}

const startServer = async () => {
  console.log('--------------------------------------------------');
  console.log(`[Dastaan API] Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  // Pre-flight check: if a healthy Dastaan backend is already listening on PORT, avoid duplicate binding
  const probe = await probeHealthyDastaanInstance(PORT);
  if (probe.isHealthy) {
    console.log(formatPortConflictDiagnostic(PORT, true, probe.data));
    console.log('--------------------------------------------------');
    process.exit(0);
  }

  // Attempt database connection
  await connectDB();

  return new Promise((resolve) => {
    let retries = 0;
    const maxRetries = 2;

    const bindListener = () => {
      const server = app.listen(PORT, HOST, () => {
        console.log(`[Dastaan API] Express server running on port: ${PORT} (bound to: ${HOST})`);
        console.log(`[Dastaan API] Health check endpoint: http://localhost:${PORT}/api/health`);
        console.log(`[Dastaan API] Root health check: http://localhost:${PORT}/health`);
        console.log('--------------------------------------------------');

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

        resolve(server);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && retries < maxRetries) {
          retries++;
          console.warn(`[Dastaan API] Port ${PORT} busy, retrying in 600ms (attempt ${retries}/${maxRetries})...`);
          setTimeout(bindListener, 600);
        } else if (err.code === 'EADDRINUSE') {
          console.error(formatPortConflictDiagnostic(PORT, false));
          process.exit(1);
        } else {
          console.error(`[Dastaan API] Server error:`, err);
          process.exit(1);
        }
      });
    };

    bindListener();
  });
};

// Start only when executed directly from CLI, not when imported
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default startServer;
