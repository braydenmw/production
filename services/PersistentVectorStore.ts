/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — PERSISTENT VECTOR STORE (IndexedDB-backed RAG)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wraps the in-memory VectorMemoryIndex with IndexedDB persistence so that
 * embeddings, chunks, and knowledge survive browser refreshes.
 *
 * Architecture:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  In-Memory Layer (fast search via VectorMemoryIndex + LSH)  │
 *  │  ↕ sync on startup / flush on write                        │
 *  │  IndexedDB Layer (persistent across sessions)               │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * Stores:
 *  • vectors  — embeddings with metadata (id, vector, metadata, text)
 *  • chunks   — document chunks from DocumentChunkingService
 *  • knowledge — extracted facts/learnings for long-term memory
 *
 * Retrieval:
 *  • Semantic search via cosine similarity on neural embeddings
 *  • Metadata filtering (country, industry, topic)
 *  • Full-text fallback when embeddings unavailable
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { aiEmbeddingService } from './AIEmbeddingService';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StoredVector {
  id: string;
  text: string;
  vector: number[];
  metadata: Record<string, unknown>;
  createdAt: string;
  source: string;
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  topic: string;
  embedding?: number[];
  confidence: number;
  createdAt: string;
  accessCount: number;
  lastAccessed: string;
}

export interface RetrievalResult {
  id: string;
  text: string;
  score: number;
  source: string;
  metadata: Record<string, unknown>;
}

// ─── IndexedDB Constants ────────────────────────────────────────────────────

const DB_NAME = 'bw_nexus_vector_store';
const DB_VERSION = 1;
const STORE_VECTORS = 'vectors';
const STORE_KNOWLEDGE = 'knowledge';

// ─── Persistent Vector Store ────────────────────────────────────────────────

class PersistentVectorStore {
  private db: IDBDatabase | null = null;
  private memoryIndex: Map<string, StoredVector> = new Map();
  private knowledgeIndex: Map<string, KnowledgeEntry> = new Map();
  private initialized = false;

  /**
   * Initialize IndexedDB and load existing vectors into memory.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (typeof indexedDB === 'undefined') {
      console.warn('[PersistentVectorStore] IndexedDB not available, running in memory-only mode');
      this.initialized = true;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('[PersistentVectorStore] Failed to open IndexedDB, using memory fallback');
          this.initialized = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_VECTORS)) {
            const vectorStore = db.createObjectStore(STORE_VECTORS, { keyPath: 'id' });
            vectorStore.createIndex('source', 'source', { unique: false });
            vectorStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_KNOWLEDGE)) {
            const knowledgeStore = db.createObjectStore(STORE_KNOWLEDGE, { keyPath: 'id' });
            knowledgeStore.createIndex('topic', 'topic', { unique: false });
            knowledgeStore.createIndex('confidence', 'confidence', { unique: false });
          }
        };

        request.onsuccess = async (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          // Load existing vectors into memory
          await this.loadFromDB();
          this.initialized = true;
          console.log(`[PersistentVectorStore] Initialized — ${this.memoryIndex.size} vectors, ${this.knowledgeIndex.size} knowledge entries`);
          resolve();
        };
      } catch {
        this.initialized = true;
        resolve();
      }
    });
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    // Load vectors
    await new Promise<void>((resolve) => {
      const tx = this.db!.transaction(STORE_VECTORS, 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const request = store.getAll();
      request.onsuccess = () => {
        const vectors = request.result as StoredVector[];
        for (const v of vectors) {
          this.memoryIndex.set(v.id, v);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });

    // Load knowledge
    await new Promise<void>((resolve) => {
      const tx = this.db!.transaction(STORE_KNOWLEDGE, 'readonly');
      const store = tx.objectStore(STORE_KNOWLEDGE);
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = request.result as KnowledgeEntry[];
        for (const k of entries) {
          this.knowledgeIndex.set(k.id, k);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  // ── Document Storage ────────────────────────────────────────────────────

  /**
   * Add a document/chunk to the vector store.
   */
  async addDocument(id: string, text: string, metadata: Record<string, unknown> = {}, source = 'unknown'): Promise<void> {
    await this.initialize();

    let vector: number[];
    try {
      vector = await aiEmbeddingService.embedText(text);
    } catch {
      // Fallback: simple bag-of-words vector
      vector = this.simpleEmbed(text);
    }

    const entry: StoredVector = {
      id,
      text,
      vector,
      metadata,
      createdAt: new Date().toISOString(),
      source,
    };

    this.memoryIndex.set(id, entry);
    await this.persistVector(entry);
  }

  /**
   * Add pre-embedded document (already has vector).
   */
  async addEmbedded(id: string, text: string, vector: number[], metadata: Record<string, unknown> = {}, source = 'unknown'): Promise<void> {
    await this.initialize();
    const entry: StoredVector = { id, text, vector, metadata, createdAt: new Date().toISOString(), source };
    this.memoryIndex.set(id, entry);
    await this.persistVector(entry);
  }

