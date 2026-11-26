import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const HASH_STORE_PATH = path.resolve(__dirname, '.elviora-admin.hash.json');

interface PersistedAdminHash {
  salt: string;
  hashHex: string;
  createdAt: string;
}

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const revokedTokenIds = new Set<string>();
const attemptTracker = new Map<string, RateLimitEntry>();

function readPersistedHash(): PersistedAdminHash | null {
  try {
    if (!fs.existsSync(HASH_STORE_PATH)) return null;
    const raw = fs.readFileSync(HASH_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedAdminHash>;
    if (
      typeof parsed.salt === 'string' &&
      parsed.salt.length >= 16 &&
      typeof parsed.hashHex === 'string' &&
      parsed.hashHex.length === 128
    ) {
      return {
        salt: parsed.salt,
        hashHex: parsed.hashHex,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function isPasscodeConfigured(): { configured: boolean; mode: 'env' | 'setup' | 'unconfigured' } {
  if (getEnvPasscode().length > 0) {
    return { configured: true, mode: 'env' };
  }
  if (readPersistedHash() !== null) {
    return { configured: true, mode: 'setup' };
  }
  return { configured: false, mode: 'unconfigured' };
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function verifyPasscode(candidate: string): boolean {
  const envPass = getEnvPasscode();
  if (envPass.length > 0) {
    return timingSafeCompareStrings(candidate, envPass);
  }
  const stored = readPersistedHash();
  if (!stored) return false;
  const derived = crypto.scryptSync(candidate, stored.salt, 64);
  const expected = Buffer.from(stored.hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function signAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = {
    role: 'admin',
    jti: crypto.randomBytes(16).toString('hex'),
    exp: expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  };
}

function verifyAdminToken(token: string): { valid: boolean; jti?: string; expiresAt?: number } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return { valid: false };

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const sigBufA = Buffer.from(providedSig, 'utf8');
  const sigBufB = Buffer.from(expectedSig, 'utf8');
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return { valid: false };
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      role?: string;
      jti?: string;
      exp?: number;
    };
    if (
      decoded.role !== 'admin' ||
      typeof decoded.jti !== 'string' ||
      typeof decoded.exp !== 'number' ||
      Date.now() > decoded.exp ||
      revokedTokenIds.has(decoded.jti)
    ) {
      return { valid: false };
    }
    return { valid: true, jti: decoded.jti, expiresAt: decoded.exp };
  } catch {
    return { valid: false };
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function checkRateLimit(clientKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = attemptTracker.get(clientKey);
  if (!entry || now > entry.resetAt) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedAttempt(clientKey: string): void {
  const now = Date.now();
  const entry = attemptTracker.get(clientKey);
  if (!entry || now > entry.resetAt) {
    attemptTracker.set(clientKey, { attempts: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.attempts += 1;
    attemptTracker.set(clientKey, entry);
  }
}

function clearAttempts(clientKey: string): void {
  attemptTracker.delete(clientKey);
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Check whether an admin passcode is configured
  app.get('/api/admin/status', (_req: Request, res: Response) => {
    const status = isPasscodeConfigured();
    res.json(status);
  });

  // First-run passcode claim when ADMIN_PASSCODE env var and persisted hash are not yet set
  app.post('/api/admin/setup', (req: Request, res: Response) => {
    const status = isPasscodeConfigured();
    if (status.configured) {
      res.status(409).json({
        error: 'Sandi Admin sudah dikonfigurasi. Silakan masukkan sandi yang berlaku.',
      });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const confirmPasscode =
      typeof req.body?.confirmPasscode === 'string' ? req.body.confirmPasscode.trim() : '';

    if (passcode.length < 6 || passcode.length > 64) {
      res.status(400).json({
        error: 'Sandi Admin harus terdiri dari 6 hingga 64 karakter.',
      });
      return;
    }

    if (passcode !== confirmPasscode) {
      res.status(400).json({
        error: 'Konfirmasi sandi tidak cocok.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashHex = crypto.scryptSync(passcode, salt, 64).toString('hex');
    const payload: PersistedAdminHash = {
      salt,
      hashHex,
      createdAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(HASH_STORE_PATH, JSON.stringify(payload, null, 2), {
        encoding: 'utf8',
        mode: 0o600,
      });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan sandi admin di server.' });
      return;
    }

    const session = signAdminToken();
    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      mode: 'setup',
    });
  });

  // Verify admin passcode and issue in-memory Bearer token
  app.post('/api/admin/verify', (req: Request, res: Response) => {
    const status = isPasscodeConfigured();
    if (!status.configured) {
      res.status(409).json({
        error: 'Sandi Admin belum diatur. Silakan buat sandi admin terlebih dahulu.',
        needsSetup: true,
      });
      return;
    }

    const clientIp = getClientIp(req);
    const limit = checkRateLimit(clientIp);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${limit.retryAfterSec} detik.`,
      });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode || passcode.length > 128) {
      res.status(400).json({ error: 'Masukkan sandi admin terlebih dahulu.' });
      return;
    }

    if (!verifyPasscode(passcode)) {
      recordFailedAttempt(clientIp);
      res.status(401).json({
        error: 'Sandi Admin salah. Akses ditolak — halaman ini khusus Admin studio.',
      });
      return;
    }

    clearAttempts(clientIp);
    const session = signAdminToken();
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      mode: status.mode,
    });
  });

  // Validate active in-memory Bearer token
  app.get('/api/admin/session', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ valid: false });
      return;
    }
    const result = verifyAdminToken(token);
    if (!result.valid) {
      res.status(401).json({ valid: false });
      return;
    }
    res.json({ valid: true, expiresAt: result.expiresAt });
  });

  // Revoke current Bearer token
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      const result = verifyAdminToken(token);
      if (result.valid && result.jti) {
        revokedTokenIds.add(result.jti);
      }
    }
    res.json({ ok: true });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Elviora server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
