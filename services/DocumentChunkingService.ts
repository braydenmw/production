/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — DOCUMENT CHUNKING SERVICE (RAG Pipeline)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Splits documents/text into semantically meaningful chunks for vector
 * embedding and retrieval. This is the "ingestion" phase of the RAG pipeline.
 *
 * Chunking Strategies:
 *  1. Sentence-boundary  — Splits on sentence endings, respects paragraphs
 *  2. Sliding window      — Overlapping fixed-size windows
 *  3. Semantic sections   — Splits on headers/topic boundaries
 *  4. Hybrid              — Combines sentence + semantic (default)
 *
 * Each chunk includes:
 *  • text: The chunk content
 *  • metadata: source, position, section title, etc.
 *  • overlap: Characters shared with adjacent chunks (for context continuity)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { aiEmbeddingService } from './AIEmbeddingService';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;
  text: string;
  embedding?: number[];
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    sectionTitle?: string;
    startOffset: number;
    endOffset: number;
    wordCount: number;
    strategy: ChunkStrategy;
  };
}

export type ChunkStrategy = 'sentence' | 'sliding_window' | 'semantic' | 'hybrid';

export interface ChunkOptions {
  strategy?: ChunkStrategy;
  maxChunkSize?: number;     // Max chars per chunk (default: 1000)
  minChunkSize?: number;     // Min chars per chunk (default: 100)
  overlapSize?: number;      // Overlap between chunks (default: 100)
  embedImmediately?: boolean; // Generate embeddings during chunking (default: false)
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  strategy: 'hybrid',
  maxChunkSize: 1000,
  minChunkSize: 100,
  overlapSize: 100,
  embedImmediately: false,
};

// ─── Sentence-Boundary Chunking ─────────────────────────────────────────────

function chunkBySentence(text: string, maxSize: number, minSize: number, overlap: number): Array<{ text: string; start: number; end: number }> {
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  // Split on sentence boundaries (period, exclamation, question followed by space or newline)
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';
  let currentStart = 0;
  let offset = 0;

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxSize && currentChunk.length >= minSize) {
      chunks.push({ text: currentChunk.trim(), start: currentStart, end: offset });
      // Apply overlap: keep last `overlap` chars of current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + sentence;
      currentStart = offset - overlap;
    } else {
      if (!currentChunk) currentStart = offset;
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
    offset += sentence.length + 1; // +1 for space
  }

  if (currentChunk.trim().length >= minSize) {
    chunks.push({ text: currentChunk.trim(), start: currentStart, end: offset });
  } else if (chunks.length > 0 && currentChunk.trim()) {
    // Merge small trailing chunk into previous
    const last = chunks[chunks.length - 1];
    last.text += ' ' + currentChunk.trim();
    last.end = offset;
  }

  return chunks;
}

// ─── Sliding Window Chunking ────────────────────────────────────────────────

function chunkBySlidingWindow(text: string, windowSize: number, stepSize: number): Array<{ text: string; start: number; end: number }> {
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  for (let i = 0; i < text.length; i += stepSize) {
    const end = Math.min(i + windowSize, text.length);
    const chunk = text.slice(i, end).trim();
    if (chunk.length >= 50) {
      chunks.push({ text: chunk, start: i, end });
    }
    if (end >= text.length) break;
  }
  return chunks;
}

// ─── Semantic Section Chunking ──────────────────────────────────────────────

