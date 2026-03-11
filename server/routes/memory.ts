/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — SERVER-SIDE SESSION & MEMORY PERSISTENCE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Express routes for server-side storage of conversation sessions, user
 * preferences, and learnings. Enables cross-device memory and persistence
 * beyond browser-local storage.
 *
 * Storage: File-based JSON (upgradeable to PostgreSQL/Redis)
 *
 * Endpoints:
 *  POST   /api/memory/sessions       — Create/update a session
 *  GET    /api/memory/sessions/:id    — Get session by ID
 *  GET    /api/memory/sessions        — List recent sessions
 *  POST   /api/memory/learnings       — Store a learning
 *  GET    /api/memory/learnings       — Get all learnings
 *  POST   /api/memory/preferences     — Store user preferences
 *  GET    /api/memory/preferences     — Get user preferences
 *  GET    /api/memory/stats           — Memory system stats
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'memory');

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  metadata?: Record<string, unknown>;
}

interface Learning {
  id: string;
  type: 'correction' | 'preference' | 'fact' | 'domain_knowledge' | 'style';
  content: string;
  confidence: number;
  source: string;
  createdAt: string;
}

interface Preferences {
  updatedAt: string;
  language?: string;
  responseStyle?: 'concise' | 'detailed' | 'balanced';
  focusAreas?: string[];
  customInstructions?: string;
  [key: string]: unknown;
}

// ─── File-based Storage Helpers ─────────────────────────────────────────────

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch { /* directory may already exist */ }
}

async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  try {
    const filepath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(filename: string, data: unknown): Promise<void> {
  await ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Input validation helpers ───────────────────────────────────────────────

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function sanitizeString(input: unknown, maxLength = 10000): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
}

// ─── Sessions ───────────────────────────────────────────────────────────────

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { id, title, summary, messages, metadata } = req.body;
    if (!id || !isValidId(id)) {
      return res.status(400).json({ error: 'Valid session id is required' });
    }

    const sessions = await readJSON<Record<string, Session>>('sessions.json', {});
    const existing = sessions[id];

    const messageArray = Array.isArray(messages)
      ? messages.slice(-200).map((m: { role?: string; content?: string; timestamp?: string }) => ({
          role: sanitizeString(m.role, 20),
          content: sanitizeString(m.content, 5000),
          timestamp: sanitizeString(m.timestamp, 30) || new Date().toISOString(),
        }))
      : existing?.messages || [];

    sessions[id] = {
      id,
      title: sanitizeString(title, 200) || existing?.title || 'Untitled Session',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: messageArray.length,
      summary: sanitizeString(summary, 2000) || existing?.summary || '',
      messages: messageArray,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : existing?.metadata,
    };

    // Keep only last 100 sessions
    const sessionIds = Object.keys(sessions);
    if (sessionIds.length > 100) {
      const sorted = sessionIds.sort((a, b) => (sessions[b].updatedAt ?? '').localeCompare(sessions[a].updatedAt ?? ''));
      for (const oldId of sorted.slice(100)) {
        delete sessions[oldId];
      }
    }

    await writeJSON('sessions.json', sessions);
    res.json({ success: true, session: { id, title: sessions[id].title, messageCount: sessions[id].messageCount } });
  } catch (error) {
    console.error('[Memory] Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid session id' });

    const sessions = await readJSON<Record<string, Session>>('sessions.json', {});
    const session = sessions[id];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json(session);
  } catch (error) {
    console.error('[Memory] Error reading session:', error);
    res.status(500).json({ error: 'Failed to read session' });
  }
});

router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await readJSON<Record<string, Session>>('sessions.json', {});
    const list = Object.values(sessions)
      .map(s => ({ id: s.id, title: s.title, updatedAt: s.updatedAt, messageCount: s.messageCount, summary: s.summary }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 50);
    res.json(list);
  } catch (error) {
    console.error('[Memory] Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// ─── Learnings ──────────────────────────────────────────────────────────────

router.post('/learnings', async (req: Request, res: Response) => {
  try {
    const { type, content, confidence, source } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }

    const learnings = await readJSON<Learning[]>('learnings.json', []);
    const validTypes = ['correction', 'preference', 'fact', 'domain_knowledge', 'style'];
    const learning: Learning = {
      id: `learning_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: validTypes.includes(type) ? type : 'fact',
      content: sanitizeString(content, 2000),
      confidence: typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.8,
      source: sanitizeString(source, 200) || 'conversation',
      createdAt: new Date().toISOString(),
    };

    learnings.push(learning);

    // Keep only last 500 learnings
    const trimmed = learnings.slice(-500);
    await writeJSON('learnings.json', trimmed);
    res.json({ success: true, id: learning.id });
  } catch (error) {
    console.error('[Memory] Error saving learning:', error);
    res.status(500).json({ error: 'Failed to save learning' });
  }
});

router.get('/learnings', async (_req: Request, res: Response) => {
  try {
    const learnings = await readJSON<Learning[]>('learnings.json', []);
    res.json(learnings.slice(-100));
  } catch (error) {
    console.error('[Memory] Error reading learnings:', error);
    res.status(500).json({ error: 'Failed to read learnings' });
  }
});

// ─── Preferences ────────────────────────────────────────────────────────────

router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const existing = await readJSON<Preferences>('preferences.json', { updatedAt: '' });
    const merged: Preferences = {
      ...existing,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    // Sanitize known fields
    if (merged.customInstructions) merged.customInstructions = sanitizeString(merged.customInstructions, 5000);
    if (merged.language) merged.language = sanitizeString(merged.language, 20);

    await writeJSON('preferences.json', merged);
    res.json({ success: true });
  } catch (error) {
    console.error('[Memory] Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

router.get('/preferences', async (_req: Request, res: Response) => {
  try {
    const prefs = await readJSON<Preferences>('preferences.json', { updatedAt: '' });
    res.json(prefs);
  } catch (error) {
    console.error('[Memory] Error reading preferences:', error);
    res.status(500).json({ error: 'Failed to read preferences' });
  }
});

// ─── Stats ──────────────────────────────────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const sessions = await readJSON<Record<string, Session>>('sessions.json', {});
    const learnings = await readJSON<Learning[]>('learnings.json', []);
    const prefs = await readJSON<Preferences>('preferences.json', { updatedAt: '' });

    res.json({
      sessions: Object.keys(sessions).length,
      totalMessages: Object.values(sessions).reduce((s, sess) => s + sess.messageCount, 0),
      learnings: learnings.length,
      hasPreferences: !!prefs.updatedAt,
      oldestSession: Object.values(sessions).reduce((oldest, s) => s.createdAt < oldest ? s.createdAt : oldest, new Date().toISOString()),
      newestSession: Object.values(sessions).reduce((newest, s) => s.updatedAt > newest ? s.updatedAt : newest, ''),
    });
  } catch (error) {
    console.error('[Memory] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
