import crypto from 'crypto';
import { Router } from 'express';
import { queryOne, query } from '../db';
import { verifyPassword, generateToken, authenticateRequest, hashPassword } from '../auth';
import { asyncHandler } from '../validate';

const router = Router();

// POST /api/auth/login — returns a session token
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await queryOne<{ id: string; username: string; password_hash: string; display_name: string }>(
    'SELECT id, username, password_hash, display_name FROM admin_users WHERE username = $1',
    [username]
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Invalidate old sessions for this user
  await query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

  // Create new session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    'INSERT INTO sessions (id, user_id, username, token, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [crypto.randomUUID(), user.id, user.username, token, expiresAt.toISOString()]
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
    },
  });
}));

// GET /api/auth/me — validates token and returns current user
router.get('/me', asyncHandler(async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const fullUser = await queryOne<{ id: string; username: string; display_name: string }>(
    'SELECT id, username, display_name FROM admin_users WHERE id = $1',
    [user.userId]
  );

  if (!fullUser) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({
    id: fullUser.id,
    username: fullUser.username,
    displayName: fullUser.display_name,
  });
}));

// POST /api/auth/logout — destroys session
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await query('DELETE FROM sessions WHERE token = $1', [token]);
  }
  res.json({ ok: true });
}));

// POST /api/auth/change-password — requires current password
router.post('/change-password', asyncHandler(async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const admin = await queryOne<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM admin_users WHERE id = $1',
    [user.userId]
  );

  if (!admin || !verifyPassword(currentPassword, admin.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const { hash: newHash } = hashPassword(newPassword);

  await query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [newHash, user.userId]);

  // Invalidate all sessions except current one
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const currentToken = authHeader.slice(7);
    await query('DELETE FROM sessions WHERE user_id = $1 AND token != $2', [user.userId, currentToken]);
  }

  res.json({ ok: true });
}));

export default router;
