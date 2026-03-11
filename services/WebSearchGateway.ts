/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — WEB SEARCH GATEWAY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Unified web search and content extraction service. Provides a single
 * interface that:
 *
 *  1. Routes through server proxy (Serper/Google) when backend is available
 *  2. Falls back to Tavily client-side when standalone
 *  3. Falls back to GDELT + Wikipedia when no search API keys
 *  4. Can extract content from specific URLs (via server proxy)
 *
 * This is the "Google access" layer — the ability to search the web
 * and READ actual web page content, not just titles/snippets.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { tavilyDeepSearch, type TavilySearchResponse } from './tavilySearchService';
import { ReactiveIntelligenceEngine } from './ReactiveIntelligenceEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  relevanceScore: number;
}

export interface WebPageContent {
  url: string;
  title: string;
  text: string;
  extractedAt: string;
  wordCount: number;
}

export interface SearchOptions {
  maxResults?: number;
  searchType?: 'general' | 'news' | 'academic' | 'government';
  country?: string;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'any';
  includeDomains?: string[];
  excludeDomains?: string[];
}

// ─── Provider Detection ─────────────────────────────────────────────────────

async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function hasTavilyKey(): boolean {
  try {
    const key = (import.meta as any).env?.VITE_TAVILY_API_KEY || '';
    return key.length > 10 && !key.includes('your-');
  } catch {
    return false;
  }
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const searchCache = new Map<string, { results: WebSearchResult[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key: string): WebSearchResult[] | null {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.results;
  if (entry) searchCache.delete(key);
  return null;
}

function setCache(key: string, results: WebSearchResult[]): void {
  if (searchCache.size > 200) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

// ─── Search Providers ───────────────────────────────────────────────────────

/**
 * Search via server-side Serper (Google Search API).
 */
async function searchViaServer(query: string, opts: SearchOptions): Promise<WebSearchResult[]> {
  try {
    const res = await fetch('/api/search/serper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.slice(0, 256),
        num: opts.maxResults || 8,
        type: opts.searchType === 'news' ? 'news' : 'search',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = (data.organic || data.news || []) as any[];

    return items.map((item: any, idx: number) => ({
      title: item.title || '',
      url: item.link || item.url || '',
      snippet: item.snippet || item.description || '',
      source: item.source || new URL(item.link || 'https://unknown').hostname,
      publishedDate: item.date || item.publishedDate,
      relevanceScore: 1 - idx * 0.08,
    }));
  } catch {
    return [];
  }
}

/**
 * Search via Tavily (client-side, deep research grade).
 */
async function searchViaTavily(query: string, opts: SearchOptions): Promise<WebSearchResult[]> {
  try {
    const response: TavilySearchResponse | null = await tavilyDeepSearch(query, {
      maxResults: opts.maxResults || 8,
      searchDepth: 'advanced',
      includeDomains: opts.includeDomains,
      excludeDomains: opts.excludeDomains,
    });

    if (!response) return [];

    const results: WebSearchResult[] = response.results.map((r, idx) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      source: new URL(r.url).hostname,
      publishedDate: r.publishedDate,
      relevanceScore: r.score || (1 - idx * 0.08),
    }));

    // If Tavily provided a synthesized answer, add it as the top result
    if (response.answer) {
      results.unshift({
        title: `AI Research Summary: ${query.slice(0, 60)}`,
        url: '',
        snippet: response.answer,
        source: 'Tavily AI',
        relevanceScore: 1.0,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fallback search via GDELT news + ReactiveIntelligenceEngine.
 */
async function searchViaFallback(query: string, opts: SearchOptions): Promise<WebSearchResult[]> {
  const results: WebSearchResult[] = [];

  // GDELT news search
  try {
    const gdeltQ = encodeURIComponent(query.slice(0, 200));
    const gdeltRes = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQ}&mode=artlist&maxrecords=${opts.maxResults || 5}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (gdeltRes.ok) {
      const data = await gdeltRes.json();
      const articles = (data.articles || []) as any[];
      for (const art of articles.slice(0, 5)) {
        results.push({
          title: art.title || query,
          url: art.url || '',
          snippet: art.title || '',
          source: art.domain || 'GDELT',
          publishedDate: art.seendate,
          relevanceScore: 0.7,
        });
      }
    }
  } catch { /* GDELT timeout */ }

  // ReactiveIntelligenceEngine live search
  try {
    const liveResults = await ReactiveIntelligenceEngine.liveSearch(query, {
      category: opts.searchType || 'general',
      country: opts.country,
    });
    for (const r of liveResults.slice(0, 5)) {
      results.push({
        title: r.title || query,
        url: r.url || '',
        snippet: r.snippet || '',
        source: r.source || 'LiveSearch',
        relevanceScore: 0.6,
      });
    }
  } catch { /* fallback failed silently */ }

  return results;
}

// ─── Web Page Content Extraction ────────────────────────────────────────────

/**
 * Extract readable text content from a URL via server proxy.
 * The server uses a content extraction pipeline.
 */
async function extractPageContent(url: string): Promise<WebPageContent | null> {
  try {
    const res = await fetch('/api/search/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      url,
      title: data.title || '',
      text: (data.text || data.content || '').slice(0, 20000),
      extractedAt: new Date().toISOString(),
      wordCount: (data.text || '').split(/\s+/).length,
    };
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Unified web search — automatically picks the best available provider.
 * Provider priority: Server (Serper) → Tavily (client) → GDELT fallback
 */
export async function webSearch(query: string, opts: SearchOptions = {}): Promise<WebSearchResult[]> {
  if (!query || query.trim().length < 3) return [];

  // Check cache
  const cacheKey = `${query}|${opts.searchType || 'general'}|${opts.maxResults || 8}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let results: WebSearchResult[] = [];

  // Try providers in order
  const serverUp = await isServerAvailable();

  if (serverUp) {
    results = await searchViaServer(query, opts);
  }

  if (results.length === 0 && hasTavilyKey()) {
    results = await searchViaTavily(query, opts);
  }

  if (results.length === 0) {
    results = await searchViaFallback(query, opts);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  results = results.filter(r => {
    if (!r.url || seen.has(r.url)) return !r.url ? true : false;
    seen.add(r.url);
    return true;
  });

  if (results.length > 0) {
    setCache(cacheKey, results);
  }

  return results;
}

/**
 * Deep research — search + extract content from top results.
 * Returns search results enriched with full page content.
 */
export async function deepResearch(
  query: string,
  opts: SearchOptions = {}
): Promise<{ results: WebSearchResult[]; pages: WebPageContent[] }> {
  const results = await webSearch(query, { ...opts, maxResults: opts.maxResults || 5 });

  // Extract full content from top 3 results (in parallel)
  const urlsToExtract = results
    .filter(r => r.url && r.url.startsWith('http'))
    .slice(0, 3)
    .map(r => r.url);

  const pages: WebPageContent[] = [];
  if (urlsToExtract.length > 0) {
    const extractions = await Promise.all(
      urlsToExtract.map(url => extractPageContent(url).catch(() => null))
    );
    for (const page of extractions) {
      if (page && page.text.length > 100) pages.push(page);
    }
  }

  return { results, pages };
}

/**
 * Search specifically for news about a topic.
 */
export async function searchNews(query: string, country?: string): Promise<WebSearchResult[]> {
  return webSearch(query, { searchType: 'news', maxResults: 8, country });
}

/**
 * Search specifically for government/official sources.
 */
export async function searchGovernment(query: string, country?: string): Promise<WebSearchResult[]> {
  return webSearch(`${query} site:gov OR site:govt OR site:government`, {
    searchType: 'government',
    maxResults: 5,
    country,
  });
}

/**
 * Format search results into a prompt-ready string for the AI.
 */
export function formatResultsForPrompt(results: WebSearchResult[], maxChars = 4000): string {
  if (results.length === 0) return '';

  let output = '## WEB SEARCH RESULTS:\n';
  let chars = output.length;

  for (const r of results) {
    const line = `• **${r.title}** (${r.source}${r.publishedDate ? `, ${r.publishedDate}` : ''})\n  ${r.snippet}\n  ${r.url ? `Source: ${r.url}` : ''}\n\n`;
    if (chars + line.length > maxChars) break;
    output += line;
    chars += line.length;
  }

  return output;
}

export default {
  webSearch,
  deepResearch,
  searchNews,
  searchGovernment,
  formatResultsForPrompt,
};
