/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — SELF-LEARNING LOOP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Real AI-powered learning from conversation outcomes.
 *
 * After each conversation the system:
 *  1. EXTRACTS corrections, preferences, and facts from the exchange
 *  2. STORES them as learnings in ConversationStore (IndexedDB)
 *  3. RETRIEVES relevant learnings for future prompts (few-shot injection)
 *  4. TRACKS what worked and what didn't → surface patterns
 *
 * This replaces the heuristic selfLearningEngine with actual AI extraction.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { conversationStore, type Learning } from './ConversationStore';
import { classifyWithAI, summarizeWithAI } from './MultiModelRouter';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LearningType = Learning['type'];

export interface ExtractedLearning {
  type: LearningType;
  content: string;
  confidence: number;
  source: 'user_correction' | 'conversation_pattern' | 'explicit_feedback';
}

export interface LearningContext {
  recentLearnings: string;
  domainKnowledge: string;
  userPreferences: string;
  estimatedTokens: number;
}

// ─── Learning Extraction ────────────────────────────────────────────────────

/**
 * Extract learnings from a completed conversation.
 * Called after each conversation ends or after significant exchanges.
 */
export async function extractLearnings(
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<ExtractedLearning[]> {
  if (messages.length < 4) return []; // Need enough conversation to learn from

  // Take last 10 exchanges to avoid token limits
  const recentMessages = messages.slice(-20);
  const transcript = recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}`)
    .join('\n');

  try {
    const raw = await classifyWithAI(
      `Analyze this conversation and extract LEARNINGS for future conversations.

CONVERSATION:
${transcript.slice(0, 4000)}

Look for:
1. CORRECTIONS — user corrected the AI (wrong facts, wrong approach)
2. PREFERENCES — user expressed preferences (style, format, topics)
3. FACTS — specific facts about the user's context (country, org, role)
4. STYLE — how the user wants responses (formal/casual, detail level)
5. DOMAIN_KNOWLEDGE — domain-specific info the AI should remember

Return ONLY valid JSON array (empty [] if no learnings found):
[{"type":"correction|preference|fact|style|domain_knowledge","content":"What was learned...","confidence":0.9,"source":"user_correction|conversation_pattern|explicit_feedback"}]`
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const learnings: ExtractedLearning[] = JSON.parse(jsonMatch[0]);
      // Validate and filter
      return learnings.filter(l =>
        l.type && l.content && l.content.length > 10 && l.confidence >= 0.5
      );
    }
  } catch { /* extraction failed — not critical */ }

  return [];
}

/**
 * Store extracted learnings in persistent storage.
 */
export async function storeLearnings(
  conversationId: string,
  learnings: ExtractedLearning[]
): Promise<void> {
  for (const learning of learnings) {
    await conversationStore.addLearning(
      conversationId,
      learning.type as Learning['type'],
      learning.content
    );
  }
}

/**
 * Full extract + store pipeline. Call at end of a conversation.
 */
export async function learnFromConversation(
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<number> {
  const learnings = await extractLearnings(conversationId, messages);
  if (learnings.length > 0) {
    await storeLearnings(conversationId, learnings);
  }
  return learnings.length;
}

// ─── Learning Retrieval (for prompt injection) ──────────────────────────────

/**
 * Retrieve relevant learnings and format them for injection into the AI prompt.
 * This is the "memory" that makes the AI improve over time.
 */
export async function getLearningContext(query?: string): Promise<LearningContext> {
  const allLearnings = await conversationStore.getLearnings(undefined, 50);

  if (allLearnings.length === 0) {
    return { recentLearnings: '', domainKnowledge: '', userPreferences: '', estimatedTokens: 0 };
  }

  // Group by type
  const corrections = allLearnings.filter(l => l.type === 'correction');
  const preferences = allLearnings.filter(l => l.type === 'preference');
  const facts = allLearnings.filter(l => l.type === 'fact');

  // Format sections
  const recentLearnings = corrections.length > 0
    ? 'PAST CORRECTIONS (avoid these mistakes):\n' +
      corrections.slice(0, 5).map(l => `• ${l.content}`).join('\n')
    : '';

  const userPreferences = preferences.length > 0
    ? 'USER PREFERENCES:\n' +
      preferences.slice(0, 5).map(l => `• ${l.content}`).join('\n')
    : '';

  const domainKnowledge = facts.length > 0
    ? 'KNOWN FACTS:\n' +
      facts.slice(0, 8).map(l => `• ${l.content}`).join('\n')
    : '';

  const all = [recentLearnings, userPreferences, domainKnowledge].filter(Boolean).join('\n\n');

  return {
    recentLearnings,
    domainKnowledge,
    userPreferences,
    estimatedTokens: Math.ceil(all.length / 4),
  };
}

/**
 * Format learnings as a ready-to-inject prompt block.
 */
export async function formatLearningsForPrompt(query?: string): Promise<string> {
  const ctx = await getLearningContext(query);
  const parts: string[] = [];

  if (ctx.recentLearnings) parts.push(ctx.recentLearnings);
  if (ctx.userPreferences) parts.push(ctx.userPreferences);
  if (ctx.domainKnowledge) parts.push(ctx.domainKnowledge);

  if (parts.length === 0) return '';
  return '\n## LEARNED FROM PREVIOUS CONVERSATIONS:\n' + parts.join('\n\n') + '\n';
}

// ─── Conversation Quality Tracking ──────────────────────────────────────────

/**
 * Record that a conversation ended positively or negatively.
 * Over time this builds a quality signal for self-improvement.
 */
export async function recordConversationOutcome(
  conversationId: string,
  outcome: 'positive' | 'negative' | 'neutral',
  notes?: string
): Promise<void> {
  await conversationStore.addLearning(
    conversationId,
    'fact',
    `Conversation outcome: ${outcome}${notes ? ` — ${notes}` : ''}`
  );
}

/**
 * Get a summary of recent conversation quality patterns.
 * Used to surface systemic issues in the AI's performance.
 */
export async function getQualityPatterns(): Promise<{
  totalConversations: number;
  positiveRate: number;
  commonCorrections: string[];
}> {
  const outcomes = await conversationStore.getLearnings('fact', 100);
  const qualityEntries = outcomes.filter(l => l.content.startsWith('Conversation outcome:'));
  const positives = qualityEntries.filter(l => l.content.includes('positive'));

  const corrections = await conversationStore.getLearnings('correction', 20);
  const correctionTexts = corrections.map(l => l.content);

  // Find most common corrections
  const commonCorrections: string[] = [];
  if (correctionTexts.length >= 3) {
    try {
      const raw = await summarizeWithAI(
        `Summarize the most common themes from these AI corrections in 3 bullet points:\n${correctionTexts.join('\n')}`
      );
      commonCorrections.push(...raw.split('\n').filter(l => l.trim().startsWith('•') || l.trim().startsWith('-')).map(l => l.replace(/^[•\-]\s*/, '').trim()));
    } catch {
      commonCorrections.push(...correctionTexts.slice(0, 3));
    }
  }

  return {
    totalConversations: qualityEntries.length,
    positiveRate: qualityEntries.length > 0 ? positives.length / qualityEntries.length : 0,
    commonCorrections,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const SelfLearningLoop = {
  extractLearnings,
  storeLearnings,
  learnFromConversation,
  getLearningContext,
  formatLearningsForPrompt,
  recordConversationOutcome,
  getQualityPatterns,
};

export default SelfLearningLoop;
