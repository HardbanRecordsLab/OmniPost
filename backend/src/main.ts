// omnipost/backend/src/main.ts

import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Load environment variables
dotenv.config();

// Initialize dependencies
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
(async () => {
  await fastify.register(helmet);
  
  await fastify.register(fastifyCors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    sign: {
      expiresIn: process.env.JWT_EXPIRY || '7d',
    },
  });

  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW_MS || '15 minutes',
  });

  // Health Check
  fastify.get('/health', async (request, reply) => {
    try {
      await pool.query('SELECT 1');
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        service: 'omnipost-api',
        version: '1.0.0',
      };
    } catch (error) {
      reply.statusCode = 503;
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // API Info
  fastify.get('/api', async (request, reply) => {
    return {
      name: 'OmniPost API',
      version: '1.0.0',
      description: 'Social Media Planner API',
      endpoints: {
        auth: '/api/auth',
        posts: '/api/posts',
        accounts: '/api/accounts',
        analytics: '/api/analytics',
        scheduling: '/api/scheduling',
      },
    };
  });

  // Routes will be imported here
  import { authRoutes } from './routes/auth';
  import { postRoutes } from './routes/posts';
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(postRoutes, { prefix: '/api/posts' });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.statusCode = error.statusCode || 500;
    return {
      error: {
        message: error.message || 'Internal Server Error',
        statusCode: reply.statusCode,
        timestamp: new Date().toISOString(),
      },
    };
  });

  // Start server
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 OmniPost API running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();

// Graceful shutdown
const signals = ['SIGTERM', 'SIGINT'];
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    await fastify.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  });
});

export default fastify;
