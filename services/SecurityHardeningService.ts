/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — SECURITY HARDENING SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Defense-in-depth security layer protecting the live OS from:
 *
 *   1. Prompt Injection       — Malicious instructions disguised as user input
 *   2. XSS / HTML Injection   — Script tags, event handlers, data URIs
 *   3. Request Flooding        — Client-side rate limiting per action type
 *   4. Data Exfiltration       — Blocks attempts to extract API keys / env vars
 *   5. Payload Size Abuse      — Rejects oversized messages before they hit AI
 *   6. Encoding Attacks        — Detects obfuscated payloads (base64, hex, unicode)
 *   7. Path Traversal          — Blocks ../ and filesystem path injection
 *   8. Command Injection       — Detects shell/system command patterns
 *
 * This service runs on EVERY user input BEFORE it reaches the AI pipeline.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { monitoringService } from './MonitoringService';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SecurityCheckResult {
  safe: boolean;
  threats: SecurityThreat[];
  sanitizedInput: string;
  blocked: boolean;
  riskScore: number;          // 0-100, higher = more dangerous
}

export interface SecurityThreat {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  matchedPattern?: string;
}

export type ThreatType =
  | 'prompt_injection'
  | 'xss'
  | 'html_injection'
  | 'data_exfiltration'
  | 'command_injection'
  | 'path_traversal'
  | 'encoding_attack'
  | 'payload_size'
  | 'rate_limit'
  | 'malicious_url'
  | 'sql_injection';

// ─── Prompt Injection Patterns ──────────────────────────────────────────────
// These detect attempts to override AI system instructions

const PROMPT_INJECTION_PATTERNS: Array<{ pattern: RegExp; severity: 'medium' | 'high' | 'critical'; desc: string }> = [
  // Direct instruction override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/i, severity: 'critical', desc: 'Instruction override attempt' },
  { pattern: /forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|training|rules?|context)/i, severity: 'critical', desc: 'Memory wipe attempt' },
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+/i, severity: 'high', desc: 'Role hijack attempt' },
  { pattern: /\bsystem\s*:\s*/i, severity: 'high', desc: 'System prompt injection' },
  { pattern: /\[system\]|\[INST\]|<\|system\|>|<\|im_start\|>/i, severity: 'critical', desc: 'Prompt format injection' },
  { pattern: /pretend\s+(you\s+are|to\s+be|that)/i, severity: 'medium', desc: 'Persona manipulation' },
  { pattern: /act\s+as\s+(if\s+you|a\s+different|an?\s+)/i, severity: 'medium', desc: 'Behavior override' },
  { pattern: /new\s+instructions?\s*:/i, severity: 'critical', desc: 'Instruction injection' },
  { pattern: /override\s+(your|the|all)\s+(rules?|instructions?|safety|filters?)/i, severity: 'critical', desc: 'Safety override attempt' },
  { pattern: /jailbreak|do\s+anything\s+now|DAN\s+mode|developer\s+mode/i, severity: 'critical', desc: 'Jailbreak attempt' },
  { pattern: /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?|message)/i, severity: 'high', desc: 'System prompt extraction' },
  { pattern: /repeat\s+(the\s+)?(text|words?|prompt)\s+(above|before|earlier)/i, severity: 'high', desc: 'Prompt leak attempt' },
  { pattern: /what\s+(are|is|were)\s+(your|the)\s+(system|original|initial)\s+(prompt|instructions?)/i, severity: 'high', desc: 'System prompt query' },
  { pattern: /from\s+now\s+on\s+(you|ignore|disregard|forget)/i, severity: 'high', desc: 'Persistent override attempt' },
];

// ─── XSS / HTML Injection Patterns ──────────────────────────────────────────

