import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { withPostgres } from './postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'memory');
const VECTOR_FILE = path.join(DATA_DIR, 'vectors.json');

export interface StoredVectorDocument {
  id: string;
  text: string;
  source: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  source: string;
  metadata: Record<string, unknown>;
  score: number;
  embeddingModel: string;
}

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const HASH_EMBEDDING_MODEL = 'hash-fallback-v1';
const HASH_EMBEDDING_DIMENSIONS = 256;

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadDocuments(): Promise<StoredVectorDocument[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(VECTOR_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoredVectorDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveDocuments(documents: StoredVectorDocument[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(VECTOR_FILE, JSON.stringify(documents, null, 2), 'utf-8');
}

function normalizeDocument(row: Record<string, unknown>): StoredVectorDocument {
  return {
    id: String(row.id || ''),
    text: String(row.text_content || row.text || ''),
    source: String(row.source || 'unknown'),
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata as Record<string, unknown> : {},
    embedding: Array.isArray(row.embedding) ? row.embedding.map((value) => Number(value) || 0) : [],
    embeddingModel: String(row.embedding_model || row.embeddingModel || HASH_EMBEDDING_MODEL),
    createdAt: new Date(String(row.created_at || row.createdAt || new Date().toISOString())).toISOString(),
    updatedAt: new Date(String(row.updated_at || row.updatedAt || new Date().toISOString())).toISOString(),
  };
}

function sanitizeText(input: unknown, maxLength = 20000): string {
  if (typeof input !== 'string') return '';
  return input.replace(/\0/g, '').trim().slice(0, maxLength);
}

function hashEmbedding(text: string): { vector: number[]; model: string } {
  const vector = new Array(HASH_EMBEDDING_DIMENSIONS).fill(0);
  const lower = text.toLowerCase();

  for (let i = 0; i < lower.length; i++) {
    const index = (lower.charCodeAt(i) * 33 + i * 17) % HASH_EMBEDDING_DIMENSIONS;
    vector[index] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return {
    vector: vector.map((value) => value / norm),
    model: HASH_EMBEDDING_MODEL
  };
}

async function openAIEmbedding(text: string): Promise<{ vector: number[]; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    return hashEmbedding(text);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text.slice(0, 8000)
      })
    });

    if (!response.ok) {
      return hashEmbedding(text);
    }

    const data = await response.json();
    const vector = data?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length === 0) {
      return hashEmbedding(text);
    }

    return {
      vector: vector.map((value: unknown) => Number(value) || 0),
      model: OPENAI_EMBEDDING_MODEL
    };
  } catch {
    return hashEmbedding(text);
  }
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator > 0 ? dot / denominator : 0;
}

