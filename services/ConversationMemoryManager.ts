/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — CONVERSATION MEMORY MANAGER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Hierarchical context window management that prevents the AI from
 * "forgetting" after 4-5 turns. Implements the standard approach used
 * by ChatGPT/Claude: rolling summary + recent verbatim turns.
 *
 * Architecture:
 *   ┌──────────────────────────────────────────┐
 *   │  Tier 1: Rolling Summary (LLM-generated) │  ← compressed old turns
 *   │  Tier 2: Recent 6 turns (verbatim)       │  ← full text
 *   │  Tier 3: Current turn                    │  ← user's latest message
 *   └──────────────────────────────────────────┘
 *
 * The summary is regenerated when conversation hits a threshold (8+ turns)
 * using the fast model for efficiency. Cross-session memory is pulled from
 * ConversationStore learnings for truly persistent intelligence.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { summarizeWithAI } from './MultiModelRouter';
import { conversationStore } from './ConversationStore';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ManagedContext {
  /** Compressed summary of older conversation turns */
  rollingSummary: string;
  /** Recent turns kept verbatim (last 6) */
  recentTurns: ConversationTurn[];
  /** Cross-session learnings/memories */
  longTermMemory: string;
  /** Total estimated tokens in this context block */
  estimatedTokens: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const MAX_RECENT_TURNS = 6;
const MAX_RECENT_CHARS_PER_TURN = 2000;
const SUMMARY_TRIGGER_TURNS = 8;
const MAX_SUMMARY_CHARS = 2000;
const MAX_LONG_TERM_CHARS = 1500;

// ─── Manager ────────────────────────────────────────────────────────────────

class ConversationMemoryManager {
  private fullHistory: ConversationTurn[] = [];
  private rollingSummary = '';
  private conversationId = '';
  private summarizing = false;

  /**
   * Start or resume a conversation. Pulls existing context if available.
   */
  async startConversation(conversationId?: string): Promise<string> {
    if (conversationId) {
      this.conversationId = conversationId;
      // Restore from store
      const messages = await conversationStore.getMessages(conversationId, 200);
      this.fullHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, timestamp: m.timestamp }));
    } else {
      const conv = await conversationStore.createConversation();
      this.conversationId = conv.id;
      this.fullHistory = [];
      this.rollingSummary = '';
    }
    return this.conversationId;
  }

  /**
   * Add a turn and persist to store. Triggers summarization if needed.
   */
  async addTurn(role: 'user' | 'assistant', content: string): Promise<void> {
    const turn: ConversationTurn = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.fullHistory.push(turn);

    // Persist to IndexedDB
    await conversationStore.addMessage(this.conversationId, role, content).catch(() => {});

    // Trigger background summarization if threshold exceeded
    if (this.fullHistory.length >= SUMMARY_TRIGGER_TURNS && !this.summarizing) {
      this.triggerSummarization();
    }
  }

  /**
   * Build the managed context ready for injection into the AI prompt.
   */
  async getContext(): Promise<ManagedContext> {
    // Split history into old (to summarize) and recent (verbatim)
    const recentCount = Math.min(MAX_RECENT_TURNS, this.fullHistory.length);
    const recentTurns = this.fullHistory
      .slice(-recentCount)
      .map(t => ({
        ...t,
        content: t.content.slice(0, MAX_RECENT_CHARS_PER_TURN),
      }));

    // Get cross-session learnings
    const longTermMemory = await this.buildLongTermMemory();

    const summaryChars = this.rollingSummary.length;
    const recentChars = recentTurns.reduce((s, t) => s + t.content.length, 0);
    const ltmChars = longTermMemory.length;
    const estimatedTokens = Math.round((summaryChars + recentChars + ltmChars) / 4);

    return {
      rollingSummary: this.rollingSummary,
      recentTurns,
      longTermMemory,
      estimatedTokens,
    };
  }

  /**
   * Format the managed context into a prompt-ready string.
   */
  async formatForPrompt(): Promise<string> {
    const ctx = await this.getContext();
    const parts: string[] = [];

    if (ctx.longTermMemory) {
      parts.push(`## LONG-TERM MEMORY (from previous sessions):\n${ctx.longTermMemory}`);
    }

    if (ctx.rollingSummary) {
      parts.push(`## CONVERSATION SUMMARY (earlier in this session):\n${ctx.rollingSummary}`);
    }

    if (ctx.recentTurns.length > 0) {
      const turnLines = ctx.recentTurns
        .map(t => `${t.role.toUpperCase()}: ${t.content}`)
        .join('\n\n');
      parts.push(`## RECENT CONVERSATION:\n${turnLines}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Record a learning from this conversation for cross-session memory.
   */
  async recordLearning(type: 'correction' | 'preference' | 'fact' | 'feedback', content: string): Promise<void> {
    await conversationStore.addLearning(this.conversationId, type, content);
  }

  /**
   * Reset for a new conversation.
   */
  reset(): void {
    this.fullHistory = [];
    this.rollingSummary = '';
    this.conversationId = '';
  }

  getConversationId(): string {
    return this.conversationId;
  }

  getTurnCount(): number {
    return this.fullHistory.length;
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private async triggerSummarization(): Promise<void> {
    if (this.summarizing) return;
    this.summarizing = true;

    try {
      // Take all turns EXCEPT the most recent 4 (keep those verbatim)
      const turnsToSummarize = this.fullHistory.slice(0, -4);
      if (turnsToSummarize.length < 4) return;

      const transcript = turnsToSummarize
        .map(t => `${t.role.toUpperCase()}: ${t.content.slice(0, 800)}`)
        .join('\n');

      const prompt = `Summarize this conversation history into a concise briefing. Preserve: key facts discussed, decisions made, user preferences expressed, any corrections the user made, and the current topic trajectory. Maximum 250 words.\n\n${transcript.slice(0, 8000)}`;

      const summary = await summarizeWithAI(prompt, 250);
      if (summary && summary.length > 20) {
        // Merge with existing summary if present
        if (this.rollingSummary) {
          const mergePrompt = `Merge these two conversation summaries into one concise briefing (max 300 words). Include all key facts and decisions.\n\nPREVIOUS SUMMARY:\n${this.rollingSummary}\n\nNEW TURNS SUMMARY:\n${summary}`;
          const merged = await summarizeWithAI(mergePrompt, 300);
          this.rollingSummary = (merged || summary).slice(0, MAX_SUMMARY_CHARS);
        } else {
          this.rollingSummary = summary.slice(0, MAX_SUMMARY_CHARS);
        }

        // Update the conversation record with the summary
        await conversationStore.updateConversation(this.conversationId, {
          summary: this.rollingSummary,
        });
      }
    } catch (err) {
      console.warn('[ConversationMemoryManager] Summarization failed:', err);
    } finally {
      this.summarizing = false;
    }
  }

  private async buildLongTermMemory(): Promise<string> {
    try {
      // Pull recent learnings across ALL past conversations
      const learnings = await conversationStore.getLearnings(undefined, 20);
      if (learnings.length === 0) return '';

      const lines = learnings
        .map(l => `[${l.type}] ${l.content}`)
        .join('\n');

      return lines.slice(0, MAX_LONG_TERM_CHARS);
    } catch {
      return '';
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const conversationMemoryManager = new ConversationMemoryManager();
export default conversationMemoryManager;
