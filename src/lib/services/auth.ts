import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { execute, query, queryOne, transaction } from '../db';
import { Profile, UserBadge } from '../db/types';

export const SESSION_COOKIE_NAME = 'curio_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
const PASSWORD_HASH_BYTES = 64;
const PASSWORD_HASH_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_SALT = Buffer.alloc(16, 0x5a);
const DUMMY_PASSWORD_HASH = Buffer.alloc(PASSWORD_HASH_BYTES, 0x51);

export class AuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export function getAuthErrorStatus(error: unknown, fallbackStatus: number): number {
  return error instanceof AuthError ? error.status : fallbackStatus;
}

type RawProfile = Omit<Profile, 'interests' | 'subjects' | 'languages' | 'is_suspended'> & {
  interests: string | string[] | null;
  subjects: string | string[] | null;
  languages: string | string[] | null;
  is_suspended: number | boolean;
  password_hash?: string | null;
};

type AuthRecord = RawProfile & { password_hash: string | null };

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, PASSWORD_HASH_BYTES, PASSWORD_HASH_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 128) {
    throw new AuthError('Password must be between 12 and 128 characters.', 400);
  }
}

async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt);
  return `scrypt$16384$8$1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  const parts = storedHash?.split('$');
  const encodedSalt = parts?.[4];
  const encodedHash = parts?.[5];
  const validFormat =
    parts?.[0] === 'scrypt' &&
    parts[1] === '16384' &&
    parts[2] === '8' &&
    parts[3] === '1' &&
    Boolean(encodedSalt && /^[0-9a-f]{32}$/i.test(encodedSalt)) &&
    Boolean(encodedHash && /^[0-9a-f]{128}$/i.test(encodedHash));
  const salt = validFormat && encodedSalt ? Buffer.from(encodedSalt, 'hex') : DUMMY_SALT;
  const expected = validFormat && encodedHash ? Buffer.from(encodedHash, 'hex') : DUMMY_PASSWORD_HASH;
  const actual = await derivePassword(password, salt);
  return validFormat && timingSafeEqual(actual, expected);
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthSession(userId: string): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  execute("DELETE FROM auth_sessions WHERE expires_at <= datetime('now')");
  execute(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [hashSessionToken(token), userId, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

export function deleteAuthSession(token: string | undefined): void {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return;
  execute('DELETE FROM auth_sessions WHERE token_hash = ?', [hashSessionToken(token)]);
}

export function getUserForSessionToken(token: string | undefined): Profile | null {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return null;
  const raw = queryOne<RawProfile>(
    `SELECT p.* FROM profiles p
     JOIN auth_sessions s ON s.user_id = p.id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND p.is_suspended = 0`,
    [hashSessionToken(token)]
  );
  return parseProfile(raw);
}

export async function getCurrentUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new AuthError('Please sign in to continue.', 401);
  return currentUser.id;
}

export function parseProfile(raw: RawProfile | null | undefined): Profile | null {
  if (!raw) return null;
  const safeProfile = { ...raw };
  delete safeProfile.password_hash;
  return {
    ...safeProfile,
    interests:
      typeof raw.interests === 'string' ? JSON.parse(raw.interests || '[]') : raw.interests || [],
    subjects: typeof raw.subjects === 'string' ? JSON.parse(raw.subjects || '[]') : raw.subjects || [],
    languages:
      typeof raw.languages === 'string' ? JSON.parse(raw.languages || '[]') : raw.languages || [],
    is_suspended: Boolean(raw.is_suspended),
  };
}

export async function getCurrentUser(): Promise<Profile | null> {
  const cookieStore = await cookies();
  return getUserForSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export function getUserById(id: string): Profile | null {
  const raw = queryOne<RawProfile>('SELECT * FROM profiles WHERE id = ?', [id]);
  return parseProfile(raw);
}

export function getUserByUsername(username: string): Profile | null {
  const raw = queryOne<RawProfile>('SELECT * FROM profiles WHERE username = ?', [username]);
  return parseProfile(raw);
}

export async function authenticateUser(email: string, password: string): Promise<Profile> {
  const normalizedEmail = email.trim().toLowerCase();
  const record = queryOne<AuthRecord>(
    'SELECT * FROM profiles WHERE lower(email) = lower(?)',
    [normalizedEmail]
  );
  const passwordMatches = await verifyPassword(password, record?.password_hash ?? null);
  if (!record || !passwordMatches || record.is_suspended) {
    throw new AuthError('Invalid email or password.', 401);
  }
  return parseProfile(record)!;
}

export function getUserBadges(userId: string): UserBadge[] {
  return query<UserBadge>('SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC', [userId]);
}

export function isFollowing(followerId: string, followingId: string): boolean {
  const row = queryOne('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
  return Boolean(row);
}

export function toggleFollow(followerId: string, followingId: string): { following: boolean } {
  if (followerId === followingId) {
    throw new Error('You cannot follow yourself');
  }

  const existing = queryOne('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
  if (existing) {
    execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
    return { following: false };
  } else {
    const id = `fol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    execute('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)', [id, followerId, followingId]);
    
    // Add notification
    const follower = getUserById(followerId);
    if (follower) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      execute(
        'INSERT INTO notifications (id, user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?, ?)',
        [notifId, followingId, followerId, 'mention', `${follower.display_name} (@${follower.username}) started following you.`, `/profile/${follower.username}`]
      );
    }
    return { following: true };
  }
}

