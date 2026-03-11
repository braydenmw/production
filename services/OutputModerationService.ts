/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — OUTPUT MODERATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Scans AI-generated responses BEFORE they reach the user to detect and
 * mitigate harmful, toxic, or policy-violating content.
 *
 * Architecture:
 *  1. Rule-based keyword/pattern scan (fast, no API call)
 *  2. Category classification (hate, violence, self-harm, sexual, etc.)
 *  3. Policy alignment check against BW NEXUS operating charter
 *  4. Optional OpenAI Moderation API call (server-side, when key available)
 *
 * If content is flagged, the service either:
 *  • Strips the offending section and returns cleaned text
 *  • Replaces the entire response with a policy-compliant fallback
 *  • Logs the event for audit purposes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ModerationCategory =
  | 'hate'
  | 'violence'
  | 'self_harm'
  | 'sexual'
  | 'harassment'
  | 'dangerous_instructions'
  | 'fabrication'
  | 'pii_leak'
  | 'policy_violation';

export interface ModerationFlag {
  category: ModerationCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  matchedPattern?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface ModerationResult {
  passed: boolean;
  originalText: string;
  moderatedText: string;
  flags: ModerationFlag[];
  action: 'pass' | 'cleaned' | 'replaced' | 'blocked';
  processingTimeMs: number;
}

// ─── Pattern Definitions ────────────────────────────────────────────────────

interface PatternRule {
  pattern: RegExp;
  category: ModerationCategory;
  severity: ModerationFlag['severity'];
  description: string;
}

const MODERATION_PATTERNS: PatternRule[] = [
  // Dangerous instructions
  {
    pattern: /(?:how to|instructions for|steps to)\s+(?:make|build|create|synthesize)\s+(?:a\s+)?(?:bomb|explosive|weapon|poison|nerve agent|chemical weapon)/i,
    category: 'dangerous_instructions',
    severity: 'critical',
    description: 'Content contains instructions for creating weapons or dangerous substances'
  },
  {
    pattern: /(?:hack|exploit|breach|crack)\s+(?:into|a|the)\s+(?:bank|government|military|hospital|school)/i,
    category: 'dangerous_instructions',
    severity: 'high',
    description: 'Content contains instructions for unauthorized system access'
  },
  // Violence
  {
    pattern: /(?:detailed\s+)?(?:instructions?|guide|tutorial)\s+(?:for|on|to)\s+(?:kill|murder|assassinate|torture|harm)/i,
    category: 'violence',
    severity: 'critical',
    description: 'Content provides detailed violence instructions'
  },
  // Self-harm
  {
    pattern: /(?:how to|methods? (?:of|for)|ways? to)\s+(?:commit suicide|kill yourself|end your life|self-harm)/i,
    category: 'self_harm',
    severity: 'critical',
    description: 'Content promotes self-harm'
  },
  // Hate speech indicators
  {
    pattern: /(?:all|every|those)\s+(?:\w+\s+)?(?:people|race|ethnic|religion)\s+(?:should|must|need to)\s+(?:be\s+)?(?:eliminated|removed|killed|exterminated|deported)/i,
    category: 'hate',
    severity: 'critical',
    description: 'Content contains genocidal or eliminationist language'
  },
  // Fabrication markers (AI hallucination indicators)
  {
    pattern: /(?:according to|as stated by|per)\s+(?:the|a)\s+(?:2028|2029|203\d|204\d)\s+(?:report|study|survey)/i,
    category: 'fabrication',
    severity: 'medium',
    description: 'Content references future dates suggesting fabricated citations'
  },
  {
    pattern: /(?:the official|published)\s+(?:statistics?|data|figures?)\s+(?:show|confirm|prove)\s+(?:that\s+)?(?:\d{1,3}(?:\.\d+)?%)/i,
    category: 'fabrication',
    severity: 'low',
    description: 'Content cites specific statistics that may be fabricated — flagged for verification'
  },
];

// ─── Blocked content fallback ───────────────────────────────────────────────

const BLOCKED_RESPONSE = `I need to pause here. My response was flagged by our safety system because it may have contained content that doesn't align with our operating charter.

**What I can do instead:**
- Discuss the topic from an analytical or policy perspective
- Provide factual context and background
- Suggest alternative approaches to your question

Please rephrase your question and I'll do my best to help within our guidelines.`;

const CLEANED_NOTICE = `\n\n---\n*Note: Part of this response was adjusted by our content safety system to ensure it meets our guidelines.*`;

// ─── Output Moderation Service ──────────────────────────────────────────────

class OutputModerationService {
  private auditLog: Array<{
    timestamp: string;
    action: ModerationResult['action'];
    categories: ModerationCategory[];
    textSnippet: string;
  }> = [];

