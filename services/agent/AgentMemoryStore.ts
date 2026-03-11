// ============================================================================
// AGENT MEMORY STORE
// Persists facts, insights, tool results, and outcomes across the session.
// Now supports REAL neural embedding retrieval via AIEmbeddingService,
// with keyword-based fallback.
// ============================================================================

import { aiEmbeddingService } from '../AIEmbeddingService';

export type MemoryEntryType =
  | 'case_fact'
  | 'insight'
  | 'tool_result'
  | 'user_preference'
  | 'outcome'
  | 'document_extract';

export interface MemoryEntry {
  id: string;
  sessionId: string;
  content: string;
  metadata: {
    type: MemoryEntryType;
    confidence: number;   // 0-100
    timestamp: number;
    tags: string[];
    toolName?: string;    // set when type === 'tool_result'
    documentName?: string; // set when type === 'document_extract'
  };
}

const STORAGE_KEY = 'bw_agent_memory_v1';
const MAX_STORED = 500;

export class AgentMemoryStore {
  private entries: MemoryEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // ── Write ────────────────────────────────────────────────────────────────

  store(entry: Omit<MemoryEntry, 'id'>): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full: MemoryEntry = { id, ...entry };
    this.entries.push(full);
    this.persist();
    return id;
  }

  storeFact(sessionId: string, content: string, tags: string[] = [], confidence = 80): string {
    return this.store({
      sessionId,
      content,
      metadata: { type: 'case_fact', confidence, timestamp: Date.now(), tags }
    });
  }

  storeToolResult(sessionId: string, toolName: string, summary: string, confidence = 90): string {
    return this.store({
      sessionId,
      content: summary,
      metadata: { type: 'tool_result', confidence, timestamp: Date.now(), tags: [toolName], toolName }
    });
  }

  storeInsight(sessionId: string, insight: string, confidence = 75): string {
    return this.store({
      sessionId,
      content: insight,
      metadata: { type: 'insight', confidence, timestamp: Date.now(), tags: [] }
    });
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  /**
   * Keyword-based retrieval — returns entries whose content or tags overlap
   * with the query. Priority: tool_results > case_facts > insights.
   * Replace this with a cosine-similarity search once embeddings are available.
   */
  retrieve(query: string, limit = 8): MemoryEntry[] {
    const q = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const scored = this.entries.map(entry => {
      const text = (entry.content + ' ' + entry.metadata.tags.join(' ')).toLowerCase();
      const hits = q.filter(w => text.includes(w)).length;
      const typePriority = entry.metadata.type === 'tool_result' ? 2
        : entry.metadata.type === 'case_fact' ? 1 : 0;
      return { entry, score: hits * 10 + typePriority + (entry.metadata.confidence / 100) };
    });
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /**
   * Neural embedding retrieval — uses real AI embeddings to find
   * semantically similar memories. Falls back to keyword search.
   */
  async retrieveWithAI(query: string, limit = 8): Promise<MemoryEntry[]> {
    if (this.entries.length === 0) return [];

    try {
      const queryEmbedding = await aiEmbeddingService.embedText(query);
      const entryTexts = this.entries.map(e => e.content);
      const entryEmbeddings = await aiEmbeddingService.embedBatch(entryTexts);

      const scored = this.entries.map((entry, idx) => {
        const sim = aiEmbeddingService.cosineSimilarity(queryEmbedding, entryEmbeddings[idx]);
        const typePriority = entry.metadata.type === 'tool_result' ? 0.1
          : entry.metadata.type === 'case_fact' ? 0.05 : 0;
        return { entry, score: sim + typePriority };
      });

      return scored
        .filter(s => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.entry);
    } catch {
      // Fallback to keyword search
      return this.retrieve(query, limit);
    }
  }

  getBySession(sessionId: string): MemoryEntry[] {
    return this.entries.filter(e => e.sessionId === sessionId)
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
  }

  getRecent(sessionId: string, limit = 10): MemoryEntry[] {
    return this.getBySession(sessionId).slice(0, limit);
  }

  /** Renders recent memory as a compact context block for the AI */
  toContextBlock(sessionId: string, query?: string): string {
    const pool = query ? this.retrieve(query) : this.getRecent(sessionId, 6);
    if (pool.length === 0) return '';
    const lines = pool.map(e => {
      const tag = e.metadata.type === 'tool_result' ? `[TOOL: ${e.metadata.toolName}]`
        : e.metadata.type === 'case_fact' ? '[FACT]'
        : e.metadata.type === 'document_extract' ? '[DOC]'
        : '[INSIGHT]';
      return `${tag} ${e.content.slice(0, 300)}`;
    });
    return `\n\nMemory context:\n${lines.join('\n')}`;
  }

  /** Remove all entries older than `daysOld` days */
  pruneOldEntries(daysOld = 30): void {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    this.entries = this.entries.filter(e => e.metadata.timestamp > cutoff);
    this.persist();
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private persist(): void {
    try {
      const trimmed = this.entries.slice(-MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Storage quota exceeded — rotate oldest half
      this.entries = this.entries.slice(-Math.floor(MAX_STORED / 2));
    }
  }

  loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.entries = raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
    } catch {
      this.entries = [];
    }
  }
}
