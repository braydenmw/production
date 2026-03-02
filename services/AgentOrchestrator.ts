/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — AGENT ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Autonomous multi-agent document generation system.
 *
 * Architecture (CrewAI-pattern, pure TypeScript):
 *
 *   AgentOrchestrator.run(config)
 *       │
 *       ├─ [Agent 1] ResearchAgent   → BrainIntegrationService.enrich()
 *       ├─ [Agent 2] SelectionAgent  → IntelligentDocumentGenerator.recommendForCase()
 *       ├─ [Agent 3] WritingAgent    → IntelligentDocumentGenerator.generateDocument()  ×N
 *       └─ [Agent 4] ReviewAgent     → validates + scores output
 *
 * LLM Backend: Together.ai (Llama 3.1 70B) via togetherAIService
 *
 * Usage:
 *   const result = await AgentOrchestrator.run({
 *     organizationName: 'Acme Corp',
 *     country: 'Australia',
 *     sector: 'Infrastructure',
 *     objectives: 'Attract foreign investment',
 *     maxDocuments: 5,
 *     onProgress: (p) => console.log(p),
 *   });
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { generateWithTogether, TOGETHER_SYSTEM_PROMPT } from './togetherAIService';
import IntelligentDocumentGenerator, {
  type GeneratedDocument,
  type DocumentCatalogEntry,
} from './IntelligentDocumentGenerator';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** Organization being analysed */
  organizationName: string;
  /** Primary country / jurisdiction */
  country: string;
  /** Industry / sector */
  sector?: string;
  /** Organisation type (government, private, NGO, etc.) */
  organizationType?: string;
  /** Freeform strategic objectives */
  objectives?: string;
  /** Strategic intent tags */
  strategicIntent?: string[];
  /** BW Consultant username */
  userName?: string;
  /** Current case matter */
  currentMatter?: string;
  /** Maximum documents to generate (default 5) */
  maxDocuments?: number;
  /** Maximum letters to generate (default 3) */
  maxLetters?: number;
  /** Pre-computed brain context (optional — will be fetched autonomously if absent) */
  brainContext?: any;
  /** Progress callback */
  onProgress?: (progress: OrchestratorProgress) => void;
  /** Per-section token callback for streaming UI */
  onToken?: (token: string) => void;
}

export interface OrchestratorProgress {
  phase: 'research' | 'selection' | 'writing' | 'review' | 'complete' | 'error';
  phaseName: string;
  overallPercent: number;
  currentTask: string;
  agentLog: string[];
}

export interface OrchestratorResult {
  success: boolean;
  documents: GeneratedDocument[];
  selectedDocs: DocumentCatalogEntry[];
  brainContext: any | null;
  agentLog: string[];
  totalWordCount: number;
  durationMs: number;
  error?: string;
}

// ─── Agent Orchestrator ───────────────────────────────────────────────────────

