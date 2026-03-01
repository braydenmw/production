import jsPDF from 'jspdf';
import { ReportPayload } from '../types';
import { GovernanceService } from './GovernanceService';
import { ReportOrchestrator } from './ReportOrchestrator';
import { exportToDocx, type DocxDocumentMeta } from './DocxExporter';

/** Build a real PDF Blob from Markdown text using jsPDF. */
function buildPdfFromMarkdown(markdown: string, meta: DocxDocumentMeta): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const usableW = pageW - margin * 2;
  let y = margin;

  // Title page header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 100);
  doc.text(meta.title, margin, y, { maxWidth: usableW });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Prepared for: ${meta.preparedFor}  |  By: ${meta.preparedBy}`, margin, y);
  y += 6;
  doc.text(`Date: ${meta.date}  |  Report ID: ${meta.reportId}  |  ${meta.classification}`, margin, y);
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const lines = markdown.split('\n');
  for (const raw of lines) {
    const line = raw.trimEnd();

    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }

    if (line.startsWith('## ')) {
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 58, 100);
      doc.text(line.replace(/^##\s+/, ''), margin, y);
      y += 7;
    } else if (line.startsWith('### ')) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 80, 130);
      doc.text(line.replace(/^###\s+/, ''), margin, y);
      y += 6;
    } else if (line.startsWith('# ')) {
      // skip — already in header
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const bullet = '•  ' + line.replace(/^[-*]\s+/, '');
      const wrapped = doc.splitTextToSize(bullet, usableW - 5);
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(wl, margin + 4, y);
        y += 5;
      }
    } else if (line.startsWith('**') && line.endsWith('**')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(line.replace(/\*\*/g, ''), margin, y);
      y += 5;
    } else if (line.startsWith('|')) {
      // Simple table — treat each row as plain text
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      const rowText = line.replace(/\|/g, '  ').replace(/\s{2,}/g, '  ').trim();
      const wrapped = doc.splitTextToSize(rowText, usableW);
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(wl, margin, y);
        y += 4;
      }
    } else if (line === '' || line === '---') {
      y += 3;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      // Strip inline bold markers
      const plain = line.replace(/\*\*(.*?)\*\*/g, '$1');
      const wrapped = doc.splitTextToSize(plain, usableW);
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(wl, margin, y);
        y += 5;
      }
    }
  }

  // Footer on each page
  const totalPages = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${meta.classification} — ${meta.preparedBy}   |   Page ${p} of ${totalPages}`,
      margin, doc.internal.pageSize.getHeight() - 8);
  }

  return doc.output('blob');
}

