/**
 * ═══════════════════════════════════════════════════════════════════
 * Tavily Search API — Deep Web Research with Cited Answers
 * ═══════════════════════════════════════════════════════════════════
 * Requires VITE_TAVILY_API_KEY (free tier: 1,000 credits/month).
 * Sign up at: https://tavily.com
 *
 * Advantages over standard search:
 * - Returns a synthesized direct answer (not just links)
 * - Sources are vetted (excludes spam/SEO farms)
 * - Supports "advanced" depth for research-grade queries
 * - Optimized for LLM-pipeline consumption
 * ═══════════════════════════════════════════════════════════════════
 */

export interface TavilyResult {
  title: string;
  url: string;
  content: string;   // Cleaned full text snippet (~500 chars)
  score: number;     // Relevance 0-1
  publishedDate?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer: string;           // Synthesized direct answer from Tavily AI
  results: TavilyResult[];
  responseTime?: number;    // ms
}

export async function tavilyDeepSearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeDomains?: string[];
    excludeDomains?: string[];
  } = {}
): Promise<TavilySearchResponse | null> {
  const apiKey = (typeof import.meta !== 'undefined' ? (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_TAVILY_API_KEY : undefined) || '';
  if (!apiKey) return null;
  if (!query || query.trim().length < 5) return null;

  const {
    maxResults = 5,
    searchDepth = 'advanced',
    includeDomains,
    excludeDomains,
  } = options;

  try {
    const t0 = Date.now();
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.substring(0, 400),
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
        ...(includeDomains?.length ? { include_domains: includeDomains } : {}),
        ...(excludeDomains?.length ? { exclude_domains: excludeDomains } : {}),
      }),
      signal: AbortSignal.timeout(18000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const rawResults = (data.results || []) as Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
      published_date?: string;
    }>;

    return {
      query,
      answer: (data.answer as string) || '',
      results: rawResults.slice(0, maxResults).map(r => ({
        title: r.title || '',
        url: r.url || '',
        content: (r.content || '').substring(0, 500),
        score: r.score ?? 0,
        publishedDate: r.published_date,
      })),
      responseTime: Date.now() - t0,
    };
  } catch {
    return null;
  }
}

/** Convenience wrapper for strategic question deep research */
export async function tavilyResearchQuestion(
  strategicQuestion: string,
  country?: string
): Promise<TavilySearchResponse | null> {
  const query = country
    ? `${strategicQuestion} ${country} analysis`
    : strategicQuestion;
  return tavilyDeepSearch(query, {
    searchDepth: 'advanced',
    maxResults: 6,
    // Prefer authoritative sources
    includeDomains: [
      'worldbank.org', 'imf.org', 'oecd.org', 'reuters.com',
      'ft.com', 'economist.com', 'bloomberg.com', 'oxfordbusinessgroup.com',
    ],
  }).catch(() => null);
}
