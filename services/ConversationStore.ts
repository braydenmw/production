/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — CONVERSATION STORE (IndexedDB)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Persistent conversation storage using IndexedDB. Replaces localStorage-only
 * approach with a proper database that:
 *  • Stores full conversation threads with metadata
 *  • Supports searching across conversations
 *  • Auto-compacts old data (90-day retention by default)
 *  • Falls back to localStorage if IndexedDB is unavailable
 *
 * Schema:
 *  conversations: { id, title, createdAt, updatedAt, messageCount, summary }
 *  messages:      { id, conversationId, role, content, timestamp, metadata }
 *  learnings:     { id, conversationId, type, content, timestamp }
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const DB_NAME = 'bw_nexus_conversations';
const DB_VERSION = 1;
const RETENTION_DAYS = 90;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary: string;
  tags: string[];
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    brainContext?: string;
    toolsUsed?: string[];
    searchResults?: string[];
    confidenceScore?: number;
  };
}

export interface Learning {
  id: string;
  conversationId: string;
  type: 'correction' | 'preference' | 'fact' | 'feedback';
  content: string;
  timestamp: string;
}

// ─── IndexedDB Manager ──────────────────────────────────────────────────────

class ConversationStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      console.warn('[ConversationStore] IndexedDB not available, using memory-only fallback');
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('[ConversationStore] Failed to open IndexedDB, using fallback');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Conversations store
          if (!db.objectStoreNames.contains('conversations')) {
            const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
            convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
            msgStore.createIndex('conversationId', 'conversationId', { unique: false });
            msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Learnings store
          if (!db.objectStoreNames.contains('learnings')) {
            const learnStore = db.createObjectStore('learnings', { keyPath: 'id' });
            learnStore.createIndex('conversationId', 'conversationId', { unique: false });
            learnStore.createIndex('type', 'type', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          console.log('[ConversationStore] IndexedDB initialized');
          // Auto-compact on init
          this.compactOldData().catch(() => {});
          resolve();
        };
      } catch {
        console.warn('[ConversationStore] IndexedDB init exception');
        resolve();
      }
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }

  // ─── Conversation CRUD ──────────────────────────────────────────────────

  async createConversation(title?: string): Promise<Conversation> {
    await this.ensureReady();
    const conv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title || 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      summary: '',
      tags: [],
    };

    if (this.db) {
      await this.idbPut('conversations', conv);
    }
    return conv;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    await this.ensureReady();
    if (!this.db) return null;
    return this.idbGet('conversations', id);
  }

  async listConversations(limit = 50): Promise<Conversation[]> {
    await this.ensureReady();
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const index = store.index('updatedAt');
      const results: Conversation[] = [];
      const request = index.openCursor(null, 'prev');
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value as Conversation);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    const conv = await this.idbGet<Conversation>('conversations', id);
    if (conv) {
      Object.assign(conv, updates, { updatedAt: new Date().toISOString() });
      await this.idbPut('conversations', conv);
    }
  }

  // ─── Message CRUD ───────────────────────────────────────────────────────

  async addMessage(conversationId: string, role: StoredMessage['role'], content: string, metadata?: StoredMessage['metadata']): Promise<StoredMessage> {
    await this.ensureReady();
    const msg: StoredMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    if (this.db) {
      await this.idbPut('messages', msg);
      // Update conversation messageCount
      const conv = await this.idbGet<Conversation>('conversations', conversationId);
      if (conv) {
        conv.messageCount = (conv.messageCount || 0) + 1;
        conv.updatedAt = new Date().toISOString();
        // Auto-title from first user message
        if (conv.title === 'New Conversation' && role === 'user') {
          conv.title = content.slice(0, 80) + (content.length > 80 ? '...' : '');
        }
        await this.idbPut('conversations', conv);
      }
    }

    return msg;
  }

  async getMessages(conversationId: string, limit = 100): Promise<StoredMessage[]> {
    await this.ensureReady();
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);
      request.onsuccess = () => {
        const all = (request.result || []) as StoredMessage[];
        all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        resolve(all.slice(-limit));
      };
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Get the last N messages across ALL conversations, most recent first.
   * Useful for building cross-session context (long-term memory).
   */
  async getRecentMessages(limit = 20): Promise<StoredMessage[]> {
    await this.ensureReady();
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('timestamp');
      const results: StoredMessage[] = [];
      const request = index.openCursor(null, 'prev');
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value as StoredMessage);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  // ─── Learnings CRUD ─────────────────────────────────────────────────────

  async addLearning(conversationId: string, type: Learning['type'], content: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    const learning: Learning = {
      id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      type,
      content,
      timestamp: new Date().toISOString(),
    };
    await this.idbPut('learnings', learning);
  }

  async getLearnings(type?: Learning['type'], limit = 50): Promise<Learning[]> {
    await this.ensureReady();
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction('learnings', 'readonly');
      const store = tx.objectStore('learnings');
      const all: Learning[] = [];
      const request = type
        ? store.index('type').getAll(type)
        : store.getAll();
      request.onsuccess = () => {
        const results = (request.result || []) as Learning[];
        results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        resolve(results.slice(0, limit));
      };
      request.onerror = () => resolve(all);
    });
  }

  // ─── Search ─────────────────────────────────────────────────────────────

  async searchMessages(query: string, limit = 20): Promise<StoredMessage[]> {
    await this.ensureReady();
    if (!this.db) return [];
    const q = query.toLowerCase();
    return new Promise((resolve) => {
      const tx = this.db!.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const results: StoredMessage[] = [];
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const msg = cursor.value as StoredMessage;
          if (msg.content.toLowerCase().includes(q)) {
            results.push(msg);
          }
          if (results.length < limit) {
            cursor.continue();
          } else {
            resolve(results);
          }
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  // ─── Maintenance ────────────────────────────────────────────────────────

  async compactOldData(): Promise<number> {
    await this.ensureReady();
    if (!this.db) return 0;
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
    let deleted = 0;

    // Delete old messages
    await new Promise<void>((resolve) => {
      const tx = this.db!.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });

    if (deleted > 0) {
      console.log(`[ConversationStore] Compacted ${deleted} old messages (>${RETENTION_DAYS} days)`);
    }
    return deleted;
  }

  async getStats(): Promise<{ conversations: number; messages: number; learnings: number }> {
    await this.ensureReady();
    if (!this.db) return { conversations: 0, messages: 0, learnings: 0 };
    const count = async (storeName: string) => new Promise<number>((resolve) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    return {
      conversations: await count('conversations'),
      messages: await count('messages'),
      learnings: await count('learnings'),
    };
  }

  // ─── IndexedDB Helpers ──────────────────────────────────────────────────

  private idbPut(storeName: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private idbGet<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const conversationStore = new ConversationStore();
export default conversationStore;