function chunkBySemantic(text: string, maxSize: number, minSize: number): Array<{ text: string; start: number; end: number; sectionTitle?: string }> {
  const chunks: Array<{ text: string; start: number; end: number; sectionTitle?: string }> = [];

  // Split on markdown headers, double newlines, or clear section boundaries
  const sectionPattern = /(?=^#{1,4}\s.+$)|(?=\n\n\n+)|(?=^(?:---+|===+)\s*$)/gm;
  const sections = text.split(sectionPattern).filter(s => s.trim().length > 0);

  let offset = 0;
  for (const section of sections) {
    // Extract section title if present
    const headerMatch = section.match(/^(#{1,4})\s+(.+?)$/m);
    const sectionTitle = headerMatch ? headerMatch[2].trim() : undefined;

    if (section.length > maxSize) {
      // Section too large — sub-chunk by sentence
      const subChunks = chunkBySentence(section, maxSize, minSize, 50);
      for (const sub of subChunks) {
        chunks.push({
          text: sub.text,
          start: offset + sub.start,
          end: offset + sub.end,
          sectionTitle,
        });
      }
    } else if (section.trim().length >= minSize) {
      chunks.push({
        text: section.trim(),
        start: offset,
        end: offset + section.length,
        sectionTitle,
      });
    }
    offset += section.length;
  }

  return chunks;
}

// ─── Hybrid Chunking (default) ──────────────────────────────────────────────

function chunkHybrid(text: string, maxSize: number, minSize: number, overlap: number): Array<{ text: string; start: number; end: number; sectionTitle?: string }> {
  // First pass: semantic section splitting
  const sections = chunkBySemantic(text, maxSize * 2, minSize);
  const result: Array<{ text: string; start: number; end: number; sectionTitle?: string }> = [];

  for (const section of sections) {
    if (section.text.length > maxSize) {
      // Second pass: sentence-boundary chunking within large sections
      const subChunks = chunkBySentence(section.text, maxSize, minSize, overlap);
      for (const sub of subChunks) {
        result.push({
          text: sub.text,
          start: section.start + sub.start,
          end: section.start + sub.end,
          sectionTitle: section.sectionTitle,
        });
      }
    } else {
      result.push(section);
    }
  }

  return result;
}

// ─── Document Chunking Service ──────────────────────────────────────────────

class DocumentChunkingService {
  private chunkCount = 0;

  /**
   * Chunk a document into semantically meaningful pieces.
   */
  async chunk(text: string, source: string, options?: ChunkOptions): Promise<DocumentChunk[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let rawChunks: Array<{ text: string; start: number; end: number; sectionTitle?: string }>;

    switch (opts.strategy) {
      case 'sentence':
        rawChunks = chunkBySentence(text, opts.maxChunkSize, opts.minChunkSize, opts.overlapSize);
        break;
      case 'sliding_window':
        rawChunks = chunkBySlidingWindow(text, opts.maxChunkSize, opts.maxChunkSize - opts.overlapSize);
        break;
      case 'semantic':
        rawChunks = chunkBySemantic(text, opts.maxChunkSize, opts.minChunkSize);
        break;
      case 'hybrid':
      default:
        rawChunks = chunkHybrid(text, opts.maxChunkSize, opts.minChunkSize, opts.overlapSize);
        break;
    }

    const totalChunks = rawChunks.length;
    const chunks: DocumentChunk[] = rawChunks.map((raw, index) => ({
      id: `chunk_${source.replace(/[^a-zA-Z0-9]/g, '_')}_${++this.chunkCount}`,
      text: raw.text,
      metadata: {
        source,
        chunkIndex: index,
        totalChunks,
        sectionTitle: 'sectionTitle' in raw ? raw.sectionTitle : undefined,
        startOffset: raw.start,
        endOffset: raw.end,
        wordCount: raw.text.split(/\s+/).length,
        strategy: opts.strategy,
      },
    }));

    // Optionally generate embeddings
    if (opts.embedImmediately) {
      const texts = chunks.map(c => c.text);
      try {
        const embeddings = await aiEmbeddingService.embedBatch(texts);
        for (let i = 0; i < chunks.length; i++) {
          if (embeddings[i]) chunks[i].embedding = embeddings[i];
        }
      } catch {
        // Embeddings are optional — proceed without them
      }
    }

    return chunks;
  }

  /**
   * Chunk and add to vector index in one step.
   */
  async chunkAndIndex(
    text: string,
    source: string,
    vectorIndex: { addDocument: (id: string, text: string, metadata: Record<string, unknown>) => Promise<void> },
    options?: ChunkOptions
  ): Promise<DocumentChunk[]> {
    const chunks = await this.chunk(text, source, { ...options, embedImmediately: false });

    for (const chunk of chunks) {
      try {
        await vectorIndex.addDocument(chunk.id, chunk.text, chunk.metadata as unknown as Record<string, unknown>);
      } catch {
        // Continue on individual chunk failures
      }
    }

    return chunks;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const documentChunkingService = new DocumentChunkingService();
export default documentChunkingService;
