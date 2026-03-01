import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export interface BrainCoverageItem {
  engine: string;
  referencedIn: string[];
  status: 'active' | 'underused';
}

export interface BrainCoverageReport {
  generatedAt: string;
  totalCandidateEngines: number;
  activeCount: number;
  underusedCount: number;
  active: BrainCoverageItem[];
  underused: BrainCoverageItem[];
  recommendations: string[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SERVICES_DIR = path.resolve(ROOT, 'services');

const ENTRY_FILES = [
  'server/routes/ai.ts',
  'components/BWConsultantOS.tsx',
  'services/DecisionPipeline.ts',
  'services/ReportOrchestrator.ts',
  'services/MasterAutonomousOrchestrator.ts'
].map((relative) => path.resolve(ROOT, relative));

const shouldIncludeAsEngine = (filename: string): boolean => {
  if (!/\.(ts|tsx)$/i.test(filename)) return false;
  if (/\.d\.ts$/i.test(filename)) return false;
  return /(Engine|Orchestrator|Service|Hub)\.tsx?$/i.test(filename);
};

const walkFiles = async (dirPath: string): Promise<string[]> => {
  const result: string[] = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        result.push(fullPath);
      }
    }
  }

  return result;
};

const readEntryContents = async (): Promise<Array<{ file: string; content: string }>> => {
  const contents: Array<{ file: string; content: string }> = [];
  for (const file of ENTRY_FILES) {
    try {
      const content = await fs.readFile(file, 'utf8');
      contents.push({ file, content });
    } catch {
      // Ignore missing entry file in unusual layouts
    }
  }
  return contents;
};

export const buildBrainCoverageReport = async (): Promise<BrainCoverageReport> => {
  const serviceFiles = (await walkFiles(SERVICES_DIR)).filter((file) => shouldIncludeAsEngine(path.basename(file)));
  const entries = await readEntryContents();

  const coverage: BrainCoverageItem[] = serviceFiles.map((file) => {
    const engine = path.basename(file, path.extname(file));
    const referencedIn = entries
      .filter((entry) => {
        const importHit = new RegExp(`\\b${engine}\\b`).test(entry.content);
        return importHit;
      })
      .map((entry) => path.relative(ROOT, entry.file).replace(/\\/g, '/'));

    return {
      engine,
      referencedIn,
      status: referencedIn.length > 0 ? 'active' : 'underused'
    };
  });

  const active = coverage.filter((item) => item.status === 'active').sort((a, b) => a.engine.localeCompare(b.engine));
  const underused = coverage.filter((item) => item.status === 'underused').sort((a, b) => a.engine.localeCompare(b.engine));

  const topUnderused = underused.slice(0, 8).map((item) => item.engine);

  return {
    generatedAt: new Date().toISOString(),
    totalCandidateEngines: coverage.length,
    activeCount: active.length,
    underusedCount: underused.length,
    active,
    underused,
    recommendations: [
      'Route underused engines through a unified strategic pipeline before output generation.',
      'Prioritize activation of underused engines with strongest fit to regional opportunity mining and letter generation.',
      `Immediate activation candidates: ${topUnderused.length > 0 ? topUnderused.join(', ') : 'none detected'}`
    ]
  };
};