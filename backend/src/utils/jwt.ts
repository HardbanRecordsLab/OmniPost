// omnipost/backend/src/utils/jwt.ts

import jwt from 'jsonwebtoken';

export const createAccessToken = (payload: any, expiresIn = '7d'): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
};

export const createRefreshToken = (payload: any, expiresIn = '30d'): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const decodeToken = (token: string) => {
  return jwt.decode(token);
};