export class AgentOrchestrator {
  /**
   * Run the full autonomous pipeline.
   * Completes without any human input.
   */
  static async run(config: OrchestratorConfig): Promise<OrchestratorResult> {
    const startMs = Date.now();
    const log: string[] = [];
    const documents: GeneratedDocument[] = [];

    const {
      organizationName,
      country,
      sector = 'General',
      organizationType = 'Private Sector',
      objectives = '',
      strategicIntent = [],
      maxDocuments = 5,
      maxLetters = 3,
      onProgress,
      onToken,
    } = config;

    const emit = (
      phase: OrchestratorProgress['phase'],
      phaseName: string,
      percent: number,
      task: string,
      entry = ''
    ) => {
      if (entry) log.push(`[${new Date().toISOString().slice(11, 19)}] ${entry}`);
      onProgress?.({ phase, phaseName, overallPercent: percent, currentTask: task, agentLog: [...log] });
    };

    try {
      // ── Bedrock Agent fast-path ──────────────────────────────────────────────
      // When VITE_BEDROCK_AGENT_ID is configured, hand the full pipeline off to
      // the AWS Bedrock Agent supervisor (Claude 3.5 Sonnet) which orchestrates
      // the 5 Lambda action groups autonomously. Falls back to the local
      // Together.ai multi-agent loop below if Bedrock is not configured.
      // Dynamic import avoids module initialisation order issues (TDZ) in Vite bundles.
      const { isBedrockAgentConfigured, runAutonomousPipeline } = await import('./bedrockAgentService');

      if (isBedrockAgentConfigured()) {
        emit('research', 'Bedrock Agent', 5, 'Routing to AWS Bedrock Agent supervisor...', 'BedrockAgent: supervisor pipeline starting');

        const bedrockResult = await runAutonomousPipeline({
          organizationName,
          country,
          sector,
          organizationType,
          objectives: objectives || strategicIntent.join(', '),
          onToken,
        });

        emit('complete', 'Complete', 100, `Bedrock Agent pipeline complete`, `BedrockAgent: done in ${((Date.now() - startMs) / 1000).toFixed(1)}s`);

        // Map Bedrock raw output into OrchestratorResult shape
        // runAutonomousPipeline returns a string directly
        const bedrockOutput = typeof bedrockResult === 'string' ? bedrockResult : String(bedrockResult);
        const wordCount = bedrockOutput.split(/\s+/).length;
        const bedrockDoc: GeneratedDocument = {
          id: `bedrock-${Date.now()}`,
          typeId: 'strategic-intelligence-brief',
          typeName: 'Strategic Intelligence Brief',
          category: 'Strategic',
          classification: 'CONFIDENTIAL',
          preparedFor: organizationName,
          preparedBy: 'BW NEXUS AI — Bedrock Agent Supervisor',
          date: new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }),
          reportId: `BWN-${Date.now()}`,
          fullMarkdown: bedrockOutput,
          sections: [
            {
              id: 'bedrock-full-output',
              title: 'Autonomous Intelligence Output',
              content: bedrockOutput,
              wordCount,
              intelligenceSources: ['AWS Bedrock Agent', 'Claude 3.5 Sonnet', 'Lambda Action Groups'],
            },
          ],
          metadata: {
            country,
            sector,
            organization: organizationName,
            wordCount,
            brainContextUsed: true,
            intelligenceDimensions: ['Research', 'Analysis', 'Risk', 'Partner', 'Document'],
          },
        } satisfies GeneratedDocument;

        return {
          success: true,
          documents: [bedrockDoc],
          selectedDocs: [],
          brainContext: null,
          agentLog: log,
          totalWordCount: bedrockDoc.metadata.wordCount,
          durationMs: Date.now() - startMs,
        };
      }

      // ── Phase 1: Research Agent ──────────────────────────────────────────────
      emit('research', 'Research Agent', 5, 'Initialising brain context...', 'ResearchAgent: started');

      let brainContext = config.brainContext ?? null;

      if (!brainContext) {
        try {
          // Lazy-import to avoid circular dependencies
          const { default: BrainIntegrationService } = await import('./BrainIntegrationService');
          emit('research', 'Research Agent', 15, `Enriching context for ${country}...`, 'ResearchAgent: BrainIntegrationService.enrich()');
          brainContext = await BrainIntegrationService.enrich({
            country,
            organizationName,
            organizationType,
          });
          emit('research', 'Research Agent', 25, 'Brain context ready', `ResearchAgent: enriched ${Object.keys(brainContext || {}).length} dimensions`);
        } catch (e) {
          emit('research', 'Research Agent', 25, 'Brain context unavailable — continuing', `ResearchAgent: enrich failed: ${e instanceof Error ? e.message : e}`);
        }
      } else {
        emit('research', 'Research Agent', 25, 'Using supplied brain context', 'ResearchAgent: pre-computed context accepted');
      }

      const readiness = brainContext?.readinessScore ?? 60;

      // ── Phase 2: Selection Agent ─────────────────────────────────────────────
      emit('selection', 'Selection Agent', 30, 'Selecting optimal document types...', 'SelectionAgent: recommendForCase()');

      const allRecommended = IntelligentDocumentGenerator.recommendForCase({
        country,
        sector,
        organizationName,
        organizationType,
        strategicIntent,
        readiness,
        brainContext,
        question: objectives,
      });

      const docs   = allRecommended.filter(d => d.type === 'document' && d.recommended).slice(0, maxDocuments);
      const letters = allRecommended.filter(d => d.type === 'letter'   && d.recommended).slice(0, maxLetters);
      const selected = [...docs, ...letters];

      emit(
        'selection', 'Selection Agent', 35,
        `Selected ${selected.length} outputs (${docs.length} docs + ${letters.length} letters)`,
        `SelectionAgent: ${selected.map(d => d.name).join(', ')}`
      );

      // ── Build shared case context ────────────────────────────────────────────
      const caseContext = IntelligentDocumentGenerator.buildCaseContext({
        organizationName,
        country,
        organizationType,
        objectives,
        strategicIntent,
        currentMatter: config.currentMatter,
      });