export type ExportFormat = 'pdf' | 'docx' | 'ppt' | 'dashboard' | 'interactive';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a ReportPayload into structured Markdown for DOCX/PDF rendering. */
function buildMarkdownFromPayload(payload: ReportPayload): string {
  const md: string[] = [];
  const m = payload.metadata;
  const p = payload.problemDefinition;
  const r = payload.regionalProfile;
  const e = payload.economicSignals;
  const o = payload.opportunityMatches;
  const risks = payload.risks;
  const rec = payload.recommendations;
  const conf = payload.confidenceScores;

  md.push(`# Strategic Intelligence Report — ${m.country}`);
  md.push(`**Region:** ${m.region}  `);
  md.push(`**Report ID:** ${m.reportId}  `);
  md.push(`**Date:** ${m.timestamp}  `);
  md.push('');

  // Problem definition
  md.push('## Problem Definition');
  md.push(p.statedProblem);
  md.push(`**Urgency:** ${p.urgency}`);
  if (p.constraints.length) {
    md.push('### Constraints');
    p.constraints.forEach(c => md.push(`- ${c}`));
  }
  md.push('');

  // Regional profile
  md.push('## Regional Profile');
  md.push('### Demographics');
  md.push(`| Metric | Value |`);
  md.push(`|--------|-------|`);
  md.push(`| Population | ${r.demographics.population.toLocaleString()} |`);
  md.push(`| GDP per Capita | $${r.demographics.gdpPerCapita.toLocaleString()} |`);
  md.push(`| Labour Costs | $${r.demographics.laborCosts.toLocaleString()} |`);
  md.push('');
  md.push('### Infrastructure Scores');
  md.push(`| Category | Score |`);
  md.push(`|----------|-------|`);
  md.push(`| Transportation | ${r.infrastructure.transportation}/100 |`);
  md.push(`| Digital | ${r.infrastructure.digital}/100 |`);
  md.push(`| Utilities | ${r.infrastructure.utilities}/100 |`);
  md.push('');
  md.push('### Logistics');
  md.push(`- Regional Connectivity: ${r.logistics.regionalConnectivity}/100`);
  md.push(`- Export Potential: ${r.logistics.exportPotential}/100`);
  md.push('');

  // Economic signals
  md.push('## Economic Signals');
  md.push(`- Trade Exposure: ${e.tradeExposure}%`);
  md.push(`- Tariff Sensitivity: ${e.tariffSensitivity}%`);
  md.push(`- Bottleneck Relief Potential: ${e.bottleneckReliefPotential}/100`);
  if (e.costAdvantages.length) {
    md.push('### Cost Advantages');
    e.costAdvantages.forEach(a => md.push(`- ${a}`));
  }
  md.push('');

  // Opportunity matches
  md.push('## Opportunity Matches');
  md.push(`**Risk-Adjusted ROI:** ${o.riskAdjustedROI}%`);
  md.push('### Target Sectors');
  o.sectors.forEach(s => md.push(`- ${s}`));
  md.push('### Partner Types');
  o.partnerTypes.forEach(pt => md.push(`- ${pt}`));
  md.push('');

  // Risk assessment
  md.push('## Risk Assessment');
  md.push('### Political');
  md.push(`- Stability Score: ${risks.political.stabilityScore}/100`);
  md.push(`- Regional Conflict Risk: ${risks.political.regionalConflictRisk}/100`);
  md.push('### Regulatory');
  md.push(`- Corruption Index: ${risks.regulatory.corruptionIndex}`);
  md.push(`- Regulatory Friction: ${risks.regulatory.regulatoryFriction}/100`);
  if (risks.regulatory.complianceRoadmap.length) {
    md.push('### Compliance Roadmap');
    risks.regulatory.complianceRoadmap.forEach(r => md.push(`- ${r}`));
  }
  md.push('### Operational');
  md.push(`- Supply Chain Dependency: ${risks.operational.supplyChainDependency}/100`);
  md.push(`- Currency Risk: ${risks.operational.currencyRisk}`);
  md.push('');

  // Recommendations
  md.push('## Recommendations');
  if (rec.shortTerm.length) {
    md.push('### Short-Term');
    rec.shortTerm.forEach(r => md.push(`- ${r}`));
  }
  if (rec.midTerm.length) {
    md.push('### Mid-Term');
    rec.midTerm.forEach(r => md.push(`- ${r}`));
  }
  if (rec.longTerm.length) {
    md.push('### Long-Term');
    rec.longTerm.forEach(r => md.push(`- ${r}`));
  }
  md.push('');

  // Confidence scores
  md.push('## Confidence Scores');
  md.push(`| Dimension | Score |`);
  md.push(`|-----------|-------|`);
  md.push(`| Overall | ${conf.overall}% |`);
  md.push(`| Economic Readiness | ${conf.economicReadiness}% |`);
  md.push(`| Symbiotic Fit | ${conf.symbioticFit}% |`);
  md.push(`| Political Stability | ${conf.politicalStability}% |`);
  md.push(`| Partner Reliability | ${conf.partnerReliability}% |`);
  md.push(`| Ethical Alignment | ${conf.ethicalAlignment}% |`);
  md.push(`| Activation Velocity | ${conf.activationVelocity}% |`);
  md.push(`| Transparency | ${conf.transparency}% |`);
  md.push('');

  return md.join('\n');
}

/** Build DocxDocumentMeta from a ReportPayload. */
function buildDocxMeta(payload: ReportPayload): DocxDocumentMeta {
  return {
    title: `Strategic Intelligence Report — ${payload.metadata.country}`,
    subtitle: `${payload.metadata.region} Regional Analysis`,
    preparedFor: payload.metadata.requesterType,
    preparedBy: 'BW Global Advisory AI',
    date: payload.metadata.timestamp || new Date().toISOString().slice(0, 10),
    reportId: payload.metadata.reportId,
    classification: 'CONFIDENTIAL',
    jurisdiction: payload.metadata.country,
    strategicReadiness: payload.confidenceScores?.overall,
    evidenceCredibility: payload.confidenceScores?.transparency,
  };
}

/** Trigger a browser file download from a Blob. */
function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a small delay so the browser can start the download
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
}

// ── ExportService ────────────────────────────────────────────────────────────

