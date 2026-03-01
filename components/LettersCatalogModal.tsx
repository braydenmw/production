/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI — LETTERS & DOCUMENTS CATALOG
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Full 247-document + 156-letter browsable library.
 * Every item is backed by DocumentTypeRouter with real AI prompt instructions.
 * Clicking "Generate" produces the full document using the brain context.
 *
 * Features:
 *  - Tabbed view: Documents | Letters
 *  - Category filter sidebar
 *  - Search across names and descriptions
 *  - One-click generation with brain context injection
 *  - Download as DOCX
 *  - Copy markdown to clipboard
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Search, FileText, Mail, Download, Copy, Check, Loader2,
  ChevronRight, Tag, BarChart3, Shield, Globe, BookOpen, Zap, Users,
  FileCheck,
} from 'lucide-react';
import { DocumentTypeRouter, type DocumentTypeConfig, type LetterTypeConfig } from '../services/DocumentTypeRouter';
import { downloadAsDocx } from '../services/DocxExporter';
import { ReportParameters } from '../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LettersCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Injected case context for generation */
  params?: Partial<ReportParameters>;
  /** Brain context block for AI prompt injection */
  brainBlock?: string;
  /** AI generation function */
  generateFn?: (prompt: string, systemNote?: string) => Promise<string>;
}

// ─── Tone badge colours ───────────────────────────────────────────────────────

const TONE_COLOR: Record<string, string> = {
  'formal-corporate': 'bg-blue-100 text-blue-800',
  'formal-government': 'bg-indigo-100 text-indigo-800',
  'technical-analytical': 'bg-violet-100 text-violet-800',
  'persuasive-investment': 'bg-amber-100 text-amber-800',
  'community-engagement': 'bg-green-100 text-green-800',
  'academic-research': 'bg-teal-100 text-teal-800',
  'diplomatic': 'bg-rose-100 text-rose-800',
};

const TONE_LABEL: Record<string, string> = {
  'formal-corporate': 'Corporate',
  'formal-government': 'Government',
  'technical-analytical': 'Technical',
  'persuasive-investment': 'Investment',
  'community-engagement': 'Community',
  'academic-research': 'Academic',
  'diplomatic': 'Diplomatic',
};

// ─── Category icon map ────────────────────────────────────────────────────────