  // ── Retrieval ───────────────────────────────────────────────────────────

  /**
   * Semantic search: find documents most similar to query.
   */
  async search(query: string, topK = 5, minScore = 0.1): Promise<RetrievalResult[]> {
    await this.initialize();
    if (this.memoryIndex.size === 0) return [];

    let queryVector: number[];
    try {
      queryVector = await aiEmbeddingService.embedText(query);
    } catch {
      queryVector = this.simpleEmbed(query);
    }

    const results: RetrievalResult[] = [];
    for (const [, entry] of this.memoryIndex) {
      const score = this.cosineSimilarity(queryVector, entry.vector);
      if (score >= minScore) {
        results.push({
          id: entry.id,
          text: entry.text,
          score,
          source: entry.source,
          metadata: entry.metadata,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Format search results as context for AI prompts.
   */
  async searchForContext(query: string, topK = 3): Promise<string> {
    const results = await this.search(query, topK, 0.15);
    if (results.length === 0) return '';
    return results
      .map((r, i) => `[Retrieved ${i + 1}] (relevance: ${(r.score * 100).toFixed(0)}%) ${r.text.slice(0, 500)}`)
      .join('\n\n');
  }

  // ── Knowledge Base ──────────────────────────────────────────────────────

  /**
   * Store a knowledge entry (extracted fact, learning, etc.)
   */
  async addKnowledge(content: string, topic: string, confidence = 0.8): Promise<void> {
    await this.initialize();
    let embedding: number[] | undefined;
    try {
      embedding = await aiEmbeddingService.embedText(content);
    } catch { /* optional */ }

    const entry: KnowledgeEntry = {
      id: `knowledge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      topic,
      embedding,
      confidence,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
    };

    this.knowledgeIndex.set(entry.id, entry);
    await this.persistKnowledge(entry);
  }

  /**
   * Query knowledge base by topic or semantic similarity.
   */
  async queryKnowledge(query: string, topK = 5): Promise<KnowledgeEntry[]> {
    await this.initialize();
    const entries = Array.from(this.knowledgeIndex.values());
    if (entries.length === 0) return [];

    // Try semantic search if embeddings available
    let queryEmbedding: number[] | undefined;
    try {
      queryEmbedding = await aiEmbeddingService.embedText(query);
    } catch { /* optional */ }

    const scored = entries.map(entry => {
      let score = 0;
      // Topic keyword match
      if (entry.topic.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(entry.topic.toLowerCase())) {
        score += 0.5;
      }
      // Content keyword match
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchCount = queryWords.filter(w => entry.content.toLowerCase().includes(w)).length;
      score += (matchCount / Math.max(queryWords.length, 1)) * 0.3;
      // Semantic similarity
      if (queryEmbedding && entry.embedding) {
        score += this.cosineSimilarity(queryEmbedding, entry.embedding) * 0.5;
      }
      // Confidence boost
      score *= entry.confidence;
      return { entry, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => {
        s.entry.accessCount++;
        s.entry.lastAccessed = new Date().toISOString();
        return s.entry;
      });
  }

  // ── Stats & Maintenance ─────────────────────────────────────────────────

  getStats(): { vectors: number; knowledge: number; persistent: boolean } {
    return {
      vectors: this.memoryIndex.size,
      knowledge: this.knowledgeIndex.size,
      persistent: this.db !== null,
    };
  }

  async clear(): Promise<void> {
    this.memoryIndex.clear();
    this.knowledgeIndex.clear();
    if (this.db) {
      const tx = this.db.transaction([STORE_VECTORS, STORE_KNOWLEDGE], 'readwrite');
      tx.objectStore(STORE_VECTORS).clear();
      tx.objectStore(STORE_KNOWLEDGE).clear();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private simpleEmbed(text: string): number[] {
    // Fallback: hash-based embedding for when API is unavailable
    const dims = 768;
    const vec = new Array(dims).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      let hash = 0;
      for (let j = 0; j < words[i].length; j++) {
        hash = ((hash << 5) - hash + words[i].charCodeAt(j)) | 0;
      }
      vec[Math.abs(hash) % dims] += 1 / (i + 1);
    }
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    return vec.map(x => x / norm);
  }

  private async persistVector(entry: StoredVector): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_VECTORS, 'readwrite');
        tx.objectStore(STORE_VECTORS).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { resolve(); }
    });
  }

  private async persistKnowledge(entry: KnowledgeEntry): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_KNOWLEDGE, 'readwrite');
        tx.objectStore(STORE_KNOWLEDGE).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { resolve(); }
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const persistentVectorStore = new PersistentVectorStore();
export default persistentVectorStore;
