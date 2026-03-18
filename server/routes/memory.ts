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
import { memoryStore, LearningRecord, PreferencesRecord, SessionRecord } from '../services/memoryStore.js';
import { serverVectorStore } from '../services/vectorStore.js';

const router = Router();

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

    const existing = await memoryStore.getSession(id);

    const messageArray = Array.isArray(messages)
      ? messages.slice(-200).map((m: { role?: string; content?: string; timestamp?: string }) => ({
          role: sanitizeString(m.role, 20),
          content: sanitizeString(m.content, 5000),
          timestamp: sanitizeString(m.timestamp, 30) || new Date().toISOString(),
        }))
      : existing?.messages || [];

    const session: SessionRecord = {
      id,
      title: sanitizeString(title, 200) || existing?.title || 'Untitled Session',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: messageArray.length,
      summary: sanitizeString(summary, 2000) || existing?.summary || '',
      messages: messageArray,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : existing?.metadata,
    };

    const saved = await memoryStore.saveSession(session);
    res.json({ success: true, session: saved });
  } catch (error) {
    console.error('[Memory] Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid session id' });

    const session = await memoryStore.getSession(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json(session);
  } catch (error) {
    console.error('[Memory] Error reading session:', error);
    res.status(500).json({ error: 'Failed to read session' });
  }
});

router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const list = await memoryStore.listSessions(50);
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

    const validTypes = ['correction', 'preference', 'fact', 'domain_knowledge', 'style'];
    const learning: LearningRecord = {
      id: `learning_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: validTypes.includes(type) ? type : 'fact',
      content: sanitizeString(content, 2000),
      confidence: typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.8,
      source: sanitizeString(source, 200) || 'conversation',
      createdAt: new Date().toISOString(),
    };

    const saved = await memoryStore.saveLearning(learning);
    res.json({ success: true, id: saved.id });
  } catch (error) {
    console.error('[Memory] Error saving learning:', error);
    res.status(500).json({ error: 'Failed to save learning' });
  }
});

router.get('/learnings', async (_req: Request, res: Response) => {
  try {
    const learnings = await memoryStore.getLearnings(100);
    res.json(learnings);
  } catch (error) {
    console.error('[Memory] Error reading learnings:', error);
    res.status(500).json({ error: 'Failed to read learnings' });
  }
});

// ─── Preferences ────────────────────────────────────────────────────────────

router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const existing = await memoryStore.getPreferences();
    const merged: PreferencesRecord = {
      ...existing,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    // Sanitize known fields
    if (merged.customInstructions) merged.customInstructions = sanitizeString(merged.customInstructions, 5000);
    if (merged.language) merged.language = sanitizeString(merged.language, 20);

    await memoryStore.savePreferences(merged);
    res.json({ success: true });
  } catch (error) {
    console.error('[Memory] Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

router.get('/preferences', async (_req: Request, res: Response) => {
  try {
    const prefs = await memoryStore.getPreferences();
    res.json(prefs);
  } catch (error) {
    console.error('[Memory] Error reading preferences:', error);
    res.status(500).json({ error: 'Failed to read preferences' });
  }
});

// ─── Vector Retrieval ───────────────────────────────────────────────────────

router.post('/vectors', async (req: Request, res: Response) => {
  try {
    const documents = Array.isArray(req.body?.documents)
      ? req.body.documents
      : [req.body];

    const saved = [];
    for (const document of documents) {
      if (!document?.text) continue;
      const record = await serverVectorStore.upsertDocument({
        id: document.id,
        text: document.text,
        source: document.source,
        metadata: document.metadata
      });
      saved.push({
        id: record.id,
        source: record.source,
        embeddingModel: record.embeddingModel,
        updatedAt: record.updatedAt
      });
    }

    if (saved.length === 0) {
      return res.status(400).json({ error: 'At least one document with text is required' });
    }

    res.status(201).json({ success: true, saved });
  } catch (error) {
    console.error('[Memory] Error saving vector documents:', error);
    res.status(500).json({ error: 'Failed to save vector documents' });
  }
});

router.post('/search', async (req: Request, res: Response) => {
  try {
    const query = sanitizeString(req.body?.query, 5000);
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await serverVectorStore.search(query, {
      topK: typeof req.body?.topK === 'number' ? req.body.topK : undefined,
      minScore: typeof req.body?.minScore === 'number' ? req.body.minScore : undefined,
      source: req.body?.source
    });

    res.json({
      query,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('[Memory] Error searching vectors:', error);
    res.status(500).json({ error: 'Failed to search vectors' });
  }
});

// ─── Stats ──────────────────────────────────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const memoryStats = await memoryStore.getStats();
    const vectorStats = await serverVectorStore.stats();

    res.json({
      ...memoryStats,
      vectors: vectorStats,
    });
  } catch (error) {
    console.error('[Memory] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
