/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — PII DETECTION & SCRUBBING SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Detects and redacts Personally Identifiable Information (PII) from AI
 * outputs before they reach the user. Prevents accidental data leakage.
 *
 * Detected PII types:
 *  • Email addresses
 *  • Phone numbers (international formats)
 *  • Credit card numbers
 *  • Social Security / Tax ID numbers
 *  • Passport numbers
 *  • IP addresses (v4)
 *  • Physical addresses (partial detection)
 *  • Bank account / IBAN numbers
 *
 * Modes:
 *  • 'redact'   — Replace PII with [REDACTED-TYPE]
 *  • 'mask'     — Partially mask (e.g., ****@****.com)
 *  • 'detect'   — Flag only, don't modify text
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type PIIType =
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'ssn'
  | 'passport'
  | 'ip_address'
  | 'iban'
  | 'date_of_birth';

export interface PIIMatch {
  type: PIIType;
  value: string;
  maskedValue: string;
  startIndex: number;
  endIndex: number;
}

export interface PIIScanResult {
  hasPII: boolean;
  originalText: string;
  scrubbedText: string;
  matches: PIIMatch[];
  mode: 'redact' | 'mask' | 'detect';
}

// ─── Pattern Definitions ────────────────────────────────────────────────────

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  mask: (match: string) => string;
  redact: (match: string) => string;
}