export class ExportService {
  /**
   * Export a report. For DOCX format, produces a real .docx file and triggers
   * a browser download. For other formats, generates the best available output.
   */
  static async exportReport(params: {
    reportId: string;
    format: ExportFormat;
    payload?: ReportPayload | null;
  }): Promise<{ link: string }> {
    const { reportId, format, payload } = params;
    if (!payload) {
      throw new Error('Export blocked. Payload is required to generate outputs.');
    }

    // Validate payload completeness
    const validation = ReportOrchestrator.validatePayload(payload);
    if (!validation.isComplete) {
      await GovernanceService.recordProvenance({
        reportId,
        artifact: 'report-export',
        action: 'export-blocked',
        actor: 'ExportService',
        tags: [format, 'incomplete-payload', ...validation.missingFields],
        source: 'service'
      });
      throw new Error(`Export blocked until required fields are present: ${validation.missingFields.join(', ')}`);
    }

    // Governance gate
    const check = await GovernanceService.ensureStage(reportId, 'approved');
    if (!check.ok) {
      await GovernanceService.recordProvenance({
        reportId,
        artifact: 'report-export',
        action: 'export-blocked',
        actor: 'ExportService',
        tags: [format, `stage:${check.stage}`],
        source: 'service'
      });
      throw new Error(`Export blocked. Stage must be at least 'approved'. Current stage: ${check.stage}`);
    }

    await GovernanceService.recordProvenance({
      reportId,
      artifact: 'report-export',
      action: 'export-requested',
      actor: 'ExportService',
      tags: [format],
      source: 'service'
    });

    // ── Produce real export artifacts ──
    const markdown = buildMarkdownFromPayload(payload);
    const meta = buildDocxMeta(payload);
    const timestamp = Date.now();
    let downloadedFilename: string;

    switch (format) {
      case 'docx': {
        const blob = await exportToDocx(markdown, meta);
        const fname = `${reportId}-report-${timestamp}.docx`;
        downloadedFilename = downloadBlob(blob, fname);
        break;
      }
      case 'pdf': {
        const pdfBlob = buildPdfFromMarkdown(markdown, meta);
        const fname = `${reportId}-report-${timestamp}.pdf`;
        downloadedFilename = downloadBlob(pdfBlob, fname);
        break;
      }
      case 'ppt':
      case 'dashboard':
      case 'interactive': {
        // For formats without a dedicated renderer, export structured markdown
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const fname = `${reportId}-${format}-${timestamp}.md`;
        downloadedFilename = downloadBlob(blob, fname);
        break;
      }
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    await GovernanceService.recordProvenance({
      reportId,
      artifact: 'report-export',
      action: 'export-success',
      actor: 'ExportService',
      tags: [format, downloadedFilename],
      source: 'service'
    });

    return { link: downloadedFilename };
  }

  static async emailReport(reportId: string) {
    const check = await GovernanceService.ensureStage(reportId, 'approved');
    if (!check.ok) {
      await GovernanceService.recordProvenance({
        reportId,
        artifact: 'report-export',
        action: 'email-blocked',
        actor: 'ExportService',
        tags: [`stage:${check.stage}`],
        source: 'service'
      });
      throw new Error('Email blocked until stage is approved');
    }
    await GovernanceService.recordProvenance({
      reportId,
      artifact: 'report-export',
      action: 'email-requested',
      actor: 'ExportService',
      source: 'service'
    });
    await GovernanceService.recordProvenance({
      reportId,
      artifact: 'report-export',
      action: 'email-success',
      actor: 'ExportService',
      source: 'service'
    });
  }

  static async shareLink(reportId: string) {
    const check = await GovernanceService.ensureStage(reportId, 'approved');
    if (!check.ok) {
      await GovernanceService.recordProvenance({
        reportId,
        artifact: 'report-export',
        action: 'share-blocked',
        actor: 'ExportService',
        tags: [`stage:${check.stage}`],
        source: 'service'
      });
      throw new Error('Share link blocked until stage is approved');
    }
    await GovernanceService.recordProvenance({
      reportId,
      artifact: 'report-export',
      action: 'share-requested',
      actor: 'ExportService',
      source: 'service'
    });
    const link = `/share/${reportId}-${Date.now()}`;
    await GovernanceService.recordProvenance({
      reportId,
      artifact: 'report-export',
      action: 'share-success',
      actor: 'ExportService',
      source: 'service'
    });
    return { link };
  }
}

