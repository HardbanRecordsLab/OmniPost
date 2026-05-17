// omnipost/backend/src/routes/auth.ts

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3).max(128),
  password: z.string().min(8),
  confirmPassword: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const localUser = {
    id: 'local-admin',
    email: 'local@hardbanrecordslab.online',
    username: 'local-admin',
    role: 'admin',
  };

  // Register
  fastify.post<{ Body: unknown }>('/register', async (request) => {
    registerSchema.safeParse(request.body);
    const accessToken = fastify.jwt.sign(
      { userId: localUser.id },
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    return {
      user: localUser,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 604800,
    };
  });

  // Login
  fastify.post<{ Body: unknown }>('/login', async (request) => {
    loginSchema.safeParse(request.body);
    const accessToken = fastify.jwt.sign(
      { userId: localUser.id },
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    return {
      user: localUser,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 604800,
    };
  });

  // Verify Email (optional endpoint)
  fastify.post<{ Body: unknown }>('/verify-email', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      
      await pool.query(
        'UPDATE users SET is_email_verified = true, email_verified_at = NOW() WHERE id = $1',
        [userId]
      );

      return { message: 'Email verified successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.statusCode = 500;
      return { error: 'Internal server error' };
    }
  });

  // Refresh token
  fastify.post<{ Body: unknown }>('/refresh', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        reply.statusCode = 401;
        return { error: 'No token provided' };
      }

      const token = authHeader.slice(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        
        const newAccessToken = fastify.jwt.sign(
          { userId: decoded.userId },
          { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );

        return {
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: 604800,
        };
      } catch (err) {
        reply.statusCode = 401;
        return { error: 'Invalid token' };
      }
    } catch (error) {
      fastify.log.error(error);
      reply.statusCode = 500;
      return { error: 'Internal server error' };
    }
  });

  // Logout
  fastify.post('/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Invalidate refresh tokens
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );

      return { message: 'Logged out successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.statusCode = 500;
      return { error: 'Internal server error' };
    }
  });
}