class ServerVectorStore {
  async upsertDocument(input: {
    id?: string;
    text: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredVectorDocument> {
    const text = sanitizeText(input.text);
    if (!text) {
      throw new Error('Document text is required');
    }

    const id = sanitizeText(input.id, 200) || `vec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const source = sanitizeText(input.source, 200) || 'unknown';
    const metadata = typeof input.metadata === 'object' && input.metadata !== null ? input.metadata : {};
    const now = new Date().toISOString();
    const { vector, model } = await openAIEmbedding(text);

    const documents = await loadDocuments();
    const existingIndex = documents.findIndex((document) => document.id === id);

    const record: StoredVectorDocument = {
      id,
      text,
      source,
      metadata,
      embedding: vector,
      embeddingModel: model,
      createdAt: existingIndex >= 0 ? documents[existingIndex].createdAt : now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      documents[existingIndex] = record;
    } else {
      documents.push(record);
    }

    if (documents.length > 5000) {
      documents.splice(0, documents.length - 5000);
    }

    const savedToDb = await withPostgres(async (client) => {
      await client.query(
        `
          INSERT INTO memory_vectors (id, text_content, source, metadata, embedding, embedding_model, created_at, updated_at)
          VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::timestamptz, $8::timestamptz)
          ON CONFLICT (id) DO UPDATE SET
            text_content = EXCLUDED.text_content,
            source = EXCLUDED.source,
            metadata = EXCLUDED.metadata,
            embedding = EXCLUDED.embedding,
            embedding_model = EXCLUDED.embedding_model,
            updated_at = EXCLUDED.updated_at
        `,
        [
          record.id,
          record.text,
          record.source,
          JSON.stringify(record.metadata || {}),
          JSON.stringify(record.embedding),
          record.embeddingModel,
          record.createdAt,
          record.updatedAt,
        ]
      );

      await client.query(`
        DELETE FROM memory_vectors
        WHERE id IN (
          SELECT id
          FROM memory_vectors
          ORDER BY updated_at DESC
          OFFSET 5000
        )
      `);

      return true;
    });

    if (savedToDb) {
      return record;
    }

    await saveDocuments(documents);
    return record;
  }

  async search(query: string, options?: { topK?: number; minScore?: number; source?: string }): Promise<VectorSearchResult[]> {
    const cleanQuery = sanitizeText(query, 5000);
    if (!cleanQuery) return [];

    const topK = Math.max(1, Math.min(50, options?.topK ?? 5));
    const minScore = typeof options?.minScore === 'number' ? options.minScore : 0.15;
    const sourceFilter = sanitizeText(options?.source, 200);
    const documents = await withPostgres(async (client) => {
      const result = await client.query(
        `
          SELECT id, text_content, source, metadata, embedding, embedding_model, created_at, updated_at
          FROM memory_vectors
          WHERE ($1 = '' OR source = $1)
          ORDER BY updated_at DESC
          LIMIT 5000
        `,
        [sourceFilter]
      );
      return result.rows.map((row) => normalizeDocument(row));
    }) || await loadDocuments();
    const { vector: queryVector, model } = await openAIEmbedding(cleanQuery);

    return documents
      .filter((document) => document.embeddingModel === model)
      .filter((document) => !sourceFilter || document.source === sourceFilter)
      .map((document) => ({
        id: document.id,
        text: document.text,
        source: document.source,
        metadata: document.metadata,
        embeddingModel: document.embeddingModel,
        score: cosineSimilarity(queryVector, document.embedding)
      }))
      .filter((document) => document.score >= minScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  async stats(): Promise<{
    documents: number;
    bySource: Record<string, number>;
    byEmbeddingModel: Record<string, number>;
    newestDocument: string | null;
  }> {
    const dbStats = await withPostgres(async (client) => {
      const totals = await client.query(`
        SELECT COUNT(*)::int AS documents, MAX(updated_at) AS newest_document
        FROM memory_vectors
      `);
      const bySourceRows = await client.query(`SELECT source, COUNT(*)::int AS count FROM memory_vectors GROUP BY source`);
      const byModelRows = await client.query(`SELECT embedding_model, COUNT(*)::int AS count FROM memory_vectors GROUP BY embedding_model`);

      const bySource: Record<string, number> = {};
      const byEmbeddingModel: Record<string, number> = {};
      for (const row of bySourceRows.rows) {
        bySource[String(row.source)] = Number(row.count) || 0;
      }
      for (const row of byModelRows.rows) {
        byEmbeddingModel[String(row.embedding_model)] = Number(row.count) || 0;
      }

      return {
        documents: totals.rows[0]?.documents || 0,
        bySource,
        byEmbeddingModel,
        newestDocument: totals.rows[0]?.newest_document ? new Date(totals.rows[0].newest_document).toISOString() : null,
      };
    });

    if (dbStats) {
      return dbStats;
    }

    const documents = await loadDocuments();
    const bySource: Record<string, number> = {};
    const byEmbeddingModel: Record<string, number> = {};

    for (const document of documents) {
      bySource[document.source] = (bySource[document.source] || 0) + 1;
      byEmbeddingModel[document.embeddingModel] = (byEmbeddingModel[document.embeddingModel] || 0) + 1;
    }

    const newestDocument = documents.reduce<string | null>((latest, document) => {
      if (!latest || document.updatedAt > latest) return document.updatedAt;
      return latest;
    }, null);

    return {
      documents: documents.length,
      bySource,
      byEmbeddingModel,
      newestDocument
    };
  }
}

export const serverVectorStore = new ServerVectorStore();