function categoryIcon(cat: string) {
  const c = cat.toLowerCase();
  if (/letter|outreach|intro|partner|engage/.test(c)) return <Mail size={14} className="mr-1 inline-block" />;
  if (/government|submission|policy|public/.test(c)) return <FileCheck size={14} className="mr-1 inline-block" />;
  if (/financial|invest|fund/.test(c)) return <BarChart3 size={14} className="mr-1 inline-block" />;
  if (/risk|due diligence|compli/.test(c)) return <Shield size={14} className="mr-1 inline-block" />;
  if (/market|intelligence|trade/.test(c)) return <Globe size={14} className="mr-1 inline-block" />;
  if (/partner|stakeholder|community/.test(c)) return <Users size={14} className="mr-1 inline-block" />;
  if (/strategic|executive|plan/.test(c)) return <Zap size={14} className="mr-1 inline-block" />;
  return <FileText size={14} className="mr-1 inline-block" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

const LettersCatalogModal: React.FC<LettersCatalogModalProps> = ({
  isOpen,
  onClose,
  params,
  brainBlock = '',
  generateFn,
}) => {
  const [tab, setTab] = useState<'letters' | 'documents'>('letters');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Load full catalog ───────────────────────────────────────────────────────
  const allLetters: LetterTypeConfig[] = useMemo(() => DocumentTypeRouter.getAllLetterTypes(), []);
  const allDocuments: DocumentTypeConfig[] = useMemo(() => DocumentTypeRouter.getAllDocumentTypes(), []);

  const letterCategories = useMemo(() => {
    const cats = new Set(allLetters.map((l) => l.category));
    return ['all', ...Array.from(cats).sort()];
  }, [allLetters]);

  const documentCategories = useMemo(() => {
    const cats = new Set(allDocuments.map((d) => d.category));
    return ['all', ...Array.from(cats).sort()];
  }, [allDocuments]);

  const categories = tab === 'letters' ? letterCategories : documentCategories;

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredLetters = useMemo(() => {
    const q = search.toLowerCase();
    return allLetters.filter((l) => {
      const matchCat = selectedCategory === 'all' || l.category === selectedCategory;
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allLetters, selectedCategory, search]);

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase();
    return allDocuments.filter((d) => {
      const matchCat = selectedCategory === 'all' || d.category === selectedCategory;
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allDocuments, selectedCategory, search]);

  // ── Case context builder ────────────────────────────────────────────────────
  const buildCaseContext = useCallback(() => {
    if (!params) return 'No case context provided. Generate in professional advisory style.';
    return [
      `Organization: ${params.organizationName || 'Not specified'}`,
      `Country / Jurisdiction: ${params.country || 'Not specified'}`,
      `Sector: ${params.sector || 'Not specified'}`,
      `Objective: ${(params.strategicIntent || []).join(', ') || 'Not specified'}`,
    ].join('\n');
  }, [params]);

  // ── Generation ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (id: string, isLetter: boolean) => {
    if (!generateFn) {
      alert('Generation is available when accessed through BW Consultant OS. Open Case Study Builder first.');
      return;
    }
    setGenerating(id);
    try {
      const caseCtx = buildCaseContext();
      let content = '';

      if (isLetter) {
        const route = DocumentTypeRouter.routeLetter(id);
        if (!route) throw new Error(`Letter type not found: ${id}`);
        const prompt = [
          `You are BW Global Advisory writing a professional institutional letter.`,
          `Letter Type: ${route.config.name}`,
          ``,
          `### Letter Format Instructions`,
          route.promptInstruction,
          ``,
          `### Case Context`,
          caseCtx,
          ``,
          `### Intelligence Context`,
          brainBlock || '(No additional intelligence context)',
          ``,
          `Write the complete letter now. Formal and professional. No placeholders.`,
          `Jurisdiction: ${params?.country || 'Global'}`,
        ].join('\n');
        content = await generateFn(prompt, `Generating letter: ${route.config.name}`);
      } else {
        const route = DocumentTypeRouter.routeDocument(id);
        if (!route) throw new Error(`Document type not found: ${id}`);
        const { sectionPrompts } = route;
        const sections: string[] = [];
        for (const sp of sectionPrompts) {
          const sPrompt = [
            `## Section: ${sp.title}`,
            ``,
            `### Instructions`,
            sp.prompt,
            ``,
            `### Case Context`,
            caseCtx,
            ``,
            `### Intelligence Context`,
            brainBlock || '(No additional context)',
            ``,
            `Max ${sp.maxWords} words. Write professional prose. Begin directly with content.`,
          ].join('\n');
          const sContent = await generateFn(sPrompt, `Generating section: ${sp.title}`);
          sections.push(`## ${sp.title}\n\n${sContent}`);
        }
        content = sections.join('\n\n');
      }

      setGenerated((prev) => ({ ...prev, [id]: content }));
      setPreviewId(id);
    } catch (err) {
      console.error('Generation error:', err);
      alert('Generation failed. Check your API key and case context.');
    } finally {
      setGenerating(null);
    }
  }, [generateFn, buildCaseContext, brainBlock, params]);

  const handleCopy = useCallback((id: string) => {
    const content = generated[id];
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, [generated]);

  const handleDownload = useCallback(async (id: string, name: string) => {
    const content = generated[id];
    if (!content) return;
    setDownloadingId(id);
    try {
      await downloadAsDocx({
        title: name.toUpperCase(),
        subtitle: `${params?.organizationName || 'BW Global Advisory'} — ${params?.country || 'Global'}`,
        classification: 'CONFIDENTIAL',
        preparedFor: params?.organizationName || 'Client',
        preparedBy: 'BW Global Advisory — NEXUS AI',
        date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
        reportId: `BWGA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        content,
      } as any);
    } catch (err) {
      console.error('Download error:', err);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }, [generated, params]);

  if (!isOpen) return null;

  const catalog = DocumentTypeRouter.getCatalogSummary();
  const activeItems = tab === 'letters' ? filteredLetters : filteredDocuments;
  const previewItem = previewId
    ? (tab === 'letters' ? allLetters : allDocuments as any[]).find((x: any) => x.id === previewId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-4 pb-8 px-2">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl bg-white rounded-sm shadow-2xl border border-stone-200 flex flex-col" style={{ minHeight: '90vh' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-900 text-white rounded-t-sm">
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase">
              Document &amp; Letter Catalog
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {catalog.totalDocumentTypes} Document Types &middot; {catalog.totalLetterTypes} Letter Templates &middot; All AI-Powered via NSIL Agentic Runtime
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-stone-200 bg-stone-50">
          {(['letters', 'documents'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedCategory('all'); setSearch(''); setPreviewId(null); }}
              className={`px-6 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                tab === t
                  ? 'border-stone-900 text-stone-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {t === 'letters' ? `Letters (${allLetters.length})` : `Documents (${allDocuments.length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

          {/* ── Category sidebar ────────────────────────────────────────────── */}
          <div className="w-52 shrink-0 border-r border-stone-200 bg-stone-50 overflow-y-auto py-3">
            <p className="px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Categories</p>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center transition-colors ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat !== 'all' && categoryIcon(cat)}
                <span className="truncate">{cat === 'all' ? 'All' : cat}</span>
              </button>
            ))}
          </div>

          {/* ── Main content area ────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search bar */}
            <div className="px-4 py-3 border-b border-stone-200 bg-white shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${activeItems.length} ${tab}…`}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-sm focus:outline-none focus:border-stone-500"
                />
              </div>
            </div>

            {/* Generated content preview panel */}
            {previewId && generated[previewId] && (
              <div className="mx-4 mt-3 mb-2 border border-amber-200 rounded-sm bg-amber-50 shrink-0">
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200">
                  <span className="text-xs font-semibold text-amber-900">
                    Generated: {previewItem?.name || previewId}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(previewId)}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-sm transition-colors"
                    >
                      {copied === previewId ? <Check size={12} /> : <Copy size={12} />}
                      {copied === previewId ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleDownload(previewId, previewItem?.name || previewId)}
                      disabled={!!downloadingId}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-stone-900 hover:bg-stone-700 text-white rounded-sm transition-colors disabled:opacity-50"
                    >
                      {downloadingId === previewId ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Download
                    </button>
                    <button onClick={() => setPreviewId(null)} className="text-amber-700 hover:text-amber-900 px-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto px-3 py-2">
                  <pre className="text-[10px] text-amber-900 whitespace-pre-wrap font-mono leading-relaxed">
                    {generated[previewId].slice(0, 4000)}
                    {generated[previewId].length > 4000 ? '\n\n…(document continues)' : ''}
                  </pre>
                </div>
              </div>
            )}

            {/* Item grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'letters' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredLetters.map((letter) => (
                    <LetterCard
                      key={letter.id}
                      item={letter}
                      isGenerating={generating === letter.id}
                      isGenerated={!!generated[letter.id]}
                      isCopied={copied === letter.id}
                      isDownloading={downloadingId === letter.id}
                      onGenerate={() => handleGenerate(letter.id, true)}
                      onCopy={() => handleCopy(letter.id)}
                      onDownload={() => handleDownload(letter.id, letter.name)}
                      onPreview={() => setPreviewId(letter.id)}
                      hasGenerateFn={!!generateFn}
                    />
                  ))}
                  {filteredLetters.length === 0 && (
                    <p className="col-span-3 py-12 text-center text-stone-400 text-xs">No letters match your search.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      item={doc}
                      isGenerating={generating === doc.id}
                      isGenerated={!!generated[doc.id]}
                      isCopied={copied === doc.id}
                      isDownloading={downloadingId === doc.id}
                      onGenerate={() => handleGenerate(doc.id, false)}
                      onCopy={() => handleCopy(doc.id)}
                      onDownload={() => handleDownload(doc.id, doc.name)}
                      onPreview={() => setPreviewId(doc.id)}
                      hasGenerateFn={!!generateFn}
                    />
                  ))}
                  {filteredDocuments.length === 0 && (
                    <p className="col-span-3 py-12 text-center text-stone-400 text-xs">No documents match your search.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 text-[10px] text-stone-500 flex items-center justify-between rounded-b-sm">
          <span>
            BW NEXUS AI &middot; {catalog.totalDocumentTypes} Document Types &middot; {catalog.totalLetterTypes} Letter Templates &middot; Powered by NSIL Agentic Runtime
          </span>
          <span className={generateFn ? 'text-green-600 font-semibold' : 'text-stone-400'}>
            {generateFn ? '● Generation active — case context injected' : '○ Open via Case Study Builder for AI generation'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Letter Card ──────────────────────────────────────────────────────────────

interface CardSharedProps {
  isGenerating: boolean;
  isGenerated: boolean;
  isCopied: boolean;
  isDownloading: boolean;
  onGenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onPreview: () => void;
  hasGenerateFn: boolean;
}

const ActionBar: React.FC<CardSharedProps & { itemType: string; sectionCount?: number }> = ({
  isGenerating, isGenerated, isCopied, isDownloading, onGenerate, onCopy, onDownload, onPreview, hasGenerateFn, sectionCount,
}) => (
  <div className="flex gap-1.5 mt-auto pt-1 border-t border-stone-100">
    {!isGenerated ? (
      <button
        onClick={onGenerate}
        disabled={isGenerating || !hasGenerateFn}
        title={!hasGenerateFn ? 'Open via Case Study Builder to generate' : undefined}
        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 bg-stone-900 text-white rounded-sm hover:bg-stone-700 disabled:opacity-50 transition-colors"
      >
        {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
        {isGenerating ? 'Generating…' : sectionCount ? `Generate (${sectionCount} sections)` : 'Generate'}
      </button>
    ) : (
      <>
        <button onClick={onPreview} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 bg-green-700 text-white rounded-sm hover:bg-green-800 transition-colors">
          <BookOpen size={11} /> Preview
        </button>
        <button onClick={onCopy} className="px-2 py-1.5 border border-stone-300 rounded-sm hover:bg-stone-100 transition-colors text-stone-700">
          {isCopied ? <Check size={11} /> : <Copy size={11} />}
        </button>
        <button onClick={onDownload} disabled={isDownloading} className="px-2 py-1.5 border border-stone-300 rounded-sm hover:bg-stone-100 transition-colors text-stone-700 disabled:opacity-50">
          {isDownloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
        </button>
        <button onClick={onGenerate} disabled={isGenerating} className="px-2 py-1.5 border border-amber-300 bg-amber-50 rounded-sm hover:bg-amber-100 transition-colors text-amber-800 disabled:opacity-50" title="Regenerate">
          {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
        </button>
      </>
    )}
  </div>
);

const LetterCard: React.FC<CardSharedProps & { item: LetterTypeConfig }> = ({ item, ...rest }) => (
  <div className={`border rounded-sm p-3 bg-white flex flex-col gap-2 transition-all ${rest.isGenerated ? 'border-green-300 bg-green-50/30' : 'border-stone-200 hover:border-stone-400'}`}>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Mail size={12} className="text-stone-500 shrink-0" />
        <span className="text-xs font-semibold text-stone-900 truncate">{item.name}</span>
      </div>
      <p className="text-[10px] text-stone-500 line-clamp-2">{item.description}</p>
    </div>
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${TONE_COLOR[item.tone] || 'bg-stone-100 text-stone-700'}`}>
        {TONE_LABEL[item.tone] || item.tone}
      </span>
      <span className="text-[9px] text-stone-400 flex items-center">
        <Tag size={9} className="mr-0.5" />{item.category}
      </span>
      <span className="text-[9px] text-stone-400">~{item.maxWords} words</span>
    </div>
    <ActionBar {...rest} itemType="letter" />
  </div>
);

const DocumentCard: React.FC<CardSharedProps & { item: DocumentTypeConfig }> = ({ item, ...rest }) => {
  const totalWords = item.sections?.reduce((s, x) => s + x.maxWords, 0) || 0;
  const estimatedPages = Math.round(totalWords / 250);
  return (
    <div className={`border rounded-sm p-3 bg-white flex flex-col gap-2 transition-all ${rest.isGenerated ? 'border-green-300 bg-green-50/30' : 'border-stone-200 hover:border-stone-400'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <FileText size={12} className="text-stone-500 shrink-0" />
          <span className="text-xs font-semibold text-stone-900 truncate">{item.name}</span>
        </div>
        <p className="text-[10px] text-stone-500 line-clamp-2">{item.description}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${TONE_COLOR[item.tone] || 'bg-stone-100 text-stone-700'}`}>
          {TONE_LABEL[item.tone] || item.tone}
        </span>
        <span className="text-[9px] text-stone-400 flex items-center">
          <Tag size={9} className="mr-0.5" />{item.category}
        </span>
        <span className="text-[9px] text-stone-400">{item.sections?.length || 0} sections · ~{estimatedPages}pp</span>
      </div>
      <ActionBar {...rest} itemType="document" sectionCount={item.sections?.length} />
    </div>
  );
};

export default LettersCatalogModal;
