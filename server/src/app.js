import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { getHealth } from './controllers/healthController.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Allowed origins for CORS (React development frontend and local tooling)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
].filter(Boolean);

const isLocalhostOrigin = (origin) => {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin)
    if (!origin) return callback(null, true);

    // Allow any localhost, 127.0.0.1, or [::1] port (HTTP or HTTPS)
    if (isLocalhostOrigin(origin)) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Preflight handler for all routes
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Root health check endpoints (accessible at both /health and /api/health)
app.get('/health', getHealth);
app.get('/api/health', getHealth);

// Root info route
app.get('/', (req, res) => {
  res.json({
    name: 'Dastaan API Server',
    status: 'running',
    health: '/api/health',
    version: '1.0.0'
  });
});

// All API routes mounted under /api
app.use('/api', apiRoutes);

// 404 for any unmatched routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
