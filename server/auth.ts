import crypto from 'crypto';
import { queryOne, query } from './db';

export type UserRole = 'admin' | 'manager' | 'viewer';

const ALGO = 'scrypt';
const KEYLEN = 64;
const SALT_LEN = 32;

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(SALT_LEN).toString('hex');
  const derived = crypto.scryptSync(password, s, KEYLEN);
  return { hash: `${ALGO}:${s}:${derived.toString('hex')}`, salt: s };
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const { hash } = hashPassword(password, salt);
  const bufExpected = Buffer.from(expectedHash, 'hex');
  const bufActual = Buffer.from(hash.split(':')[2], 'hex');
  return bufExpected.length === bufActual.length && crypto.timingSafeEqual(bufExpected, bufActual);
}

export function generateToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export async function authenticateRequest(req: any): Promise<{ userId: string; username: string; role: UserRole } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token || token.length < 10) return null;

  const session = await queryOne<{ user_id: string; username: string }>(
    'SELECT user_id, username FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  if (!session) return null;

  const user = await queryOne<{ role: string }>(
    'SELECT role FROM admin_users WHERE id = $1',
    [session.user_id]
  );

  return {
    userId: session.user_id,
    username: session.username,
    role: (user?.role as UserRole) || 'viewer',
  };
}

export function requireAuth(req: any, res: any, next: any) {
  authenticateRequest(req).then((user) => {
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    (req as any).user = user;
    next();
  }).catch(() => {
    res.status(401).json({ error: 'Authentication required' });
  });
}

export function requireRole(...allowed: UserRole[]) {
  return (req: any, res: any, next: any) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowed.includes(user.role)) {
      return res.status(403).json({ error: `Requires role: ${allowed.join(' or ')}` });
    }
    next();
  };
}

export function canWrite(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'manager';
}

export function canDelete(userRole: UserRole): boolean {
  return userRole === 'admin';
}

export async function seedDefaultAdmin(): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM admin_users WHERE username = $1',
    ['admin']
  );

  if (!existing) {
    const id = crypto.randomUUID();
    const { hash } = hashPassword('admin');
    await query(
      'INSERT INTO admin_users (id, username, password_hash, display_name, role, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, 'admin', hash, 'Administrator', 'admin', true]
    );
    console.log('Default admin user created (admin / admin) — must change password on first login');
  }
}
