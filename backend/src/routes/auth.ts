// omnipost/backend/src/routes/auth.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
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

  // Register
  fastify.post<{ Body: unknown }>('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      if (body.password !== body.confirmPassword) {
        reply.statusCode = 400;
        return { error: 'Passwords do not match' };
      }

      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [body.email, body.username]
      );

      if (existingUser.rows.length > 0) {
        reply.statusCode = 409;
        return { error: 'Email or username already exists' };
      }

      const hashedPassword = await bcrypt.hash(body.password, 12);

      const result = await pool.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
        [body.email, body.username, hashedPassword]
      );

      const user = result.rows[0];

      reply.statusCode = 201;
      return {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.statusCode = 400;
        return { error: 'Validation error', details: error.errors };
      }
      fastify.log.error(error);
      reply.statusCode = 500;
      return { error: 'Internal server error' };
    }
  });

  // Login
  fastify.post<{ Body: unknown }>('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const result = await pool.query(
        'SELECT id, email, username, password_hash FROM users WHERE email = $1 AND is_active = true',
        [body.email]
      );

      if (result.rows.length === 0) {
        reply.statusCode = 401;
        return { error: 'Invalid email or password' };
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(body.password, user.password_hash);

      if (!passwordMatch) {
        reply.statusCode = 401;
        return { error: 'Invalid email or password' };
      }

      // Update last login
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      const refreshTokenValue = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d' }
      );

      // Store refresh token (hashed)
      const hashedRefreshToken = await bcrypt.hash(refreshTokenValue, 12);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
        [user.id, hashedRefreshToken]
      );

      return {
        message: 'Login successful',
        tokens: {
          access_token: accessToken,
          refresh_token: refreshTokenValue,
          token_type: 'Bearer',
          expires_in: 604800, // 7 days in seconds
        },
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.statusCode = 400;
        return { error: 'Validation error', details: error.errors };
      }
      fastify.log.error(error);
      reply.statusCode = 500;
      return { error: 'Internal server error' };
    }
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