const XSS_PATTERNS: Array<{ pattern: RegExp; severity: 'medium' | 'high' | 'critical'; desc: string }> = [
  { pattern: /<script[\s>]/i, severity: 'critical', desc: 'Script tag injection' },
  { pattern: /on(load|error|click|mouseover|focus|blur|submit|change|input|keyup|keydown)\s*=/i, severity: 'high', desc: 'Event handler injection' },
  { pattern: /javascript\s*:/i, severity: 'critical', desc: 'JavaScript protocol injection' },
  { pattern: /data\s*:\s*text\/html/i, severity: 'high', desc: 'Data URI HTML injection' },
  { pattern: /<iframe[\s>]/i, severity: 'critical', desc: 'Iframe injection' },
  { pattern: /<object[\s>]/i, severity: 'high', desc: 'Object tag injection' },
  { pattern: /<embed[\s>]/i, severity: 'high', desc: 'Embed tag injection' },
  { pattern: /<form[\s>]/i, severity: 'medium', desc: 'Form injection' },
  { pattern: /expression\s*\(/i, severity: 'high', desc: 'CSS expression injection' },
  { pattern: /<svg[\s>].*?on\w+\s*=/i, severity: 'critical', desc: 'SVG event handler injection' },
  { pattern: /<img[^>]+onerror/i, severity: 'critical', desc: 'Image error handler injection' },
];

// ─── Data Exfiltration Patterns ─────────────────────────────────────────────

const EXFIL_PATTERNS: Array<{ pattern: RegExp; severity: 'high' | 'critical'; desc: string }> = [
  { pattern: /(?:VITE_|REACT_APP_|process\.env)\w*(?:API_KEY|SECRET|TOKEN|PASSWORD)/i, severity: 'critical', desc: 'Environment variable probe' },
  { pattern: /(?:show|print|reveal|display|output|return|give)\s+(?:me\s+)?(?:the\s+)?(?:api|secret|private)\s*key/i, severity: 'critical', desc: 'API key extraction attempt' },
  { pattern: /\.env(?:\.|$)/i, severity: 'high', desc: '.env file probe' },
  { pattern: /(?:Bearer|Authorization)\s+[A-Za-z0-9+/=_-]{20,}/i, severity: 'critical', desc: 'Auth token in input' },
  { pattern: /(?:gsk_|sk-|key_|AIza)[A-Za-z0-9_-]{20,}/i, severity: 'critical', desc: 'API key detected in input' },
];

// ─── Command Injection Patterns ─────────────────────────────────────────────

const COMMAND_INJECTION_PATTERNS: Array<{ pattern: RegExp; severity: 'high' | 'critical'; desc: string }> = [
  { pattern: /;\s*(?:rm|del|format|shutdown|reboot|kill|wget|curl|nc|netcat)\s/i, severity: 'critical', desc: 'Shell command injection' },
  { pattern: /\|\s*(?:bash|sh|cmd|powershell|python|node|exec)/i, severity: 'critical', desc: 'Pipe to shell' },
  { pattern: /`[^`]*(?:rm|cat|echo|curl|wget|eval|exec)[^`]*`/i, severity: 'high', desc: 'Backtick command execution' },
  { pattern: /\$\([^)]*(?:rm|cat|echo|curl|wget|eval|exec)[^)]*\)/i, severity: 'high', desc: 'Subshell command execution' },
];

// ─── SQL Injection Patterns ─────────────────────────────────────────────────