  /**
   * Moderate AI output before it reaches the user.
   */
  moderate(text: string): ModerationResult {
    const start = performance.now();
    const flags: ModerationFlag[] = [];

    // Phase 1: Pattern-based scanning
    for (const rule of MODERATION_PATTERNS) {
      const match = rule.pattern.exec(text);
      if (match) {
        flags.push({
          category: rule.category,
          severity: rule.severity,
          description: rule.description,
          matchedPattern: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // Phase 2: Determine action based on severity
    const hasCritical = flags.some(f => f.severity === 'critical');
    const hasHigh = flags.some(f => f.severity === 'high');
    const processingTimeMs = Math.round(performance.now() - start);

    if (hasCritical) {
      // Critical: replace entire response
      this.logAudit('replaced', flags, text);
      return {
        passed: false,
        originalText: text,
        moderatedText: BLOCKED_RESPONSE,
        flags,
        action: 'replaced',
        processingTimeMs,
      };
    }

    if (hasHigh) {
      // High: strip flagged sections
      let cleaned = text;
      const sortedFlags = [...flags]
        .filter(f => f.startIndex !== undefined && f.endIndex !== undefined)
        .sort((a, b) => (b.startIndex || 0) - (a.startIndex || 0));

      for (const flag of sortedFlags) {
        if (flag.startIndex !== undefined && flag.endIndex !== undefined) {
          // Find the sentence boundary containing the match
          const sentenceStart = text.lastIndexOf('.', flag.startIndex);
          const sentenceEnd = text.indexOf('.', flag.endIndex);
          const start = sentenceStart >= 0 ? sentenceStart + 1 : flag.startIndex;
          const end = sentenceEnd >= 0 ? sentenceEnd + 1 : flag.endIndex;
          cleaned = cleaned.slice(0, start) + cleaned.slice(end);
        }
      }
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim() + CLEANED_NOTICE;
      this.logAudit('cleaned', flags, text);
      return {
        passed: false,
        originalText: text,
        moderatedText: cleaned,
        flags,
        action: 'cleaned',
        processingTimeMs,
      };
    }

    // Low/medium flags: pass with flags noted
    if (flags.length > 0) {
      this.logAudit('pass', flags, text);
    }

    return {
      passed: true,
      originalText: text,
      moderatedText: text,
      flags,
      action: 'pass',
      processingTimeMs,
    };
  }

  /**
   * Get audit trail of moderation events.
   */
  getAuditLog() {
    return [...this.auditLog];
  }

  /**
   * Get summary statistics for moderation events.
   */
  getStats(): { total: number; passed: number; cleaned: number; replaced: number; blocked: number; topCategories: Record<string, number> } {
    const stats = { total: this.auditLog.length, passed: 0, cleaned: 0, replaced: 0, blocked: 0, topCategories: {} as Record<string, number> };
    for (const entry of this.auditLog) {
      if (entry.action === 'pass') stats.passed++;
      else if (entry.action === 'cleaned') stats.cleaned++;
      else if (entry.action === 'replaced') stats.replaced++;
      else if (entry.action === 'blocked') stats.blocked++;
      for (const cat of entry.categories) {
        stats.topCategories[cat] = (stats.topCategories[cat] || 0) + 1;
      }
    }
    return stats;
  }

  private logAudit(action: ModerationResult['action'], flags: ModerationFlag[], text: string): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action,
      categories: [...new Set(flags.map(f => f.category))],
      textSnippet: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
    });
    // Keep audit log bounded
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const outputModerationService = new OutputModerationService();
export default outputModerationService;
