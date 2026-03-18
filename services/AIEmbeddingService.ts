/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI - REAL NEURAL EMBEDDING SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates real 768-dimensional vector embeddings via Together.ai's
 * embedding endpoint. Replaces the bag-of-words approach in VectorMemoryIndex
 * with genuine neural semantic understanding.
 *
 * Model: togethercomputer/m2-bert-80M-8k-retrieval (768 dims, 8K context)
 *
 * Features:
 *  • Batched embedding requests (up to 32 texts per call)
 *  • In-memory LRU cache to avoid redundant API calls
 *  • Cosine similarity utility for search
 *  • Chunking for long documents
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const TOGETHER_EMBEDDING_URL = 'https://api.together.xyz/v1/embeddings';
const EMBEDDING_MODEL = 'togethercomputer/m2-bert-80M-8k-retrieval';
const EMBEDDING_DIMENSIONS = 768;
const MAX_BATCH_SIZE = 32;
const CACHE_MAX_ENTRIES = 2000;
const MAX_CHUNK_CHARS = 6000; // ~1500 tokens safe margin for 8K model

// ─── API Key helper ─────────────────────────────────────────────────────────

function getAPIKey(): string {
  const key =
    (typeof process !== 'undefined' && process.env?.TOGETHER_API_KEY) ||
    '';
  const lower = key.toLowerCase();
  if (!key || key.length < 20 || lower.includes('your-') || lower.includes('placeholder')) {
    return '';
  }
  return key;
}

// ─── LRU Cache ──────────────────────────────────────────────────────────────

const embeddingCache = new Map<string, number[]>();

function cacheGet(text: string): number[] | undefined {
  const key = text.slice(0, 200); // Use prefix as cache key
  const val = embeddingCache.get(key);
  if (val) {
    // Move to end (LRU refresh)
    embeddingCache.delete(key);
    embeddingCache.set(key, val);
  }
  return val;
}

function cacheSet(text: string, vector: number[]): void {
  const key = text.slice(0, 200);
  if (embeddingCache.size >= CACHE_MAX_ENTRIES) {
    // Evict oldest entry
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey !== undefined) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(key, vector);
}

// ─── Core embedding call ────────────────────────────────────────────────────

async function callEmbeddingAPI(texts: string[]): Promise<number[][]> {
  const apiKey = getAPIKey();
  if (!apiKey) {
    // Fallback: deterministic hash-based pseudo-embeddings when no key
    return texts.map(t => hashToVector(t));
  }

  const res = await fetch(TOGETHER_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map(t => t.slice(0, MAX_CHUNK_CHARS)),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn(`[AIEmbeddingService] API error ${res.status}: ${errText}`);
    return texts.map(t => hashToVector(t));
  }

  const data = await res.json();
  const embeddings: number[][] = (data.data || [])
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => item.embedding as number[]);

  // Ensure we got results for every input
  while (embeddings.length < texts.length) {
    embeddings.push(hashToVector(texts[embeddings.length]));
  }

  return embeddings;
}

/**
 * Deterministic fallback: maps text to a stable 768-dim unit vector.
 * Used when no API key is available. Not semantically meaningful
 * but preserves the same interface so the rest of the system works.
 */
function hashToVector(text: string): number[] {
  const vec = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const chars = text.toLowerCase();
  for (let i = 0; i < chars.length; i++) {
    const idx = (chars.charCodeAt(i) * 31 + i * 7) % EMBEDDING_DIMENSIONS;
    vec[idx] += 1;
  }
  // Normalize to unit vector
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Embed a single text. Returns a 768-dim vector.
 * Uses cache to avoid redundant API calls.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || !text.trim()) return new Array(EMBEDDING_DIMENSIONS).fill(0);

  const cached = cacheGet(text);
  if (cached) return cached;

  const [vector] = await callEmbeddingAPI([text.slice(0, MAX_CHUNK_CHARS)]);
  cacheSet(text, vector);
  return vector;
}

/**
 * Embed multiple texts in batches. Returns array of 768-dim vectors.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);
  const uncached: { index: number; text: string }[] = [];

  // Check cache first
  for (let i = 0; i < texts.length; i++) {
    const cached = cacheGet(texts[i]);
    if (cached) {
      results[i] = cached;
    } else {
      uncached.push({ index: i, text: texts[i] });
    }
  }

  // Batch API calls for uncached
  for (let batchStart = 0; batchStart < uncached.length; batchStart += MAX_BATCH_SIZE) {
    const batch = uncached.slice(batchStart, batchStart + MAX_BATCH_SIZE);
    const vectors = await callEmbeddingAPI(batch.map(b => b.text));
    for (let j = 0; j < batch.length; j++) {
      results[batch[j].index] = vectors[j];
      cacheSet(batch[j].text, vectors[j]);
    }
  }

  return results;
}

/**
 * Cosine similarity between two vectors. Returns -1 to 1.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Chunk a long document into embeddable segments with overlap.
 */
export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    const end = Math.min(pos + chunkSize, text.length);
    chunks.push(text.slice(pos, end));
    pos += chunkSize - overlap;
    if (pos >= text.length) break;
  }
  return chunks;
}

/**
 * Embed a long document by chunking and returning per-chunk embeddings.
 */
export async function embedDocument(text: string): Promise<{ chunks: string[]; vectors: number[][] }> {
  const chunks = chunkText(text);
  const vectors = await embedBatch(chunks);
  return { chunks, vectors };
}

/**
 * Find the most relevant chunks from a document corpus given a query.
 */
export async function searchChunks(
  query: string,
  corpus: { chunks: string[]; vectors: number[][] },
  topK = 5
): Promise<{ chunk: string; score: number; index: number }[]> {
  const queryVec = await embedText(query);
  const scored = corpus.vectors.map((vec, idx) => ({
    chunk: corpus.chunks[idx],
    score: cosineSimilarity(queryVec, vec),
    index: idx,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const EMBEDDING_CONFIG = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
  maxBatchSize: MAX_BATCH_SIZE,
  maxChunkChars: MAX_CHUNK_CHARS,
} as const;

/** Named singleton for import convenience */
export const aiEmbeddingService = {
  embedText,
  embedBatch,
  embedDocument,
  searchChunks,
  cosineSimilarity,
  chunkText,
  EMBEDDING_CONFIG,
};

export default aiEmbeddingService;
