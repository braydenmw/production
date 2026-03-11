/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — SERVER-SIDE AI PROXY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Routes ALL AI calls through the Express server to:
 *  1. Hide API keys from the browser (security)
 *  2. Provide rate limiting and logging
 *  3. Support embedding calls (server-side only)
 *  4. Content extraction from web pages
 *  5. Streaming via SSE
 *
 * Endpoints:
 *  POST /api/ai/proxy/chat — Standard chat completion (streaming optional)
 *  POST /api/ai/proxy/embed — Text embedding
 *  POST /api/ai/proxy/extract — Web page content extraction
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from 'express';

const router = Router();

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const TOGETHER_EMBED_URL = 'https://api.together.xyz/v1/embeddings';
const getKey = () => process.env.TOGETHER_API_KEY || '';

// ─── Chat Completion Proxy ──────────────────────────────────────────────────

router.post('/chat', async (req: Request, res: Response) => {
  const key = getKey();
  if (!key) {
    return res.status(503).json({ error: 'AI service not configured — TOGETHER_API_KEY missing' });
  }

  const { messages, model, max_tokens, temperature, stream, tools, tool_choice } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Sanitize messages — prevent injection via roles
  const cleanMessages = messages.map((m: { role: string; content: string }) => ({
    role: ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user',
    content: String(m.content || '').slice(0, 30000),
  }));

  const body: Record<string, unknown> = {
    model: model || 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    messages: cleanMessages,
    max_tokens: Math.min(max_tokens || 4096, 8192),
    temperature: Math.min(Math.max(temperature || 0.4, 0), 1.5),
    stream: Boolean(stream),
  };

  if (tools) {
    body.tools = tools;
    body.tool_choice = tool_choice || 'auto';
  }

  try {
    const apiRes = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => '');
      console.error(`[AI Proxy] Together.ai error ${apiRes.status}:`, errText.slice(0, 200));
      return res.status(apiRes.status).json({ error: `AI provider error: ${apiRes.status}` });
    }

    // Streaming response — pipe SSE directly
    if (stream && apiRes.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = (apiRes.body as ReadableStream).getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          res.write(text);
        }
      } catch {
        // Client disconnected
      } finally {
        res.end();
      }
      return;
    }

    // Non-streaming
    const data = await apiRes.json();
    return res.json(data);
  } catch (err) {
    console.error('[AI Proxy] Error:', err);
    return res.status(500).json({ error: 'AI proxy internal error' });
  }
});

// ─── Embedding Proxy ────────────────────────────────────────────────────────

router.post('/embed', async (req: Request, res: Response) => {
  const key = getKey();
  if (!key) {
    return res.status(503).json({ error: 'AI service not configured — TOGETHER_API_KEY missing' });
  }

  const { input, model } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'input text is required' });
  }

  // Normalize to array
  const texts = Array.isArray(input) ? input.map((t: unknown) => String(t).slice(0, 8000)) : [String(input).slice(0, 8000)];

  try {
    const apiRes = await fetch(TOGETHER_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'togethercomputer/m2-bert-80M-8k-retrieval',
        input: texts,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => '');
      console.error(`[AI Proxy] Embed error ${apiRes.status}:`, errText.slice(0, 200));
      return res.status(apiRes.status).json({ error: `Embedding error: ${apiRes.status}` });
    }

    const data = await apiRes.json();
    return res.json(data);
  } catch (err) {
    console.error('[AI Proxy] Embed error:', err);
    return res.status(500).json({ error: 'Embedding proxy internal error' });
  }
});

// ─── Web Content Extraction ─────────────────────────────────────────────────

router.post('/extract', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs allowed' });
  }

  // Block private/internal IPs to prevent SSRF
  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return res.status(403).json({ error: 'Internal URLs are not allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BWNexusAI/1.0; +https://bw-nexus-ai.com)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/') && !contentType.includes('application/json') && !contentType.includes('xml')) {
      return res.status(400).json({ error: 'URL does not return text content' });
    }

    const html = await response.text();

    // Extract readable content from HTML
    const title = extractTitle(html);
    const text = extractReadableText(html);

    return res.json({
      url,
      title,
      text: text.slice(0, 20000),
      contentType,
      extractedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AI Proxy] Extract error:', err);
    return res.status(500).json({ error: 'Content extraction failed' });
  }
});

// ─── HTML Content Extraction Helpers ────────────────────────────────────────

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

function extractReadableText(html: string): string {
  // Remove script, style, nav, header, footer, and other non-content tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')  // Strip remaining tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove very short lines (likely menu items)
  const lines = text.split(/[.\n]/).filter(l => l.trim().length > 40);
  return lines.join('. ').trim();
}

export default router;
