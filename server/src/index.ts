import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './utils/errorHandler.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow local frontend access
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging in development
if (env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// API Routes
app.use('/api/v1', apiRouter);

// Root greeting / health
app.get('/', (req, res) => {
  res.json({
    name: 'Personal Learning OS API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// Centralized error handler
app.use(errorHandler);

let server: any = null;

export async function startServer() {
  await connectDB();
  return new Promise((resolve) => {
    server = app.listen(env.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Personal Learning OS API running on port ${env.PORT}`);
      console.log(`📡 Health Check: http://localhost:${env.PORT}/api/v1/health`);
      console.log(`======================================================\n`);
      resolve(server);
    });
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Process] Received SIGINT. Shutting down gracefully...');
  if (server) {
    server.close();
  }
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Process] Received SIGTERM. Shutting down gracefully...');
  if (server) {
    server.close();
  }
  await disconnectDB();
  process.exit(0);
});

// Auto-start server when run directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

export { app };

