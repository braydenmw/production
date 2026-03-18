import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { withPostgres } from './postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'memory');

export interface SessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  metadata?: Record<string, unknown>;
}

export interface LearningRecord {
  id: string;
  type: 'correction' | 'preference' | 'fact' | 'domain_knowledge' | 'style';
  content: string;
  confidence: number;
  source: string;
  createdAt: string;
}

export interface PreferencesRecord {
  updatedAt: string;
  language?: string;
  responseStyle?: 'concise' | 'detailed' | 'balanced';
  focusAreas?: string[];
  customInstructions?: string;
  [key: string]: unknown;
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory may already exist.
  }
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

class MemoryStore {
  async saveSession(session: SessionRecord): Promise<{ id: string; title: string; messageCount: number }> {
    const saved = await withPostgres(async (client) => {
      await client.query(
        `
          INSERT INTO memory_sessions (id, title, created_at, updated_at, message_count, summary, messages, metadata)
          VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5, $6, $7::jsonb, $8::jsonb)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            updated_at = EXCLUDED.updated_at,
            message_count = EXCLUDED.message_count,
            summary = EXCLUDED.summary,
            messages = EXCLUDED.messages,
            metadata = EXCLUDED.metadata
        `,
        [
          session.id,
          session.title,
          session.createdAt,
          session.updatedAt,
          session.messageCount,
          session.summary,
          JSON.stringify(session.messages),
          JSON.stringify(session.metadata || {}),
        ]
      );

      await client.query(`
        DELETE FROM memory_sessions
        WHERE id IN (
          SELECT id
          FROM memory_sessions
          ORDER BY updated_at DESC
          OFFSET 100
        )
      `);

      return {
        id: session.id,
        title: session.title,
        messageCount: session.messageCount,
      };
    });

    if (saved) {
      return saved;
    }

    const sessions = await readJSON<Record<string, SessionRecord>>('sessions.json', {});
    sessions[session.id] = session;
    const sessionIds = Object.keys(sessions);
    if (sessionIds.length > 100) {
      const sorted = sessionIds.sort((a, b) => (sessions[b].updatedAt ?? '').localeCompare(sessions[a].updatedAt ?? ''));
      for (const oldId of sorted.slice(100)) {
        delete sessions[oldId];
      }
    }

    await writeJSON('sessions.json', sessions);
    return { id: session.id, title: session.title, messageCount: session.messageCount };
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    const session = await withPostgres(async (client) => {
      const result = await client.query(
        `SELECT id, title, created_at, updated_at, message_count, summary, messages, metadata FROM memory_sessions WHERE id = $1 LIMIT 1`,
        [id]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
        messageCount: row.message_count,
        summary: row.summary || '',
        messages: Array.isArray(row.messages) ? row.messages : [],
        metadata: row.metadata || {},
      } as SessionRecord;
    });

    if (session !== null) {
      return session;
    }

    const sessions = await readJSON<Record<string, SessionRecord>>('sessions.json', {});
    return sessions[id] || null;
  }

  async listSessions(limit = 50): Promise<Array<Pick<SessionRecord, 'id' | 'title' | 'updatedAt' | 'messageCount' | 'summary'>>> {
    const sessions = await withPostgres(async (client) => {
      const result = await client.query(
        `
          SELECT id, title, updated_at, message_count, summary
          FROM memory_sessions
          ORDER BY updated_at DESC
          LIMIT $1
        `,
        [limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        updatedAt: new Date(row.updated_at).toISOString(),
        messageCount: row.message_count,
        summary: row.summary || '',
      }));
    });

    if (sessions) {
      return sessions;
    }