export function isBlocked(blockerId: string, targetId: string): boolean {
  const row = queryOne('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, targetId]);
  return Boolean(row);
}

export function toggleBlock(blockerId: string, blockedId: string): { blocked: boolean } {
  if (blockerId === blockedId) {
    throw new Error('You cannot block yourself');
  }
  const existing = queryOne('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
  if (existing) {
    execute('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
    return { blocked: false };
  } else {
    const id = `blk_${Date.now()}`;
    execute('INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)', [id, blockerId, blockedId]);
    // Also remove follow if exists
    execute('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', [
      blockerId,
      blockedId,
      blockedId,
      blockerId,
    ]);
    return { blocked: true };
  }
}

export function updateUserProfile(
  userId: string,
  data: {
    display_name?: string;
    bio?: string;
    interests?: string[];
    subjects?: string[];
    languages?: string[];
    avatar_url?: string;
  }
): Profile {
  const current = getUserById(userId);
  if (!current) throw new Error('User not found');

  const displayName = data.display_name ?? current.display_name;
  const bio = data.bio ?? current.bio ?? '';
  const interests = JSON.stringify(data.interests ?? current.interests);
  const subjects = JSON.stringify(data.subjects ?? current.subjects);
  const languages = JSON.stringify(data.languages ?? current.languages);
  const avatarUrl = data.avatar_url ?? current.avatar_url ?? '';

  execute(
    `UPDATE profiles SET 
      display_name = ?, bio = ?, interests = ?, subjects = ?, languages = ?, avatar_url = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [displayName, bio, interests, subjects, languages, avatarUrl, userId]
  );

  return getUserById(userId)!;
}

export async function registerUser(data: {
  username: string;
  display_name: string;
  email: string;
  password: string;
  bio?: string;
}): Promise<Profile> {
  const cleanUsername = data.username.trim().toLowerCase();
  const displayName = data.display_name.trim();
  const email = data.email.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
    throw new AuthError('Username must be 3-30 characters using letters, numbers, and underscores.', 400);
  }
  if (displayName.length < 2 || displayName.length > 80) {
    throw new AuthError('Display name must be between 2 and 80 characters.', 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError('Enter a valid email address.', 400);
  }
  if ((data.bio ?? '').length > 300) {
    throw new AuthError('Bio must be 300 characters or fewer.', 400);
  }
  const passwordHash = await hashPassword(data.password);
  const id = `user_${randomBytes(16).toString('hex')}`;

  transaction(() => {
    if (queryOne('SELECT 1 FROM profiles WHERE username = ?', [cleanUsername])) {
      throw new AuthError('Username or email is already in use.', 409);
    }
    if (queryOne('SELECT 1 FROM profiles WHERE lower(email) = lower(?)', [email])) {
      throw new AuthError('Username or email is already in use.', 409);
    }
    execute(
      `INSERT INTO profiles (id, username, display_name, email, bio, interests, subjects, languages, role, reputation_score, password_hash)
       VALUES (?, ?, ?, ?, ?, '[]', '[]', '["English"]', 'user', 10, ?)`,
      [id, cleanUsername, displayName, email, data.bio?.trim() || 'Curious mind joining Curio.', passwordHash]
    );
    execute('INSERT INTO notification_preferences (user_id) VALUES (?)', [id]);
  });

  return getUserById(id)!;
}

export async function provisionAccountPassword(
  email: string,
  password: string,
  allowReset = false
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  transaction(() => {
    const account = queryOne<{ id: string; password_hash: string | null }>(
      'SELECT id, password_hash FROM profiles WHERE lower(email) = lower(?)',
      [normalizedEmail]
    );
    if (!account) throw new AuthError('No account exists for that email.', 404);
    if (account.password_hash && !allowReset) {
      throw new AuthError('That account already has a password; use the reset option to replace it.', 409);
    }
    execute('UPDATE profiles SET password_hash = ?, updated_at = datetime(?) WHERE id = ?', [
      passwordHash,
      new Date().toISOString(),
      account.id,
    ]);
    execute('DELETE FROM auth_sessions WHERE user_id = ?', [account.id]);
  });
}