const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    mask: (m) => {
      const [local, domain] = m.split('@');
      return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 1))}@${'*'.repeat(Math.max(domain.indexOf('.'), 1))}${domain.slice(domain.indexOf('.'))}`;
    },
    redact: () => '[REDACTED-EMAIL]',
  },
  {
    type: 'phone',
    // International phone numbers: +1-234-567-8900, (234) 567-8900, +44 20 7946 0958, etc.
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
    mask: (m) => {
      const digits = m.replace(/\D/g, '');
      if (digits.length < 7) return m; // Too short to be a phone number
      return m.slice(0, 3) + '*'.repeat(Math.max(m.length - 7, 1)) + m.slice(-4);
    },
    redact: () => '[REDACTED-PHONE]',
  },
  {
    type: 'credit_card',
    // Major card formats: 4xxx-xxxx-xxxx-xxxx, 5xxx-xxxx-xxxx-xxxx, etc.
    pattern: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b/g,
    mask: (m) => {
      const digits = m.replace(/\D/g, '');
      return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
    },
    redact: () => '[REDACTED-CARD]',
  },
  {
    type: 'ssn',
    // US SSN: 123-45-6789 or 123456789
    pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    mask: (m) => `***-**-${m.replace(/\D/g, '').slice(-4)}`,
    redact: () => '[REDACTED-SSN]',
  },
  {
    type: 'passport',
    // Generic passport: 1-2 letters followed by 6-9 digits
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    mask: (m) => `${m.slice(0, 2)}${'*'.repeat(m.length - 2)}`,
    redact: () => '[REDACTED-PASSPORT]',
  },
  {
    type: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    mask: (m) => {
      const parts = m.split('.');
      return `${parts[0]}.***.***${parts[3]}`;
    },
    redact: () => '[REDACTED-IP]',
  },
  {
    type: 'iban',
    // IBAN: 2 letters + 2 digits + up to 30 alphanumeric
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
    mask: (m) => `${m.slice(0, 4)}${'*'.repeat(Math.max(m.length - 8, 1))}${m.slice(-4)}`,
    redact: () => '[REDACTED-IBAN]',
  },
  {
    type: 'date_of_birth',
    // DOB patterns: DD/MM/YYYY, MM-DD-YYYY, YYYY-MM-DD preceded by context words
    pattern: /(?:(?:born|dob|date of birth|birthday)[:\s]+)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi,
    mask: () => '[DOB: **/**/****]',
    redact: () => '[REDACTED-DOB]',
  },
];

// Additional context patterns that increase PII confidence
const PII_CONTEXT_INDICATORS = [
  /(?:my|his|her|their)\s+(?:social security|ssn|tax id)/i,
  /(?:my|his|her|their)\s+(?:passport|visa)\s+(?:number|#|no\.?)/i,
  /(?:my|his|her|their)\s+(?:credit card|debit card|card number)/i,
  /(?:my|his|her|their)\s+(?:phone|mobile|cell|telephone)\s+(?:number|#|no\.?)/i,
  /(?:my|his|her|their)\s+(?:account|routing)\s+(?:number|#|no\.?)/i,
];

// ─── Exclusion patterns (avoid false positives) ────────────────────────────

function isLikelyFalsePositive(match: string, type: PIIType, text: string, index: number): boolean {
  // Phone: Don't flag numbers that are clearly not phone numbers
  if (type === 'phone') {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return true;
    // Skip numbers in context of statistics, years, amounts
    const contextBefore = text.slice(Math.max(0, index - 30), index).toLowerCase();
    if (/(?:gdp|population|million|billion|year|rate|percent|%|\$|usd|aud|eur|gbp)\s*$/.test(contextBefore)) return true;
    if (/^\d{4}$/.test(digits)) return true; // 4-digit numbers are likely years
  }
  // SSN: Require context to avoid flagging random 9-digit sequences
  if (type === 'ssn') {
    const contextBefore = text.slice(Math.max(0, index - 50), index).toLowerCase();
    if (!PII_CONTEXT_INDICATORS.some(p => p.test(contextBefore)) && !/[-]/.test(match)) return true;
  }
  // Passport: Require context
  if (type === 'passport') {
    const contextBefore = text.slice(Math.max(0, index - 50), index).toLowerCase();
    if (!PII_CONTEXT_INDICATORS.some(p => p.test(contextBefore))) return true;
  }
  // IBAN: Must be at least 15 chars to be a real IBAN
  if (type === 'iban' && match.length < 15) return true;

  return false;
}

// ─── PII Detection Service ──────────────────────────────────────────────────

class PIIDetectionService {
  private scanCount = 0;
  private detectionCount = 0;

  /**
   * Scan text for PII and optionally scrub it.
   */
  scan(text: string, mode: 'redact' | 'mask' | 'detect' = 'redact'): PIIScanResult {
    const matches: PIIMatch[] = [];
    this.scanCount++;

    for (const rule of PII_PATTERNS) {
      // Reset regex lastIndex for global patterns
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(text)) !== null) {
        if (isLikelyFalsePositive(match[0], rule.type, text, match.index)) continue;
        matches.push({
          type: rule.type,
          value: match[0],
          maskedValue: mode === 'mask' ? rule.mask(match[0]) : rule.redact(match[0]),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    if (matches.length > 0) this.detectionCount++;

    // Apply scrubbing if not in detect-only mode
    let scrubbedText = text;
    if (mode !== 'detect' && matches.length > 0) {
      // Sort by startIndex descending to replace from end to start
      const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex);
      for (const m of sorted) {
        scrubbedText = scrubbedText.slice(0, m.startIndex) + m.maskedValue + scrubbedText.slice(m.endIndex);
      }
    }

    return {
      hasPII: matches.length > 0,
      originalText: text,
      scrubbedText,
      matches,
      mode,
    };
  }

  /**
   * Quick check: does text contain PII? (no scrubbing)
   */
  hasPII(text: string): boolean {
    return this.scan(text, 'detect').hasPII;
  }

  /**
   * Get detection statistics.
   */
  getStats(): { totalScans: number; totalDetections: number; detectionRate: string } {
    return {
      totalScans: this.scanCount,
      totalDetections: this.detectionCount,
      detectionRate: this.scanCount > 0
        ? `${((this.detectionCount / this.scanCount) * 100).toFixed(1)}%`
        : '0%',
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const piiDetectionService = new PIIDetectionService();
export default piiDetectionService;