    const fallbackSessions = await readJSON<Record<string, SessionRecord>>('sessions.json', {});
    return Object.values(fallbackSessions)
      .map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        messageCount: session.messageCount,
        summary: session.summary,
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit);
  }

  async saveLearning(learning: LearningRecord): Promise<{ id: string }> {
    const saved = await withPostgres(async (client) => {
      await client.query(
        `
          INSERT INTO memory_learnings (id, type, content, confidence, source, created_at)
          VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        `,
        [learning.id, learning.type, learning.content, learning.confidence, learning.source, learning.createdAt]
      );

      await client.query(`
        DELETE FROM memory_learnings
        WHERE id IN (
          SELECT id
          FROM memory_learnings
          ORDER BY created_at DESC
          OFFSET 500
        )
      `);

      return { id: learning.id };
    });

    if (saved) {
      return saved;
    }

    const learnings = await readJSON<LearningRecord[]>('learnings.json', []);
    learnings.push(learning);
    await writeJSON('learnings.json', learnings.slice(-500));
    return { id: learning.id };
  }

  async getLearnings(limit = 100): Promise<LearningRecord[]> {
    const learnings = await withPostgres(async (client) => {
      const result = await client.query(
        `
          SELECT id, type, content, confidence, source, created_at
          FROM memory_learnings
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        content: row.content,
        confidence: Number(row.confidence),
        source: row.source,
        createdAt: new Date(row.created_at).toISOString(),
      })) as LearningRecord[];
    });

    if (learnings) {
      return learnings;
    }

    const fallbackLearnings = await readJSON<LearningRecord[]>('learnings.json', []);
    return fallbackLearnings.slice(-limit).reverse();
  }

  async savePreferences(preferences: PreferencesRecord): Promise<void> {
    const saved = await withPostgres(async (client) => {
      await client.query(
        `
          INSERT INTO memory_preferences (preference_scope, payload, updated_at)
          VALUES ('global', $1::jsonb, $2::timestamptz)
          ON CONFLICT (preference_scope) DO UPDATE SET
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        `,
        [JSON.stringify(preferences), preferences.updatedAt]
      );
      return true;
    });

    if (saved) {
      return;
    }

    await writeJSON('preferences.json', preferences);
  }

  async getPreferences(): Promise<PreferencesRecord> {
    const preferences = await withPostgres(async (client) => {
      const result = await client.query(
        `SELECT payload FROM memory_preferences WHERE preference_scope = 'global' LIMIT 1`
      );
      return (result.rows[0]?.payload || { updatedAt: '' }) as PreferencesRecord;
    });

    if (preferences) {
      return preferences;
    }

    return readJSON<PreferencesRecord>('preferences.json', { updatedAt: '' });
  }

  async getStats(): Promise<{
    sessions: number;
    totalMessages: number;
    learnings: number;
    hasPreferences: boolean;
    oldestSession: string;
    newestSession: string;
  }> {
    const stats = await withPostgres(async (client) => {
      const sessionAgg = await client.query(`
        SELECT COUNT(*)::int AS sessions,
               COALESCE(SUM(message_count), 0)::int AS total_messages,
               COALESCE(MIN(created_at), NOW()) AS oldest_session,
               COALESCE(MAX(updated_at), NULL) AS newest_session
        FROM memory_sessions
      `);
      const learningAgg = await client.query(`SELECT COUNT(*)::int AS learnings FROM memory_learnings`);
      const prefAgg = await client.query(`SELECT COUNT(*)::int AS preferences FROM memory_preferences`);

      const sessionRow = sessionAgg.rows[0];
      return {
        sessions: sessionRow.sessions,
        totalMessages: sessionRow.total_messages,
        learnings: learningAgg.rows[0]?.learnings || 0,
        hasPreferences: (prefAgg.rows[0]?.preferences || 0) > 0,
        oldestSession: new Date(sessionRow.oldest_session).toISOString(),
        newestSession: sessionRow.newest_session ? new Date(sessionRow.newest_session).toISOString() : '',
      };
    });

    if (stats) {
      return stats;
    }

    const sessions = await readJSON<Record<string, SessionRecord>>('sessions.json', {});
    const learnings = await readJSON<LearningRecord[]>('learnings.json', []);
    const prefs = await readJSON<PreferencesRecord>('preferences.json', { updatedAt: '' });
    return {
      sessions: Object.keys(sessions).length,
      totalMessages: Object.values(sessions).reduce((sum, session) => sum + session.messageCount, 0),
      learnings: learnings.length,
      hasPreferences: !!prefs.updatedAt,
      oldestSession: Object.values(sessions).reduce((oldest, session) => session.createdAt < oldest ? session.createdAt : oldest, new Date().toISOString()),
      newestSession: Object.values(sessions).reduce((newest, session) => session.updatedAt > newest ? session.updatedAt : newest, ''),
    };
  }
}

export const memoryStore = new MemoryStore();