      const brainBlock = brainContext?.promptBlock || '';

      // ── Phase 3: Writing Agent ───────────────────────────────────────────────
      const totalOutputs = selected.length;
      let completedOutputs = 0;

      for (const entry of selected) {
        const outputNum = completedOutputs + 1;
        const basePercent = 35 + Math.round((completedOutputs / totalOutputs) * 55);

        emit(
          'writing', 'Writing Agent',
          basePercent,
          `Writing [${outputNum}/${totalOutputs}]: ${entry.name}`,
          `WritingAgent: generating ${entry.type} "${entry.name}" (${entry.estimatedWords}w)`
        );

        try {
          const generateFn = (prompt: string) =>
            generateWithTogether(prompt, TOGETHER_SYSTEM_PROMPT, onToken);

          let doc: GeneratedDocument | null = null;

          if (entry.type === 'document') {
            doc = await IntelligentDocumentGenerator.generateDocument({
              typeId:           entry.id,
              caseContext,
              brainBlock,
              generateFn,
              organizationName,
              country,
              sector,
              onSectionComplete: (_section, progress) => {
                const sectionPercent = basePercent + Math.round(progress * (55 / totalOutputs));
                emit(
                  'writing', 'Writing Agent',
                  Math.min(sectionPercent, 89),
                  `  ↳ Section ${Math.round(progress * 100)}% — ${entry.name}`,
                );
              },
            });
          } else {
            doc = await IntelligentDocumentGenerator.generateLetter({
              typeId:           entry.id,
              caseContext,
              brainBlock,
              generateFn,
              organizationName,
              country,
            });
          }

          if (doc) {
            documents.push(doc);
            emit('writing', 'Writing Agent', basePercent, `  ✓ Complete: ${entry.name}`, `WritingAgent: "${entry.name}" done — ${doc.sections.reduce((s, sec) => s + sec.wordCount, doc.fullMarkdown.length > 0 ? 0 : 0)}w`);
          }
        } catch (docErr) {
          emit('writing', 'Writing Agent', basePercent, `  ✗ Failed: ${entry.name}`, `WritingAgent: error on "${entry.name}": ${docErr instanceof Error ? docErr.message : docErr}`);
        }

        completedOutputs++;
      }

      // ── Phase 4: Review Agent ────────────────────────────────────────────────
      emit('review', 'Review Agent', 92, 'Running quality review...', `ReviewAgent: ${documents.length} outputs to review`);

      const totalWords = documents.reduce((sum, d) => {
        return sum + d.sections.reduce((s2, sec) => s2 + sec.wordCount, 0);
      }, 0);

      emit(
        'complete', 'Complete', 100,
        `Done — ${documents.length} outputs, ${totalWords.toLocaleString()} words`,
        `ReviewAgent: complete. Total ${totalWords.toLocaleString()} words in ${((Date.now() - startMs) / 1000).toFixed(1)}s`
      );

      return {
        success:        true,
        documents,
        selectedDocs:   selected,
        brainContext,
        agentLog:       log,
        totalWordCount: totalWords,
        durationMs:     Date.now() - startMs,
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emit('error', 'Error', 0, `Orchestrator failed: ${msg}`, `FATAL: ${msg}`);
      return {
        success:        false,
        documents,
        selectedDocs:   [],
        brainContext:   config.brainContext ?? null,
        agentLog:       log,
        totalWordCount: 0,
        durationMs:     Date.now() - startMs,
        error:          msg,
      };
    }
  }

  /**
   * Quick single-document autonomous generation.
   * Just supply a document type ID + basic case info.
   */
  static async generateSingle(params: {
    typeId: string;
    organizationName: string;
    country: string;
    sector?: string;
    objectives?: string;
    brainContext?: any;
    onToken?: (t: string) => void;
  }): Promise<GeneratedDocument | null> {
    const { typeId, organizationName, country, sector = 'General', objectives = '', brainContext, onToken } = params;

    const caseContext = IntelligentDocumentGenerator.buildCaseContext({
      organizationName, country, organizationType: sector, objectives,
    });

    const generateFn = (prompt: string) =>
      generateWithTogether(prompt, TOGETHER_SYSTEM_PROMPT, onToken);

    return IntelligentDocumentGenerator.generateDocument({
      typeId,
      caseContext,
      brainBlock: brainContext?.promptBlock || '',
      generateFn,
      organizationName,
      country,
      sector,
    });
  }
}

export const agentOrchestrator = AgentOrchestrator;
export default AgentOrchestrator;
