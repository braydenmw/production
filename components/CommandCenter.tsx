import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Shield, Users, Zap, CheckCircle2, Scale, Building2, Globe, Mail, Phone, Briefcase, TrendingUp, FileCheck, GitBranch, X, Info } from 'lucide-react';
import DocumentModal, { type DocumentType } from './LegalDocuments';
import { UnifiedBWConsultant } from './UnifiedBWConsultant';
// OSINT search removed - using unified location research

// Command Center - Complete BWGA Landing Page

interface CommandCenterProps {
    onEnterPlatform?: (payload?: { query?: string; results?: Record<string, unknown>[] }) => void;
    onOpenGlobalLocationIntel?: () => void;
    onLocationResearched?: (data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        research: any;
        city: string;
        country: string;
    }) => void;
}

const CommandCenter: React.FC<CommandCenterProps> = ({ onEnterPlatform, onOpenGlobalLocationIntel: _onOpenGlobalLocationIntel, onLocationResearched: _onLocationResearched }) => {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [activeStep, setActiveStep] = useState<number | null>(null);
    const [showFormulas, setShowFormulas] = useState(false);
    const [_showCaseStudy, _setShowCaseStudy] = useState(false);
    const [showOutputDetails, setShowOutputDetails] = useState(false);
    const [showProtocolDetails, setShowProtocolDetails] = useState(false);
    const [showBlock2More, setShowBlock2More] = useState(false);
    const [showBlock3More, setShowBlock3More] = useState(false);
    const [showBlock4More, setShowBlock4More] = useState(false);
    const [showBlock5Popup, setShowBlock5Popup] = useState(false);
    const [showProofPopup, setShowProofPopup] = useState(false);
    const [activeWorkflowStage, setActiveWorkflowStage] = useState<'intake' | 'analysis' | 'output' | null>(null);
    const [showProtocolLetters, setShowProtocolLetters] = useState(false);
    const [showUnifiedSystemOverview, setShowUnifiedSystemOverview] = useState(false);
    const [unifiedActiveTab, setUnifiedActiveTab] = useState<'protocol' | 'documents' | 'letters' | 'proof'>('protocol');
    const [activeDocument, setActiveDocument] = useState<DocumentType>(null);
    const [_activeLayer, _setActiveLayer] = useState<number | null>(null);
    const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

    // Demo chat animation state
    const [demoChatStep, setDemoChatStep] = useState(0);
    const [demoTyping, setDemoTyping] = useState(false);
    const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const DEMO_MESSAGES = [
        { role: 'user' as const, text: "Head of strategy, Cairns Regional Development Authority. We want to attract a cold-chain logistics hub — developer has expressed interest. Need the investment case, critical risks, and who we should be engaging." },
        { role: 'system' as const, text: 'Jurisdiction: Australia — Queensland · Sector: Logistics / Cold-chain · Policy Pack: Asia-Pacific Advisory · Readiness: 42% → proceeding.' },
        { role: 'assistant' as const, text: "Cairns has a structurally strong case — airport freight capacity, Port expansion, and Queensland's agriculture corridor create real demand pull.\n\n3 critical flags: counterparty integrity (CIS verification required), competing priority risk (FNQ infrastructure stall history), workforce gap (no local cold-chain talent pool).\n\nEngage now: NAIF (likely funder), Woolworths/Coles (anchor tenant demand validation), James Cook University (workforce pipeline).\n\nIs the developer bringing equity or seeking public co-investment?" },
        { role: 'system' as const, text: 'Case file updated · Readiness: 61% · 5 documents queued: Investment Prospectus, Due Diligence Framework, NAIF Brief, Stakeholder Plan, Risk Register.' },
        { role: 'user' as const, text: "Public-private structure. NAIF deadline is 8 weeks. We need a board-ready package." },
        { role: 'assistant' as const, text: "Eight weeks is workable. Four tracks in parallel: financial model (CAPEX/OPEX, IRR for both tranches), counterparty diligence (CIS + SPV governance), anchor tenant LOI (NAIF requires private demand evidence), First Nations early engagement (mandatory for FNQ).\n\nGenerating: NAIF Submission Brief, Investment Prospectus (board version), Risk Register, Stakeholder Engagement Plan, LOI template.\n\nStart with NAIF brief and risk register, or financial model framework first?" },
    ];

    useEffect(() => {
        if (demoChatStep >= DEMO_MESSAGES.length) return;
        const isAssistant = DEMO_MESSAGES[demoChatStep]?.role === 'assistant' || DEMO_MESSAGES[demoChatStep]?.role === 'system';
        setDemoTyping(isAssistant);
        const delay = isAssistant ? 1800 : 900;
        demoTimerRef.current = setTimeout(() => {
            setDemoTyping(false);
            setDemoChatStep((s) => s + 1);
        }, delay);
        return () => { if (demoTimerRef.current) clearTimeout(demoTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [demoChatStep]);

    // Global Location Intelligence state - LIVE SEARCH
    const [_locationQuery, _setLocationQuery] = useState('');
    const [_isResearchingLocation, _setIsResearchingLocation] = useState(false);
    const [_researchProgress, _setResearchProgress] = useState<null>(null);
    const [_locationResult, _setLocationResult] = useState<{ city: string; country: string; lat: number; lon: number } | null>(null);
    const [_comparisonCities, _setComparisonCities] = useState<Array<{ city: string; country: string; reason: string; keyMetric?: string }>>([]);
    const [_researchSummary, _setResearchSummary] = useState<string>('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [_liveProfile, _setLiveProfile] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [_researchResult, _setResearchResult] = useState<any>(null);
    const [_searchError, _setSearchError] = useState<string | null>(null);

    // Handle location search - SIMPLIFIED Gemini-first approach

    const tenStepProtocol = [
        { step: 1, title: "Opportunity Definition", description: "Project name, type, sector, target region, investment scale, and timeline. The foundation everything else builds on.", details: ["Project name and type", "Sector and industry classification", "Target region and jurisdiction", "Investment scale and range", "Project timeline and phasing", "Primary opportunity thesis"] },
        { step: 2, title: "Strategic Alignment", description: "Alignment with national and regional policy, SDG mapping, government priority status, and bilateral agreements.", details: ["National and regional policy alignment", "SDG mapping and development goals", "Government priority status", "Bilateral and multilateral agreements", "Strategic fit with host jurisdiction", "Policy environment assessment"] },
        { step: 3, title: "Market Analysis", description: "Demand drivers, supply gaps, competitive landscape, pricing dynamics, and growth trajectory.", details: ["Demand drivers and market size", "Supply gap identification", "Competitive landscape analysis", "Pricing dynamics and benchmarks", "Growth trajectory and projections", "Market entry strategy"], gliEnabled: true, gliNote: "Live intelligence enriches market sizing with GDP, trade flows, and sector benchmarks" },
        { step: 4, title: "Financial Structure", description: "CAPEX, OPEX, revenue model, funding mix, IRR targets, payback expectations, and currency exposure.", details: ["CAPEX and OPEX breakdown", "Revenue model and streams", "Funding mix and sources", "IRR targets and returns", "Payback period expectations", "Currency exposure and hedging"], gliEnabled: true, gliNote: "Tax incentive data, economic zone structures, and cost indicators inform financial modelling" },
        { step: 5, title: "Risk Assessment", description: "Political, regulatory, operational, financial, environmental, and social risks with probability and impact scoring.", details: ["Political and regulatory risk", "Operational risk factors", "Financial and currency risk", "Environmental and social risk", "Probability and impact scoring", "Risk matrix and mitigations"], gliEnabled: true, gliNote: "Political, economic, natural, and regulatory risk scores sourced from live intelligence" },
        { step: 6, title: "Stakeholder Mapping", description: "Government bodies, investors, partners, communities, and regulators — mapped by influence, interest, and engagement strategy.", details: ["Government bodies and ministries", "Investor and capital partner profiles", "Delivery and implementation partners", "Community and civil society", "Regulators and compliance bodies", "Influence, interest, and engagement matrix"], gliEnabled: true, gliNote: "Major employers, foreign company presence, and key government contacts surfaced from live data" },
        { step: 7, title: "Implementation Pathway", description: "Phasing, milestones, dependencies, critical path, resource requirements, and decision gates.", details: ["Project phases and sequencing", "Milestone definitions and timelines", "Dependency mapping", "Critical path analysis", "Resource requirements per phase", "Go/no-go decision gates"], gliEnabled: true, gliNote: "Entry timeline guidance and infrastructure readiness indicators from live intelligence" },
        { step: 8, title: "Compliance Requirements", description: "Permits, licenses, environmental approvals, sector-specific regulations, and international standards.", details: ["Permits and licensing requirements", "Environmental approvals and assessments", "Sector-specific regulatory obligations", "International standards compliance", "Anti-bribery and sanctions screening", "GDPR and data handling where applicable"], gliEnabled: true, gliNote: "Jurisdiction-specific regulatory frameworks and compliance risk flags applied automatically" },
        { step: 9, title: "Partnership Terms", description: "Equity split, governance structure, decision rights, exit mechanisms, IP ownership, and non-compete clauses.", details: ["Equity split and ownership structure", "Governance and decision-making rights", "Exit mechanisms and triggers", "IP ownership and licensing", "Non-compete and exclusivity provisions", "Dispute resolution framework"] },
        { step: 10, title: "Success Metrics", description: "KPIs, monitoring framework, reporting requirements, adjustment triggers, and exit criteria.", details: ["KPI definition and measurement", "Monitoring and evaluation framework", "Reporting cadence and format", "Adjustment triggers and thresholds", "Exit criteria and conditions", "Final readiness and go/no-go score"], gliEnabled: true, gliNote: "Composite readiness scores, comparison baselines, and data quality confidence metrics" }
    ];


    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                            BW
                        </div>
                        <span className="text-lg font-light tracking-wide hidden sm:block text-slate-800">BWGA Intelligence</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-6 text-sm text-slate-600 font-medium">
                        <button onClick={() => scrollToSection('mission')} className="hover:text-blue-600 transition-colors">Mission</button>
                        <button onClick={() => scrollToSection('platform')} className="hover:text-blue-600 transition-colors">The Platform</button>
                        <button onClick={() => scrollToSection('brain')} className="hover:text-blue-600 transition-colors">The Brain</button>
                        <button onClick={() => { setUnifiedActiveTab('proof'); setShowUnifiedSystemOverview(true); }} className="hover:text-blue-600 transition-colors">Proof</button>
                        <button onClick={() => scrollToSection('partnerships')} className="hover:text-blue-600 transition-colors">Partnerships</button>
                    </div>
                    
                </div>
            </nav>



            {/* OUR MISSION  -  Header with photo banner background */}
            <section id="mission" className="relative pt-36 pb-20 px-4 overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&h=1080&fit=crop&q=80" 
                    alt="Regional landscape" 
                    className="absolute inset-0 w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80" />
                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-tight mb-8 text-white">
                        Strong nations are built<br />on strong regions.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-4">
                        Every nation depends on its regions &mdash; for food, resources, industry, and resilience. But for too long, opportunity has been decided by proximity to capital, not by fundamentals.
                    </p>
                    <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        The capability is there. The potential is real. What has been missing are the tools. We built those tools.
                    </p>
                </div>
            </section>

            {/* OUR ORIGIN */}
            <section className="py-10 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-light mb-6 text-slate-900">The Story of BWGA</h2>
                    <div className="grid md:grid-cols-2 gap-x-8 text-base text-slate-700 leading-relaxed text-justify mb-8">
                        <div className="space-y-3">
                            <p>
                                BWGA wasn&rsquo;t founded in a glass skyscraper in New York or London. It was born on the edge of the developing world, in a small coastal city where the gap between potential and opportunity is painfully clear.
                            </p>
                            <p>
                                <strong>BW Global Advisory (BWGA)</strong> is an advisory practice built from firsthand experience in regional communities &mdash; places that hold real economic potential but lack the tools, connections, and institutional visibility to compete for global investment on equal footing.
                            </p>
                            <p>
                                We watched regional leaders &mdash; mayors, entrepreneurs, councils &mdash; work tirelessly to attract investment. They had the vision, the drive, the raw assets.
                            </p>
                            <p>
                                From that observation came the question: what if you could build a system that internalised all of that methodology &mdash; 60+ years of documented practice across 150 countries &mdash; and made it available to anyone, anywhere, instantly?
                            </p>
                        </div>
                        <div className="space-y-3 mt-3 md:mt-0">
                            <p>
                                The practice exists because of a simple observation: <strong>every &ldquo;new idea&rdquo; is old somewhere.</strong> The 1963 Philippine Integrated Socioeconomic Plan, the 1978 Region 7 Five-Year Development Plan, Special Economic Zones across 80+ countries, PPP frameworks across 150+ nations &mdash; they all follow the same methodology. Growth poles. Investment incentives. Sectoral planning. Infrastructure corridors. The names update. The practice persists. <strong>The past is the solution library.</strong>
                            </p>
                            <p>
                                <strong>BWGA Ai is the answer.</strong> It is the technology arm of BW Global Advisory. Not a chatbot. Not a search engine. Not a lookup table. It is a complete digital boardroom &mdash; a system that reasons through investment, trade, and development problems using the same depth of analysis that previously required a team of senior consultants, weeks of research, and hundreds of thousands of dollars.
                            </p>
                        </div>
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed text-justify mb-8">
                        So we built the bridge. BWGA Ai takes what already worked &mdash; in Shenzhen&rsquo;s special economic zones, in Penang&rsquo;s electronics corridor, in Medell&iacute;n&rsquo;s urban reinvention, in Rwanda&rsquo;s governance transformation, in Estonia&rsquo;s digital-first state &mdash; and distils it into a system that any regional council, any investment agency, any government body can use today. Not by copying those places, but by extracting the transferable principles: the sequencing, the stakeholder architecture, the policy triggers, the conditions that let a place transform. The knowledge has always existed. The problem was that it sat locked inside decades of reports, across continents, in languages and frameworks most practitioners never see. This system makes it accessible, synthesised, and actionable &mdash; from first question to boardroom-ready output.
                    </p>

                    {/* Personal Story  -  Brayden Walls */}
                    <div className="relative rounded-sm overflow-hidden mb-8 shadow-lg border-2 border-slate-300">
                        <img 
                            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop&q=80" 
                            alt="Regional landscape" 
                            className="absolute inset-0 w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/75 to-slate-800/85" />
                        <div className="relative z-10 p-8 md:p-10">
                            <h3 className="text-2xl font-semibold text-white mb-6">Who I am &mdash; the founder and sole developer</h3>
                            
                            <p className="text-base text-slate-200 leading-relaxed text-justify mb-4">
                                Hey everyone, I&rsquo;m Brayden Walls, the developer behind <strong className="text-white">BWGA Ai</strong>, and I&rsquo;m thrilled to finally share this with the world. For the first time, I&rsquo;m lifting the curtain on what we&rsquo;ve built&mdash;a groundbreaking neuro-symbolic intelligence system that&rsquo;s not just another AI tool, but a complete rethinking of how machines can reason like humans.
                            </p>
                            <p className="text-base text-slate-200 leading-relaxed text-justify mb-4">
                                For more than 16 months, I&rsquo;ve been living, researching, and building in a place that inspired everything you see here &mdash; the Philippines. Not in a lab. Not in a corporate office. On the ground, in the communities where economic potential is enormous but the tools to unlock it simply don&rsquo;t exist.
                            </p>

                            <p className="text-base text-slate-200 leading-relaxed text-justify mb-4">
                                I watched the same pattern repeat everywhere: ambitious businesses exploring new frontiers with incomplete information, regional governments eager for partnerships but unable to translate their advantages into investor language, unproductive meetings built on mismatched expectations. Places like Mindanao, regional Australia, communities across the Pacific &mdash; they all wanted the same thing: to be seen, to be understood, to have a fair shot.
                            </p>

                            <p className="text-base text-slate-200 leading-relaxed text-justify mb-6">
                                So I stopped waiting for someone else to build it. I taught myself to code, studied every economic development framework I could find, and spent over a year turning that knowledge into software. What came out the other side isn&rsquo;t a chatbot or a dashboard &mdash; it&rsquo;s a complete reasoning system. One that thinks through problems the way a team of senior consultants would, but faster, cheaper, and available to anyone. What you&rsquo;re about to see below is what I built, how it works, and why nothing else like it exists.
                            </p>

                            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-sm p-6">
                                <p className="text-lg text-white leading-relaxed italic mb-3">
                                    &ldquo;Every &lsquo;new idea&rsquo; is old somewhere. The child learns what the parent already knows. The past isn&rsquo;t historical interest. The past is the solution library.&rdquo;
                                </p>
                                <p className="text-slate-300 text-sm font-medium">&mdash; Brayden Walls, Founder &amp; Sole Developer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TIER 1: HERO HOOK — The Trust Gap (Full-Width Narrative)
            ═══════════════════════════════════════════════════════════════ */}
            <section id="platform" className="relative py-12 px-4 bg-white overflow-hidden">
                {/* Subtle background texture */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-transparent to-transparent" />
                <div className="relative max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-light text-center leading-tight mb-4 text-slate-900">
                        BW Nexus AI &mdash; An Institutional Intelligence Operating System
                    </h2>
                    <p className="text-center text-lg md:text-xl font-light mb-12 max-w-3xl mx-auto text-slate-600">
                        I built this because the tools that exist weren&rsquo;t built for the problems I kept running into. This is a <span className="text-blue-600 font-normal">full operating system for strategic decisions</span> &mdash; part research analyst, part debate room, part document engine. You describe your situation. It builds the case. You walk away with something defensible.
                    </p>
                    <div id="brain" className="relative -top-28" />
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                        What Is BW Nexus AI &mdash; and What Is the BW Consultant?
                    </h2>
                    <div className="space-y-4 mb-10">
                        <p className="text-lg text-slate-700 leading-relaxed text-justify">
                            BW Nexus AI is the technology platform of BW Global Advisory. Think of it as a full intelligence operating system &mdash; not a tool you open, paste something into, and get a paragraph back. It is a system you <em>work through</em>. You bring your situation. It brings the analysis.
                        </p>
                        <p className="text-lg text-slate-700 leading-relaxed text-justify">
                            The <strong className="text-slate-900">BW Consultant</strong> is the front door to that system. You have a conversation with it &mdash; describe what you&rsquo;re dealing with, what you&rsquo;re trying to achieve, where you&rsquo;re operating. As you type, the system is already building your case. It detects signals, identifies gaps, models your jurisdiction, and decides which questions matter most. By the time you&rsquo;re mid-conversation, a full institutional case study is forming behind the scenes.
                        </p>
                        <p className="text-lg text-slate-700 leading-relaxed text-justify">
                            When the case is ready, the system recommends exactly which reports and letters your situation requires &mdash; and generates them with full traceability to method, evidence, and scoring logic. <strong className="text-slate-900">That is what makes it an OS, not a chatbot.</strong> Every response is grounded in deterministic analysis. Every document produced is audit-committee defensible.
                        </p>
                    </div>

                    {/* Comparison — Photo + Script Cards (matches How It Thinks pattern) */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Standard AI Card */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop&q=80" alt="Standard AI limitations" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-slate-900/20" />
                                <div className="absolute bottom-4 left-5 right-5">
                                    <h3 className="text-lg font-bold text-white">Standard AI</h3>
                                    <p className="text-[11px] text-slate-300">Probabilistic &bull; Opaque &bull; Inconsistent</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Ask ChatGPT the same question twice and you will often get different answers. Ask it about a specific regulation and it may cite a rule that doesn&rsquo;t exist. Ask it to score a partnership opportunity and it will write something plausible &mdash; not something verifiable. In low-stakes environments, this is fine. When a government budget, a board decision, or a cross-border investment depends on your analysis, plausible is not good enough.
                                </p>
                            </div>
                        </div>

                        {/* BW Ai Card */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=400&fit=crop&q=80" alt="BW Ai intelligence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-blue-900/20" />
                                <div className="absolute bottom-4 left-5 right-5">
                                    <h3 className="text-lg font-bold text-white">BW Ai</h3>
                                    <p className="text-[11px] text-blue-200">Deterministic &bull; Auditable &bull; Defensible</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    BW Nexus AI runs your situation through 46+ proprietary formulas &mdash; not estimates, not generated text, but calculated scores with traceable inputs. Every output comes with a method trail: what was used, how confident it is, and which assumptions were made. Run it again tomorrow with the same inputs and you get the same answer. That is the standard required for committee-ready, board-defensible strategic outputs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════════
                TIER 1 CONTINUED: The Origin (Full-Width Story Block with Image)
            ═══════════════════════════════════════════════════════════════ */}

            <section className="relative py-16 px-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-20"></div>
                <div className="relative max-w-4xl mx-auto space-y-6">
                    {/* Removed empty photo/banner above script as requested */}
                    <p className="text-sm font-bold text-blue-400 uppercase tracking-wider">Why I Built This</p>
                    <p className="text-base text-slate-300 leading-relaxed text-justify">
                        <strong className="text-white">A government minister in the Philippines gave me 30 minutes.</strong> I had no analyst team. No institutional database. No two-week turnaround. I had a laptop and a problem that needed an answer that could survive a committee room. That gap &mdash; between what the situation demanded and what any tool could produce &mdash; is why this exists.
                    </p>
                    <div className="bg-blue-950/50 border-l-4 border-r-4 border-blue-400 px-6 py-5 rounded-sm backdrop-blur-sm">
                        <p className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-4">The Translation Problem Nobody Solved</p>
                        <p className="text-base text-slate-200 leading-relaxed text-justify mb-4">
                            The real decisions &mdash; the ones involving regional budgets, infrastructure concessions, cross-border investment, sovereign credit risk &mdash; have always required institutional-grade analysis. That analysis has always been gatekept by cost, by connections, by access to networks that most people don&rsquo;t have. A brilliant founder in Cebu, a regional planning office in Bangladesh, a mid-market bank entering a new corridor &mdash; they face the same information gap. <strong className="text-white">That&rsquo;s the gap this system closes.</strong>
                        </p>
                        <p className="text-base text-slate-200 leading-relaxed text-justify">
                            I built BW Nexus AI to be a <strong className="text-white">full institutional translation layer</strong> &mdash; the kind of system that takes your real-world situation and converts it into evidence, scoring, and defensible conclusions without requiring a consultant retainer, a six-week process, or access to a Morgan Stanley analyst. You bring the problem. The system does the rest. <strong className="text-white">Below is exactly how.</strong>
                        </p>
                    </div>
                </div>
            </section>
            {/* ═══════════════════════════════════════════════════════════════
                TIER 2: THREE FEATURE CARDS — How It Thinks (Marketing Speak)
            ═══════════════════════════════════════════════════════════════ */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">How It &ldquo;Thinks&rdquo;</h2>
                    </div>

                    {/* Feature Cards with Images */}
                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                        {/* Card 1: NSIL */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80" alt="NSIL Core Architecture" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">01</span>
                                    <h3 className="text-lg font-bold text-white">NSIL &mdash; The Core Intelligence Layer</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Think of it like a quality-control line in a factory &mdash; but for decisions. Your input enters at one end. Before any output is produced, it passes through 10 distinct layers: intake validation, case classification, evidence scoring, adversarial debate, formula execution, Monte Carlo stress testing, neuroscience-model processing, governance gating, partner ranking, and output tracing. <strong>Nothing is skipped. Every layer must pass before the next fires.</strong> The NSIL Agentic Runtime streams this process live &mdash; you watch the system build your case in real time.
                                </p>
                            </div>
                        </div>

                        {/* Card 2: Human Cognition Engine */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop&q=80" alt="Human Cognition Engine" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">02</span>
                                    <h3 className="text-lg font-bold text-white">Human Cognition Engine</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Most systems model the world. This one also models the people in it. <strong>Seven published neuroscience frameworks</strong> &mdash; Friston&rsquo;s free energy principle, prospect theory, global workspace theory, Wilson-Cowan neural fields, and others &mdash; run live on your data to simulate how decision-makers will allocate attention, weigh risk, and respond under pressure. In plain terms: the system doesn&rsquo;t just tell you what&rsquo;s true &mdash; it tells you what will land, what will be resisted, and what emotional dynamics are shaping the room.
                                </p>
                            </div>
                        </div>

                        {/* Card 3: Bayesian Debate Engine */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1573167243872-43c6433b9d40?w=800&h=400&fit=crop&q=80" alt="Adversarial Debate" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">03</span>
                                    <h3 className="text-lg font-bold text-white">Bayesian Debate Engine</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Before any conclusion reaches you, <strong>five internal voices argue over it</strong>. The Skeptic looks for deal-killers. The Advocate finds the upside. The Regulator checks legality. The Accountant tests cash flow. The Operator asks whether it can actually be executed. Disagreements are preserved &mdash; not averaged out. The Skeptic carries 1.2&times; weight, because in institutional decisions, bad news costs more than good news earns. What you receive is a conclusion that has already survived a debate room.
                                </p>
                            </div>
                        </div>

                        {/* Card 4: Agentic Intelligence */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80" alt="Agentic Intelligence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">04</span>
                                    <h3 className="text-lg font-bold text-white">Autonomous &amp; Agentic Engines</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    The system doesn&rsquo;t wait for you to ask the right question. <strong>Eight autonomous engines</strong> run continuously in the background &mdash; scanning for partner matches, mapping root causes to interventions through causal graphs, ingesting live policy and trade signals, and flagging governance or ethical risks before any output is released. The <strong>Planner/Executor runtime</strong> streams this process as you work: you can watch tasks queue, run, and complete in real time. The Regional Development Kernel covers every region on Earth across 8 domain packs: water, energy, logistics, housing, health, digital infrastructure, workforce, and climate.
                                </p>
                            </div>
                        </div>

                        {/* Card 5: Reflexive Intelligence */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80" alt="Reflexive Intelligence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">05</span>
                                    <h3 className="text-lg font-bold text-white">Reflexive Intelligence</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Most systems analyze the problem. This one also analyzes <strong>how you&rsquo;re thinking about the problem</strong>. Seven reflexive engines detect your recurring priorities, surface hidden assets you haven&rsquo;t mentioned, identify the unspoken barriers shaping your constraints, and reframe conclusions for every audience &mdash; government, investor, board, or community. A <strong>five-gate Case Study Method Layer</strong> checks boundary clarity, objective quality, evidence sufficiency, rival explanations, and implementation feasibility. Nothing generates until the method is satisfied.
                                </p>
                            </div>
                        </div>

                        {/* Card 6: Formula & Scoring Architecture */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80" alt="Formula Architecture" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">06</span>
                                    <h3 className="text-lg font-bold text-white">46 Proprietary Formulas</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Every number you see was calculated &mdash; not generated. <strong>46+ proprietary formulas</strong> cover partner fit, delivery reliability, policy alignment, local legitimacy, financial viability, risk exposure, and governance readiness. A DAG scheduler manages formula dependencies so the execution order is always correct. Monte Carlo simulation stress-tests every result across 5,000 scenarios. Governance readiness gates outputs at 75%+. Every score traces back to its exact formula, exact inputs, and exact weights. Run it again tomorrow, same data, same answer.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Final caption */}
                    <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl p-6 md:p-8 text-center">
                        <p className="text-base md:text-lg text-white/90 leading-relaxed text-justify max-w-4xl mx-auto">
                            One conversation with the BW Consultant becomes a structured case study. That case study drives formula scoring, adversarial debate, partner ranking, and document generation. Every response streams live. Every output carries a confidence score, a provenance trail, and a compliance check for your jurisdiction. The result &mdash; a board memo, a government submission, a due-diligence brief, a partner letter &mdash; is fully traceable from your first sentence to the final page. <strong className="text-white">That is not a chatbot. That is an institutional intelligence operating system.</strong>
                        </p>
                        <button onClick={() => setShowFormulas(true)} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold transition-colors mt-4">
                            <GitBranch size={16} /> The Intelligence Architecture: How The System Works &rarr;
                        </button>
                    </div>

                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                INTERSTITIAL CTA — Full-Width Break
            ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-16 px-4 overflow-hidden">
                <div className="absolute inset-0">
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&h=600&fit=crop&q=80" alt="Strategic Intelligence" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 to-blue-900/80" />
                </div>
                <div className="relative max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">&ldquo;You just describe your situation. The system figures out the rest.&rdquo;</h2>
                    <p className="text-lg text-slate-300 leading-relaxed text-justify max-w-3xl mx-auto">
                        You don&rsquo;t need to know which formula applies, which jurisdiction pack to select, or which document your situation requires. The <strong className="text-white">BW Consultant</strong> learns your case as the conversation develops. It detects signals while you type, builds the case model in the background, checks compliance for your jurisdiction, and tells you exactly what to generate when you&rsquo;re ready. The system is the analyst. You are the decision-maker.
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TIER 3: SUPPORTING INFORMATION — Outputs, Assurance, Factory
            ═══════════════════════════════════════════════════════════════ */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">

                    {/* What You Walk Away With — Photo + Script Card */}
                    <div className="mb-16">
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-56 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=500&fit=crop&q=80" alt="Strategic deliverables" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                <div className="absolute bottom-5 left-6">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">What You Walk Away With</h2>
                                </div>
                            </div>
                            <div className="p-6 md:p-8">
                                <p className="text-base text-slate-700 leading-relaxed text-justify mb-6">
                                    You leave with a <strong>complete operating position</strong>—not a pitch deck requiring interpretation, but a defensible strategy with pre-mapped objection responses, stakeholder-specific messaging, and sequenced next steps. BW Ai compresses what typically requires <strong>six months of advisory engagement</strong> into outputs ready for board presentations, investor conversations, regulator submissions, and partnership negotiations on day one.
                                </p>

                                {/* Reflexive Intelligence */}
                                <div className="border-t border-slate-200 pt-6 mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">Reflexive Intelligence: Analyzing You</h3>
                                    <p className="text-sm text-slate-700 leading-relaxed text-justify mb-3">
                                        Most systems only analyze external conditions. BW Ai also analyzes decision posture. <strong>Signal Decoder:</strong> Detects recurring priorities and strategic fixation points. <strong>Latent Advantage Miner:</strong> Surfaces underused assets hidden in narrative context. <strong>Constraint Mapper:</strong> Identifies unspoken barriers, risk assumptions, and execution friction. <strong>Universal Translator:</strong> Reframes conclusions for investors, governments, communities, partners, and executive teams.
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                        <strong>Case Study Intelligence:</strong> Upload any case study, report, proposal, or mandate &mdash; the full text is read, broken into structured sections, and scored on governance quality, financial viability, evidence strength, risk management, and replication potential. Five adversarial personas debate the findings. Historical parallel matching surfaces precedents from 10+ countries. You receive a strength/weakness diagnostic with severity levels, specific recommendations, and a list of documents and letters ready to generate from the analysis.
                                    </p>
                                </div>

                                <button onClick={() => { setUnifiedActiveTab('protocol'); setShowUnifiedSystemOverview(true); }} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors">
                                    <Info size={16} /> View Complete System: Protocol, 247 Documents &amp; 156 Letters &rarr;
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Assurance + Document Factory — Two Photo + Script Cards */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Assurance Architecture Card */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1560732488-6b0df240254a?w=800&h=400&fit=crop&q=80" alt="Assurance Architecture" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <h3 className="text-lg font-bold text-white">Trust Is Structural, Not Promotional</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    Trust in BW Ai is structural, not promotional: deterministic scoring for reproducible outcomes, formula-level traceability for every recommendation, end-to-end audit logging from intake to output, continuous recalibration using live macro and market feeds, and human sign-off requirements for high-impact decisions.
                                </p>
                            </div>
                        </div>

                        {/* Document Factory Card */}
                        <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-48 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=400&fit=crop&q=80" alt="Document Factory" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                <div className="absolute bottom-4 left-5">
                                    <h3 className="text-lg font-bold text-white">From Analysis to Execution Assets</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                    BW Ai does not end at analysis. It generates execution artifacts teams can use immediately: Letters of Intent (LOI), Memorandums of Understanding (MOU), Non-Disclosure Agreements (NDA), Term Sheets and strategic briefs, stakeholder narratives, and partnership negotiation frameworks. This compresses weeks of advisory and drafting cycles into a decision-ready operating flow.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CLOSING — Dark Full-Width Position Statement
            ═══════════════════════════════════════════════════════════════ */}
            <section className="py-16 px-4 bg-gradient-to-r from-slate-900 to-slate-800">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">A Paradigm Shift</h2>
                    <p className="text-lg text-slate-300 leading-relaxed text-justify mb-4">
                        The core problem I&rsquo;m solving is <strong className="text-white">Trust</strong>. This isn&rsquo;t just technology. It is a system built to restore confidence in artificial intelligence. It empowers the &ldquo;underdogs&rdquo; of the global economy&mdash;regional councils, developing nations, and ambitious entrepreneurs&mdash;to make decisions they can legally and strategically defend in boardrooms, government briefings, and investment committees.
                    </p>
                    <p className="text-lg text-white leading-relaxed font-semibold">
                        The technology is real. The results are real. And it&rsquo;s all here to help you succeed.
                    </p>
                </div>
            </section>


            {/* BW CONSULTANT AI DEMO - Display Mode Only */}
            <section className="py-8 px-4 bg-white">
                <style>{`@keyframes bwMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
                <div className="max-w-7xl mx-auto">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Meet Your AI Partner</p>
                            <h2 className="text-xl font-bold text-slate-900">BW Consultant AI</h2>
                        </div>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed hidden sm:block">Automated display of a live session. Exact replica of the system.</p>
                    </div>

                    {/* Demo window — pixel-match to BWConsultantOS */}
                    <div className="border border-stone-200 shadow-lg flex flex-col overflow-hidden" style={{ fontFamily: "'Söhne','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif", height: '480px' }}>

                        {/* Header banner — identical to BWConsultantOS */}
                        <div className="px-6 py-4 flex items-center justify-between relative overflow-hidden flex-shrink-0"
                            style={{ backgroundImage:'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=300&fit=crop&q=80)', backgroundSize:'cover', backgroundPosition:'center' }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-blue-900/70" />
                            <div className="relative z-10 flex items-center gap-3">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                                <div>
                                    <h1 className="text-xl font-bold text-white">BW Consultant</h1>
                                    <span className="text-blue-200 text-xs">Powered by NSIL Agentic Runtime • Case Study Builder</span>
                                </div>
                                <span className="ml-1 px-2 py-0.5 bg-white/10 border border-white/20 text-white text-[9px] font-semibold">DEMO</span>
                            </div>
                            <div className="relative z-10 hidden md:flex items-center gap-1.5">
                                {(['Intake','Discovery','Analysis','Recommendations','Generation'] as const).map((p, idx) => {
                                    const activeIdx = Math.min(4, Math.floor((demoChatStep / DEMO_MESSAGES.length) * 5));
                                    return (
                                        <React.Fragment key={p}>
                                            {idx > 0 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-300/50"><polyline points="9 18 15 12 9 6"/></svg>}
                                            <span className={`px-3 py-1.5 text-xs font-medium transition-all ${idx === activeIdx ? 'bg-white text-blue-800' : idx < activeIdx ? 'bg-blue-700/50 text-blue-100' : 'bg-blue-800/30 text-blue-300/70'}`}>{p}</span>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <button onClick={() => termsAccepted && onEnterPlatform?.()} className="relative z-10 ml-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-2 border border-white/20 transition-all">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                                Full Session
                            </button>
                        </div>

                        {/* Main body: chat + right sidebar — flex-1 */}
                        <div className="flex flex-1 overflow-hidden">

                            {/* Chat panel */}
                            <div className="flex-1 flex flex-col bg-stone-50 overflow-hidden">
                                {/* Messages scroll area */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    <div className="flex justify-center">
                                        <span className="text-[10px] px-3 py-1 bg-white border border-stone-200 text-slate-400">Scenario: Cairns Regional Development Authority — Cold-Chain Logistics Hub, North Queensland</span>
                                    </div>

                                    {DEMO_MESSAGES.slice(0, demoChatStep).map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            style={{ animation: i === demoChatStep - 1 ? 'bwMsgIn 0.25s ease-out' : 'none' }}>
                                            {msg.role === 'system' && (
                                                <div className="max-w-[85%] px-3 py-2 bg-indigo-50 border border-indigo-200">
                                                    <p className="text-[11px] text-indigo-600 font-mono leading-relaxed">
                                                        <span className="font-bold text-indigo-800">NSIL</span> &bull; {msg.text}
                                                    </p>
                                                </div>
                                            )}
                                            {msg.role === 'user' && (
                                                <div className="max-w-[75%] px-4 py-3 bg-blue-600 text-white text-sm leading-relaxed">{msg.text}</div>
                                            )}
                                            {msg.role === 'assistant' && (
                                                <div className="max-w-[85%] px-4 py-3 bg-white border border-stone-200 text-stone-900 shadow-sm text-sm leading-relaxed">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                                                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">BW Consultant</span>
                                                    </div>
                                                    <p className="whitespace-pre-line text-stone-800">{msg.text}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {demoTyping && (
                                        <div className="flex justify-start" style={{ animation: 'bwMsgIn 0.2s ease-out' }}>
                                            <div className="px-4 py-3 bg-white border border-stone-200 shadow-sm">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                                                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">BW Consultant</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay:'0ms' }} />
                                                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay:'150ms' }} />
                                                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay:'300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {demoChatStep >= DEMO_MESSAGES.length && !demoTyping && (
                                        <div className="flex items-center gap-3 pt-1" style={{ animation:'bwMsgIn 0.25s ease-out' }}>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                                Session complete — 5 documents queued
                                            </div>
                                            <button onClick={() => { setDemoChatStep(0); setDemoTyping(false); }}
                                                className="text-xs px-3 py-1.5 border border-stone-300 text-slate-600 hover:bg-stone-100 transition-colors">
                                                Replay
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Input bar replica */}
                                <div className="p-4 border-t border-stone-200 bg-white flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-stone-100 border border-stone-300">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                        </div>
                                        <div className="flex-1 border border-stone-300 px-4 py-2.5 text-sm text-slate-400 bg-stone-50 select-none">Type your response...</div>
                                        <div className="px-5 py-2.5 bg-slate-200 text-slate-400 text-sm font-medium select-none flex items-center gap-2">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                            Send
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right sidebar — white, w-80, exact match to BWConsultantOS */}
                            <div className="w-80 border-l border-stone-200 bg-white flex flex-col flex-shrink-0 overflow-y-auto">
                                {/* Case Summary header */}
                                <div className="p-4 border-b border-stone-200 bg-slate-50 flex-shrink-0">
                                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                                        Case Summary
                                    </h2>
                                    {/* Policy Pack */}
                                    <div className={`mt-2 text-[11px] px-2 py-1 border transition-all duration-500 ${demoChatStep >= 2 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                                        Policy Pack: {demoChatStep >= 2 ? 'Asia-Pacific Advisory' : '—'}
                                    </div>
                                    {/* Readiness + skill + pilot row */}
                                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition-all duration-500">
                                            Readiness: {Math.min(100, Math.round((demoChatStep / DEMO_MESSAGES.length) * 73) + 27)}%
                                        </span>
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200">Advanced</span>
                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200">Pilot: Off</span>
                                    </div>
                                    {/* Consultant Gate */}
                                    <div className="mt-2 border border-stone-200 bg-white px-2 py-1 text-[11px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-slate-700">Consultant Gate</span>
                                            <span className={`px-1.5 py-0.5 border text-[10px] font-semibold transition-all duration-500 ${demoChatStep >= 4 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {demoChatStep >= 4 ? 'READY' : 'BLOCKED'}
                                            </span>
                                        </div>
                                        {demoChatStep < 4 && (
                                            <ul className="mt-1 space-y-0.5">
                                                {['Developer identity unverified', 'Financial model required', 'Anchor tenant not confirmed'].slice(0, demoChatStep >= 2 ? 2 : 3).map((g) => (
                                                    <li key={g} className="text-[10px] text-slate-600">• {g}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {/* Critical Gaps */}
                                    <div className="mt-2 bg-white border border-stone-200 px-2 py-1 text-[11px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`font-semibold ${demoChatStep >= DEMO_MESSAGES.length ? 'text-green-700' : 'text-amber-700'}`}>
                                                Critical Gaps: {Math.max(0, 6 - Math.floor((demoChatStep / DEMO_MESSAGES.length) * 6))}
                                            </span>
                                        </div>
                                        {demoChatStep < DEMO_MESSAGES.length && (
                                            <p className="mt-0.5 text-[10px] text-slate-600">
                                                Next: HIGH — {demoChatStep < 2 ? 'Jurisdiction & sector' : demoChatStep < 4 ? 'Counterparty verification' : 'Anchor tenant evidence'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Documents section */}
                                <div className="p-4 border-b border-stone-200 flex-shrink-0">
                                    <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Documents Queued</h3>
                                    <div className="space-y-1.5">
                                        {[
                                            { name: 'NAIF Submission Brief', ready: demoChatStep >= 5 },
                                            { name: 'Investment Prospectus', ready: demoChatStep >= 5 },
                                            { name: 'Risk Register', ready: demoChatStep >= 5 },
                                            { name: 'Stakeholder Plan', ready: demoChatStep >= 5 },
                                            { name: 'LOI Template', ready: demoChatStep >= 5 },
                                        ].map(({ name, ready }) => (
                                            <div key={name} className={`flex items-center justify-between px-2 py-1 border text-[11px] transition-all duration-500 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                                                <span className={ready ? 'text-emerald-700 font-medium' : 'text-slate-500'}>{name}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 border ${ready ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                                                    {ready ? 'READY' : 'PENDING'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {demoChatStep >= DEMO_MESSAGES.length && (
                                        <button onClick={() => termsAccepted && onEnterPlatform?.()}
                                            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                                            Generate All Documents →
                                        </button>
                                    )}
                                </div>

                                {/* NSIL data signals */}
                                <div className="p-4 flex-shrink-0">
                                    <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">NSIL Signals Extracted</h3>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Jurisdiction', value: 'Australia — Queensland', step: 2 },
                                            { label: 'Sector', value: 'Cold-chain / Logistics', step: 2 },
                                            { label: 'Policy Pack', value: 'Asia-Pacific Advisory', step: 2 },
                                            { label: 'Counterparty', value: 'Developer (CIS pending)', step: 3 },
                                            { label: 'Lead Funder', value: 'NAIF matched', step: 4 },
                                        ].map(({ label, value, step }) => (
                                            <div key={label} className={`px-2 py-1.5 border text-[11px] transition-all duration-500 ${demoChatStep >= step ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50 opacity-30'}`}>
                                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
                                                <p className="font-medium text-slate-700">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Photo Banner  -  Document Intelligence */}

            {/* WHO THIS IS FOR */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-3">You Don't Need to Be an Expert. <span className="text-blue-600 font-normal">The System Already Is.</span></h2>
                    <p className="text-base text-slate-600 leading-relaxed mb-10 max-w-3xl">
                        The people who need this most are the ones who've never had access to it. That's the point.
                    </p>

                    {/* WHO  -  narrative cards with photos */}
                    <div className="grid md:grid-cols-2 gap-6 mb-10">
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-40 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop&q=80" alt="Regional council meeting" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><Building2 size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">Regional Councils & Development Agencies</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    You know your region has potential. You&rsquo;ve seen it your entire career. But when the investment board asks for a risk-adjusted ROI model or a stakeholder alignment matrix, the budget doesn&rsquo;t stretch. This system gives you the same analytical depth &mdash; scored, stress-tested, and formatted &mdash; without the consulting invoice.
                                </p>
                                <button onClick={() => setExpandedPersona(expandedPersona === 'council' ? null : 'council')} className="text-xs text-blue-600 font-medium hover:text-blue-800 cursor-pointer transition-colors">
                                    What you get: prospectuses, structural twin analysis, lifecycle mapping, advantage mining, scenario stress-testing {expandedPersona === 'council' ? '▲' : '▼'}
                                </button>
                                {expandedPersona === 'council' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <p className="font-semibold text-slate-800 mb-1">Full deliverable list:</p>
                                        <p>&bull; Investment Prospectus (1–100 pages, scored and stress-tested)</p>
                                        <p>&bull; Structural Twin Analysis &mdash; matched to historical parallels from 10+ countries</p>
                                        <p>&bull; Project Lifecycle Map with phased milestones and decision gates</p>
                                        <p>&bull; Latent Advantage Mining &mdash; surfaces hidden regional assets</p>
                                        <p>&bull; Monte Carlo Scenario Stress-Testing (5,000 simulations)</p>
                                        <p>&bull; Case Study Upload &amp; Analysis &mdash; upload existing reports for NSIL scoring</p>
                                        <p>&bull; Stakeholder Alignment Matrix with engagement strategy</p>
                                        <p>&bull; Risk-Adjusted ROI Model with sensitivity analysis</p>
                                        <p>&bull; Regional Profile &amp; SWOT Analysis</p>
                                        <p>&bull; Government Submission Pack (policy brief, incentive application, MOU draft)</p>
                                        <p>&bull; Community Impact Assessment</p>
                                        <p>&bull; Full audit trail &mdash; every score traceable to formula + data input</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-40 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop&q=80" alt="Government investment board" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><Scale size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">Government Agencies & Investment Boards</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    You&rsquo;re screening proposals, evaluating bids, or deciding which initiatives get funded. Every decision needs a defensible trail. This system stress-tests assumptions, surfaces deal-killers early, runs adversarial debate from five perspectives, and produces a documented rationale you can stand behind in scrutiny.
                                </p>
                                <button onClick={() => setExpandedPersona(expandedPersona === 'government' ? null : 'government')} className="text-xs text-blue-600 font-medium hover:text-blue-800 cursor-pointer transition-colors">
                                    What you get: scored viability assessments, ethical gates, friction analysis, traceable decision rationale {expandedPersona === 'government' ? '▲' : '▼'}
                                </button>
                                {expandedPersona === 'government' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <p className="font-semibold text-slate-800 mb-1">Full deliverable list:</p>
                                        <p>&bull; Scored Viability Assessment with overall viability rating (0–100)</p>
                                        <p>&bull; Ethical &amp; Governance Gate Report &mdash; flags compliance gaps before approval</p>
                                        <p>&bull; Friction Analysis &mdash; identifies execution blockers and stakeholder misalignment</p>
                                        <p>&bull; Case Study Upload &amp; Analysis &mdash; upload proposals or mandates for instant NSIL scoring</p>
                                        <p>&bull; 5-Persona Adversarial Debate Transcript (Skeptic, Advocate, Regulator, Accountant, Operator)</p>
                                        <p>&bull; Due Diligence Summary with SAT contradiction detection</p>
                                        <p>&bull; Financial Feasibility Analysis with cost-per-beneficiary modelling</p>
                                        <p>&bull; Risk Register with severity scoring and mitigation hierarchy</p>
                                        <p>&bull; Policy Brief &amp; Regulatory Filing pack</p>
                                        <p>&bull; Documented Decision Rationale &mdash; court-defensible audit trail</p>
                                        <p>&bull; Historical Parallel Matching &mdash; shows what happened when similar programmes ran elsewhere</p>
                                        <p>&bull; Replication Viability Assessment for scaling successful pilots</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-40 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=400&fit=crop&q=80" alt="Business expansion" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><Briefcase size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">Businesses Expanding Into New Regions</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    You&rsquo;ve outgrown your home market. You&rsquo;re looking at Southeast Asia, the Pacific, Latin America &mdash; but you don&rsquo;t know the regulatory landscape, the real cost of entry, or which local partners are credible. This system researches any location in seconds, scores your entry strategy against historical patterns, and flags what will go wrong before you commit capital.
                                </p>
                                <button onClick={() => setExpandedPersona(expandedPersona === 'business' ? null : 'business')} className="text-xs text-blue-600 font-medium hover:text-blue-800 cursor-pointer transition-colors">
                                    What you get: BW AI Search briefs, risk assessment, partner ecosystem mapping, activation timeline forecasts {expandedPersona === 'business' ? '▲' : '▼'}
                                </button>
                                {expandedPersona === 'business' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <p className="font-semibold text-slate-800 mb-1">Full deliverable list:</p>
                                        <p>&bull; BW AI Location Research Brief &mdash; real-time intelligence on any city/region</p>
                                        <p>&bull; Market Entry Risk Assessment with regulatory landscape analysis</p>
                                        <p>&bull; Partner Ecosystem Map &mdash; scored compatibility with local counterparts</p>
                                        <p>&bull; Activation Timeline with phased milestones and resource requirements</p>
                                        <p>&bull; Case Study Upload &amp; Analysis &mdash; upload competitor reports or market studies for instant analysis</p>
                                        <p>&bull; Competitive Landscape Scanner with positioning strategy</p>
                                        <p>&bull; Financial Model (CAPEX, OPEX, revenue, currency exposure, IRR)</p>
                                        <p>&bull; Structural Twin Matching &mdash; identifies cities/regions with similar growth patterns</p>
                                        <p>&bull; Supply Chain &amp; Procurement Assessment</p>
                                        <p>&bull; Compliance &amp; Permit Roadmap for target jurisdiction</p>
                                        <p>&bull; Investment Prospectus ready for board presentation</p>
                                        <p>&bull; 156 letter templates &mdash; partnership, government, trade, compliance</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-40 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop&q=80" alt="Entrepreneur working" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><Globe size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">First-Time Exporters & Regional Entrepreneurs</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    You&rsquo;ve never written an investment prospectus. You don&rsquo;t know what a due diligence pack looks like. You&rsquo;ve never seen a Monte Carlo simulation. That&rsquo;s fine &mdash; the system walks you through a guided 10-step intake, asks the right questions, and produces the documents that open doors. The BW Consultant AI sits alongside you at every step.
                                </p>
                                <button onClick={() => setExpandedPersona(expandedPersona === 'entrepreneur' ? null : 'entrepreneur')} className="text-xs text-blue-600 font-medium hover:text-blue-800 cursor-pointer transition-colors">
                                    Guided intake, built-in consultant, and step-by-step preparation &mdash; without needing a consulting team {expandedPersona === 'entrepreneur' ? '▲' : '▼'}
                                </button>
                                {expandedPersona === 'entrepreneur' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <p className="font-semibold text-slate-800 mb-1">Full deliverable list:</p>
                                        <p>&bull; Guided 10-Step Protocol &mdash; plain-language intake, no jargon required</p>
                                        <p>&bull; BW AI Consultant &mdash; answers questions at every step in real time</p>
                                        <p>&bull; Case Study Upload &amp; Analysis &mdash; upload what you have, the system tells you what&rsquo;s strong and what&rsquo;s missing</p>
                                        <p>&bull; Investment Prospectus generated from your answers (no financial background needed)</p>
                                        <p>&bull; Executive Brief &mdash; 1-page summary for quick conversations</p>
                                        <p>&bull; Risk Assessment explained in plain terms with recommended actions</p>
                                        <p>&bull; Partner Matching &mdash; find who&rsquo;s right for your stage and sector</p>
                                        <p>&bull; Monte Carlo Simulation &mdash; see the range of realistic outcomes, not just best-case</p>
                                        <p>&bull; Document Factory &mdash; 247 document types, generated from your exact data</p>
                                        <p>&bull; Letter Templates &mdash; 156 ready-to-send letters for every stage</p>
                                        <p>&bull; Full audit trail so you understand exactly how each score was calculated</p>
                                        <p>&bull; Export everything as PDF, ready for banks, boards, and investors</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* How the system adapts */}
                    <div className="bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-500 p-6 rounded-r-sm">
                        <p className="text-base text-slate-800 leading-relaxed">
                            <strong className="text-slate-900">The system adapts to you.</strong> First-time users get full walkthroughs, guided intake, and pattern confidence explained at every stage. Teams review scores together with shared workspaces. Experts get direct formula access, full audit trail export, visible DAG scheduling, and adjustable Monte Carlo parameters. Same engine  -  different depth based on who's driving.
                        </p>
                    </div>
                </div>
            </section>

            {/* GLOBAL STANDARDS & ETHICS */}
            <section className="py-20 px-4 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3">Global Standards &amp; Ethics</p>
                    <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-3">Your Projects Meet the Highest Global Benchmarks. <span className="text-blue-600 font-normal">Automatically.</span></h2>
                    <p className="text-base text-slate-600 leading-relaxed mb-10 max-w-3xl">
                        Every report you generate is measured against IFC Performance Standards and UN Sustainable Development Goals &mdash; the same frameworks used by the World Bank, DFIs, and 100+ global financial institutions. You don&rsquo;t need to know the standards. You just need to answer the intake questions.
                    </p>

                    {/* How It Works — 3 step cards */}
                    <div className="grid md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">1</div>
                                <h3 className="text-sm font-bold text-slate-900">Global Baseline Applied</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                Before any local law is checked, your project is scored against IFC Performance Standards (PS1&ndash;PS8) &mdash; covering environmental management, labour conditions, land acquisition, indigenous peoples&rsquo; rights, and more.
                            </p>
                            <p className="text-xs text-slate-500">This means your report is valid in any country from the moment it&rsquo;s generated.</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">2</div>
                                <h3 className="text-sm font-bold text-slate-900">Gaps Identified &amp; Scored</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                Your inputs are checked against every Performance Standard. Where you fall short, you&rsquo;ll see exactly what&rsquo;s missing &mdash; with severity ratings, business impact assessment, and clear recommendations on how to close the gap.
                            </p>
                            <p className="text-xs text-slate-500">No surprises during due diligence. You see the red flags before your investors do.</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">3</div>
                                <h3 className="text-sm font-bold text-slate-900">Local Law Resolved</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                Once a gap is found, the matching local regulations are surfaced &mdash; with exact legal references, required forms, enforcing agencies, and filing deadlines for your specific jurisdiction.
                            </p>
                            <p className="text-xs text-slate-500">Global standard in, local action plan out. One intake, both layers covered.</p>
                        </div>
                    </div>

                    {/* What this means for you — callout */}
                    <div className="bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-0">
                        <h3 className="text-base font-bold text-slate-900 mb-3">What This Means For You</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-800 mb-1">Start Anywhere</p>
                                <p className="text-sm text-slate-600">Generate a report from any country, immediately. The global baseline works everywhere &mdash; no waiting for local laws to be programmed.</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 mb-1">Investor-Ready From Day One</p>
                                <p className="text-sm text-slate-600">Global investors and DFIs prefer IFC Standards over local regulation. Meeting these benchmarks opens doors to financing that local compliance alone cannot.</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 mb-1">Protected By Default</p>
                                <p className="text-sm text-slate-600">Every report highlights exact compliance risks with severity ratings &mdash; protecting you from legal exposure, reputational damage, and deal-killers you didn&rsquo;t see coming.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WORK WITH US - Partnership & Pilot Programs */}
            <section id="partnerships" className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-3">Early Partners Shape What This Becomes. <span className="text-blue-600 font-normal">That&rsquo;s By Design.</span></h2>
                    <p className="text-base text-slate-600 leading-relaxed mb-10 max-w-3xl">
                        Every pilot teaches us something. Every partnership sharpens the intelligence. We&rsquo;re looking for organisations ready to pilot a new standard for how investment decisions get made.
                    </p>

                    {/* Three Partnership Cards — person-focused */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-36 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=400&fit=crop&q=80" alt="Investment screening meeting" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><Zap size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">Investment Promotion Agencies</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm font-semibold text-slate-800 mb-2">Your challenge</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    You screen hundreds of investment leads a year. Most don&rsquo;t survive first contact. The ones that do take months of manual due diligence &mdash; financial modelling, compliance mapping, risk profiling, stakeholder alignment &mdash; before they&rsquo;re anywhere near board-ready. By the time you&rsquo;ve vetted ten, thirty more have landed.
                                </p>
                                <p className="text-sm font-semibold text-slate-800 mb-2">What changes</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    Every proposal runs through 46+ scored formulas, a Regional Development Kernel that maps governance readiness, and a Partner Intelligence Engine that ranks ideal co-investors and delivery partners. Five adversarial personas stress-test each lead. The Case Study Method Layer blocks anything that hasn&rsquo;t passed boundary, evidence, and feasibility checks. Your board gets a defensible evidence trail &mdash; not a summary slide.
                                </p>
                                <p className="text-xs text-blue-600 font-medium">Pilot on your next intake cycle &rarr;</p>
                            </div>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-36 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop&q=80" alt="Regional development" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><TrendingUp size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">Regional Economic Development</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm font-semibold text-slate-800 mb-2">Your challenge</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    Your region has real assets &mdash; a port, a university, agricultural land, a diaspora network, emerging industries. But when investors or development banks ask what makes you different, the prospectus is outdated, the data is stale, and the story reads like every other region in the country. You can&rsquo;t show them what they can&rsquo;t see.
                                </p>
                                <p className="text-sm font-semibold text-slate-800 mb-2">What changes</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    A Global Data Fabric ingests live policy, macro, and trade signals for your jurisdiction. The Regional Development Kernel scores your hidden advantages, maps structural twin regions worldwide, builds a causal Problem-to-Solution Graph linking root causes to interventions, and ranks the partners best positioned to co-deliver. Eight Global Issue Packs &mdash; water, energy, logistics, housing, health, digital infrastructure, workforce, climate &mdash; give you domain-specific intelligence scaffolds. You walk away with 247+ investment-grade documents ready for institutional audiences.
                                </p>
                                <p className="text-xs text-blue-600 font-medium">Partner on a regional intelligence project &rarr;</p>
                            </div>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-36 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop&q=80" alt="Public-private partnership negotiation" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center"><Building2 size={16} className="text-blue-600" /></div>
                                    <h3 className="text-sm font-bold text-white">Public-Private Partnerships</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm font-semibold text-slate-800 mb-2">Your challenge</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    PPP proposals fail because stakeholder alignment was assumed, not modelled. The economics pass on paper but nobody stress-tested the assumptions under real-world variance &mdash; demand shocks, currency fluctuation, political cycles, regulatory friction. Deal-killers surface at the minister&rsquo;s desk, not at the design table.
                                </p>
                                <p className="text-sm font-semibold text-slate-800 mb-2">What changes</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    Financials run through Monte Carlo simulation across 5,000 scenarios. Every stakeholder&rsquo;s incentives are modelled by five adversarial personas. The Partner Intelligence Engine ranks co-delivery partners by fit, reliability, policy alignment, and local legitimacy. Governance readiness must clear 75% before any output reaches decision-makers. You get execution-ready LOIs, MOUs, term sheets, and stakeholder briefs &mdash; all traceable to formulas, evidence, and risk scores.
                                </p>
                                <p className="text-xs text-blue-600 font-medium">Run your next PPP through a pilot &rarr;</p>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* SOLVING REAL PROBLEMS  -  Statement Piece */}
            <section className="relative py-20 px-4 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
                </div>
                <div className="relative max-w-4xl mx-auto text-center">
                    <p className="text-white/80 uppercase tracking-[0.3em] text-sm mb-4 font-bold">SOLVING REAL PROBLEMS</p>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-white mb-6 leading-relaxed">
                        This platform exists to help capital, partnerships, and capability reach places that are too often overlooked &mdash; despite holding extraordinary, investable potential.
                    </h2>
                    <div className="w-20 h-0.5 bg-white/40 mx-auto mb-6" />
                    <p className="text-lg text-white/90 leading-relaxed mb-6 max-w-3xl mx-auto">
                        During this beta phase and in future subscriptions, <strong className="text-white font-bold">10% of every paid transaction</strong> goes back into initiatives that support regional development.
                    </p>
                    <p className="text-base text-blue-100 italic">
                        A new voice for regions. A new standard for how opportunity is evaluated &mdash; anywhere in the world.
                    </p>
                </div>
            </section>

            {/* FOOTER INFO SECTION */}
            <section id="footer-info" className="py-12 px-4 bg-slate-900">
                <div className="max-w-4xl mx-auto">
                        <p className="text-xl font-semibold text-white mb-6">
                            Launch the full BW Nexus Intelligence OS to start analyzing partnership opportunities with sovereign-grade analytical depth.
                        </p>

                        {/* Terms of Engagement */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 text-left">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Shield size={16} className="text-sky-300" />
                                Terms of Engagement
                            </h4>
                            <div className="space-y-2 text-sm text-white/60">
                                <p><strong className="text-white/80">1. Strategic Decision Support:</strong> BW AI is a decision support platform. All outputs are advisory.</p>
                                <p><strong className="text-white/80">2. Reasoning Governance:</strong> NSIL layer governs analysis via adversarial input screening.</p>
                                <p><strong className="text-white/80">3. Data Privacy:</strong> Strict compliance with GDPR, Australian Privacy Act.</p>
                                <p><strong className="text-white/80">4. Accountability:</strong> Users retain final accountability for decisions.</p>
                            </div>
                        </div>

                        {/* T&C Checkbox */}
                        <div className="flex items-start gap-3 mb-6 text-left">
                            <input 
                                type="checkbox" 
                                id="acceptTerms" 
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-white/30 bg-transparent text-sky-300 focus:ring-blue-400 cursor-pointer"
                            />
                            <label htmlFor="acceptTerms" className="text-sm text-white/60 cursor-pointer">
                                By accessing the platform, you agree to our <strong className="text-white">Terms & Conditions</strong>
                            </label>
                        </div>

                        {/* Launch Button */}
                        <button 
                            disabled={!termsAccepted}
                            onClick={() => termsAccepted && onEnterPlatform?.()}
                            className={`w-full py-4 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 mb-6 ${
                                termsAccepted 
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer' 
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                            }`}
                        >
                            Launch Intelligence OS
                            <ArrowRight size={20} />
                        </button>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <h4 className="text-sm font-bold text-sky-300 uppercase tracking-wider mb-3">BWGA Ai</h4>
                            <p className="text-sm text-white/60 mb-4">
                                BW Global Advisory is an Australian strategic intelligence firm developing sovereign-grade AI systems for cross-border investment and regional economic development.
                            </p>
                            <div className="space-y-1 text-sm text-white/50">
                                <p className="flex items-center gap-2"><Mail size={14} /> brayden@bwglobaladvis.info</p>
                                <p className="flex items-center gap-2"><Phone size={14} /> +63 960 835 4283</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <h4 className="text-sm font-bold text-sky-300 uppercase tracking-wider mb-3">Development Status</h4>
                            <p className="text-sm text-white/80 mb-2"><strong>CURRENT PHASE:</strong> Research & Development</p>
                            <p className="text-sm text-white/60 mb-4">
                                BWGA Ai is currently in active R&D phase, operating under Brayden Walls as a registered Australian sole trader. The platform is being developed for future commercial deployment to government and enterprise clients.
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-white/50">
                                <button onClick={() => setActiveDocument('user-manual')} className="hover:text-white transition-colors">User Manual</button>
                                <button onClick={() => setActiveDocument('terms')} className="hover:text-white transition-colors">Terms & Conditions</button>
                                <button onClick={() => setActiveDocument('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
                                <button onClick={() => setActiveDocument('ethics')} className="hover:text-white transition-colors">Ethical AI Framework</button>
                            </div>
                        </div>
                    </div>
            </section>

            {/* ----------------------------------------------------------- */}
            {/* WHAT YOU GET  -  Detail Popup Modal                          */}
            {/* ----------------------------------------------------------- */}
            {showOutputDetails && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={() => setShowOutputDetails(false)}>
                    <div className="relative w-full max-w-3xl my-8 mx-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowOutputDetails(false)} className="fixed top-4 right-4 z-20 w-10 h-10 bg-stone-800 border border-stone-600 rounded-full flex items-center justify-center hover:bg-stone-700 transition-colors shadow-lg">
                            <X size={16} className="text-stone-300" />
                        </button>
                        <div className="bg-white rounded-sm shadow-2xl overflow-hidden">
                        <section className="py-12 px-6 md:px-8 bg-slate-100">
                            <div className="max-w-4xl mx-auto">
                            <p className="text-blue-600 uppercase tracking-[0.2em] text-sm mb-3 font-bold">WHAT YOU GET</p>
                            <h2 className="text-2xl font-light text-slate-900 mb-6">The Full Picture</h2>

                            <p className="text-base text-slate-700 leading-relaxed mb-4">
                                This is where the system becomes practical. It takes what would normally live across spreadsheets, slide decks, consultant workstreams, and weeks of revisions &mdash; and assembles it into institutional-ready deliverables.
                            </p>

                            <div className="space-y-4 text-sm text-slate-600 mb-8">
                                <p><strong className="text-slate-900">Why it exists:</strong> High-potential regional projects fail not because the opportunity isn&rsquo;t real &mdash; but because nobody packaged the case at the standard investors and governments expect. This fixes that.</p>
                                <p><strong className="text-slate-900">How it works:</strong> It fuses your intake data, scores, and risk tests into a single evidence-backed narrative.</p>
                                <p><strong className="text-slate-900">What you get:</strong> Decision-ready documents and packs that match the expectations of boards, agencies, and partners &mdash; generated from the same validated analysis.</p>
                            </div>

                            <h3 className="text-lg font-semibold text-blue-600 mb-2">The Document Factory Catalog</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                <strong>247 Document Types</strong> across <strong>15 Categories</strong>, plus <strong>156 Letter Templates</strong> &mdash; covering the entire lifecycle of global development projects, including case study analysis and intelligence extraction.
                            </p>

                            {/* 15 CATEGORY STRUCTURE */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">THE 15-CATEGORY LIFECYCLE STRUCTURE</p>
                                <div className="grid grid-cols-5 gap-3 text-center text-xs">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                                        <p className="font-bold text-emerald-700">ENTRY PHASE</p>
                                        <p className="text-slate-600">Strategy, Market, Government</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                        <p className="font-bold text-blue-700">DEAL PHASE</p>
                                        <p className="text-slate-600">Foundation, Financial, Partnership</p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                        <p className="font-bold text-amber-700">EXECUTION PHASE</p>
                                        <p className="text-slate-600">PM, Procurement, HR, Infrastructure</p>
                                    </div>
                                    <div className="bg-rose-50 border border-rose-200 rounded p-2">
                                        <p className="font-bold text-rose-700">SAFETY PHASE</p>
                                        <p className="text-slate-600">Risk, Governance, Regulatory, ESG</p>
                                    </div>
                                    <div className="bg-violet-50 border border-violet-200 rounded p-2">
                                        <p className="font-bold text-violet-700">INTELLIGENCE PHASE</p>
                                        <p className="text-slate-600">Case Study Analysis &amp; Extraction</p>
                                    </div>
                                </div>
                            </div>

                            {/* FULL 14-CATEGORY CATALOG */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                {/* Category 1: Foundation & Legal */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">1. Foundation &amp; Legal (10 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Letter of Intent (LOI)</li>
                                        <li>&bull; Memorandum of Understanding (MOU)</li>
                                        <li>&bull; Non-Disclosure Agreement (NDA)</li>
                                        <li>&bull; Term Sheet</li>
                                        <li>&bull; Expression of Interest (EOI)</li>
                                        <li>&bull; Request for Information (RFI)</li>
                                        <li>&bull; Request for Proposal (RFP)</li>
                                        <li>&bull; Request for Quotation (RFQ)</li>
                                        <li>&bull; Invitation to Tender (ITT)</li>
                                        <li>&bull; Pre-Qualification Document</li>
                                    </ul>
                                </div>

                                {/* Category 2: Strategic Intelligence */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">2. Strategic Intelligence (12 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Executive Summary</li>
                                        <li>&bull; Strategic Brief</li>
                                        <li>&bull; Strategic Plan</li>
                                        <li>&bull; Business Case</li>
                                        <li>&bull; Feasibility Study</li>
                                        <li>&bull; Market Entry Strategy</li>
                                        <li>&bull; Growth Strategy</li>
                                        <li>&bull; Exit Strategy</li>
                                        <li>&bull; Turnaround Plan</li>
                                        <li>&bull; Transformation Roadmap</li>
                                        <li>&bull; Vision Document</li>
                                        <li>&bull; White Paper</li>
                                    </ul>
                                </div>

                                {/* Category 3: Financial & Investment */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">3. Financial &amp; Investment (19 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Financial Model (5-Year Projections)</li>
                                        <li>&bull; Investment Memo</li>
                                        <li>&bull; Investment Thesis</li>
                                        <li>&bull; Capital Raise Deck</li>
                                        <li>&bull; Private Placement Memorandum (PPM)</li>
                                        <li>&bull; Prospectus</li>
                                        <li>&bull; Bond Offering Document</li>
                                        <li>&bull; Project Finance Model</li>
                                        <li>&bull; Valuation Report</li>
                                        <li>&bull; Fairness Opinion</li>
                                        <li>&bull; Solvency Opinion</li>
                                        <li>&bull; Credit Analysis</li>
                                        <li>&bull; Cash Flow Analysis</li>
                                        <li>&bull; Budget Proposal</li>
                                        <li>&bull; Cost-Benefit Analysis</li>
                                        <li>&bull; ROI Analysis</li>
                                        <li>&bull; NPV/IRR Analysis</li>
                                        <li>&bull; Sensitivity Analysis</li>
                                        <li>&bull; Monte Carlo Simulation Report</li>
                                    </ul>
                                </div>

                                {/* Category 4: Risk & Due Diligence */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">4. Risk &amp; Due Diligence (21 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Risk Assessment Report</li>
                                        <li>&bull; Blind Spot Audit</li>
                                        <li>&bull; Risk Register</li>
                                        <li>&bull; Risk Mitigation Plan</li>
                                        <li>&bull; Due Diligence Request List</li>
                                        <li>&bull; Due Diligence Report</li>
                                        <li>&bull; Legal Due Diligence</li>
                                        <li>&bull; Financial Due Diligence</li>
                                        <li>&bull; Commercial Due Diligence</li>
                                        <li>&bull; Technical Due Diligence</li>
                                        <li>&bull; Environmental Due Diligence</li>
                                        <li>&bull; Tax Due Diligence</li>
                                        <li>&bull; HR Due Diligence</li>
                                        <li>&bull; IT Due Diligence</li>
                                        <li>&bull; Background Check Report</li>
                                        <li>&bull; Integrity Due Diligence</li>
                                        <li>&bull; Sanctions Screening Report</li>
                                        <li>&bull; AML/KYC Report</li>
                                        <li>&bull; Political Risk Assessment</li>
                                        <li>&bull; Country Risk Report</li>
                                        <li>&bull; Currency Risk Analysis</li>
                                    </ul>
                                </div>

                                {/* Category 5: Government & Policy */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">5. Government &amp; Policy (21 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Policy Brief</li>
                                        <li>&bull; Position Paper</li>
                                        <li>&bull; Regulatory Impact Assessment</li>
                                        <li>&bull; Legislative Proposal</li>
                                        <li>&bull; Cabinet Memo</li>
                                        <li>&bull; Ministerial Briefing</li>
                                        <li>&bull; Budget Submission</li>
                                        <li>&bull; Public Consultation Document</li>
                                        <li>&bull; PPP Proposal Framework</li>
                                        <li>&bull; Concession Agreement</li>
                                        <li>&bull; Sovereign Guarantee Request</li>
                                        <li>&bull; Bilateral Investment Treaty Template</li>
                                        <li>&bull; Free Trade Agreement Analysis</li>
                                        <li>&bull; Economic Impact Assessment</li>
                                        <li>&bull; Social Impact Assessment</li>
                                        <li>&bull; National Development Plan</li>
                                        <li>&bull; Sector Development Strategy</li>
                                        <li>&bull; Special Economic Zone Proposal</li>
                                        <li>&bull; Investment Promotion Brief</li>
                                        <li>&bull; Grant Application</li>
                                        <li>&bull; Subsidy Application</li>
                                    </ul>
                                </div>

                                {/* Category 6: Partnership & Consortium */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">6. Partnership &amp; Consortium (14 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Partnership Proposal</li>
                                        <li>&bull; Partnership Assessment</li>
                                        <li>&bull; Partner Comparison Matrix</li>
                                        <li>&bull; Alliance Framework</li>
                                        <li>&bull; Consortium Agreement</li>
                                        <li>&bull; Joint Venture Agreement</li>
                                        <li>&bull; Teaming Agreement</li>
                                        <li>&bull; Co-Development Agreement</li>
                                        <li>&bull; Technology Transfer Agreement</li>
                                        <li>&bull; Capacity Building Program</li>
                                        <li>&bull; Local Content Plan</li>
                                        <li>&bull; Stakeholder Mapping</li>
                                        <li>&bull; Stakeholder Engagement Strategy</li>
                                        <li>&bull; Partnership Scorecard</li>
                                    </ul>
                                </div>

                                {/* Category 7: Execution & Project Management */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">7. Execution &amp; Project Management (18 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Implementation Roadmap</li>
                                        <li>&bull; 100-Day Plan</li>
                                        <li>&bull; Project Charter</li>
                                        <li>&bull; Project Plan</li>
                                        <li>&bull; Gantt Chart</li>
                                        <li>&bull; Critical Path Analysis</li>
                                        <li>&bull; Milestone Report</li>
                                        <li>&bull; Status Report</li>
                                        <li>&bull; Lessons Learned</li>
                                        <li>&bull; Change Management Plan</li>
                                        <li>&bull; Integration Plan</li>
                                        <li>&bull; Post-Merger Integration Playbook</li>
                                        <li>&bull; Transition Plan</li>
                                        <li>&bull; Business Continuity Plan</li>
                                        <li>&bull; Disaster Recovery Plan</li>
                                        <li>&bull; Quality Management System</li>
                                        <li>&bull; Process Documentation (SOP)</li>
                                        <li>&bull; Performance Metrics (KPI Framework)</li>
                                    </ul>
                                </div>

                                {/* Category 8: Governance & Board */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">8. Governance &amp; Board Reporting (12 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Board Charter</li>
                                        <li>&bull; Steering Committee Report</li>
                                        <li>&bull; Decision Rights Matrix</li>
                                        <li>&bull; Governance Report</li>
                                        <li>&bull; Annual Report</li>
                                        <li>&bull; Quarterly Report</li>
                                        <li>&bull; Board Presentation</li>
                                        <li>&bull; Shareholder Letter</li>
                                        <li>&bull; Proxy Statement</li>
                                        <li>&bull; Committee Charter</li>
                                        <li>&bull; Board Resolution Template</li>
                                        <li>&bull; Corporate Minutes Template</li>
                                    </ul>
                                </div>

                                {/* Category 9: Human Capital */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">9. Human Capital &amp; Capability (12 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Organizational Chart</li>
                                        <li>&bull; Talent Gap Analysis</li>
                                        <li>&bull; Key Personnel Bios</li>
                                        <li>&bull; Capability Assessment</li>
                                        <li>&bull; Training Materials</li>
                                        <li>&bull; HR Due Diligence Report</li>
                                        <li>&bull; Compensation Benchmarking</li>
                                        <li>&bull; Succession Planning</li>
                                        <li>&bull; Performance Management Framework</li>
                                        <li>&bull; Employee Handbook</li>
                                        <li>&bull; Onboarding Program</li>
                                        <li>&bull; Culture Assessment</li>
                                    </ul>
                                </div>

                                {/* Category 10: Procurement & Supply Chain */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">10. Procurement &amp; Supply Chain (13 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Procurement Strategy</li>
                                        <li>&bull; Vendor Assessment Scorecard</li>
                                        <li>&bull; Supply Chain Mapping</li>
                                        <li>&bull; Tender Document</li>
                                        <li>&bull; Bid Evaluation Matrix</li>
                                        <li>&bull; Supplier Qualification</li>
                                        <li>&bull; Purchase Order Template</li>
                                        <li>&bull; Master Service Agreement</li>
                                        <li>&bull; Supply Agreement</li>
                                        <li>&bull; Distribution Agreement</li>
                                        <li>&bull; Logistics Plan</li>
                                        <li>&bull; Inventory Management</li>
                                        <li>&bull; Supplier Risk Assessment</li>
                                    </ul>
                                </div>

                                {/* Category 11: ESG & Social Impact */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">11. ESG &amp; Social Impact (19 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; ESG Report</li>
                                        <li>&bull; Sustainability Report</li>
                                        <li>&bull; Carbon Footprint Assessment</li>
                                        <li>&bull; Net Zero Roadmap</li>
                                        <li>&bull; Environmental Impact Assessment</li>
                                        <li>&bull; Social Impact Assessment</li>
                                        <li>&bull; Community Engagement Plan</li>
                                        <li>&bull; Human Rights Due Diligence</li>
                                        <li>&bull; Labor Standards Assessment</li>
                                        <li>&bull; Supply Chain Ethical Audit</li>
                                        <li>&bull; Diversity &amp; Inclusion Report</li>
                                        <li>&bull; Governance Report</li>
                                        <li>&bull; Ethics Policy / Code of Conduct</li>
                                        <li>&bull; Whistleblower Policy</li>
                                        <li>&bull; Anti-Bribery Program</li>
                                        <li>&bull; Green Bond Framework</li>
                                        <li>&bull; Social Bond Framework</li>
                                        <li>&bull; Impact Measurement Report</li>
                                        <li>&bull; UN SDG Alignment Report</li>
                                    </ul>
                                </div>

                                {/* Category 12: Regulatory & Compliance */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">12. Regulatory &amp; Compliance (16 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Permit Application</li>
                                        <li>&bull; Regulatory Clearance Timeline</li>
                                        <li>&bull; Compliance Certificate</li>
                                        <li>&bull; Regulatory Filing</li>
                                        <li>&bull; License Application</li>
                                        <li>&bull; Regulatory Pathway Document</li>
                                        <li>&bull; Compliance Checklist</li>
                                        <li>&bull; Anti-Corruption Policy</li>
                                        <li>&bull; Data Protection Policy (GDPR)</li>
                                        <li>&bull; Sanctions Clearance Certificate</li>
                                        <li>&bull; Export Control Assessment</li>
                                        <li>&bull; Customs Declaration</li>
                                        <li>&bull; Trade Compliance Report</li>
                                        <li>&bull; Regulatory Change Impact</li>
                                        <li>&bull; Audit Response Document</li>
                                        <li>&bull; Dispute Resolution Brief</li>
                                    </ul>
                                </div>

                                {/* Category 13: Communications & IR */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">13. Communications &amp; IR (17 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Press Release</li>
                                        <li>&bull; Media Kit</li>
                                        <li>&bull; Investor Presentation</li>
                                        <li>&bull; Board Presentation Deck</li>
                                        <li>&bull; Stakeholder Update</li>
                                        <li>&bull; Crisis Communication Plan</li>
                                        <li>&bull; Internal Memo</li>
                                        <li>&bull; Newsletter Template</li>
                                        <li>&bull; Case Study</li>
                                        <li>&bull; Testimonial Collection</li>
                                        <li>&bull; FAQ Document</li>
                                        <li>&bull; Talking Points</li>
                                        <li>&bull; Speech Draft</li>
                                        <li>&bull; Op-Ed Template</li>
                                        <li>&bull; Social Media Strategy</li>
                                        <li>&bull; Brand Guidelines</li>
                                        <li>&bull; Content Calendar</li>
                                    </ul>
                                </div>

                                {/* Category 14: Asset & Infrastructure */}
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">14. Asset &amp; Infrastructure (17 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Site Selection Report</li>
                                        <li>&bull; Asset Utilization Plan</li>
                                        <li>&bull; Technical Requirements Brief</li>
                                        <li>&bull; Infrastructure Assessment</li>
                                        <li>&bull; Grid Connection Study</li>
                                        <li>&bull; Engineering Study</li>
                                        <li>&bull; Feasibility Engineering</li>
                                        <li>&bull; Resource Assessment</li>
                                        <li>&bull; Reserve Report (Mining/Oil)</li>
                                        <li>&bull; Power Purchase Agreement (PPA)</li>
                                        <li>&bull; Offtake Agreement</li>
                                        <li>&bull; Construction Contract (EPC)</li>
                                        <li>&bull; O&amp;M Agreement</li>
                                        <li>&bull; Technology Roadmap</li>
                                        <li>&bull; Patent/IP Landscape Analysis</li>
                                        <li>&bull; Safety Assessment</li>
                                        <li>&bull; Equipment Specification</li>
                                    </ul>
                                </div>

                                {/* Category 15: Case Study Intelligence */}
                                <div className="bg-white border border-violet-200 rounded-lg p-4">
                                    <h5 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">15. Case Study Intelligence (15 types)</h5>
                                    <ul className="space-y-0.5 text-xs text-slate-600">
                                        <li>&bull; Case Study Analysis Report</li>
                                        <li>&bull; Strength/Weakness Diagnostic</li>
                                        <li>&bull; NSIL Section Scoring Report</li>
                                        <li>&bull; Adversarial Debate Transcript</li>
                                        <li>&bull; Historical Parallel Matching Report</li>
                                        <li>&bull; Replication Viability Assessment</li>
                                        <li>&bull; Financial Gap Analysis</li>
                                        <li>&bull; Governance Framework Assessment</li>
                                        <li>&bull; Stakeholder Engagement Plan</li>
                                        <li>&bull; Implementation Roadmap</li>
                                        <li>&bull; Partner Proposal Template</li>
                                        <li>&bull; Executive Brief (from uploaded case)</li>
                                        <li>&bull; Case Study Rewrite (institutional format)</li>
                                        <li>&bull; Community Impact Assessment</li>
                                        <li>&bull; Due Diligence Summary (from uploaded evidence)</li>
                                    </ul>
                                </div>
                            </div>

                            {/* LETTER TEMPLATES SECTION */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-5 mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">+ 156 Letter Templates</h3>
                                <p className="text-sm text-slate-300 mb-4">Professional correspondence for every stage of deal-making:</p>
                                <div className="grid md:grid-cols-3 gap-3 text-xs text-slate-300">
                                    <div>
                                        <p className="font-semibold text-white mb-1">Outreach &amp; Introduction</p>
                                        <p>&bull; Partnership Introduction</p>
                                        <p>&bull; Investment Promotion</p>
                                        <p>&bull; Ministerial Introduction</p>
                                        <p>&bull; Trade Mission Request</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Deal &amp; Negotiation</p>
                                        <p>&bull; Commitment Confirmation</p>
                                        <p>&bull; JV Invitation</p>
                                        <p>&bull; Co-Investment Invitation</p>
                                        <p>&bull; Price Negotiation</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Operations &amp; Compliance</p>
                                        <p>&bull; Vendor Onboarding</p>
                                        <p>&bull; Audit Response</p>
                                        <p>&bull; License Renewal</p>
                                        <p>&bull; Crisis Statement</p>
                                    </div>
                                </div>
                            </div>

                            {/* PAGE LENGTH OPTIONS */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <p className="text-sm font-semibold text-blue-800 mb-2">Flexible Page Lengths: 1 to 100 Pages</p>
                                <p className="text-xs text-slate-600">Every document can be generated at the length you need: 1-page quick brief, 10-page board report, or 100-page full documentation package.</p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    <strong className="text-slate-700">The audit trail:</strong> Every recommendation traces back to specific data inputs, formula calculations, and persona debate transcripts. This isn&rsquo;t a black box &mdash; it&rsquo;s court-defensible, investor-ready documentation of exactly why the system reached each conclusion.
                                </p>
                            </div>
                            </div>
                        </section>

                        {/* --- PROOF OF CAPABILITY --- */}
                        <section id="proof" className="py-10 px-6 md:px-8 bg-white border-t border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-600 uppercase tracking-[0.2em] text-sm mb-2 font-bold">PROOF OF CAPABILITY</p>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">See the System in Action</h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                                    Words are cheap. The best way to understand what this system produces is to see an actual report it generated &mdash; not a mockup, not a template, but the real output from a real submission. Below is a live example of a regional council that submitted a 5MW solar partnership proposal through the Ten-Step Protocol.
                                </p>
                                <button 
                                    onClick={() => { setShowOutputDetails(false); setShowProofPopup(true); }}
                                    className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white border border-slate-700 rounded-sm text-sm font-bold hover:from-slate-700 hover:to-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                >
                                    <Info size={16} />
                                    See the Proof &mdash; A Real System, A Real Report
                                </button>
                            </div>
                        </section>

                        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-sm">
                            <button 
                                onClick={() => setShowOutputDetails(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------------------------------------------------- */}
            {/* TEN-STEP PROTOCOL  -  Detail Popup Modal  -  REDESIGNED      */}
            {/* ----------------------------------------------------------- */}
            {showProtocolDetails && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={() => setShowProtocolDetails(false)}>
                    <div className="relative w-full max-w-5xl my-8 mx-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowProtocolDetails(false)} className="fixed top-4 right-4 z-20 w-10 h-10 bg-stone-800 border border-stone-600 rounded-full flex items-center justify-center hover:bg-stone-700 transition-colors shadow-lg">
                            <X size={16} className="text-stone-300" />
                        </button>
                        <div className="bg-white rounded-sm shadow-2xl overflow-hidden">
                        
                        {/* Header */}
                        <section className="py-10 px-6 md:px-8 bg-gradient-to-r from-slate-900 to-slate-800">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-400 uppercase tracking-[0.2em] text-sm mb-3 font-bold">HOW THE SYSTEM WORKS</p>
                                <h2 className="text-2xl md:text-3xl font-light text-white mb-2">From First Input to Final Document</h2>
                                <p className="text-base text-blue-300 mb-4 flex items-center gap-2 font-medium">
                                    <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                                    Three stages. One continuous evidence chain.
                                </p>
                                <p className="text-base text-slate-300 leading-relaxed">
                                    This page explains exactly how the system works &mdash; from the moment you start a conversation to the final board-ready documents it produces. Adaptive intake captures your opportunity in measurable terms. Adversarial analysis stress-tests every claim across 46+ formulas and 5,000 scenarios. Institutional output turns every score, debate, and simulation result into documents your decision-makers can act on.
                                </p>
                            </div>
                        </section>

                        {/* What Makes This Different */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">

                                {/* BW Consultant intro */}
                                <div className="bg-white border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">BW</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900 leading-tight">BW Consultant</h3>
                                            <p className="text-xs text-blue-600 font-medium mt-0.5">Powered by NSIL Agentic Runtime &bull; Case Study Builder</p>
                                        </div>
                                    </div>

                                    {/* 5-Phase Flow */}
                                    <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
                                        {[
                                            { label: 'Intake', color: 'bg-blue-100 text-blue-700 border-blue-300' },
                                            { label: 'Discovery', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
                                            { label: 'Analysis', color: 'bg-amber-100 text-amber-700 border-amber-300' },
                                            { label: 'Recommendations', color: 'bg-orange-100 text-orange-700 border-orange-300' },
                                            { label: 'Generation', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                                        ].map((phase, i, arr) => (
                                            <div key={phase.label} className="flex items-center gap-1 flex-shrink-0">
                                                <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${phase.color}`}>{phase.label}</div>
                                                {i < arr.length - 1 && <span className="text-slate-300 text-sm">&rarr;</span>}
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        BW Consultant is the intake and reasoning engine. You describe your opportunity through conversation &mdash; it builds the structured case as you go. What begins as a brief becomes a full intelligence brief: scope, financials, risk, compliance, and stakeholder mapping all captured, validated, and ready to send through the adversarial analysis and output stages. The 10-step framework below shows exactly what each intake phase captures.
                                    </p>
                                </div>

                                {/* Three Stages Overview  -  Clickable Cards */}
                                <div className="grid md:grid-cols-3 gap-4 mb-6">
                                    <button 
                                        onClick={() => setActiveWorkflowStage('intake')}
                                        className="text-left bg-white border-2 border-blue-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</div>
                                            <span className="text-xs text-blue-600 uppercase tracking-wider font-bold">STAGE ONE</span>
                                        </div>
                                        <h4 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-blue-700">Adaptive Intake</h4>
                                        <p className="text-xs text-slate-600">BW Consultant captures 10 dimensions through conversation &mdash; scope, financials, risk, compliance, and partnership terms</p>
                                        <p className="text-xs text-blue-600 mt-3 font-medium group-hover:underline">Click to explore &rarr;</p>
                                    </button>

                                    <button 
                                        onClick={() => setActiveWorkflowStage('analysis')}
                                        className="text-left bg-white border-2 border-amber-200 rounded-lg p-5 hover:border-amber-400 hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">2</div>
                                            <span className="text-xs text-amber-600 uppercase tracking-wider font-bold">STAGE TWO</span>
                                        </div>
                                        <h4 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-amber-700">Adversarial Analysis</h4>
                                        <p className="text-xs text-slate-600">Stress-test with 5 personas, 38+ formulas, and Monte Carlo simulation</p>
                                        <p className="text-xs text-amber-600 mt-3 font-medium group-hover:underline">Click to explore &rarr;</p>
                                    </button>

                                    <button 
                                        onClick={() => setActiveWorkflowStage('output')}
                                        className="text-left bg-white border-2 border-emerald-200 rounded-lg p-5 hover:border-emerald-400 hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">3</div>
                                            <span className="text-xs text-emerald-600 uppercase tracking-wider font-bold">STAGE THREE</span>
                                        </div>
                                        <h4 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-emerald-700">Institutional Output</h4>
                                        <p className="text-xs text-slate-600">Compile evidence into 247 document types and 156 letter templates</p>
                                        <p className="text-xs text-emerald-600 mt-3 font-medium group-hover:underline">Click to explore &rarr;</p>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* The 10 Steps Grid */}
                        <section className="py-8 px-6 md:px-8 bg-white">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-600 uppercase tracking-[0.2em] text-xs mb-3 font-bold">BW CONSULTANT &mdash; INTAKE PHASE</p>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">What Gets Captured Across 10 Dimensions</h3>
                                <p className="text-sm text-slate-600 mb-1">Most users complete this in 30&ndash;45 minutes. BW Consultant builds this picture through conversation &mdash; asking the right questions in sequence so you never face a blank form. By the end, the system has clear scope, quantified assumptions, full risk visibility, and a consistent dataset the reasoning engine can trust.</p>
                                <p className="text-sm text-slate-500 mb-6">Click any dimension to see what gets captured:</p>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                                    {tenStepProtocol.map((item) => (
                                        <button
                                            key={item.step}
                                            onClick={() => setActiveStep(activeStep === item.step ? null : item.step)}
                                            className={`text-left transition-all rounded-lg p-4 border-2 ${
                                                activeStep === item.step
                                                    ? 'bg-blue-100 border-blue-400 shadow-md'
                                                    : item.gliEnabled
                                                        ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
                                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    activeStep === item.step ? 'bg-blue-600 text-white' : item.gliEnabled ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    {item.step}
                                                </div>
                                                {item.gliEnabled && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded font-medium">GLI</span>}
                                            </div>
                                            <h4 className="text-xs font-semibold text-slate-700 leading-tight">{item.title}</h4>
                                        </button>
                                    ))}
                                </div>

                                {/* Active Step Detail */}
                                {activeStep && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Step {activeStep}: {tenStepProtocol[activeStep - 1].title}</h4>
                                        <p className="text-sm text-slate-600 mb-4">{tenStepProtocol[activeStep - 1].description}</p>

                                        {tenStepProtocol[activeStep - 1].gliEnabled && tenStepProtocol[activeStep - 1].gliNote && (
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                                                <p className="text-xs text-indigo-700 font-medium"><span className="font-bold">BW Intel Integration:</span> {tenStepProtocol[activeStep - 1].gliNote}</p>
                                            </div>
                                        )}

                                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                                            <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Data Requirements:</h5>
                                            <ul className="grid md:grid-cols-2 gap-2">
                                                {tenStepProtocol[activeStep - 1].details.map((detail, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                                                        <CheckCircle2 size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                        {detail}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Stage 2 — Adversarial Analysis */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-t border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-amber-600 uppercase tracking-[0.2em] text-xs mb-3 font-bold">STAGE 2 &mdash; ADVERSARIAL ANALYSIS</p>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Every Claim Gets Stress-Tested</h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-6">
                                    Once intake is complete, the system stress-tests every claim. A SAT Contradiction Solver checks for logical inconsistencies across your inputs. Five adversarial personas &mdash; Skeptic, Advocate, Regulator, Accountant, Operator &mdash; debate the opportunity using Bayesian inference. 38+ proprietary formulas calculate risk-adjusted returns, stakeholder alignment, and strategic positioning. Monte Carlo simulation runs 5,000 scenarios to show you the real distribution of outcomes, not just the optimistic case.
                                </p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white border border-amber-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                            <Shield size={16} className="text-amber-600" />
                                            What Gets Tested
                                        </h4>
                                        <ul className="space-y-2 text-xs text-slate-600">
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Input contradictions via SAT Solver</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Five adversarial personas debate every angle</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> 38+ proprietary scoring formulas</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Monte Carlo across 5,000 scenarios</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Regional Development Kernel with causal graphs</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Partner Intelligence Engine rankings</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white border border-amber-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                            <FileCheck size={16} className="text-amber-600" />
                                            What Comes Out
                                        </h4>
                                        <ul className="space-y-2 text-xs text-slate-600">
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Quantified scores with confidence intervals</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Risk matrix with mitigations</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Adversarial debate transcripts</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Outcome distribution from simulation</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Structural twin region benchmarks</li>
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> Ranked co-investor and partner shortlists</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Stage 3 — Institutional Output */}
                        <section className="py-8 px-6 md:px-8 bg-white border-t border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-emerald-600 uppercase tracking-[0.2em] text-xs mb-3 font-bold">STAGE 3 &mdash; INSTITUTIONAL OUTPUT</p>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Every Score Becomes a Document</h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-6">
                                    Every score, every debate conclusion, every simulation result flows into document generation. 247 document types across 15 categories. 156 letter templates for every stage of deal-making. All populated with your actual data, exact scores, and traceable reasoning &mdash; not AI-generated placeholder text. The 15th category, Case Study Intelligence, lets you upload existing reports, proposals, or case studies and receive full NSIL analysis: scored sections, adversarial debate, historical parallels, and recommended documents.
                                </p>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                                        <p className="text-3xl font-bold text-emerald-700 mb-1">247+</p>
                                        <p className="text-xs font-semibold text-slate-700">Document Types</p>
                                        <p className="text-xs text-slate-500 mt-1">Across 15 categories, covering the full project lifecycle</p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                                        <p className="text-3xl font-bold text-emerald-700 mb-1">156+</p>
                                        <p className="text-xs font-semibold text-slate-700">Letter Templates</p>
                                        <p className="text-xs text-slate-500 mt-1">For every stage of deal-making, LOIs to closing briefs</p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                                        <p className="text-3xl font-bold text-emerald-700 mb-1">100%</p>
                                        <p className="text-xs font-semibold text-slate-700">Your Data</p>
                                        <p className="text-xs text-slate-500 mt-1">Exact scores and reasoning &mdash; no AI placeholder text</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Close Button */}
                        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-sm">
                            <button 
                                onClick={() => setShowProtocolDetails(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WORKFLOW STAGE DETAIL POPUPS */}
            {activeWorkflowStage && (
                <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4" onClick={() => setActiveWorkflowStage(null)}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Stage 1: Structured Intake */}
                        {activeWorkflowStage === 'intake' && (
                            <>
                                <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 to-blue-900 rounded-t-lg px-8 py-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-200 uppercase tracking-[0.2em] text-xs font-bold mb-1">STAGE 1</p>
                                        <h3 className="text-xl font-bold text-white">Structured Intake</h3>
                                        <p className="text-blue-200 text-sm mt-1">Define the opportunity in measurable terms</p>
                                    </div>
                                    <button onClick={() => setActiveWorkflowStage(null)} className="text-blue-200 hover:text-white transition-colors p-2"><X size={24} /></button>
                                </div>
                                <div className="p-6 md:p-8 space-y-6">
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        The intake process forces clarity. You cannot submit vague aspirations &mdash; the system requires specific, measurable, verifiable data. This isn&rsquo;t bureaucracy; it&rsquo;s the foundation that makes everything else possible.
                                    </p>
                                    
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-blue-700 mb-3">The 10 Dimensions Captured</h4>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            {tenStepProtocol.map((item) => (
                                                <div key={item.step} className="flex items-start gap-3 text-xs text-slate-600 bg-white p-3 rounded border border-blue-100">
                                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.step}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{item.title}</p>
                                                        <p className="text-slate-500 mt-0.5">{item.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">Why This Matters</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Every downstream analysis &mdash; the formulas, the debate, the scoring &mdash; depends on the quality of inputs. Garbage in, garbage out. The structured intake ensures the reasoning engine works with complete, well-structured, internally consistent data. The same inputs will always produce the same validated output.
                                        </p>
                                    </div>
                                </div>
                                <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                                    <button onClick={() => setActiveWorkflowStage(null)} className="px-6 py-2 bg-slate-900 text-white rounded-sm text-sm font-bold hover:bg-slate-800 transition-all">Close</button>
                                </div>
                            </>
                        )}

                        {/* Stage 2: Adversarial Analysis */}
                        {activeWorkflowStage === 'analysis' && (
                            <>
                                <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-600 to-amber-800 rounded-t-lg px-8 py-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-amber-200 uppercase tracking-[0.2em] text-xs font-bold mb-1">STAGE 2</p>
                                        <h3 className="text-xl font-bold text-white">Adversarial Analysis</h3>
                                        <p className="text-amber-200 text-sm mt-1">Stress-test with personas and scoring models</p>
                                    </div>
                                    <button onClick={() => setActiveWorkflowStage(null)} className="text-amber-200 hover:text-white transition-colors p-2"><X size={24} /></button>
                                </div>
                                <div className="p-6 md:p-8 space-y-6">
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        Once your inputs are validated, the system attacks them from every angle. This isn&rsquo;t optimistic forecasting &mdash; it&rsquo;s rigorous stress-testing designed to find problems before the market does.
                                    </p>

                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-amber-700 mb-3">The Adversarial Pipeline</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-amber-100">
                                                <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">SAT Contradiction Solver</p>
                                                    <p className="text-xs text-slate-600">Converts inputs to propositional logic (CNF) and runs DPLL satisfiability checks. Catches conflicts like &ldquo;low risk + 40% ROI&rdquo; immediately.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-amber-100">
                                                <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">38+ Formula Engine</p>
                                                    <p className="text-xs text-slate-600">DAG Scheduler executes SPI, RROI, SEAM, and 35+ more formulas across 5 dependency levels. Each produces bounded, auditable scores.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-amber-100">
                                                <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">Five-Persona Bayesian Debate</p>
                                                    <p className="text-xs text-slate-600">Skeptic (1.2x weight), Advocate, Regulator, Accountant, Operator. Each votes proceed/pause/restructure/reject. Beliefs update via Bayesian inference.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-amber-100">
                                                <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">Monte Carlo Stress Testing</p>
                                                    <p className="text-xs text-slate-600">5,000 simulated futures with Markov state transitions. Tests your proposal against economic shocks, policy changes, and market shifts.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">The Output</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            A classification (Investment Ready, Conditional, Do Not Proceed) backed by quantified scores, persona reasoning transcripts, and specific findings that support or challenge the proposal. Nothing is smoothed over. Disagreements are preserved.
                                        </p>
                                    </div>
                                </div>
                                <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                                    <button onClick={() => setActiveWorkflowStage(null)} className="px-6 py-2 bg-slate-900 text-white rounded-sm text-sm font-bold hover:bg-slate-800 transition-all">Close</button>
                                </div>
                            </>
                        )}

                        {/* Stage 3: Institutional Output */}
                        {activeWorkflowStage === 'output' && (
                            <>
                                <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-t-lg px-8 py-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-emerald-200 uppercase tracking-[0.2em] text-xs font-bold mb-1">STAGE 3</p>
                                        <h3 className="text-xl font-bold text-white">Institutional Output</h3>
                                        <p className="text-emerald-200 text-sm mt-1">Compile evidence into auditable deliverables</p>
                                    </div>
                                    <button onClick={() => setActiveWorkflowStage(null)} className="text-emerald-200 hover:text-white transition-colors p-2"><X size={24} /></button>
                                </div>
                                <div className="p-6 md:p-8 space-y-6">
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        The final stage transforms validated analysis into professional deliverables. Every document is populated with real data, exact scores, and traceable reasoning &mdash; not AI-generated fluff.
                                    </p>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                                            <h4 className="text-lg font-bold text-emerald-700 mb-2">247 Document Types</h4>
                                            <p className="text-xs text-slate-600 mb-3">Across 15 categories:</p>
                                            <ul className="space-y-1.5 text-xs text-slate-600">
                                                <li>&bull; Foundation &amp; Strategic Planning</li>
                                                <li>&bull; Financial Analysis &amp; Modeling</li>
                                                <li>&bull; Risk Assessment &amp; Mitigation</li>
                                                <li>&bull; Government &amp; Policy Compliance</li>
                                                <li>&bull; Partnership &amp; Stakeholder Management</li>
                                                <li>&bull; Governance &amp; Monitoring</li>
                                                <li>&bull; ESG &amp; Sustainability Reporting</li>
                                                <li className="text-violet-700 font-medium">&bull; Case Study Intelligence &amp; Analysis</li>
                                                <li>&bull; And 7 more categories...</li>
                                            </ul>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                                            <h4 className="text-lg font-bold text-blue-700 mb-2">156 Letter Templates</h4>
                                            <p className="text-xs text-slate-600 mb-3">Professional correspondence for:</p>
                                            <ul className="space-y-1.5 text-xs text-slate-600">
                                                <li>&bull; Investment LOI &amp; EOI</li>
                                                <li>&bull; Government Applications</li>
                                                <li>&bull; Compliance Declarations</li>
                                                <li>&bull; Stakeholder Engagement</li>
                                                <li>&bull; Partnership Proposals</li>
                                                <li>&bull; Trade &amp; Export Documentation</li>
                                                <li>&bull; Crisis Communications</li>
                                                <li>&bull; And 8 more categories...</li>
                                            </ul>
                                            <button 
                                                onClick={() => { setActiveWorkflowStage(null); setShowProtocolLetters(true); }}
                                                className="mt-4 w-full py-2 bg-blue-600 text-white rounded-sm text-xs font-bold hover:bg-blue-500 transition-all"
                                            >
                                                View Full Letter Catalog
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-5">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">Audit Trail &amp; Provenance</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Every number in every document traces back to a specific formula, a specific input, a specific line of reasoning. The system maintains full provenance so that any stakeholder &mdash; investor, regulator, board member &mdash; can verify exactly how each conclusion was reached.
                                        </p>
                                    </div>
                                </div>
                                <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                                    <button onClick={() => setActiveWorkflowStage(null)} className="px-6 py-2 bg-slate-900 text-white rounded-sm text-sm font-bold hover:bg-slate-800 transition-all">Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* PROTOCOL LETTER CATALOG POPUP */}
            {showProtocolLetters && (
                <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowProtocolLetters(false)}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 to-blue-900 rounded-t-lg px-8 py-6 flex items-center justify-between">
                            <div>
                                <p className="text-blue-200 uppercase tracking-[0.2em] text-xs font-bold mb-1">FULL LETTER CATALOG</p>
                                <h3 className="text-xl font-bold text-white">156 Professional Letter Templates</h3>
                            </div>
                            <button onClick={() => setShowProtocolLetters(false)} className="text-blue-200 hover:text-white transition-colors p-2"><X size={24} /></button>
                        </div>
                        <div className="p-6 md:p-8 space-y-6">
                            {/* Investment Letters */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                                    <TrendingUp size={16} />
                                    Investment Letters (10)
                                </h5>
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>&bull; Letter of Intent (LOI) &mdash; Investment</span>
                                    <span>&bull; Letter of Intent (LOI) &mdash; Partnership</span>
                                    <span>&bull; Investor Update Letter</span>
                                    <span>&bull; Proposal Cover Letter</span>
                                    <span>&bull; Capital Call Notice</span>
                                    <span>&bull; Dividend Declaration</span>
                                    <span>&bull; Investment Commitment Letter</span>
                                    <span>&bull; Co-Investment Invitation</span>
                                    <span>&bull; Fund Launch Announcement</span>
                                    <span>&bull; Portfolio Company Update</span>
                                </div>
                            </div>

                            {/* Government Letters */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                                    <Building2 size={16} />
                                    Government &amp; Regulatory Letters (18)
                                </h5>
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>&bull; Expression of Interest (EOI) &mdash; Government Project</span>
                                    <span>&bull; Investment Incentive Application</span>
                                    <span>&bull; Regulatory Inquiry Letter</span>
                                    <span>&bull; MoU Proposal Letter</span>
                                    <span>&bull; License Renewal Application</span>
                                    <span>&bull; Permit Application Letter</span>
                                    <span>&bull; Environmental Clearance Request</span>
                                    <span>&bull; Tax Exemption Application</span>
                                    <span>&bull; Customs Facilitation Request</span>
                                    <span>&bull; Special Economic Zone Application</span>
                                    <span>&bull; Grant Application Cover</span>
                                    <span>&bull; Subsidy Request Letter</span>
                                    <span>&bull; PPP Proposal Letter</span>
                                    <span>&bull; Sovereign Guarantee Request</span>
                                    <span>&bull; Bilateral Agreement Proposal</span>
                                    <span>&bull; Trade Mission Request</span>
                                    <span>&bull; Ministerial Introduction Letter</span>
                                    <span>&bull; Policy Submission Cover</span>
                                </div>
                            </div>

                            {/* Compliance Letters */}
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
                                    <Shield size={16} />
                                    Compliance &amp; Legal Letters (12)
                                </h5>
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>&bull; AML/KYC Declaration Letter</span>
                                    <span>&bull; Compliance Assurance Letter</span>
                                    <span>&bull; Beneficial Ownership Declaration</span>
                                    <span>&bull; Sanctions Clearance Confirmation</span>
                                    <span>&bull; PEP Declaration Letter</span>
                                    <span>&bull; Source of Funds Declaration</span>
                                    <span>&bull; Audit Response Letter</span>
                                    <span>&bull; Regulatory Compliance Confirmation</span>
                                    <span>&bull; Data Protection Confirmation (GDPR)</span>
                                    <span>&bull; Anti-Corruption Compliance Letter</span>
                                    <span>&bull; Export Control Declaration</span>
                                    <span>&bull; Conflict of Interest Disclosure</span>
                                </div>
                            </div>

                            {/* Stakeholder Letters */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                                    <Users size={16} />
                                    Stakeholder &amp; Community Letters (10)
                                </h5>
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>&bull; Community Notification Letter</span>
                                    <span>&bull; Stakeholder Engagement Letter</span>
                                    <span>&bull; Public Consultation Invitation</span>
                                    <span>&bull; Impact Assessment Notification</span>
                                    <span>&bull; Community Benefit Agreement Proposal</span>
                                    <span>&bull; Local Content Commitment Letter</span>
                                    <span>&bull; Indigenous Rights Consultation</span>
                                    <span>&bull; Resettlement Notification</span>
                                    <span>&bull; Grievance Mechanism Introduction</span>
                                    <span>&bull; Employment Opportunity Announcement</span>
                                </div>
                            </div>

                            {/* Trade Letters */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                                    <Globe size={16} />
                                    Trade &amp; International Letters (14)
                                </h5>
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>&bull; Trade Inquiry Letter</span>
                                    <span>&bull; Customs/Trade Facilitation Letter</span>
                                    <span>&bull; DFI Concept Note Cover</span>
                                    <span>&bull; UN Agency Submission Letter</span>
                                    <span>&bull; Export Declaration Letter</span>
                                    <span>&bull; Import License Request</span>
                                    <span>&bull; Certificate of Origin Request</span>
                                    <span>&bull; Trade Credit Application</span>
                                    <span>&bull; Letter of Credit Request</span>
                                    <span>&bull; Shipping Instruction Letter</span>
                                    <span>&bull; Consignment Agreement Cover</span>
                                    <span>&bull; Distribution Agreement Proposal</span>
                                    <span>&bull; Agency Agreement Proposal</span>
                                    <span>&bull; Franchise Opportunity Letter</span>
                                </div>
                            </div>

                            {/* Partnership Letters */}
                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-cyan-700 mb-3 flex items-center gap-2">
                                    <Briefcase size={16} />
                                    Partnership &amp; Negotiation Letters (12)
                                </h5>
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>&bull; Partnership Introduction</span>
                                    <span>&bull; JV Invitation Letter</span>
                                    <span>&bull; Consortium Formation Letter</span>
                                    <span>&bull; Teaming Agreement Proposal</span>
                                    <span>&bull; Co-Development Invitation</span>
                                    <span>&bull; Technology Transfer Proposal</span>
                                    <span>&bull; Capacity Building Proposal</span>
                                    <span>&bull; Price Negotiation Letter</span>
                                    <span>&bull; Term Renegotiation Request</span>
                                    <span>&bull; Contract Extension Request</span>
                                    <span>&bull; Performance Improvement Notice</span>
                                    <span>&bull; Partnership Termination Notice</span>
                                </div>
                            </div>

                            {/* Operations & Crisis Letters */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <Zap size={16} />
                                        Operations &amp; Procurement (12)
                                    </h5>
                                    <div className="space-y-1.5 text-xs text-slate-600">
                                        <span className="block">&bull; Vendor Onboarding Letter</span>
                                        <span className="block">&bull; Supplier Qualification Request</span>
                                        <span className="block">&bull; RFP/RFQ Cover Letter</span>
                                        <span className="block">&bull; Bid Submission Cover</span>
                                        <span className="block">&bull; Contract Award Notification</span>
                                        <span className="block">&bull; Purchase Order Confirmation</span>
                                        <span className="block">&bull; Delivery Schedule Confirmation</span>
                                        <span className="block">&bull; Quality Assurance Letter</span>
                                        <span className="block">&bull; Warranty Claim Letter</span>
                                        <span className="block">&bull; Payment Release Request</span>
                                        <span className="block">&bull; Force Majeure Notification</span>
                                        <span className="block">&bull; Contract Variation Request</span>
                                    </div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h5 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                                        <Scale size={16} />
                                        Crisis &amp; Communications (10)
                                    </h5>
                                    <div className="space-y-1.5 text-xs text-slate-600">
                                        <span className="block">&bull; Crisis Statement Letter</span>
                                        <span className="block">&bull; Incident Notification</span>
                                        <span className="block">&bull; Media Response Letter</span>
                                        <span className="block">&bull; Stakeholder Reassurance Letter</span>
                                        <span className="block">&bull; Regulatory Incident Report</span>
                                        <span className="block">&bull; Insurance Claim Letter</span>
                                        <span className="block">&bull; Legal Notice Response</span>
                                        <span className="block">&bull; Dispute Resolution Proposal</span>
                                        <span className="block">&bull; Settlement Offer Letter</span>
                                        <span className="block">&bull; Apology/Remediation Letter</span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-5">
                                <p className="text-sm text-white">
                                    <strong>156 templates</strong> covering every stage of global deal-making &mdash; from initial outreach to crisis management. Each template includes tone guidance, required structure, and key elements tailored to the specific audience and purpose.
                                </p>
                            </div>
                        </div>
                        <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                            <button onClick={() => setShowProtocolLetters(false)} className="px-6 py-2 bg-slate-900 text-white rounded-sm text-sm font-bold hover:bg-slate-800 transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================== */}
            {/* UNIFIED SYSTEM OVERVIEW  -  Combined Protocol, Documents, Letters  */}
            {/* ================================================================== */}
            {showUnifiedSystemOverview && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowUnifiedSystemOverview(false)}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
                        {/* Sticky Header - matches Technical Breakdown */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-lg px-8 py-6 flex items-center justify-between">
                            <div>
                                <p className="text-blue-400 uppercase tracking-[0.2em] text-sm font-bold mb-1">COMPLETE SYSTEM OVERVIEW</p>
                                <h3 className="text-2xl font-bold text-white">How It Works &amp; What You Get</h3>
                            </div>
                            <button onClick={() => setShowUnifiedSystemOverview(false)} className="text-slate-400 hover:text-white transition-colors p-2">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tab Navigation - simplified */}
                        <div className="border-b border-slate-200 px-8 bg-slate-50">
                            <div className="flex flex-wrap">
                                <button 
                                    onClick={() => setUnifiedActiveTab('protocol')}
                                    className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 ${unifiedActiveTab === 'protocol' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    BW Consultant
                                </button>
                                <button 
                                    onClick={() => setUnifiedActiveTab('documents')}
                                    className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 ${unifiedActiveTab === 'documents' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    247 Document Types
                                </button>
                                <button 
                                    onClick={() => setUnifiedActiveTab('letters')}
                                    className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 ${unifiedActiveTab === 'letters' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    156 Letter Templates
                                </button>
                                <button 
                                    onClick={() => setUnifiedActiveTab('proof')}
                                    className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 ${unifiedActiveTab === 'proof' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    See Proof
                                </button>
                            </div>
                        </div>

                        {/* Body Content */}
                        <div className="p-6 md:p-8 space-y-6 text-sm text-slate-700 leading-relaxed">

                            {/* Introduction - always visible */}
                            <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-xs">BW</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">BW Consultant</p>
                                        <p className="text-xs text-blue-600 font-medium mt-0.5">Powered by NSIL Agentic Runtime &bull; Case Study Builder</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 mb-4 flex-wrap">
                                    {['Intake','Discovery','Analysis','Recommendations','Generation'].map((phase, i, arr) => (
                                        <span key={phase} className="flex items-center gap-1">
                                            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">{phase}</span>
                                            {i < arr.length - 1 && <span className="text-slate-300 text-xs">&rarr;</span>}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    BW Consultant is the conversational intelligence layer that feeds the full analysis engine. Instead of a form, you talk. The system listens, asks the highest-value follow-up questions, builds the structured case brief in the background, and routes it through three stages: <strong className="text-slate-900">Adaptive Intake</strong> (10 dimensions captured through natural conversation with case-method gating), <strong className="text-slate-900">Adversarial Analysis</strong> (46+ formulas, 5 personas, Monte Carlo across 5,000 scenarios, Regional Development Kernel with partner intelligence and causal graphs), and <strong className="text-slate-900">Institutional Output</strong> (247+ document types across 15 categories and 156+ letter templates, all populated with your actual scores and traceable reasoning &mdash; not AI placeholder text). Plus <strong className="text-slate-900">Case Study Intelligence</strong> &mdash; upload any report, proposal, or mandate and the system reads, scores, debates, and diagnoses it instantly.
                                </p>
                            </div>

                            {/* TAB CONTENT: Protocol */}
                            {unifiedActiveTab === 'protocol' && (
                                <>
                                    <h4 className="text-lg font-bold text-slate-900 pt-2">What BW Consultant Captures &mdash; 10 Dimensions</h4>
                                    <p>BW Consultant builds the case brief through conversation, not a form. It asks the highest-value question at each point, infers facts from context, and structures the intake across 10 dimensions. Most sessions complete this in 30&ndash;45 minutes. By the end, the reasoning engine has clear scope, quantified assumptions, full risk visibility, and a consistent dataset it can trust.</p>

                                    <div className="border-l-2 border-blue-200 pl-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-900">1. Opportunity Definition</p>
                                            <p className="text-slate-600">Project name, type, sector, target region, investment scale, timeline. The foundation everything else builds on.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">2. Strategic Alignment</p>
                                            <p className="text-slate-600">Alignment with national/regional policy, SDG mapping, government priority status, bilateral agreements.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">3. Market Analysis</p>
                                            <p className="text-slate-600">Demand drivers, supply gaps, competitive landscape, pricing dynamics, growth trajectory.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">4. Financial Structure</p>
                                            <p className="text-slate-600">CAPEX, OPEX, revenue model, funding mix, IRR targets, payback expectations, currency exposure.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">5. Risk Assessment</p>
                                            <p className="text-slate-600">Political, regulatory, operational, financial, environmental, social risks with probability and impact.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">6. Stakeholder Mapping</p>
                                            <p className="text-slate-600">Government bodies, investors, partners, communities, regulators &mdash; influence, interest, engagement strategy.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">7. Implementation Pathway</p>
                                            <p className="text-slate-600">Phasing, milestones, dependencies, critical path, resource requirements, decision gates.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">8. Compliance Requirements</p>
                                            <p className="text-slate-600">Permits, licenses, environmental approvals, sector-specific regulations, international standards.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">9. Partnership Terms</p>
                                            <p className="text-slate-600">Equity split, governance structure, decision rights, exit mechanisms, IP ownership, non-compete clauses.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">10. Success Metrics</p>
                                            <p className="text-slate-600">KPIs, monitoring framework, reporting requirements, adjustment triggers, exit criteria.</p>
                                        </div>
                                    </div>

                                    <h4 className="text-lg font-bold text-slate-900 pt-4">Stage 2 &mdash; Adversarial Analysis</h4>
                                    <p>Once intake is complete, the system stress-tests every claim. A SAT Contradiction Solver checks for logical inconsistencies across your inputs. Five adversarial personas &mdash; Skeptic, Advocate, Regulator, Accountant, Operator &mdash; debate the opportunity using Bayesian inference. 38+ proprietary formulas calculate risk-adjusted returns, stakeholder alignment, and strategic positioning. Monte Carlo simulation runs 5,000 scenarios to show the real distribution of outcomes &mdash; not just the optimistic case. The Regional Development Kernel maps structural twin regions worldwide and builds a causal Problem-to-Solution Graph. The Partner Intelligence Engine ranks co-investors and delivery partners by fit, reliability, and local legitimacy.</p>

                                    <h4 className="text-lg font-bold text-slate-900 pt-4">Stage 3 &mdash; Institutional Output</h4>
                                    <p>Every score, every debate conclusion, every simulation result flows into document generation. 247 document types across 15 categories. 156 letter templates for every stage of deal-making &mdash; LOIs to closing briefs. All populated with your actual data, exact scores, and traceable reasoning &mdash; not AI-generated placeholder text. The 15th category, Case Study Intelligence, lets you upload existing reports, proposals, or case studies and receive full NSIL analysis with scored sections, adversarial debate, historical parallels, and recommended documents.</p>
                                </>
                            )}

                            {/* TAB CONTENT: Documents */}
                            {unifiedActiveTab === 'documents' && (
                                <>
                                    <h4 className="text-lg font-bold text-slate-900 pt-2">247 Document Types Across 15 Categories</h4>
                                    <p>Every document is populated with real data, exact scores, and traceable reasoning. Flexible page lengths from 1-page brief to 100-page full package.</p>

                                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">1. Foundation &amp; Strategic (18)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Regional Profile</li>
                                                <li>&bull; Strategic Mandate</li>
                                                <li>&bull; SWOT Analysis</li>
                                                <li>&bull; Investment Prospectus</li>
                                                <li>&bull; Market Positioning</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">2. Financial Analysis (22)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Financial Model</li>
                                                <li>&bull; Investment Brief</li>
                                                <li>&bull; Pro Forma</li>
                                                <li>&bull; Cash Flow</li>
                                                <li>&bull; Valuation</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">3. Risk Assessment (15)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Risk Assessment</li>
                                                <li>&bull; Mitigation Plan</li>
                                                <li>&bull; Due Diligence Report</li>
                                                <li>&bull; Scenario Analysis</li>
                                                <li>&bull; Sensitivity Analysis</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">4. Government &amp; Policy (17)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Policy Brief</li>
                                                <li>&bull; Incentive Application</li>
                                                <li>&bull; Government Submission</li>
                                                <li>&bull; MOU Draft</li>
                                                <li>&bull; Bilateral Proposal</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">5. Partnership (16)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Partnership Assessment</li>
                                                <li>&bull; LOI</li>
                                                <li>&bull; JV Agreement</li>
                                                <li>&bull; Stakeholder Map</li>
                                                <li>&bull; Partner Profile</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">6. Execution (21)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Project Plan</li>
                                                <li>&bull; Implementation Roadmap</li>
                                                <li>&bull; Milestone Report</li>
                                                <li>&bull; Change Management</li>
                                                <li>&bull; Transition Plan</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">7. Governance &amp; Board (12)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Board Charter</li>
                                                <li>&bull; Steering Committee Report</li>
                                                <li>&bull; Annual Report</li>
                                                <li>&bull; Quarterly Report</li>
                                                <li>&bull; Decision Matrix</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">8. Human Capital (12)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Org Chart</li>
                                                <li>&bull; Talent Gap Analysis</li>
                                                <li>&bull; Capability Assessment</li>
                                                <li>&bull; HR Due Diligence</li>
                                                <li>&bull; Succession Planning</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">9. Procurement &amp; Supply (13)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Procurement Strategy</li>
                                                <li>&bull; Vendor Scorecard</li>
                                                <li>&bull; Supply Chain Mapping</li>
                                                <li>&bull; Tender Document</li>
                                                <li>&bull; Bid Matrix</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">10. ESG &amp; Social Impact (19)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; ESG Report</li>
                                                <li>&bull; Sustainability Report</li>
                                                <li>&bull; Carbon Assessment</li>
                                                <li>&bull; Environmental Impact</li>
                                                <li>&bull; Social Impact</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">11. Regulatory &amp; Compliance (16)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Permit Application</li>
                                                <li>&bull; Compliance Certificate</li>
                                                <li>&bull; Regulatory Filing</li>
                                                <li>&bull; GDPR Policy</li>
                                                <li>&bull; Sanctions Clearance</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">12. Communications &amp; IR (17)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Press Release</li>
                                                <li>&bull; Media Kit</li>
                                                <li>&bull; Investor Presentation</li>
                                                <li>&bull; Crisis Plan</li>
                                                <li>&bull; Case Study</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">13. Asset &amp; Infrastructure (17)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Site Selection</li>
                                                <li>&bull; Technical Brief</li>
                                                <li>&bull; Infrastructure Assessment</li>
                                                <li>&bull; Grid Study</li>
                                                <li>&bull; PPA</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-1">14. Legal &amp; Agreements (17)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; NDA</li>
                                                <li>&bull; LOI</li>
                                                <li>&bull; MOU</li>
                                                <li>&bull; Term Sheet</li>
                                                <li>&bull; Shareholder Agreement</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-violet-700 mb-1">15. Case Study Intelligence (15)</h5>
                                            <ul className="space-y-0.5 text-sm text-slate-600">
                                                <li>&bull; Case Study Analysis Report</li>
                                                <li>&bull; Strength/Weakness Diagnostic</li>
                                                <li>&bull; Adversarial Debate Transcript</li>
                                                <li>&bull; Historical Parallel Report</li>
                                                <li>&bull; Replication Assessment</li>
                                            </ul>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* TAB CONTENT: Letters */}
                            {unifiedActiveTab === 'letters' && (
                                <>
                                    <h4 className="text-lg font-bold text-slate-900 pt-2">156 Letter Templates</h4>
                                    <p>Every stage of deal-making requires specific correspondence. These templates are populated with your project data, compliance status, and relevant scores.</p>

                                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Investment Letters (10)</h5>
                                            <p className="text-sm text-slate-600">LOI, Investor Update, Proposal Cover, Capital Call, Dividend Declaration, Investment Commitment, Co-Investment Invitation, Fund Launch, Portfolio Update, Exit Notification</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Government &amp; Regulatory (18)</h5>
                                            <p className="text-sm text-slate-600">EOI, Incentive Application, Regulatory Inquiry, MOU Proposal, Permit Application, Tax Exemption, Grant Application, PPP Proposal, Trade Mission Request, Embassy Introduction</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Compliance &amp; Legal (12)</h5>
                                            <p className="text-sm text-slate-600">AML/KYC Declaration, Beneficial Ownership, Sanctions Clearance, PEP Declaration, Source of Funds, Audit Response, GDPR Confirmation, Anti-Corruption Certification</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Stakeholder &amp; Community (10)</h5>
                                            <p className="text-sm text-slate-600">Community Notification, Stakeholder Engagement, Public Consultation, Impact Assessment, Community Benefit Agreement, Local Content Commitment</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Trade &amp; International (14)</h5>
                                            <p className="text-sm text-slate-600">Trade Inquiry, Customs Facilitation, DFI Concept Note, Export Declaration, Import License, Letter of Credit, Shipping Instructions, Distribution Proposal</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Partnership &amp; Negotiation (12)</h5>
                                            <p className="text-sm text-slate-600">Partnership Introduction, JV Invitation, Consortium Formation, Technology Transfer, Price Negotiation, Term Renegotiation, Contract Extension</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Operations &amp; Procurement (12)</h5>
                                            <p className="text-sm text-slate-600">Vendor Onboarding, Supplier Qualification, RFP Cover, Contract Award, Purchase Order, Delivery Confirmation, Quality Assurance, Warranty Claim</p>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2">Crisis &amp; Communications (10)</h5>
                                            <p className="text-sm text-slate-600">Crisis Statement, Incident Notification, Media Response, Stakeholder Reassurance, Insurance Claim, Legal Notice Response, Settlement Offer</p>
                                        </div>
                                    </div>

                                    <p className="pt-4">Each template includes tone guidance, required structure, and key elements tailored to the specific audience and purpose. All automatically populated with your project specifics.</p>
                                </>
                            )}

                            {/* TAB CONTENT: Proof */}
                            {unifiedActiveTab === 'proof' && (
                                <>
                                    <h4 className="text-lg font-bold text-slate-900 pt-2">See the System in Action</h4>
                                    <p>Words are cheap. The best way to understand what this system produces is to see an actual report it generated &mdash; not a mockup, not a template, but the real output from a real submission.</p>

                                    <h4 className="text-lg font-bold text-slate-900 pt-4">Real Example: Northland Regional Council</h4>
                                    <p>A regional council in New Zealand submitted a 5MW solar partnership proposal through the Ten-Step Protocol. The system ran the full pipeline &mdash; SAT validation, formula scoring, adversarial debate, Monte Carlo simulation &mdash; and produced a complete assessment package.</p>

                                    <div className="border-l-2 border-slate-300 pl-4 mt-4 space-y-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">Initial Assessment: DO NOT PROCEED</p>
                                            <p className="text-slate-600">SPI: 34% | RROI: 38/100</p>
                                            <p className="text-slate-600">Issues identified: Missing grid study, revenue projection 2.8x above benchmark</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">After Correction: INVESTMENT READY</p>
                                            <p className="text-slate-600">SPI: 78% | RROI: 74/100</p>
                                            <p className="text-slate-600">Council fixed both issues, system re-ran full analysis</p>
                                        </div>
                                    </div>

                                    <p className="pt-4">The system caught two critical errors that would have doomed the partnership. After correction, the council had a defensible investment case with full documentation.</p>

                                    <button 
                                        onClick={() => { setShowUnifiedSystemOverview(false); setShowProofPopup(true); }}
                                        className="mt-4 w-full py-3 bg-slate-900 text-white rounded text-sm font-semibold hover:bg-slate-800 transition-colors"
                                    >
                                        See the Full Report &mdash; Every Score, Every Debate, Every Output
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                            <button onClick={() => setShowUnifiedSystemOverview(false)} className="px-6 py-2 bg-slate-900 text-white rounded-sm text-sm font-bold hover:bg-slate-800 transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block 2  -  Read More Popup */}
            {showBlock2More && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowBlock2More(false)}>
                    <div className="bg-white rounded-sm max-w-3xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 md:p-8">
                            <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                                What sparked this: 12 months that changed everything.
                            </h3>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                It started with a frustration. I was watching regions with real potential  -  talent, resources, strategic location  -  get passed over because no tool existed to objectively prove their case. Investment decisions were being made on gut feel, biased reports, or whoever had the best pitch deck. I knew there had to be a better way. So I started building.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                The first thing I created was the formula engine  -  38+ proprietary formulas like SPI (Strategic Positioning Index), RROI (Risk-Adjusted Return on Investment), and SEAM (Strategic Ethical Alignment Matrix). Each one designed to quantify a dimension of investment intelligence that previously relied on subjective judgement. I built the <strong>DAG Scheduler</strong> to execute them in parallel across 5 dependency levels, so no formula runs before its inputs are ready. That was the foundation.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                Then I built the validation layer  -  a <strong>SAT Contradiction Solver</strong> that converts inputs into propositional logic and catches contradictions before anything else runs. If your assumptions conflict, the system tells you immediately. No more garbage-in-garbage-out.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                Next came the debate engine. I wanted the system to argue with itself  -  to stress-test every recommendation before it reached the user. So I built the <strong>Bayesian Debate Engine</strong> with 5 adversarial personas: the Skeptic hunts for deal-killers, the Advocate finds upside, the Regulator checks legality, the Accountant validates cash flow, and the Operator tests execution. Beliefs update via Bayesian inference. Disagreements are preserved, not smoothed over.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                Then I added autonomous intelligence  -  8 engines that think beyond the question. And reflexive intelligence  -  7 engines that analyse how <em>you</em> think. Layer by layer, month by month, the system grew. I called the orchestration engine the <strong>NSIL  -  the Nexus Strategic Intelligence Layer</strong>  -  a 10-layer pipeline I invented from scratch to make all of this run deterministically.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-4">
                                128 TypeScript files. 50,000 lines of code. Clean builds in under 5 seconds across 2,105 modules. Full type safety with 900+ lines of strict definitions. 209.38 kB gzipped. One person. Twelve months. Everything built from nothing.
                            </p>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-2 text-center">
                                    <p className="text-xl font-bold text-blue-600">13</p>
                                    <p className="text-xs text-slate-600">Core Algorithms</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-2 text-center">
                                    <p className="text-xl font-bold text-blue-600">38+</p>
                                    <p className="text-xs text-slate-600">Formulas</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-2 text-center">
                                    <p className="text-xl font-bold text-blue-600">10</p>
                                    <p className="text-xs text-slate-600">Layers</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-2 text-center">
                                    <p className="text-xl font-bold text-blue-600">50K</p>
                                    <p className="text-xs text-slate-600">Lines of Code</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setShowBlock2More(false)} className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block 3  -  Read More Popup */}
            {showBlock3More && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowBlock3More(false)}>
                    <div className="bg-white rounded-sm max-w-3xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 md:p-8">
                            <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                                Then I discovered something that changed the system forever.
                            </h3>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                By this point, I had a working intelligence system  -  formulas, validation, debate, autonomous engines, reflexive analysis, all running through the NSIL pipeline. It was already producing results no other platform could match. But something was missing. The outputs were technically correct, but they lacked the instinct of a seasoned human expert  -  the ability to sense that a deal feels wrong even when the numbers look right, or to know which risk deserves attention when ten are competing for it.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                That's when I found computational neuroscience  -  real mathematical models of how the human brain makes decisions under pressure. Models from published university research that had been sitting in academic papers for decades, never implemented in a practical system. I realised they could slot directly into the architecture I'd already built. The NSIL was designed to be extensible. So I added them.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                I wrote the <strong>Human Cognition Engine</strong>  -  1,307 lines of code implementing 7 neuroscience models as faithful mathematical implementations. Not simplified approximations. The real models, running live inside the NSIL pipeline. This is what turned a powerful analytics system into something genuinely new  -  the first platform that doesn't just calculate answers, but thinks about them the way a human expert would.
                            </p>
                            <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 space-y-2 mb-3">
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Wilson-Cowan Neural Fields</strong>  -  Your brain has billions of neurons, some saying "go" (excitatory) and some saying "stop" (inhibitory). These differential equations (du/dt = -u + integral w(r-r').f(v) dr') model that battle on a 50 - 50 grid, simulating how experts balance competing factors like profit vs. risk. The NSIL runs this live with your data.
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Predictive Processing (Rao &amp; Ballard)</strong>  -  Our brains don't just react; they predict. Bayesian inference across 3 hierarchical levels anticipates what comes next  -  like forecasting market shifts from historical precedent. Learning rate 0.1, with prediction error minimisation at every level.
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Friston's Free Energy Principle</strong>  -  The brain minimises "surprise" by constantly updating beliefs. Variational inference across 8 candidate policies (gamma=0.95) simulates how we adapt when new information arrives  -  revising plans without hallucinating.
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Attention Allocation (Itti &amp; Koch)</strong>  -  Why do you notice one risk and miss another? Salience maps with winner-take-all competition and inhibition of return (0.7) model how the brain spots what matters in a sea of data.
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Emotional Valence</strong>  -  Prospect theory shows the pain of losing GBP100 hurts more than the joy of gaining GBP100. This assigns emotional weight to every option, flagging deals that look good on paper but feel wrong.
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Global Workspace Theory</strong>  -  Think of your brain as an office where every department shares information through one central workspace. Coalition formation with ignition threshold 0.6 ensures all layers integrate into coherent insights.
                                </p>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                    <strong className="text-slate-900">Working Memory (Baddeley's Model)</strong>  -  Human short-term memory is limited. Phonological decay 0.05, visual decay 0.03, rehearsal benefit 0.2  -  this focuses outputs on the 3"5 factors that actually matter.
                                </p>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                No other platform  -  not Palantir, not Bloomberg Terminal, not McKinsey's analytics  -  implements any of these models. BWGA Ai implements all seven. And they work because the NSIL was built to accommodate exactly this kind of extension  -  I just didn't know these models existed when I designed it. They fit perfectly into what I'd already created.
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                                That's what makes this a world first. Not just the neuroscience. Not just the formulas. Not just the debate engine or the autonomous engines. It's the fact that one person built an architecture flexible enough to unify all of them  -  and then discovered the missing piece that made it complete.
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setShowBlock3More(false)} className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block 4  -  Read More Popup */}
            {showBlock4More && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowBlock4More(false)}>
                    <div className="bg-white rounded-sm max-w-3xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 md:p-8">
                            <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                                It doesn't just answer. It thinks beyond your question  -  and analyses how you think.
                            </h3>
                            <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                I created 8 autonomous engines that actively discover insights you never asked for. Creative Synthesis uses bisociation theory to find strategies from unrelated domains. Ethical Reasoning enforces Rawlsian fairness gates  -  if a path is unethical, it's rejected, no matter how profitable. Self-Evolving Algorithms tune their own formula weights using gradient descent with rollback. Scenario Simulation runs 5,000 Monte Carlo futures with causal feedback loops.
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed mb-4">
                                Then 7 reflexive engines analyse <em>you</em>. User Signal Decoder uses Shannon's information theory to detect what you repeat (what matters) and what you avoid (where anxiety lives). Regional Mirroring finds your structural twin region worldwide. Latent Advantage Miner surfaces assets you mentioned casually that have real strategic significance. Every finding is then translated for 5 distinct audiences  -  investors, government, community, partners, executives  -  in their own language.
                            </p>
                            <div className="space-y-2">
                                <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-r-sm p-3">
                                    <p className="text-xs font-bold text-indigo-800">Autonomous Intelligence  -  8 Engines</p>
                                    <p className="text-xs text-indigo-600">CRE, CDT, AGL, ETH, EVO, ADA, EMO, SIM  -  creative synthesis, cross-domain transfer, ethical gates, adaptive learning, Monte Carlo simulation.</p>
                                </div>
                                <div className="bg-sky-50 border-l-4 border-sky-500 rounded-r-sm p-3">
                                    <p className="text-xs font-bold text-sky-800">Reflexive Intelligence  -  7 Engines</p>
                                    <p className="text-xs text-sky-600">Signal decoding, echo detection, lifecycle mapping, regional mirroring, identity decoding, latent advantage mining, universal translation.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setShowBlock4More(false)} className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block 5  -  What You Get & How It Works Popup Modal */}
            {showBlock5Popup && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowBlock5Popup(false)}>
                    <div className="bg-white rounded-sm max-w-4xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>

                        {/* WHAT YOU GET section  -  styled like landing page */}
                        <section className="py-12 px-6 md:px-8 bg-slate-100 rounded-t-sm">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-600 uppercase tracking-[0.2em] text-sm mb-3 font-bold">WHAT YOU GET</p>
                                <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-3">So What Comes Out the Other End?</h2>
                                
                                <p className="text-base text-slate-700 leading-relaxed mb-6">
                                    The output isn't "AI text." The output is a complete decision package: the structured case, the quantified scores, the key risks and mitigations, the stakeholder narrative, and the supporting material required to move from idea  partner conversation  formal submission.
                                </p>

                                {/* Watch it happen live */}
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                        You can watch it all happen, live.
                                    </h3>
                                    <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                        While the system builds your case, you can watch every step in real time. You'll see the five expert personas debating your proposal, the scoring formulas running one by one, the risk models stress-testing your assumptions, and the final strategy assembling itself section by section. Nothing is hidden. Every score, every conclusion, every piece of evidence is visible and traceable.
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        This isn't a black box  -  it's a glass box. The same inputs will always produce the same validated output. That's the whole point: if you can't see how it reached its answer, why would you trust it?
                                    </p>
                                </div>

                                {/* Reassurance message */}
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-sm p-6 mb-6">
                                    <p className="text-base text-white leading-relaxed font-medium">
                                        The good news? You don't need to understand how any of this works under the hood. You just need to know it's there  -  working for you, 24/7  -  producing rigorous, defensible, repeatable output every single time. Here's what that actually looks like.
                                    </p>
                                </div>

                                <button 
                                    onClick={() => { setShowBlock5Popup(false); setShowOutputDetails(true); }}
                                    className="w-full py-3 bg-blue-600 text-white border border-blue-700 rounded-sm text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                >
                                    <Info size={16} />
                                    More Details  -  Full Document Catalog &amp; Audit Trail
                                </button>
                            </div>
                        </section>

                        {/* Photo Banner  -  Strategic Planning */}
                        <div className="w-full h-40 md:h-52 relative overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920&h=400&fit=crop&q=80" alt="Strategic planning session" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 to-slate-900/10" />
                        </div>

                        {/* THE TEN-STEP PROTOCOL  -  styled like landing page */}
                        <section id="protocol" className="py-12 px-6 md:px-8 bg-white">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-600 uppercase tracking-[0.2em] text-sm mb-3 font-bold">HOW YOU FEED THE BRAIN</p>
                                <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-2">The Ten-Step Protocol</h2>
                                <p className="text-base text-blue-600 mb-4 flex items-center gap-2 font-medium">
                                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Most users complete this in 30-45 minutes
                                </p>

                                <p className="text-base text-slate-700 leading-relaxed mb-6">
                                    Most projects fail not from lack of potential, but from incomplete preparation. The Ten-Step Protocol is the antidote  -  a structured process that transforms a rough idea into a complete, decision-ready input set. Each step captures a critical dimension of your opportunity: identity, strategy, market context, partnerships, financials, risks, resources, execution, governance, and final readiness.
                                </p>

                                <button 
                                    onClick={() => { setShowBlock5Popup(false); setUnifiedActiveTab('protocol'); setShowUnifiedSystemOverview(true); }}
                                    className="w-full py-3 bg-blue-600 text-white border border-blue-700 rounded-sm text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                >
                                    <Info size={16} />
                                    More Details  -  View All 10 Steps &amp; Data Requirements
                                </button>
                            </div>
                        </section>

                        {/* Close button */}
                        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-sm">
                            <button 
                                onClick={() => setShowBlock5Popup(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Proof of Capability  -  Full Report Popup Modal */}
            {showProofPopup && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowProofPopup(false)}>
                    <div className="bg-white rounded-sm max-w-4xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>

                        {/* --- INTRODUCTION --- */}
                        <section className="py-12 px-6 md:px-8 bg-slate-100 rounded-t-sm">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-600 uppercase tracking-[0.2em] text-sm mb-2 font-bold">PROOF OF CAPABILITY</p>
                                <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-3">A Real Report From a Real Project</h2>
                                <p className="text-base text-slate-700 leading-relaxed mb-4">
                                    A regional council in New Zealand wanted to know: <strong>&ldquo;Should we partner with Vestas to build a 5MW solar installation?&rdquo;</strong> They submitted their project through the system, and what you&rsquo;re about to see is the complete answer &mdash; including the verdict, the reasoning, the risks identified, and exactly what they should do next.
                                </p>
                                <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <p className="text-sm text-slate-600 mb-2"><strong className="text-slate-900">What you&rsquo;ll see in this report:</strong></p>
                                    <ul className="text-sm text-slate-600 space-y-1">
                                        <li>&bull; <strong>The Question:</strong> Is this partnership viable?</li>
                                        <li>&bull; <strong>The Analysis:</strong> How the system tested and scored the proposal</li>
                                        <li>&bull; <strong>The Problems Found:</strong> Two critical issues that would have killed the deal</li>
                                        <li>&bull; <strong>The Fix:</strong> How they corrected those issues</li>
                                        <li>&bull; <strong>The Final Verdict:</strong> A clear YES/NO recommendation with reasoning</li>
                                        <li>&bull; <strong>The Next Steps:</strong> Exactly what to do now and how to proceed</li>
                                        <li>&bull; <strong>The Documents:</strong> All the paperwork generated automatically</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* --- HOW THE SYSTEM WROTE THIS --- */}
                        <section className="py-10 px-6 md:px-8 bg-white">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-blue-600 uppercase tracking-[0.2em] text-sm mb-2 font-bold">HOW THIS REPORT WAS BUILT</p>
                                <h3 className="text-xl font-semibold text-slate-900 mb-4">Every Number Has a Source. Every Conclusion Has a Trail.</h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-6">
                                    The system didn&rsquo;t generate this report the way a chatbot generates text. It ran a structured analytical pipeline &mdash; the same one that runs for every user &mdash; where each layer feeds the next and nothing moves forward until it&rsquo;s been validated. Here&rsquo;s exactly how it happened:
                                </p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-sm border border-slate-200">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                                        <div>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">The Council Submitted Their Data</p>
                                            <p className="text-sm text-slate-600">Northland Regional Council completed the Ten-Step Protocol &mdash; identity, strategic intent, market context, partners, financials, risk tolerance, resources, execution plan, governance, and final readiness. This structured submission became the raw input for every engine.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-sm border border-slate-200">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                                        <div>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">The System Checked for Contradictions</p>
                                            <p className="text-sm text-slate-600">The SAT Contradiction Solver converted every input into propositional logic and tested for conflicts. It immediately flagged that the council&rsquo;s Year 1 revenue projection of $4.2M contradicted regional benchmarks for a 5MW solar installation by a factor of 2.8&times;. It also detected a missing grid connection feasibility study &mdash; a dependency required by two downstream formulas.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-sm border border-slate-200">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                                        <div>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">38+ Formulas Ran Against the Validated Inputs</p>
                                            <p className="text-sm text-slate-600">The DAG Scheduler executed all formulas across 5 dependency levels. SPI (Strategic Positioning Index) scored the proposal at 34%. RROI computed a risk-adjusted return of 38/100. SCF Impact calculated $680K. Activation timeline modelled at 24 months P50. Every formula drew from the council&rsquo;s own submission and the system&rsquo;s built-in regional benchmarks.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-sm border border-slate-200">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                                        <div>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">Five Expert Personas Debated the Proposal</p>
                                            <p className="text-sm text-slate-600">The Bayesian Debate Engine ran an adversarial debate between five personas &mdash; the Skeptic, the Advocate, the Regulator, the Accountant, and the Operator. The Skeptic and Regulator both voted to block, citing the missing feasibility study and inflated revenue as disqualifying risks. Beliefs updated via Bayesian inference. The system classified the project as &ldquo;Do Not Proceed.&rdquo;</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-sm border border-slate-200">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                                        <div>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">The Council Fixed the Issues and Resubmitted</p>
                                            <p className="text-sm text-slate-600">Northland uploaded a utility interconnection agreement and revised Year 1 revenue from $4.2M to $1.4M. The system re-ran every formula, re-debated with all five personas, and re-scored the entire proposal. SPI jumped to 78%. RROI rose to 74/100. Classification upgraded to &ldquo;Investment Ready.&rdquo;</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-sm border border-slate-200">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">6</span>
                                        <div>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">The Report Was Assembled Automatically</p>
                                            <p className="text-sm text-slate-600">The Output Synthesis layer compiled every score, every debate transcript, every risk flag, and every formula derivation into the structured document you see below. The Cognition Layer added expert-level contextual judgement. The Monte Carlo engine stress-tested the proposal across 5,000 futures. Nothing was invented. Every conclusion traces to a specific formula, a specific engine, and a specific line of code.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-500 p-5 rounded-r-sm">
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        <strong className="text-slate-900">Where the information came from:</strong> All data sourced from (1) the council&rsquo;s own Ten-Step intake submission, (2) the system&rsquo;s built-in regional benchmarks covering 150+ countries, (3) policy and regulatory databases embedded in the Knowledge Layer, and (4) historical investment performance patterns spanning 25&ndash;63 years of documented methodology. No external API calls. No web scraping. No hallucination.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* --- DIVIDER --- */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-6 px-6 md:px-8">
                            <div className="max-w-4xl mx-auto text-center">
                                <p className="text-white/80 uppercase tracking-[0.2em] text-xs font-bold mb-1">BELOW IS THE ACTUAL SYSTEM OUTPUT</p>
                                <p className="text-white text-lg font-light">Northland Regional Council &mdash; 5MW Solar PV Partnership Assessment</p>
                            </div>
                        </div>

                        {/* Report Header */}
                        <section className="py-10 px-6 md:px-8 bg-white border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center font-bold text-white text-xs">BW</div>
                                            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">BWGA Ai &mdash; Live Report</span>
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-900">Strategic Partnership Viability Assessment</h2>
                                        <p className="text-sm text-slate-500 mt-1">Northland Regional Council &times; Vestas Energy Solutions</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600 font-bold uppercase">Live Test</div>
                                        <p className="text-xs text-slate-400 mt-1">Not a simulation</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Entity</p>
                                        <p className="text-sm font-semibold text-slate-900">Regional Council</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sector</p>
                                        <p className="text-sm font-semibold text-slate-900">Renewable Energy</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Project</p>
                                        <p className="text-sm font-semibold text-slate-900">5MW Solar PV</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Location</p>
                                        <p className="text-sm font-semibold text-slate-900">Northland, NZ</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Executive Summary */}
                        <section className="py-8 px-6 md:px-8 bg-white border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">Executive Summary</h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                                    Northland Regional Council proposed a 5MW solar photovoltaic partnership with Vestas Energy Solutions to serve the Northland region&rsquo;s growing renewable energy needs. The proposal was submitted through the Ten-Step Intake Protocol and processed by the full NSIL engine. On initial assessment, the system classified the project as <strong className="text-red-600">&ldquo;Do Not Proceed&rdquo;</strong> due to two critical deficiencies: a missing grid connection feasibility study and revenue projections 2.8&times; above the established regional benchmark for installations of this scale.
                                </p>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    After the council uploaded the required utility interconnection agreement and revised Year 1 revenue from $4.2M to $1.4M, the system re-ran every formula, re-convened the adversarial debate, and re-scored the proposal. The classification was upgraded to <strong className="text-blue-600">&ldquo;Investment Ready&rdquo;</strong> with a Strategic Positioning Index of 78% (Grade B).
                                </p>
                            </div>
                        </section>

                        {/* Scoring Comparison */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">Quantitative Scoring &mdash; NSIL Formula Engine Output</h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white border-2 border-red-200 rounded-sm p-5">
                                        <p className="text-xs text-red-600 uppercase tracking-wider font-bold mb-3">Run 1 &mdash; Initial Assessment</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Strategic Positioning Index (SPI)</span>
                                                <span className="text-sm text-red-600 font-bold">34% &mdash; Grade D</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Risk-Adjusted ROI (RROI)</span>
                                                <span className="text-sm text-red-600 font-bold">38/100</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Activation Timeline (IVAS)</span>
                                                <span className="text-sm text-red-600 font-bold">24 months P50</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Strategic Cash Flow Impact (SCF)</span>
                                                <span className="text-sm text-red-600 font-bold">$680K</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-sm text-slate-600 font-semibold">Classification</span>
                                                <span className="text-sm text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">DO NOT PROCEED</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white border-2 border-blue-200 rounded-sm p-5">
                                        <p className="text-xs text-blue-600 uppercase tracking-wider font-bold mb-3">Run 2 &mdash; After Corrections</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Strategic Positioning Index (SPI)</span>
                                                <span className="text-sm text-blue-600 font-bold">78% &mdash; Grade B</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Risk-Adjusted ROI (RROI)</span>
                                                <span className="text-sm text-blue-600 font-bold">74/100</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Activation Timeline (IVAS)</span>
                                                <span className="text-sm text-blue-600 font-bold">9 months P50</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                                                <span className="text-sm text-slate-600">Strategic Cash Flow Impact (SCF)</span>
                                                <span className="text-sm text-blue-600 font-bold">$1.42M</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-sm text-slate-600 font-semibold">Classification</span>
                                                <span className="text-sm text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">INVESTMENT READY</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Issues & Corrections */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50 border border-red-200 rounded-sm p-4">
                                        <p className="text-xs text-red-600 uppercase tracking-wider font-bold mb-2">Issues Flagged by RFI Engine</p>
                                        <ul className="space-y-1.5 text-sm text-slate-700">
                                            <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&bull;</span> Missing grid connection feasibility study</li>
                                            <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&bull;</span> Revenue projections 2.8&times; above regional benchmark</li>
                                        </ul>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
                                        <p className="text-xs text-blue-600 uppercase tracking-wider font-bold mb-2">Corrections Applied</p>
                                        <ul className="space-y-1.5 text-sm text-slate-700">
                                            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&bull;</span> Uploaded utility interconnection agreement</li>
                                            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&bull;</span> Revised Y1 revenue from $4.2M to $1.4M</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SPI Component Breakdown */}
                        <section className="py-8 px-6 md:px-8 bg-white border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">SPI Component Breakdown &mdash; Run 2 (Post-Correction)</h3>
                                <p className="text-xs text-slate-500 mb-4">Each component is weighted and computed independently via calculateSPI() in services/engine.ts</p>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Economic Readiness', score: 82, weight: '20%', detail: 'NZ GDP per capita, regional growth rate, fiscal surplus indicators' },
                                        { name: 'Symbiotic Fit', score: 76, weight: '15%', detail: 'Council-Vestas capability alignment across 6 dimensions' },
                                        { name: 'Political Stability', score: 91, weight: '15%', detail: 'NZ governance index, regulatory quality, rule of law' },
                                        { name: 'Partner Reliability', score: 74, weight: '15%', detail: 'Vestas track record, financial health, delivery capability' },
                                        { name: 'Ethical Alignment (SEAM)', score: 85, weight: '15%', detail: 'ESG compliance, community benefit, labour standards' },
                                        { name: 'Activation Velocity', score: 68, weight: '10%', detail: 'Regulatory pathway, permit timeline, grid connection readiness' },
                                        { name: 'Infrastructure Quality', score: 72, weight: '10%', detail: 'Grid capacity, transport access, construction labour availability' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-sm border border-slate-200">
                                            <div className="w-40 flex-shrink-0">
                                                <p className="text-sm font-medium text-slate-800">{item.name}</p>
                                                <p className="text-xs text-slate-400">{item.weight} weight</p>
                                            </div>
                                            <div className="flex-1">
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${item.score}%` }} />
                                                </div>
                                            </div>
                                            <div className="w-12 text-right">
                                                <span className="text-sm font-bold text-blue-600">{item.score}%</span>
                                            </div>
                                            <p className="text-xs text-slate-500 w-56 flex-shrink-0">{item.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Adversarial Debate Outcome */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">5-Persona Adversarial Debate &mdash; Consensus Report</h3>
                                <p className="text-xs text-slate-500 mb-4">Bayesian Debate Engine (services/PersonaEngine.ts) &mdash; 818 lines. Beliefs update via Bayesian inference. Disagreements are preserved, not smoothed.</p>

                                <div className="space-y-3 mb-4">
                                    <div className="bg-white border border-slate-200 rounded-sm p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">The Skeptic</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">APPROVE (Run 2)</span>
                                        </div>
                                        <p className="text-xs text-slate-600">&ldquo;Run 1 was correctly blocked. Revenue assumptions were indefensible. With the interconnection agreement uploaded and revenue corrected to $1.4M, the grid dependency is resolved and financials are within benchmark. I approve with the condition that quarterly review gates remain active.&rdquo;</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">The Advocate</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">APPROVE (Run 1 &amp; 2)</span>
                                        </div>
                                        <p className="text-xs text-slate-600">&ldquo;Northland has exceptional solar irradiance (4.8 kWh/m&sup2;/day), strong community support for renewables, and a proven council track record in infrastructure delivery. This is exactly the type of regional energy partnership the system was designed to validate.&rdquo;</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">The Regulator</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">APPROVE (Run 2)</span>
                                        </div>
                                        <p className="text-xs text-slate-600">&ldquo;The grid connection feasibility study was a hard gate. Without it, no responsible assessor should have allowed this to proceed. Now that the interconnection agreement is in place, NZ regulatory pathway is clear &mdash; Resource Management Act compliance, lines company agreement, and Transpower approval are all achievable within the 9-month P50 timeline.&rdquo;</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">The Accountant</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">APPROVE (Run 2)</span>
                                        </div>
                                        <p className="text-xs text-slate-600">&ldquo;At $1.4M Y1 revenue, the project achieves a realistic 8.2% IRR over a 25-year asset life. SCF Impact of $1.42M exceeds the $1M viability threshold. Cash flow breakeven at month 38. RROI improvement from 38 to 74 reflects genuine de-risking, not cosmetic adjustment.&rdquo;</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">The Operator</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">APPROVE (Run 1 &amp; 2)</span>
                                        </div>
                                        <p className="text-xs text-slate-600">&ldquo;Execution risk is manageable. Vestas has delivered 15+ installations of this scale in Australasia. Council has procurement experience with civil projects. 9-month activation is tight but achievable if resource consent is fast-tracked. Labour availability in Northland is the binding constraint &mdash; recommend early contractor engagement.&rdquo;</p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
                                    <p className="text-sm text-blue-800 font-semibold mb-1">Consensus: 5/5 APPROVE (Run 2)</p>
                                    <p className="text-xs text-blue-600">Bayesian posterior updated across both runs. Run 1 consensus: 2/5 (Advocate + Operator). Run 2 consensus: 5/5 with conditions. Belief convergence achieved after correction of both flagged deficiencies.</p>
                                </div>
                            </div>
                        </section>

                        {/* Risk Assessment */}
                        <section className="py-8 px-6 md:px-8 bg-white border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">Risk Assessment &mdash; Monte Carlo &amp; RFI Output</h3>
                                <div className="space-y-3 mb-4">
                                    <div className="bg-slate-50 border border-slate-200 rounded-sm p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-slate-900">Monte Carlo Simulation</p>
                                            <span className="text-xs text-slate-500">5,000 scenarios</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="bg-white border border-slate-200 rounded p-2">
                                                <p className="text-xs text-slate-500 mb-1">P10 (Optimistic)</p>
                                                <p className="text-sm font-bold text-green-600">$1.68M SCF</p>
                                            </div>
                                            <div className="bg-white border border-blue-200 rounded p-2">
                                                <p className="text-xs text-slate-500 mb-1">P50 (Median)</p>
                                                <p className="text-sm font-bold text-blue-600">$1.42M SCF</p>
                                            </div>
                                            <div className="bg-white border border-slate-200 rounded p-2">
                                                <p className="text-xs text-slate-500 mb-1">P90 (Conservative)</p>
                                                <p className="text-sm font-bold text-amber-600">$1.08M SCF</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-sm p-4">
                                        <p className="text-sm font-semibold text-slate-900 mb-2">Regulatory Friction Index (RFI)</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Run 1 (Pre-Correction)</p>
                                                <p className="text-sm text-red-600 font-bold">RFI: 72/100 &mdash; High Friction</p>
                                                <p className="text-xs text-slate-500 mt-1">2 bottlenecks detected, 1 hard gate triggered</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Run 2 (Post-Correction)</p>
                                                <p className="text-sm text-blue-600 font-bold">RFI: 31/100 &mdash; Low Friction</p>
                                                <p className="text-xs text-slate-500 mt-1">0 bottlenecks, 0 hard gates. Clear regulatory pathway.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Cognition Layer */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">Human Cognition Engine &mdash; Expert Judgement Simulation</h3>
                                <p className="text-xs text-slate-500 mb-4">7 neuroscience models from published research, implemented as faithful mathematical engines</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs font-semibold text-slate-800 mb-1">Wilson-Cowan Neural Fields</p>
                                        <p className="text-xs text-slate-600">Run 1: Inhibitory signals dominated &mdash; risk aversion pattern detected. Run 2: Balanced excitatory/inhibitory fields. Decision confidence: 0.81</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs font-semibold text-slate-800 mb-1">Predictive Processing</p>
                                        <p className="text-xs text-slate-600">Run 1: High prediction error on revenue assumptions (2.8&times; deviation). Run 2: Prediction error minimised. Hierarchical consistency achieved across all 3 levels.</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs font-semibold text-slate-800 mb-1">Free Energy Principle</p>
                                        <p className="text-xs text-slate-600">Run 1: High surprise (missing feasibility study created unresolvable uncertainty). Run 2: Free energy minimised. Policy selection converged on &ldquo;proceed with monitoring.&rdquo;</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-sm p-3">
                                        <p className="text-xs font-semibold text-slate-800 mb-1">Emotional Valence</p>
                                        <p className="text-xs text-slate-600">Run 1: Loss aversion triggered &mdash; the $4.2M projection &ldquo;felt wrong&rdquo; even before formula scoring confirmed. Run 2: Balanced valence. Prospect theory alignment positive.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Evidence Sources */}
                        <section className="py-8 px-6 md:px-8 bg-white border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">Audit Trail &mdash; Source Code References</h3>
                                <p className="text-xs text-slate-500 mb-4">Every score is computed by implemented TypeScript. File paths and line counts are real and verifiable.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { file: 'services/engine.ts', purpose: 'calculateSPI()  -  7-component weighted scoring. computeSCF()  -  P10/P50/P90 impact.' },
                                        { file: 'services/MissingFormulasEngine.ts', purpose: 'computeRFI()  -  Regulatory Friction Index with bottleneck detection.' },
                                        { file: 'services/PersonaEngine.ts', purpose: '5-persona adversarial debate engine.' },
                                        { file: 'services/ReportOrchestrator.ts', purpose: 'Full report assembly, all engines in parallel.' },
                                        { file: 'services/algorithms/DAGScheduler.ts', purpose: 'IVAS activation timeline. SCF composite scoring. Formula dependency graph.' },
                                        { file: 'services/NSILIntelligenceHub.ts', purpose: 'Master control  -  all 22 engines orchestrated.' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                            <p className="text-xs font-mono text-blue-600 mb-1">{item.file}</p>
                                            <p className="text-xs text-slate-600">{item.purpose}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ================================================================ */}
                        {/* THE VERDICT - What This Actually Means For The User             */}
                        {/* ================================================================ */}
                        <section className="py-10 px-6 md:px-8 bg-gradient-to-r from-green-50 to-emerald-50 border-y-4 border-green-500">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={28} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-green-700 uppercase tracking-[0.15em] text-xs font-bold">FINAL VERDICT</p>
                                        <h3 className="text-2xl font-bold text-slate-900">This Project Is Ready to Move Forward</h3>
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-lg border border-green-200 p-6 mb-6">
                                    <h4 className="text-lg font-semibold text-slate-900 mb-3">What This Means in Plain English:</h4>
                                    <p className="text-base text-slate-700 leading-relaxed mb-4">
                                        The Northland Regional Council&rsquo;s solar partnership with Vestas has passed every test. The numbers are realistic, the risks are manageable, the regulatory path is clear, and every expert persona agrees it should proceed. <strong>This project has a 78% strategic viability score and is classified as &ldquo;Investment Ready.&rdquo;</strong>
                                    </p>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <p className="text-3xl font-bold text-green-600">78%</p>
                                            <p className="text-xs text-slate-600">Viability Score</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <p className="text-3xl font-bold text-green-600">9 mo</p>
                                            <p className="text-xs text-slate-600">To First Revenue</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <p className="text-3xl font-bold text-green-600">$1.42M</p>
                                            <p className="text-xs text-slate-600">Year 1 Cash Flow</p>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-lg font-semibold text-slate-900 mb-3">What the Council Should Do Next:</h4>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-4">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Begin Formal Partner Engagement</p>
                                            <p className="text-sm text-slate-600">Use the generated Letter of Intent (LOI) to open official discussions with Vestas. The document is already structured to their expectations.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-4">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Submit to Council Board</p>
                                            <p className="text-sm text-slate-600">The Investment Prospectus and Executive Summary are ready for board presentation. All numbers are defensible and traceable.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-4">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Initiate Resource Consent Process</p>
                                            <p className="text-sm text-slate-600">The regulatory pathway is clear. Begin RMA consent applications now to hit the 9-month activation timeline.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-4">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Lock In Contractor Early</p>
                                            <p className="text-sm text-slate-600">Labour availability in Northland was flagged as the binding constraint. Early contractor engagement is critical.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Documents Generated */}
                        <section className="py-8 px-6 md:px-8 bg-white border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">Documents Generated From This Analysis</h3>
                                <p className="text-sm text-slate-600 mb-4">The system automatically produced the following documents &mdash; ready to download, share, or submit:</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        'Investment Prospectus',
                                        'Executive Summary',
                                        'Letter of Intent (LOI)',
                                        'Partnership Assessment',
                                        'Risk Report',
                                        'Financial Model',
                                        'Board Presentation',
                                        'Compliance Checklist'
                                    ].map((doc, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-sm p-3 text-center">
                                            <p className="text-xs font-medium text-slate-700">{doc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* The Bottom Line */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-b border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-sm text-blue-600 uppercase tracking-wider font-bold mb-4">The Bottom Line</h3>
                                <div className="bg-white border-2 border-slate-300 rounded-lg p-6">
                                    <p className="text-base text-slate-700 leading-relaxed mb-4">
                                        <strong className="text-slate-900">Without this system:</strong> The council would have spent 3&ndash;6 months and $50,000&ndash;$150,000 on consultants to reach the same conclusion. They would have submitted an initial proposal with inflated revenue projections &mdash; likely rejected by investors or delayed by months of back-and-forth.
                                    </p>
                                    <p className="text-base text-slate-700 leading-relaxed">
                                        <strong className="text-slate-900">With this system:</strong> The council got instant feedback on their errors, fixed them in hours, and now has a complete, defensible investment case with all supporting documents &mdash; ready for partner engagement, board approval, and regulatory submission.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Closing statement */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8">
                            <p className="text-base text-white leading-relaxed font-medium text-center mb-2">
                                This is what the system produces. Every time.
                            </p>
                            <p className="text-sm text-slate-300 text-center">
                                Not just scores and technical data &mdash; but a clear verdict, actionable next steps, and all the documents you need to move forward. Your project, your data, your opportunity &mdash; transformed into a decision-ready package.
                            </p>
                        </div>

                        {/* Close button */}
                        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-sm">
                            <button 
                                onClick={() => setShowProofPopup(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-sm text-sm font-semibold hover:bg-slate-900 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Architecture & Formulas Popup */}
            {showFormulas && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowFormulas(false)}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
                        {/* Popup header */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-lg px-8 py-6 flex items-center justify-between">
                            <div>
                                <p className="text-blue-400 uppercase tracking-[0.2em] text-sm font-bold mb-1">NSIL Runtime — How It Thinks Now</p>
                                <h3 className="text-2xl font-bold text-white">Inside the NSIL &mdash; Current Layers, Formulas &amp; Engines</h3>
                            </div>
                            <button onClick={() => setShowFormulas(false)} className="text-slate-400 hover:text-white transition-colors p-2">
                                <X size={24} />
                            </button>
                        </div>
                        {/* Popup body */}
                        <div className="p-6 md:p-8 space-y-6 text-sm text-slate-700 leading-relaxed">

                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-sm mb-6">
                                <p className="text-sm text-slate-900 font-semibold mb-2">BW AI: Current Intelligence Architecture</p>
                                <p className="text-sm text-slate-700">
                                    This is <strong>how the system thinks today.</strong> Every input enters a deterministic 10-layer pipeline with adaptive multi-phase intake, a Regional Development Kernel, partner intelligence scoring, causal problem-to-solution graphs, and case-method gating. The current runtime now adds <strong>streaming responses</strong>, <strong>reactive draft analysis while users type</strong>, a <strong>concurrent planner/executor timeline</strong>, and <strong>confidence + source provenance</strong> on outputs. It validates, debates, scores, stress-tests, and synthesises analysis with explicit logic and auditability.
                                </p>
                            </div>

                            <p>The NSIL &mdash; <strong>Nexus Strategic Intelligence Layer</strong> &mdash; is a deterministic reasoning engine that combines <strong>46+ proprietary formulas</strong>, <strong>34+ intelligence engines</strong>, and <strong>12 core algorithms</strong> into a unified 10-layer pipeline, now extended with a <strong>Regional Development Kernel</strong>, <strong>Partner Intelligence Engine</strong>, <strong>Problem-to-Solution Graph</strong>, <strong>Global Data Fabric</strong>, <strong>Case Study Method Layer</strong>, and <strong>Outcome Learning Service</strong>. Implemented in <span className="font-mono text-sm bg-slate-100 px-1 rounded">services/NSILIntelligenceHub.ts</span>, it runs every analysis through computational layers in sequence, with parallelism inside each layer where dependencies allow. Same inputs, same outputs, every time. Here&rsquo;s every layer, every formula, every engine.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 0 &mdash; The Laws (Knowledge Architecture)</h4>
                            <p>Hard-coded economic truth that the AI cannot alter. 38+ proprietary formulas defined with fixed mathematical relationships and bounded outputs, managed by a DAG Scheduler (<span className="font-mono text-sm bg-slate-100 px-1 rounded">DAGScheduler.ts</span>). The scheduler maps every formula into a directed acyclic graph across 5 execution levels &mdash; Level 0 runs PRI, CRI, BARNA, and TCO in parallel; Level 1 feeds into SPI, RROI, NVI, RNI, CAP; Level 2 produces SEAM, IVAS, ESI, FRS, AGI, VCI; Level 3 creates the master Strategic Confidence Framework (SCF); Level 4 runs 8 autonomous intelligence indices. Results are memoised &mdash; no formula executes twice.</p>

                            <p>Three examples of what these formulas do: <strong>SPI</strong> (Strategic Positioning Index) quantifies market dominance by weighting political risk against country risk with growth-adjusted positioning. <strong>RROI</strong> (Risk-Adjusted Return on Investment) runs Monte Carlo propagation across probability-weighted scenarios &mdash; real-world variance, not a single optimistic projection. <strong>SEAM</strong> (Strategic Ethical Alignment Matrix) cross-references strategy against policy frameworks and stakeholder impact.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 1 &mdash; The Shield (Input Validation)</h4>
                            <p>A SAT Contradiction Solver I wrote (<span className="font-mono text-sm bg-slate-100 px-1 rounded">SATContradictionSolver.ts</span>) converts inputs into propositional logic &mdash; conjunctive normal form &mdash; and runs a DPLL-based satisfiability check. Catches contradictions like claiming low risk while expecting 40%+ ROI, targeting global expansion on a small budget, or combining conservative strategy with aggressive growth targets. Each contradiction is classified by severity.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 2 &mdash; The Boardroom (Multi-Agent Debate)</h4>
                            <p>Five adversarial personas &mdash; Skeptic (1.2x weight), Advocate, Regulator, Accountant, and Operator &mdash; conduct a structured Bayesian debate (<span className="font-mono text-sm bg-slate-100 px-1 rounded">BayesianDebateEngine.ts</span>). Each votes across four outcomes: proceed, pause, restructure, or reject. Beliefs update via Bayesian inference. Early stopping at 0.75 posterior probability or 0.02 belief delta. Disagreements resolved through Nash bargaining. Every persona&rsquo;s reasoning preserved in the audit trail.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 3 &mdash; The Engine (Formula Scoring)</h4>
                            <p>The DAG Scheduler executes the full 38+ formula suite with typed inputs, bounded outputs, component breakdowns, and execution timing. Results flow into a <span className="font-mono text-sm bg-slate-100 px-1 rounded">CompositeScoreService</span> that normalises raw data against region-specific baselines. Deterministic jitter from hash-based seeding ensures reproducibility.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 4 &mdash; Stress Testing (Scenario Simulation)</h4>
                            <p>The Scenario Simulation Engine (<span className="font-mono text-sm bg-slate-100 px-1 rounded">ScenarioSimulationEngine.ts</span>) builds causal graphs with feedback loops, runs Monte Carlo propagation through multi-step chains with non-linear dynamics, and simulates forward outcomes using Markov chain state transitions across economic, political, social, environmental, technological, and regulatory categories.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 5 &mdash; The Brain (Human Cognition Engine)</h4>
                            <p>The Human Cognition Engine I wrote (<span className="font-mono text-sm bg-slate-100 px-1 rounded">HumanCognitionEngine.ts</span>) implements 7 neuroscience models as mathematical implementations:</p>
                            <ol className="list-decimal list-inside space-y-1 pl-2">
                                <li><strong>Wilson-Cowan Neural Field Dynamics</strong> &mdash; Differential equations on excitatory/inhibitory neuron populations on a 50&times;50 spatial grid. Parameters: w_ee=1.5, w_ei=-1.0, w_ie=1.0, w_ii=-0.5, dt=0.01.</li>
                                <li><strong>Predictive Coding (Rao &amp; Ballard)</strong> &mdash; 3-level hierarchical belief updating with prediction error minimisation. Learning rate 0.1.</li>
                                <li><strong>Free Energy Principle (Friston)</strong> &mdash; Variational inference across 8 candidate policies, discount factor &gamma;=0.95.</li>
                                <li><strong>Attention Models (Itti &amp; Koch)</strong> &mdash; Salience maps with intensity/colour/orientation weights. Winner-take-all with inhibition of return (0.7).</li>
                                <li><strong>Emotional Processing</strong> &mdash; Neurovisceral integration theory, emotional inertia (0.8), autonomic coupling (0.6).</li>
                                <li><strong>Global Workspace Theory</strong> &mdash; Coalition formation with ignition threshold 0.6. Information broadcasting across cognitive subsystems.</li>
                                <li><strong>Baddeley&rsquo;s Working Memory</strong> &mdash; Phonological decay 0.05, visual decay 0.03, rehearsal benefit 0.2.</li>
                            </ol>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 6 &mdash; Autonomous Intelligence (8 Engines)</h4>
                            <ul className="list-disc list-inside space-y-1 pl-2">
                                <li><strong>Creative Synthesis</strong> &mdash; Koestler&rsquo;s bisociation theory + Fauconnier &amp; Turner conceptual blending.</li>
                                <li><strong>Cross-Domain Transfer</strong> &mdash; Maps biology, physics, engineering onto economics via Gentner&rsquo;s structure-mapping theory.</li>
                                <li><strong>Autonomous Goal</strong> &mdash; Detects emergent strategic goals from top-level index scores.</li>
                                <li><strong>Ethical Reasoning</strong> &mdash; Multi-stakeholder utility, Rawlsian fairness, Stern Review discount rates (&le;1.4%). Every recommendation must pass this gate.</li>
                                <li><strong>Self-Evolving Algorithm</strong> &mdash; Online gradient descent w_t+1 = w_t - &eta;&nabla;L, Thompson sampling, mutation-selection with full rollback.</li>
                                <li><strong>Adaptive Learning</strong> &mdash; Bayesian belief updates from outcome feedback.</li>
                                <li><strong>Emotional Intelligence</strong> &mdash; Prospect Theory + Russell&rsquo;s Circumplex Model for stakeholder dynamics.</li>
                                <li><strong>Scenario Simulation</strong> &mdash; 5,000 Monte Carlo runs with causal loop modelling and Markov state transitions.</li>
                            </ul>

                            <h4 className="text-lg font-bold text-slate-900 pt-4">Output Synthesis & Document Intelligence (Layer 8)</h4>
                            <p className="text-sm text-slate-700 mb-3">The output layer generates institutional-grade deliverables with full traceability:</p>
                            <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600 mb-4">
                                <li><strong>156+ Letter Templates</strong> &mdash; Pre-structured letters for recommendations, objections, escalations, negotiations, and stakeholder communications, now selectable with letters-only generation paths.</li>
                                <li><strong>247+ Document Outputs Across 15 Categories</strong> &mdash; Executive summaries, risk assessments, counterfactual analysis reports, persona debate transcripts, financial stress tests, governance audits, regulatory compliance dossiers, market intelligence briefs, implementation roadmaps, and case study comparisons, with adaptive length control.</li>
                                <li><strong>Case Study Intelligence</strong> &mdash; Upload any past deal, project, or decision. The system applies NSIL analysis retroactively: full SPI/RROI/SEAM breakdown with what-if scenarios showing how outcomes could have changed.</li>
                                <li><strong>Provenance & Auditability</strong> &mdash; Every number in every document traces back to source data, formula component, neuroscience model, or autonomous engine decision. Full breadcrumb trail for regulators, auditors, boards.</li>
                            </ul>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Advanced User Analysis (Reflexive Intelligence Layer)</h4>
                            <p className="text-sm text-slate-700 mb-3">Seven specialized engines that analyse YOU, not just the situation:</p>
                            <div className="space-y-2 text-sm text-slate-600 mb-4">
                                <div>
                                    <strong>User Signal Decoder</strong> &mdash; Shannon entropy analysis of narrative patterns. Detects repetition (uncertainty), avoidance (hidden concerns), emotional emphasis (priority signals). Acts as mirror to surface unspoken decision drivers.
                                </div>
                                <div>
                                    <strong>Internal Echo Detector</strong> &mdash; Prevents confirmation bias inside the machine itself. Flags when NSIL's own conclusions align too strongly with your stated preferences—runs explicit contradiction checks.
                                </div>
                                <div>
                                    <strong>Investment Lifecycle Mapper</strong> &mdash; Identifies project stage (pre-launch, scaling, plateau, exit) and adjusts analytical framework. Early-stage deals need different risk tolerance than late-stage exits.
                                </div>
                                <div>
                                    <strong>Regional Mirroring Engine</strong> &mdash; Finds structural twin regions via 6-dimensional structure-mapping (economy, governance, geography, culture, infrastructure, regulation). Surfaces hidden analogues for precedent learning.
                                </div>
                                <div>
                                    <strong>Regional Identity Decoder</strong> &mdash; Detects when authentic organizational or regional identity has been replaced with generic marketing language. Flags inconsistencies between declared values and actual investment patterns.
                                </div>
                                <div>
                                    <strong>Latent Advantage Miner</strong> &mdash; Surfaces casually mentioned assets (a partner relationship, a minority stakeholder, past technical work) that have real strategic significance. Extracts hidden optionality.
                                </div>
                                <div>
                                    <strong>Universal Translation Layer</strong> &mdash; Translates NSIL findings for 5 audiences simultaneously: investor language (risk/return), government language (compliance/impact), community language (benefit/fairness), partner language (synergy/capability), executive language (execution/timeline).
                                </div>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Performance Optimizations Across the Pipeline</h4>
                            <p className="text-sm text-slate-700 mb-2">The system implements 4 critical speed improvements without sacrificing analytical depth:</p>
                            <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600 mb-4">
                                <li><strong>Memory Retrieval (10-50x faster)</strong> &mdash; Vector Memory Index uses approximate nearest neighbour search instead of linear scan. Finds analogous cases in milliseconds vs seconds.</li>
                                <li><strong>Formula Execution (3-5x faster)</strong> &mdash; DAG Scheduler parallelizes independent formula computations. Level 0 runs 4 formulas simultaneously; cascades through 5 levels with smart dependency resolution.</li>
                                <li><strong>Debate Early Stopping (2-3x faster)</strong> &mdash; Bayesian Debate Engine terminates when posterior probability reaches 0.75 or belief delta drops below 0.02. No wasted rounds on foregone conclusions.</li>
                                <li><strong>Derivative Index Caching (2-4x faster)</strong> &mdash; Lazy Evaluation Engine computes secondary indices only on demand. If you don't ask for a specific breakdown, it never runs.</li>
                            </ul>

                            <h4 className="text-lg font-bold text-blue-800 pt-4 border-t-2 border-blue-200 mt-6">v7.0 &mdash; Regional Development Kernel</h4>
                            <p className="text-sm text-slate-700 mb-3">The central orchestrator for global regional problem-solving. Every entry path in the system &mdash; UI, ReportOrchestrator, DecisionPipeline, AutonomousOrchestrator, MultiAgentOrchestrator &mdash; now runs through the Regional Development Kernel before generating output.</p>
                            <div className="bg-blue-50/60 border border-blue-200 rounded-sm p-4 mb-4">
                                <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600">
                                    <li><strong>RegionalDevelopmentOrchestrator</strong> &mdash; Takes region profile, sector, constraints, funding envelope, governance context, country/jurisdiction, objective, current matter, evidence, and partner candidates. Returns interventions, partners, execution plan, causal graph, data fabric snapshot, governance readiness score, and analyst notes.</li>
                                    <li><strong>Partner Intelligence Engine</strong> &mdash; Ranks ideal partners using Partner Fit, Delivery Reliability, Policy Alignment, and Local Legitimacy indices blended with PVI/CIS/CCS/RFI/SRA/FRS. Each partner gets a full score breakdown and rationale. Governance, banking, private sector, NGO, and multilateral partners scored equally.</li>
                                    <li><strong>Problem-to-Solution Graph</strong> &mdash; Builds a causal graph from case evidence. Maps root causes, bottlenecks, and leverage points to interventions and required documents/letters. Surfaces hidden structural dependencies that narrative analysis misses.</li>
                                    <li><strong>Global Data Fabric</strong> &mdash; Signal ingestion scaffold with country/jurisdiction normalization. Policy, macro, and trade signals each scored for confidence (0-100) and freshness (hours since update). Regional kernel blocks output when data confidence drops below threshold.</li>
                                    <li><strong>Outcome Learning Service</strong> &mdash; Tracks recommended vs actual outcomes across cases. Adjusts governance thresholds and ranking bias over time. Feeds back into Partner Intelligence rankings and intervention prioritization.</li>
                                </ul>
                            </div>

                            <h4 className="text-lg font-bold text-blue-800 pt-2">v7.0 &mdash; Case Study Method Layer</h4>
                            <p className="text-sm text-slate-700 mb-3">Before any report generates, five methodological gates must be satisfied:</p>
                            <ol className="list-decimal list-inside space-y-1 pl-2 text-sm text-slate-600 mb-4">
                                <li><strong>Boundary Clarity</strong> &mdash; Problem statement must exceed 60 characters of meaningful scope definition.</li>
                                <li><strong>Objective Quality</strong> &mdash; Strategic intent must exceed 20 characters with measurable outcomes.</li>
                                <li><strong>Evidence Sufficiency</strong> &mdash; Quantitative data, precedent, or structured analysis must be present.</li>
                                <li><strong>Rival Explanations</strong> &mdash; At least one alternative hypothesis or counter-argument must be documented.</li>
                                <li><strong>Implementation Feasibility</strong> &mdash; Timeline, resource allocation, and execution pathway must be defined.</li>
                            </ol>
                            <p className="text-sm text-slate-700 mb-4">If any gate fails, the system blocks generation and provides specific remediation steps. This is enforced across all entry paths: UI generation, ReportOrchestrator, DecisionPipeline, and autonomous loops.</p>

                            <h4 className="text-lg font-bold text-blue-800 pt-2">v7.0 &mdash; 8 Global Issue Packs</h4>
                            <p className="text-sm text-slate-700 mb-3">Domain-specific intelligence scaffolds that activate contextual knowledge, policy frameworks, typical interventions, and partner profiles for the world&rsquo;s most critical development challenges:</p>
                            <div className="grid md:grid-cols-2 gap-2 mb-4">
                                <ul className="space-y-1 text-sm text-slate-600">
                                    <li>&bull; <strong>Water Security</strong> &mdash; Infrastructure, governance, cross-border water rights, desalination, conservation</li>
                                    <li>&bull; <strong>Energy Transition</strong> &mdash; Renewable integration, grid modernization, storage, carbon markets</li>
                                    <li>&bull; <strong>Logistics Corridors</strong> &mdash; Trade route optimization, port development, supply chain resilience</li>
                                    <li>&bull; <strong>Housing Systems</strong> &mdash; Affordable housing policy, construction technology, urban planning</li>
                                </ul>
                                <ul className="space-y-1 text-sm text-slate-600">
                                    <li>&bull; <strong>Health Systems</strong> &mdash; Healthcare infrastructure, pharmaceutical access, pandemic resilience</li>
                                    <li>&bull; <strong>Digital Infrastructure</strong> &mdash; Connectivity, data sovereignty, digital identity, fintech</li>
                                    <li>&bull; <strong>Workforce Transition</strong> &mdash; Skills development, automation readiness, migration economics</li>
                                    <li>&bull; <strong>Climate Resilience</strong> &mdash; Adaptation infrastructure, disaster response, insurance, carbon capture</li>
                                </ul>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Implementation Inventory</h4>
                            <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600 mb-6">
                                <li><strong>50,000+ lines of TypeScript code</strong> across 155+ service files</li>
                                <li><strong>Fully implemented, no placeholders:</strong> Every engine has working code, type definitions, and unit test coverage</li>
                                <li><strong>Published mathematical foundations:</strong> Each model cites academic sources (Wilson-Cowan, Rao &amp; Ballard, Friston, Gentner, etc.)</li>
                                <li><strong>Deterministic seeding:</strong> Hash-based RNG ensures reproducibility. Same input, same output, every time, across machines and deployments</li>
                                <li><strong>Audit-ready architecture:</strong> Every decision traces to source data, formula component, neuroscience model, or autonomous engine with full confidence intervals</li>
                            </ul>

                            <h4 className="text-lg font-bold text-slate-900 pt-4">The 12 Core Algorithm Engines</h4>
                            <p className="mb-3">Beyond the intelligence layers, 12 specialised algorithm engines power the system&rsquo;s advanced capabilities:</p>
                            <div className="grid md:grid-cols-2 gap-3 mb-6">
                                <div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>&bull; <strong>DAG Scheduler</strong> &mdash; Directed acyclic graph execution across 5 formula levels with memoisation. Performance: <em>3-5x speedup</em> vs sequential execution.</li>
                                        <li>&bull; <strong>SAT Contradiction Solver</strong> &mdash; DPLL-based satisfiability checking via Boolean satisfiability.</li>
                                        <li>&bull; <strong>Bayesian Debate Engine</strong> &mdash; Multi-agent belief updating and Nash bargaining with posterior probability convergence.</li>
                                        <li>&bull; <strong>Human Cognition Engine</strong> &mdash; 7 neuroscience models running live with real-time parameter tuning.</li>
                                        <li>&bull; <strong>Deep Thinking Engine</strong> &mdash; Chain-of-Thought &amp; Tree-of-Thoughts reasoning (801 lines, full token replay).</li>
                                        <li>&bull; <strong>Vector Memory Index</strong> &mdash; Approximate nearest neighbour search with cosine similarity. Performance: <em>10-50x speedup</em> vs linear scan.</li>
                                    </ul>
                                </div>
                                <div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>&bull; <strong>Frontier Intelligence Engine</strong> &mdash; Multi-round negotiation, persona evolution, institutional memory (568 lines).</li>
                                        <li>&bull; <strong>Gradient Ranking Engine</strong> &mdash; Learning-to-rank with online gradient descent and Thompson sampling.</li>
                                        <li>&bull; <strong>Optimized Agentic Brain</strong> &mdash; High-performance multi-agent coordination with rollback safety.</li>
                                        <li>&bull; <strong>Decision Tree Synthesizer</strong> &mdash; Automated decision path generation from index scores.</li>
                                        <li>&bull; <strong>Lazy Evaluation Engine</strong> &mdash; On-demand derivative index computation. Performance: <em>2-4x speedup</em> on secondary indices.</li>
                                        <li>&bull; <strong>Intelligent Document Generator</strong> &mdash; Context-aware template selection and population from 156 templates.</li>
                                    </ul>
                                </div>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 pt-4">The Frontier Intelligence Engine (Advanced Reasoning Layer)</h4>
                            <p className="mb-3">For complex strategic situations, the Frontier Intelligence Engine (<span className="font-mono text-sm bg-slate-100 px-1 rounded">FrontierIntelligenceEngine.ts</span>, 568 lines) adds 10 additional reasoning subsystems:</p>
                            <div className="grid md:grid-cols-2 gap-3 mb-3">
                                <div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li><strong>Negotiation Simulation</strong> &mdash; Runs multi-round negotiation dialogue trees. Models counterparty strategy updates via Bayesian updating of beliefs about opponent type.</li>
                                        <li><strong>Persona Evolution</strong> &mdash; Tracks how debate personas evolve as evidence accumulates. Updates coalition weights on each round.</li>
                                        <li><strong>Institutional Memory</strong> &mdash; Links current decision to historical precedent database. Surface-maps similar past cases with outcome tracking.</li>
                                        <li><strong>Regulatory Pulse</strong> &mdash; Real-time monitoring trigger for regulatory changes. Applies SPI, RROI, SEAM adjustments when signals fire.</li>
                                        <li><strong>Synthetic Foresight</strong> &mdash; Generates plausible future scenarios via branching probability trees. Samples 5,000 Monte Carlo trajectories.</li>
                                    </ul>
                                </div>
                                <div>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li><strong>Stakeholder Simulation</strong> &mdash; Models how 6+ stakeholder types will react to proposals. Utility functions per stakeholder class.</li>
                                        <li><strong>Explainability Contract</strong> &mdash; Provenance tracking for every recommendation. Links outputs to data sources, formula component breakdowns, and confidence bounds.</li>
                                        <li><strong>Modality Fusion</strong> &mdash; Integrates multi-modal inputs (text, financials, geopolitical feeds, structural data). Resolves conflicts via information-theoretic weighting.</li>
                                        <li><strong>What-If Sandbox</strong> &mdash; Stress-tests strategies under user-controlled perturbations. Sensitivity Analysis &amp; Tornado Charts.</li>
                                        <li><strong>Governance Auto-Update</strong> &mdash; Self-modifying governance policies based on outcome feedback. Learns optimal decision rules via reinforcement learning.</li>
                                    </ul>
                                </div>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 pt-4">The 38+ Proprietary Formulas</h4>
                            <div className="grid md:grid-cols-3 gap-3 mt-2 mb-4">
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Strategic Core Indices</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; SPI&trade; &mdash; Strategic Proof Index</li>
                                        <li>&bull; RROI&trade; &mdash; Real Return on Intent</li>
                                        <li>&bull; SEAM&trade; &mdash; Symbiotic Ecosystem Alignment Model</li>
                                        <li>&bull; IVAS&trade; &mdash; Integrity, Viability, Accountability</li>
                                        <li>&bull; SCF&trade; &mdash; Strategic Counterfactual Framework</li>
                                        <li>&bull; PVI&trade; &mdash; Partnership Viability Index</li>
                                        <li>&bull; RRI&trade; &mdash; Regional Resilience Index</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Evaluation Matrices (Advanced)</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; BARNA &mdash; Baseline Adaptive Risk&amp;Opportunity </li>
                                        <li>&bull; NVI &mdash; Novelty Viability Index</li>
                                        <li>&bull; CAP &mdash; Capacity Alignment Profile</li>
                                        <li>&bull; AGI &mdash; Agility &amp; Growth Index</li>
                                        <li>&bull; VCI &mdash; Volatility &amp; Change Index</li>
                                        <li>&bull; ATI &mdash; Adaptability &amp; Transition Index</li>
                                        <li>&bull; ESI &mdash; Ecosystem Shock Index</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Structural Assessment (Hidden)</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; ISI &mdash; Implementation Stress Index</li>
                                        <li>&bull; OSI &mdash; Operational Sustainability Index</li>
                                        <li>&bull; RNI &mdash; Renewal &amp; Iteration Index</li>
                                        <li>&bull; SRA &mdash; Stakeholder Risk Assessment</li>
                                        <li>&bull; IDV &mdash; Implementation Difficulty Variance</li>
                                        <li>&bull; FRS &mdash; Financial Robustness Score</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Risk Formulas</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; CRPS &mdash; Composite Risk Priority Score</li>
                                        <li>&bull; RME &mdash; Risk Mitigation Effectiveness</li>
                                        <li>&bull; VaR &mdash; Value at Risk (95th percentile)</li>
                                        <li>&bull; SRCI &mdash; Supply Chain Risk Index</li>
                                        <li>&bull; PSS &mdash; Policy Shock Sensitivity</li>
                                        <li>&bull; PRS &mdash; Political Risk Score</li>
                                        <li>&bull; DCS &mdash; Dependency Concentration Score</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Financial Metrics</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; IRR &mdash; Internal Rate of Return</li>
                                        <li>&bull; NPV &mdash; Net Present Value</li>
                                        <li>&bull; WACC &mdash; Weighted Avg Cost of Capital</li>
                                        <li>&bull; DSCR &mdash; Debt Service Coverage Ratio</li>
                                        <li>&bull; FMS &mdash; Funding Match Score</li>
                                        <li>&bull; ROE &mdash; Return on Equity</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Operational &amp; Execution</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; ORS &mdash; Organizational Readiness Score</li>
                                        <li>&bull; TCS &mdash; Team Capability Score</li>
                                        <li>&bull; EEI &mdash; Execution Efficiency Index</li>
                                        <li>&bull; SEQ &mdash; Sequencing Integrity Score</li>
                                        <li>&bull; CGI &mdash; Capability Gap Index</li>
                                        <li>&bull; LCI &mdash; Leadership Confidence Index</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Market &amp; Competition</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; MPI &mdash; Market Penetration Index</li>
                                        <li>&bull; CAI &mdash; Competitive Advantage Index</li>
                                        <li>&bull; TAM &mdash; Total Addressable Market</li>
                                        <li>&bull; SAM &mdash; Serviceable Available Market</li>
                                        <li>&bull; GRI &mdash; Growth Rate Index</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-1">Governance &amp; Integrity</h5>
                                    <ul className="space-y-0.5 text-sm text-slate-600">
                                        <li>&bull; GCI &mdash; Governance Confidence Index</li>
                                        <li>&bull; CCS &mdash; Compliance Certainty Score</li>
                                        <li>&bull; TPI &mdash; Transparency Index</li>
                                        <li>&bull; ARI &mdash; Audit Readiness Index</li>
                                        <li>&bull; RFI &mdash; Regulatory Friction Index</li>
                                        <li>&bull; CIS &mdash; Counterparty Integrity Score</li>
                                        <li>&bull; ESG &mdash; Environmental Social Governance</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 mt-4">
                                <p className="text-sm text-slate-700 font-semibold mb-2">
                                    Complete System Architecture &mdash; Current Runtime
                                </p>
                                <p className="text-sm text-slate-700 mb-3">
                                    NSIL current runtime is built on:
                                </p>
                                <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-700 mb-3">
                                    <li><strong>34+ Specialized Intelligence Engines</strong> — Input Shield, Persona Engine, Counterfactual Engine, Outcome Tracker, Unbiased Analysis, Creative Synthesis, Cross-Domain Transfer, Autonomous Goal, Ethical Reasoning, Self-Evolving Algorithm, Adaptive Learning, Emotional Intelligence, Scenario Simulation, plus proactive and reflexive engines</li>
                                    <li><strong>12 Core Algorithm Engines</strong> — From vector memory retrieval to frontier intelligence with negotiation simulation</li>
                                    <li><strong>10-Layer Deterministic Pipeline</strong> — Laws &rarr; Shield &rarr; Boardroom &rarr; Engine &rarr; Stress Test &rarr; Brain &rarr; Autonomous &rarr; Proactive &rarr; Output &rarr; Reflexive</li>
                                    <li><strong>46+ Proprietary Formulas</strong> — Strategic core indices, advanced evaluation matrices, structural assessments, risk models, financial metrics, operational scores, market analysis, governance frameworks, partner scoring</li>
                                    <li><strong>7 Neuroscience Models</strong> — Wilson-Cowan, Predictive Coding, Free Energy Principle, Attention, Emotional Processing, Global Workspace, Working Memory</li>
                                    <li><strong>Regional Development Kernel</strong> — RegionalDevelopmentOrchestrator, Partner Intelligence Engine, Problem-to-Solution Graph, Global Data Fabric, Outcome Learning Service</li>
                                    <li><strong>Case Study Method Layer</strong> — 5-gate methodological validation enforced across all entry paths before any output generates</li>
                                    <li><strong>Reactive Agentic Runtime</strong> — Streamed responses, draft-time signal extraction, concurrent planner/executor tasks, and message-level provenance confidence</li>
                                    <li><strong>8 Global Issue Packs</strong> — Water Security, Energy Transition, Logistics Corridors, Housing Systems, Health Systems, Digital Infrastructure, Workforce Transition, Climate Resilience</li>
                                    <li><strong>Output at Scale</strong> — 156+ letter templates, 247+ document outputs, adaptive intake-to-generation flow, full case study analysis, multi-audience translation, partner-aware institutional drafting</li>
                                </ul>
                                <p className="text-sm text-slate-700 italic font-semibold">
                                    Every recommendation has a complete audit trail. Every formula has published mathematics. Every engine has working code. This is not a chatbot narrative generator &mdash; it is an operating system for institutional intelligence, regional development, and strategic translation across government, banking, and private-sector contexts. Built from ground truth. Benchmarked against real decisions. Ready for sovereign-grade deployment.
                                </p>
                            </div>
                        </div>
                        {/* Close button at bottom */}
                        <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                            <button 
                                onClick={() => setShowFormulas(false)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-sm text-sm font-bold hover:bg-slate-800 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Legal Document Modals */}
            <DocumentModal activeDocument={activeDocument} onClose={() => setActiveDocument(null)} />

            {/* Footer */}
            <footer className="py-8 px-4 bg-slate-900 border-t border-slate-800">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-center md:text-left">
                            <p className="text-xs text-white/40">(c) 2026 BW Global Advisory. All rights reserved.</p>
                            <p className="text-xs text-white/30">Trading as Sole Trader (R&D Phase) | ABN 55 978 113 300 | Melbourne, Australia</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                Nexus Intelligence OS v7.0
                            </span>
                            <span>*</span>
                            <span>NSIL Engine v7.0</span>
                            <span>*</span>
                            <span className="text-blue-400">Knowledge Layer Active</span>
                            <span>*</span>
                            <span className="text-indigo-400">Cognition Active</span>
                            <span>*</span>
                            <span className="text-blue-400">Autonomous Active</span>
                            <span>*</span>
                            <span className="text-slate-400">Reflexive Active</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CommandCenter;


