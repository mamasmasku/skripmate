import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId:   string;
  username: string;
  role:     'free' | 'pro' | 'admin';
  iat?:     number;
  exp?:     number;
}

export const signToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

export const getTokenFromHeader = (authHeader?: string): JWTPayload | null => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
};
