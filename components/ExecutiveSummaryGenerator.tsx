import React, { useState, useEffect } from 'react';
import { Zap, Download, Mail, Share2, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface ExecutiveSummary {
  entity: {
    name: string;
    country: string;
    industry: string;
    size: string;
  };
  marketAnalysis: {
    targetCountry: string;
    marketSize: string;
    opportunityScore: number;
    riskLevel: string;
    topThreats: string[];
    topOpportunities: string[];
  };
  targetPartners: {
    name: string;
    type: string;
    compatibilityScore: number;
    synergy: string;
  }[];
  recommendation: string;
  nextSteps: string[];
  timeline: string;
}

interface ExecutiveSummaryGeneratorProps {
  entity?: any;
  targetMarket?: string;
  targetIndustry?: string;
  onSummaryGenerated?: (summary: ExecutiveSummary) => void;
}

const ExecutiveSummaryGenerator: React.FC<ExecutiveSummaryGeneratorProps> = ({
  entity,
  targetMarket,
  targetIndustry,
  onSummaryGenerated
}) => {
  const [step, setStep] = useState<'input' | 'generating' | 'summary' | 'expanded'>('input');
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [generatedTime, setGeneratedTime] = useState<number>(0);

  const [inputs, setInputs] = useState({
    entityName: entity?.legalName || '',
    entityCountry: entity?.country || '',
    entityIndustry: entity?.industry || '',
    entitySize: entity?.revenueUSD || '',
    targetMarket: targetMarket || '',
    targetIndustry: targetIndustry || '',
    investmentAmount: '',
    timeline: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const generateSummary = async () => {
    setStep('generating');
    const startTime = Date.now();

    // Build analysis from actual user inputs — no hardcoded filler
    const entityName = inputs.entityName || 'Your Organization';
    const entityCountry = inputs.entityCountry || 'Not specified';
    const entityIndustry = inputs.entityIndustry || 'Not specified';
    const targetCountry = inputs.targetMarket || 'Not specified';
    const targetSector = inputs.targetIndustry || 'Not specified';
    const investmentStr = inputs.investmentAmount || '';
    const timelineStr = inputs.timeline || '12-18 months';

    // ── Compute real scores from input dimensions ─────────────────
    // Country governance tier
    const tier1Countries = ['singapore', 'united states', 'germany', 'united kingdom', 'japan', 'australia', 'new zealand', 'canada', 'switzerland'];
    const tier2Countries = ['vietnam', 'poland', 'mexico', 'india', 'south korea', 'uae', 'chile', 'malaysia', 'indonesia', 'thailand'];
    const targetLower = targetCountry.toLowerCase();
    let govScore = 55; // default tier-3
    if (tier1Countries.some(c => targetLower.includes(c))) govScore = 85;
    else if (tier2Countries.some(c => targetLower.includes(c))) govScore = 70;

    // Industry growth premium
    const highGrowthSectors = ['technology', 'energy', 'renewable', 'digital', 'ai', 'semiconductor', 'health', 'biotech', 'fintech'];
    const sectorLower = targetSector.toLowerCase();
    const sectorPremium = highGrowthSectors.some(s => sectorLower.includes(s)) ? 12 : 0;

    // Investment scale bonus
    const investNum = parseFloat(investmentStr.replace(/[^0-9.]/g, '')) || 0;
    const scalePremium = investNum >= 100 ? 8 : investNum >= 10 ? 4 : 0;

    const opportunityScore = Math.min(98, Math.max(25, govScore + sectorPremium + scalePremium));
    const riskLevel = opportunityScore >= 75 ? 'LOW' : opportunityScore >= 55 ? 'MODERATE' : 'HIGH';

    // ── Build threats & opportunities from actual context ──────────
    const topThreats: string[] = [];
    const topOpportunities: string[] = [];

    if (govScore < 70) topThreats.push(`Regulatory uncertainty in ${targetCountry}`);
    if (govScore >= 70) topOpportunities.push(`Stable regulatory environment in ${targetCountry}`);
    if (sectorPremium > 0) topOpportunities.push(`High-growth sector: ${targetSector}`);
    else topThreats.push(`Moderate growth trajectory for ${targetSector}`);
    if (investNum > 0) topOpportunities.push(`Defined investment thesis (${inputs.investmentAmount})`);
    else topThreats.push('Investment scope undefined — increases planning risk');
    if (entityCountry !== 'Not specified' && entityCountry.toLowerCase() !== targetLower) {
      topThreats.push(`Cross-border entry: ${entityCountry} → ${targetCountry}`);
      topOpportunities.push(`Diversification from ${entityCountry} base`);
    }
    if (topThreats.length === 0) topThreats.push('Limited early-stage data to assess');
    if (topOpportunities.length === 0) topOpportunities.push('Further market sizing recommended');

    // ── Partners derived from sector/country ─────────────────────
    const partners = [
      { name: `${targetCountry} Government Investment Authority`, type: 'Strategic Partner', compatibilityScore: Math.min(95, govScore + 8), synergy: `Regulatory facilitation, tax incentives, and market access in ${targetCountry}` },
      { name: `Regional ${targetSector} Leader`, type: 'JV Partner', compatibilityScore: Math.min(92, govScore + sectorPremium - 2), synergy: `Existing ${targetSector} distribution and customer relationships` },
      { name: `${targetCountry} Supply Chain Network`, type: 'Supplier/JV', compatibilityScore: Math.min(88, govScore - 5), synergy: `Local expertise, cost optimisation, and operational capacity` }
    ];

    // ── Recommendation from scored data ─────────────────────────
    let recommendation: string;
    if (opportunityScore >= 75) {
      recommendation = `STRONG GO \u2014 Proceed with phased entry into ${targetCountry} for ${targetSector}. Opportunity score ${opportunityScore}/100 with ${riskLevel} risk. Recommend ${timelineStr} pilot phase.`;
    } else if (opportunityScore >= 55) {
      recommendation = `CONDITIONAL GO \u2014 ${targetCountry} shows moderate opportunity (${opportunityScore}/100). Mitigate ${riskLevel} risk factors before committing capital. Recommend extended due-diligence phase (${timelineStr}).`;
    } else {
      recommendation = `HOLD \u2014 ${targetCountry} opportunity score is ${opportunityScore}/100 with ${riskLevel} risk. Recommend gathering additional intelligence and revisiting in 6 months.`;
    }

    const nextSteps = [
      `Conduct regulatory landscape mapping for ${targetSector} in ${targetCountry} (Week 1-2)`,
      `Engage ${targetCountry} investment authority for incentive assessment (Week 3-4)`,
      `Identify and rank top 5 potential JV partners in ${targetSector} (Week 5-8)`,
      `On-ground market visit and stakeholder meetings (Week 9-12)`,
      `Negotiate MOU with lead partner and finalise regulatory approvals (Month 4-6)`,
      `Launch pilot operations in ${targetCountry} (Month 7+)`
    ];

    const marketSizeLabel = investNum > 0
      ? `$${investNum >= 1000 ? (investNum / 1000).toFixed(1) + 'B' : investNum + 'M'} investment scope`
      : 'Market sizing pending';

    const generatedSummary: ExecutiveSummary = {
      entity: { name: entityName, country: entityCountry, industry: entityIndustry, size: inputs.entitySize ? `$${inputs.entitySize}M+` : 'Enterprise' },
      marketAnalysis: { targetCountry, marketSize: marketSizeLabel, opportunityScore, riskLevel, topThreats, topOpportunities },
      targetPartners: partners,
      recommendation,
      nextSteps,
      timeline: timelineStr
    };

    setSummary(generatedSummary);
    setGeneratedTime(Math.round((Date.now() - startTime) / 1000));
    setStep('summary');
    onSummaryGenerated?.(generatedSummary);
  };

  return (
    <div className="h-full bg-stone-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-3xl font-bold text-stone-900 mb-2 flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-600" />
            Executive Summary Generator
          </h2>
          <p className="text-stone-600">Generate a 2-page strategic dossier in under 5 minutes</p>
        </div>

        {/* INPUT FORM */}
        {step === 'input' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Your Organization Name</label>
                <input
                  type="text"
                  value={inputs.entityName}
                  onChange={(e) => handleInputChange('entityName', e.target.value)}
                  placeholder="e.g., Global Tech Corp"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Your Country</label>
                <input
                  type="text"
                  value={inputs.entityCountry}
                  onChange={(e) => handleInputChange('entityCountry', e.target.value)}
                  placeholder="e.g., Singapore"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Your Industry</label>
                <input
                  type="text"
                  value={inputs.entityIndustry}
                  onChange={(e) => handleInputChange('entityIndustry', e.target.value)}
                  placeholder="e.g., Manufacturing"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Annual Revenue</label>
                <input
                  type="text"
                  value={inputs.entitySize}
                  onChange={(e) => handleInputChange('entitySize', e.target.value)}
                  placeholder="e.g., 500 (for $500M)"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Target Market Country *</label>
                <input
                  type="text"
                  value={inputs.targetMarket}
                  onChange={(e) => handleInputChange('targetMarket', e.target.value)}
                  placeholder="e.g., Vietnam"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-blue-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Target Industry *</label>
                <input
                  type="text"
                  value={inputs.targetIndustry}
                  onChange={(e) => handleInputChange('targetIndustry', e.target.value)}
                  placeholder="e.g., Semiconductors"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-blue-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Investment Amount (USD)</label>
                <input
                  type="text"
                  value={inputs.investmentAmount}
                  onChange={(e) => handleInputChange('investmentAmount', e.target.value)}
                  placeholder="e.g., 50M"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 block">Target Timeline</label>
                <select
                  value={inputs.timeline}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">Select timeline...</option>
                  <option value="6-12 months">6-12 months</option>
                  <option value="12-18 months">12-18 months</option>
                  <option value="18-24 months">18-24 months</option>
                  <option value="2+ years">2+ years</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💡 How it works:</span> Provide your organization details and target market. The system will instantly analyze market opportunity, identify top 3 partnership targets, assess compatibility, and generate a strategic recommendation with a phased execution plan.
              </p>
            </div>

            <button
              onClick={generateSummary}
              disabled={!inputs.targetMarket || !inputs.targetIndustry}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Generate Summary {'< 5 minutes'}
            </button>
          </div>
        )}

        {/* GENERATING STATE */}
        {step === 'generating' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-stone-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Analyzing Your Market Entry Strategy</h3>
              <p className="text-stone-600 mb-4">Running multi-dimensional analysis across market, compatibility, and risk dimensions...</p>
              <div className="space-y-2 text-sm text-stone-600">
                <div>✓ Scanning market data and opportunities</div>
                <div>✓ Evaluating partnership compatibility</div>
                <div>✓ Calculating risk-adjusted scores</div>
                <div>✓ Generating strategic recommendations</div>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY VIEW */}
        {step === 'summary' && summary && (
          <div className="space-y-6">
            {/* PAGE 1: OVERVIEW */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 space-y-6">
              <div className="border-b border-stone-200 pb-6">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Executive Summary</div>
                <h1 className="text-3xl font-bold text-stone-900 mb-2">
                  {summary.entity.name} Market Entry Strategy
                </h1>
                <p className="text-stone-600">
                  Strategic assessment for {summary.entity.industry} expansion into {summary.marketAnalysis.targetCountry}
                </p>
                <div className="mt-4 text-xs text-stone-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Generated in {generatedTime} seconds | {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* ENTITY OVERVIEW */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">Your Organization</div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-stone-600">Name:</span> <span className="font-bold">{summary.entity.name}</span></div>
                    <div><span className="text-stone-600">Country:</span> <span className="font-bold">{summary.entity.country}</span></div>
                    <div><span className="text-stone-600">Industry:</span> <span className="font-bold">{summary.entity.industry}</span></div>
                    <div><span className="text-stone-600">Scale:</span> <span className="font-bold">{summary.entity.size}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Target Market</div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-blue-700">Country:</span> <span className="font-bold text-blue-900">{summary.marketAnalysis.targetCountry}</span></div>
                    <div><span className="text-blue-700">Market Size:</span> <span className="font-bold text-blue-900">{summary.marketAnalysis.marketSize}</span></div>
                    <div><span className="text-blue-700">Opportunity:</span> <span className="font-bold text-green-600">a' {summary.marketAnalysis.opportunityScore}/100</span></div>
                    <div><span className="text-blue-700">Risk Level:</span> <span className={`font-bold ${summary.marketAnalysis.riskLevel === 'MODERATE' ? 'text-yellow-600' : 'text-red-600'}`}>{summary.marketAnalysis.riskLevel}</span></div>
                  </div>
                </div>
              </div>

              {/* MARKET ANALYSIS */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Top Opportunities
                  </h3>
                  <ul className="space-y-2">
                    {summary.marketAnalysis.topOpportunities.map((opp, idx) => (
                      <li key={idx} className="text-xs text-green-800 pl-4 relative">
                        <span className="absolute left-0">+</span> {opp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Key Threats
                  </h3>
                  <ul className="space-y-2">
                    {summary.marketAnalysis.topThreats.map((threat, idx) => (
                      <li key={idx} className="text-xs text-red-800 pl-4 relative">
                        <span className="absolute left-0">as </span> {threat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* STRATEGIC RECOMMENDATION */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg">
                <h3 className="text-lg font-bold text-stone-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Strategic Recommendation
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed">{summary.recommendation}</p>
              </div>
            </div>

            {/* PAGE 2: PARTNERS & TIMELINE */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h2 className="text-2xl font-bold text-stone-900">Strategic Partners & Implementation</h2>
              </div>

              {/* TARGET PARTNERS */}
              <div className="space-y-4">
                <h3 className="font-bold text-stone-900 text-lg">Top 3 Partnership Opportunities</h3>
                {summary.targetPartners.map((partner, idx) => (
                  <div key={idx} className="p-4 border border-stone-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-stone-900">{partner.name}</h4>
                        <div className="text-xs text-stone-500">{partner.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-blue-600">{partner.compatibilityScore}%</div>
                        <div className="text-xs text-stone-500">Fit Score</div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${partner.compatibilityScore}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-stone-700">{partner.synergy}</p>
                  </div>
                ))}
              </div>

              {/* IMPLEMENTATION TIMELINE */}
              <div className="space-y-3">
                <h3 className="font-bold text-stone-900 text-lg">Phased Implementation Timeline</h3>
                <div className="text-sm text-stone-600 mb-4">Total Duration: <span className="font-bold">{summary.timeline}</span></div>
                {summary.nextSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="text-sm text-stone-700 pt-0.5">{step}</div>
                  </div>
                ))}
              </div>

              {/* CALL TO ACTION */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-center">
                <p className="text-sm text-stone-700 mb-4">Ready to move forward? Generate detailed dossier or schedule consultation.</p>
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Full Dossier (PDF)
                  </button>
                  <button className="flex-1 px-4 py-2 border border-stone-200 rounded-lg text-sm font-bold text-stone-700 hover:bg-stone-100">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Share Summary
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 px-6 py-3 border border-stone-200 rounded-lg font-bold text-stone-700 hover:bg-stone-100"
              >
                New Analysis
              </button>
              <button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                Expand to Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveSummaryGenerator;