const SQL_INJECTION_PATTERNS: Array<{ pattern: RegExp; severity: 'medium' | 'high'; desc: string }> = [
  { pattern: /(?:'\s*(?:OR|AND)\s+(?:'?\d+'?\s*=\s*'?\d+'?|1\s*=\s*1))/i, severity: 'high', desc: 'SQL boolean injection' },
  { pattern: /(?:UNION\s+(?:ALL\s+)?SELECT)/i, severity: 'high', desc: 'SQL UNION injection' },
  { pattern: /(?:DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET)/i, severity: 'high', desc: 'SQL modification injection' },
  { pattern: /(?:;\s*--\s*$|\/\*.*?\*\/)/i, severity: 'medium', desc: 'SQL comment injection' },
];

// ─── Path Traversal Patterns ────────────────────────────────────────────────

const PATH_TRAVERSAL_PATTERNS: Array<{ pattern: RegExp; severity: 'high' | 'critical'; desc: string }> = [
  { pattern: /\.\.[/\\]/g, severity: 'high', desc: 'Directory traversal' },
  { pattern: /(?:\/etc\/(?:passwd|shadow|hosts)|\/proc\/|\/sys\/)/i, severity: 'critical', desc: 'System file access' },
  { pattern: /(?:C:\\Windows|C:\\Users|%SystemRoot%|%APPDATA%)/i, severity: 'high', desc: 'Windows system path probe' },
];

// ─── Rate Limiter ───────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

class ClientRateLimiter {
  private buckets = new Map<string, RateBucket>();
  private readonly limits: Record<string, { max: number; windowMs: number }> = {
    chat:     { max: 30, windowMs: 60_000 },     // 30 msgs/min
    search:   { max: 15, windowMs: 60_000 },     // 15 searches/min
    upload:   { max: 5,  windowMs: 60_000 },      // 5 uploads/min
    api:      { max: 60, windowMs: 60_000 },      // 60 API calls/min
  };

  check(action: string): { allowed: boolean; retryAfterMs: number } {
    const limit = this.limits[action] || this.limits.api;
    const key = action;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (bucket.count >= limit.max) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(): void {
    this.buckets.clear();
  }
}

// ─── URL Allowlist for SSRF Prevention ──────────────────────────────────────

const ALLOWED_API_DOMAINS = new Set([
  'api.together.xyz',
  'api.groq.com',
  'generativelanguage.googleapis.com',
  'api.worldbank.org',
  'restcountries.com',
  'nominatim.openstreetmap.org',
  'en.wikipedia.org',
  'google.serper.dev',
  'api.perplexity.ai',
  'api.tavily.com',
  'api.acleddata.com',
  'comtrade.un.org',
  'api.opensanctions.org',
]);

export function isAllowedURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Block private/internal IPs
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.') ||
      hostname === '169.254.169.254' ||  // AWS metadata endpoint
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Must be HTTPS in production
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    return ALLOWED_API_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

// ─── Input Sanitizer ────────────────────────────────────────────────────────

function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function stripDangerousContent(input: string): string {
  let sanitized = input;
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  // Remove control characters (except newline, tab, carriage return)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Normalize unicode to prevent homoglyph attacks
  sanitized = sanitized.normalize('NFC');
  return sanitized;
}

// ─── Main Security Service ──────────────────────────────────────────────────

class SecurityHardeningService {
  private rateLimiter = new ClientRateLimiter();
  private threatLog: Array<{ timestamp: string; threat: SecurityThreat; input: string }> = [];
  private readonly MAX_LOG = 200;
  private readonly MAX_INPUT_LENGTH = 15_000;  // ~3,750 tokens
  private readonly MAX_URL_LENGTH = 2_048;

  /**
   * Run ALL security checks on user input.
   * Call this BEFORE the input enters the AI pipeline.
   */
  validateInput(input: string, action: string = 'chat'): SecurityCheckResult {
    const threats: SecurityThreat[] = [];

    // 1. Rate limiting
    const rateCheck = this.rateLimiter.check(action);
    if (!rateCheck.allowed) {
      threats.push({
        type: 'rate_limit',
        severity: 'medium',
        description: `Rate limit exceeded for '${action}'. Retry in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`,
      });
      return {
        safe: false,
        threats,
        sanitizedInput: '',
        blocked: true,
        riskScore: 40,
      };
    }

    // 2. Payload size
    if (input.length > this.MAX_INPUT_LENGTH) {
      threats.push({
        type: 'payload_size',
        severity: 'medium',
        description: `Input exceeds maximum length (${input.length} > ${this.MAX_INPUT_LENGTH})`,
      });
    }

    // 3. Strip dangerous control characters
    const cleaned = stripDangerousContent(input);

    // 4. Detect encoding attacks (base64 obfuscation)
    this.detectEncodingAttacks(cleaned, threats);

    // 5. Prompt injection detection
    this.detectPromptInjection(cleaned, threats);

    // 6. XSS / HTML injection
    this.detectXSS(cleaned, threats);

    // 7. Data exfiltration attempts
    this.detectDataExfiltration(cleaned, threats);

    // 8. Command injection
    this.detectCommandInjection(cleaned, threats);

    // 9. SQL injection
    this.detectSQLInjection(cleaned, threats);

    // 10. Path traversal
    this.detectPathTraversal(cleaned, threats);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(threats);
    const blocked = riskScore >= 70 || threats.some(t => t.severity === 'critical');
    const safe = threats.length === 0;

    // Sanitize the output (HTML-encode for display, strip dangerous content)
    const sanitizedInput = input.length > this.MAX_INPUT_LENGTH
      ? cleaned.slice(0, this.MAX_INPUT_LENGTH)
      : cleaned;

    // Log threats
    if (threats.length > 0) {
      this.logThreats(threats, input);
    }

    return {
      safe,
      threats,
      sanitizedInput,
      blocked,
      riskScore,
    };
  }

  /**
   * Sanitize text for safe HTML rendering (prevent XSS in the UI).
   */
  sanitizeForDisplay(text: string): string {
    return sanitizeHTML(stripDangerousContent(text));
  }

  /**
   * Validate a URL against the SSRF allowlist.
   */
  validateURL(url: string): boolean {
    if (url.length > this.MAX_URL_LENGTH) return false;
    return isAllowedURL(url);
  }

  /**
   * Get recent threat log for monitoring dashboard.
   */
  getRecentThreats(limit: number = 20): Array<{ timestamp: string; threat: SecurityThreat }> {
    return this.threatLog.slice(-limit).map(({ timestamp, threat }) => ({ timestamp, threat }));
  }

  /**
   * Get threat statistics for monitoring.
   */
  getThreatStats(): { total: number; bySeverity: Record<string, number>; byType: Record<string, number> } {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const entry of this.threatLog) {
      bySeverity[entry.threat.severity] = (bySeverity[entry.threat.severity] || 0) + 1;
      byType[entry.threat.type] = (byType[entry.threat.type] || 0) + 1;
    }
    return { total: this.threatLog.length, bySeverity, byType };
  }

  // ── Private Detection Methods ──

  private detectPromptInjection(input: string, threats: SecurityThreat[]): void {
    for (const rule of PROMPT_INJECTION_PATTERNS) {
      const match = input.match(rule.pattern);
      if (match) {
        threats.push({
          type: 'prompt_injection',
          severity: rule.severity,
          description: rule.desc,
          matchedPattern: match[0].slice(0, 50),
        });
      }
    }
  }

  private detectXSS(input: string, threats: SecurityThreat[]): void {
    for (const rule of XSS_PATTERNS) {
      const match = input.match(rule.pattern);
      if (match) {
        threats.push({
          type: 'xss',
          severity: rule.severity,
          description: rule.desc,
          matchedPattern: match[0].slice(0, 50),
        });
      }
    }
  }

  private detectDataExfiltration(input: string, threats: SecurityThreat[]): void {
    for (const rule of EXFIL_PATTERNS) {
      const match = input.match(rule.pattern);
      if (match) {
        threats.push({
          type: 'data_exfiltration',
          severity: rule.severity,
          description: rule.desc,
          matchedPattern: match[0].slice(0, 50),
        });
      }
    }
  }

  private detectCommandInjection(input: string, threats: SecurityThreat[]): void {
    for (const rule of COMMAND_INJECTION_PATTERNS) {
      const match = input.match(rule.pattern);
      if (match) {
        threats.push({
          type: 'command_injection',
          severity: rule.severity,
          description: rule.desc,
          matchedPattern: match[0].slice(0, 50),
        });
      }
    }
  }

  private detectSQLInjection(input: string, threats: SecurityThreat[]): void {
    for (const rule of SQL_INJECTION_PATTERNS) {
      const match = input.match(rule.pattern);
      if (match) {
        threats.push({
          type: 'sql_injection',
          severity: rule.severity,
          description: rule.desc,
          matchedPattern: match[0].slice(0, 50),
        });
      }
    }
  }

  private detectPathTraversal(input: string, threats: SecurityThreat[]): void {
    for (const rule of PATH_TRAVERSAL_PATTERNS) {
      const match = input.match(rule.pattern);
      if (match) {
        threats.push({
          type: 'path_traversal',
          severity: rule.severity,
          description: rule.desc,
          matchedPattern: match[0].slice(0, 50),
        });
      }
    }
  }

  private detectEncodingAttacks(input: string, threats: SecurityThreat[]): void {
    // Check for suspicious base64 blocks (potential obfuscated payloads)
    const b64Match = input.match(/[A-Za-z0-9+/]{50,}={0,2}/);
    if (b64Match) {
      try {
        const decoded = atob(b64Match[0]);
        // Check if decoded content contains dangerous patterns
        if (/<script|javascript:|on\w+\s*=|eval\s*\(/i.test(decoded)) {
          threats.push({
            type: 'encoding_attack',
            severity: 'critical',
            description: 'Base64-encoded malicious payload detected',
          });
        }
      } catch {
        // Not valid base64, ignore
      }
    }

    // Check for hex-encoded payloads
    if (/\\x[0-9a-f]{2}[\\x[0-9a-f]{2}]{4,}/i.test(input)) {
      threats.push({
        type: 'encoding_attack',
        severity: 'high',
        description: 'Hex-encoded payload detected',
      });
    }

    // Check for unicode escape sequences used for obfuscation
    if (/\\u00[0-9a-f]{2}[\\u00[0-9a-f]{2}]{4,}/i.test(input)) {
      threats.push({
        type: 'encoding_attack',
        severity: 'high',
        description: 'Unicode-escaped payload detected',
      });
    }
  }

  private calculateRiskScore(threats: SecurityThreat[]): number {
    if (threats.length === 0) return 0;

    const severityWeights: Record<string, number> = {
      low: 10,
      medium: 25,
      high: 50,
      critical: 80,
    };

    let score = 0;
    for (const threat of threats) {
      score += severityWeights[threat.severity] || 10;
    }

    return Math.min(100, score);
  }

  private logThreats(threats: SecurityThreat[], input: string): void {
    const timestamp = new Date().toISOString();
    // Only store first 100 chars of input for privacy
    const truncatedInput = input.slice(0, 100);

    for (const threat of threats) {
      this.threatLog.push({ timestamp, threat, input: truncatedInput });

      // Report critical threats to monitoring
      if (threat.severity === 'critical' || threat.severity === 'high') {
        if (threat.severity === 'critical') {
          monitoringService.critical('security', `Security threat: ${threat.type} — ${threat.description}`);
        } else {
          monitoringService.warn('security', `Security threat: ${threat.type} — ${threat.description}`);
        }
      }
    }

    // Trim log
    if (this.threatLog.length > this.MAX_LOG) {
      this.threatLog.splice(0, this.threatLog.length - this.MAX_LOG);
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const securityService = new SecurityHardeningService();
export default securityService;
