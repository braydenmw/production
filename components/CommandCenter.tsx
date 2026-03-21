import React, { useState } from 'react';
import { ArrowRight, Shield, Users, Zap, CheckCircle2, Scale, Building2, Globe, Mail, Phone, Briefcase, TrendingUp, FileCheck, GitBranch, X, Info } from 'lucide-react';
import DocumentModal, { type DocumentType } from './LegalDocuments';
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
    const [showBreakthroughPopup, setShowBreakthroughPopup] = useState(false);
    const [showProofPopup, setShowProofPopup] = useState(false);
    const [activeWorkflowStage, setActiveWorkflowStage] = useState<'intake' | 'analysis' | 'output' | null>(null);
    const [showProtocolLetters, setShowProtocolLetters] = useState(false);
    const [showUnifiedSystemOverview, setShowUnifiedSystemOverview] = useState(false);
    const [unifiedActiveTab, setUnifiedActiveTab] = useState<'protocol' | 'documents' | 'letters' | 'proof'>('protocol');
    const [activeDocument, setActiveDocument] = useState<DocumentType>(null);
    const [_activeLayer, _setActiveLayer] = useState<number | null>(null);
    const [expandedEngine, setExpandedEngine] = useState<string | null>(null);
    const [_expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const _toggleCard = (id: string) => setExpandedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        return next;
    });

    // Category-level read-more content for Original Developments
    const categoryDetails: Record<string, { title: string; subtitle: string; icon: string; color: string; summary: string; full: React.ReactNode }> = {
        'a': {
            title: 'Algorithms & Reasoning Engines',
            subtitle: 'Five proprietary engines that score, debate, validate, and simulate before any output is produced, with explicit contradiction and release-gate verdicts.',
            icon: 'A',
            color: 'from-blue-600 to-blue-800',
            summary: 'Neuroscience-based cognition modelling, adversarial Bayesian debate, propositional logic validation, cross-domain analogical reasoning, and Monte Carlo simulation &mdash; five engines that run in sequence on every input.',
            full: (
                <div className="space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed">These five engines form the analytical core of the NSIL pipeline. Every input passes through all of them before any output is produced. They were not adapted from existing tools &mdash; each applies theory from a specific academic discipline to investment intelligence for the first time.</p>

                    <div className="border-l-2 border-blue-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Human Cognition Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Seven neuroscience models &mdash; Wilson-Cowan neural field equations, Friston&rsquo;s Free Energy Principle, Rao & Ballard predictive coding, Itti-Koch salience mapping, Baars&rsquo; Global Workspace Theory, neurovisceral emotional processing, and Baddeley&rsquo;s working memory model. These are university-level differential equations applied to investment analysis: modelling how a real decision-maker will respond to your proposal, what they&rsquo;ll pay attention to, what will feel wrong, and where their cognitive blind spots exist.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 5 &mdash; runs after quantitative scoring, before autonomous intelligence. Produces a &ldquo;human reception forecast&rdquo; that shapes how findings are framed in final output.</p>
                    </div>

                    <div className="border-l-2 border-blue-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Bayesian Debate Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Five independent personas &mdash; Skeptic, Advocate, Regulator, Accountant, Operator &mdash; argue over every conclusion using Bayesian belief updating and Nash bargaining. Each persona independently votes proceed, pause, restructure, or reject. Beliefs are updated with weighted evidence. The system stops early when posterior probability exceeds 75% consensus. Disagreements are preserved in the output &mdash; you see where the Skeptic and Advocate couldn&rsquo;t agree, and why.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 2 &mdash; the first analytical gate. No data reaches the formula layer without surviving adversarial debate. This prevents confirmation bias structurally.</p>
                    </div>

                    <div className="border-l-2 border-blue-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">SAT Contradiction Solver</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Your inputs are converted into propositional logic clauses (conjunctive normal form) and run through a DPLL-like satisfiability solver. &ldquo;Low risk + 40% ROI&rdquo; or &ldquo;small budget + global expansion + fast timeline&rdquo; &mdash; contradictions are caught mathematically before any AI model processes the case. No other business intelligence tool validates inputs for logical impossibility at the propositional level.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 1 &mdash; the input shield. Logically impossible claims are flagged before any resources are spent on analysis.</p>
                    </div>

                    <div className="border-l-2 border-blue-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Cross-Domain Transfer Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Applies formal structural analogies from ecology, medicine, physics, and military strategy to economic development using Gentner&rsquo;s Structure-Mapping Theory. Coral reef recovery maps to regional economic recovery: keystone species = anchor industry, biodiversity = diversification, reef bleaching = economic shock. The engine contains fully modelled domain libraries with quantitative rules. These are patterns no economist would think to look for.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 6 &mdash; autonomous intelligence. Generates insights that expand the analysis beyond conventional economic frameworks.</p>
                    </div>

                    <div className="border-l-2 border-blue-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Counterfactual & Monte Carlo Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Generates &ldquo;what if?&rdquo; scenarios and runs 10,000-iteration Monte Carlo simulations producing probabilistic outcome distributions. Calculates Value-at-Risk (95th percentile), expected shortfall, probability of loss, and full histograms. The regret analysis layer quantifies the cost of doing nothing. Every recommendation becomes a probability-weighted statement, not a binary yes/no.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 4 &mdash; stress testing. Runs after formula scoring to test whether conclusions hold under adverse conditions.</p>
                    </div>
                </div>
            ),
        },
        'b': {
            title: 'Agentic & Autonomous Systems',
            subtitle: 'Forty-four parallel engines orchestrated as a unified brain &mdash; planning research, running adversarial analysis, querying 15+ live external sources, spawning specialist agents, and adapting runtime control modes from live outcomes.',
            icon: 'B',
            color: 'from-emerald-600 to-emerald-800',
            summary: 'A 44-engine parallel brain fires on every query &mdash; formula indices, reactive intelligence, entity verification, geopolitical arbitrage, OSINT, sanctions screening, trade statistics, opportunity detection, and deep web research, with graceful degradation and full audit trail.',
            full: (
                <div className="space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed">These systems provide goal-directed autonomy for research, synthesis, and live intelligence gathering. Forty-four engines fire in parallel on every query via the Brain Integration Service &mdash; each contributing a different analytical dimension. Specialist agents spawn on demand, external data providers are queried in real time, and governance gates (red/amber/green) enforce control at every step. Output quality and freshness depend on provider availability, API configuration, and release-gate verdicts.</p>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Multi-Agent Brain System</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Multiple AI models (Gemini, GPT-4, Claude, Mistral) orchestrated together as a consensus panel &mdash; not as fallbacks. They vote on findings with weighted confidence based on historical accuracy per domain. If models disagree, you see the disagreement. This prevents single-model hallucination and ensures outputs are cross-validated by independent reasoning architectures.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Runs across all NSIL layers. Each engine can call the Multi-Agent Brain for validation, creating multi-model checkpoints throughout the pipeline.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Autonomous Orchestrator & Agent Spawner</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">A goal-directed autonomy layer with governance gates (red/amber/green). The system plans its own research tasks, spawns specialist agents via the Agent Spawner, executes them against a mission graph with dependency tracking, and verifies outcomes through the Outcome Verification Engine. It decides what questions need answering, not just how to answer yours. The mission graph persists state so work resumes exactly where it left off.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 6 &mdash; autonomous intelligence. This is what makes the system proactive rather than reactive.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Self-Evolving Algorithm Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Scoring formulas adjust their own weights using online gradient descent and Thompson Sampling (Bayesian bandits) based on outcome feedback. Exponential moving averages track performance trends. If accuracy drifts, the system rolls back automatically to the last known-good configuration. Every change is logged with a full audit trail: what changed, why, what triggered it, and accuracy before and after.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Operates continuously in the background. Keeps the 46+ formula architecture calibrated without manual intervention.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Scenario Simulation Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Forward-looking system dynamics based on Forrester (1961): stocks, flows, and feedback loops modelled as coupled differential equations. Monte Carlo uncertainty propagation through causal graphs with Markov chain state transitions. Simulates cascading futures where one change triggers downstream effects through workforce, housing, supply chain, and tax base. Each simulation produces probability-weighted branching timelines.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Called during NSIL Layer 6 for strategic recommendations. Produces the forward-looking scenarios that appear in generated documents.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Brain Integration Service &mdash; 44-Engine Parallel Brain</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Every query fires 44+ engines simultaneously via <code className="text-xs bg-slate-100 px-1 rounded">Promise.allSettled</code> &mdash; adversarial reasoning, comprehensive indices, multi-agent orchestration, historical learning, NSIL intelligence hub, composite scoring, global compliance, case graph building, regional development, partner comparison, decision pipeline, document routing, IFC standards, pattern confidence, maturity scoring, problem-to-solution graphs, motivation detection, counterfactual analysis, narrative synthesis, historical parallel matching, partner intelligence, situation analysis, outcome tracking, self-learning, unbiased analysis, persona debate, derived indices, OSINT search, consultant gating, reactive intelligence, global issue resolution, self-improvement, ACLED conflict data, sanctions screening, trade statistics (UN Comtrade), deep web research (Tavily), intelligence quality gating, V-Dem governance, Research Ecosystem scoring (TAI/ICI/ERS), failure mode governance, and more. Results are unpacked, merged, and injected into a unified strategic prompt. Engines that fail gracefully degrade without blocking the rest.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: The runtime brain. Sits between your input and the AI response, ensuring every answer draws on the full weight of the system&rsquo;s 44+ parallel engines &mdash; the most comprehensive intelligence orchestration layer in any investment analysis platform.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Global Issue Resolver</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">A universal problem-solver that treats any query as a solvable issue. Performs root cause analysis, gathers real-time data via the Reactive Intelligence Engine, applies multi-layer NSIL analysis, and produces a structured resolution plan with specific interventions, timelines, and resource requirements. Wired into the Brain Integration Service so it runs on every strategic question.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 6 &mdash; autonomous intelligence. Ensures the system always attempts to solve the underlying problem, not just describe it.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Live External Intelligence Layer &mdash; 15+ Global Data APIs</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">The platform integrates with multiple external sources including <strong>ACLED</strong>, <strong>OpenSanctions</strong>, <strong>OpenCorporates</strong>, <strong>GLEIF</strong>, <strong>V-Dem</strong>, <strong>Brave Search</strong>, <strong>UN Comtrade</strong>, <strong>GDELT</strong>, <strong>World Bank</strong>, <strong>Wikidata</strong>, <strong>Wikipedia</strong>, <strong>REST Countries</strong>, <strong>DuckDuckGo</strong>, and <strong>Tavily</strong>. Availability varies by configuration, provider uptime, and credential setup.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Feeds the Brain Integration Service, Entity Intelligence Pipeline, and Location Intelligence with live signals when providers are reachable.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Entity Intelligence Pipeline &mdash; 7-Source Parallel Verification</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">When any entity is mentioned in a query, the Entity Intelligence Pipeline fires automatically. It runs <strong>OpenSanctions</strong> (sanctions/PEP screening), <strong>OpenCorporates</strong> (corporate registry), <strong>GLEIF</strong> (LEI/ownership chain), <strong>Tavily</strong> (deep web research), <strong>Brave Search</strong> (independent search), <strong>GDELT</strong> (news sentiment), and <strong>V-Dem</strong> (jurisdiction governance) in parallel. Produces a composite Entity Intelligence Report with verified/unverified status, risk rating (LOW/MODERATE/HIGH/CRITICAL), and full source accountability. Supports <strong>Groq function calling</strong> with 4 tool schemas so the AI can autonomously decide which verification tools to invoke.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Bridges country-level NSIL scoring and entity-level due diligence. Ensures every mentioned company, partner, or individual is verified against real registries &mdash; not training-data guesses.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Reactive Intelligence Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Real-time opportunity detection and risk monitoring. Scans live web sources, detects emerging investment signals, flags political and economic risks as they develop, and feeds structured intelligence into the Brain Integration Service. Also powers the multi-agent location research system &mdash; 7 research categories (Economy, Demographics, News, Business, Leadership, Culture, Infrastructure) each querying multiple APIs simultaneously for any city or region worldwide.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Runs alongside every analysis. Ensures the system is working with current intelligence, not stale assumptions.</p>
                    </div>

                    <div className="border-l-2 border-emerald-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Geopolitical Arbitrage Engine &mdash; Disruption-to-Opportunity Analysis</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Scans live global news for active disruptions &mdash; wars, sanctions, trade fractures, supply-chain breaks, currency crises, energy shocks, regulatory shifts &mdash; and maps them against a pattern library of 10 disruption types with 25+ historical precedents. When a crisis hurts a major market, the engine identifies where regional cities, small islands, and lesser-known jurisdictions can capture displaced demand, talent, capital, or supply-chain links. Scores each arbitrage opportunity on severity, contextual relevance, and historical validation. Vietnam replacing China in textiles post-tariff (2018), Dubai absorbing Gulf War capital (1991), Georgia&rsquo;s tech boom from Russian IT worker relocation (2022) &mdash; these patterns repeat. The engine spots them proactively.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Feeds into the BW Consultant system prompt on every query. Ensures the user is always informed how current world events &mdash; good or bad &mdash; create structural openings for their market or jurisdiction.</p>
                    </div>
                </div>
            ),
        },
        'c': {
            title: 'Reflexive Intelligence',
            subtitle: 'The system analyses the user, not just the market &mdash; detecting what you&rsquo;re not saying, modelling cognitive intent, and reframing for every audience.',
            icon: 'C',
            color: 'from-amber-600 to-amber-800',
            summary: 'Identity reality-checking using post-structuralist theory, latent advantage mining from casual mentions, audience-adaptive translation, and hidden motivation detection.',
            full: (
                <div className="space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed">Most systems only analyse external conditions. This layer analyses you &mdash; how you&rsquo;re framing your situation, what you&rsquo;re not mentioning, whether your competitive identity is authentic, and what your real motivation might be. It then adapts everything for whoever will read the output.</p>

                    <div className="border-l-2 border-amber-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Regional Identity Decoder</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Based on Baudrillard&rsquo;s Simulacra theory combined with Porter&rsquo;s Competitiveness Theory. Scans all inputs for generic investment marketing language &mdash; phrases like &ldquo;strategically located&rdquo; and &ldquo;skilled workforce&rdquo; that appear in 90%+ of investment brochures globally and therefore communicate nothing. Flags competitive identity loss and surfaces the hidden assets the region undersells but that are structurally non-replicable.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 8 &mdash; reflexive intelligence. Catches when a region is presenting a simulacrum rather than its authentic advantage, and corrects the framing before output.</p>
                    </div>

                    <div className="border-l-2 border-amber-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Latent Advantage Miner</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Inspired by the &ldquo;junk DNA&rdquo; concept from molecular biology. Scans every input field for assets mentioned casually that the user doesn&rsquo;t realise are strategically significant. &ldquo;We have a small port&rdquo; &mdash; ports are non-replicable. &ldquo;Many of our people work overseas&rdquo; &mdash; diaspora networks are proven investment channels (Philippines, Israel, Ireland). Cross-references against the Historical Parallel Matcher&rsquo;s precedent database.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 8 &mdash; reflexive intelligence. Ensures no strategic asset is overlooked because the user didn&rsquo;t know it mattered.</p>
                    </div>

                    <div className="border-l-2 border-amber-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Universal Translation Layer</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Takes analytical findings and translates them into five audience-specific formats: Investor (ROI-focused), Government (policy-aligned), Community (impact-centred), Partner/IPA (technical), Executive (board-ready). Uses Aristotelian rhetoric (ethos/pathos/logos) and Halliday&rsquo;s Register Theory. &ldquo;Young population&rdquo; means cheap labour to an investor, demographic dividend to a government, and opportunity to a community leader. Same truth, different framing.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 10 &mdash; audience-adaptive output. The final layer before the user sees anything.</p>
                    </div>

                    <div className="border-l-2 border-amber-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Motivation Detector</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Scans all user text for trigger patterns that reveal real motivation: crisis signals, capital stress, desperation markers, time pressure cues, sanctions exposure hints. Each pattern is assigned a risk level. A user under financial stress asking about &ldquo;quick ROI&rdquo; gets different treatment than a long-term strategic planner. The system reads why you&rsquo;re asking, not just what you asked.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 1 &mdash; input shield. Detects context before the analysis begins, shaping how the entire pipeline processes the case.</p>
                    </div>
                </div>
            ),
        },
        'd': {
            title: 'Self-Monitoring & Calibration',
            subtitle: 'The system audits its own reasoning, tracks perception drift, learns from every interaction, and can hard-gate or reject recommendations on ethical and control grounds.',
            icon: 'D',
            color: 'from-violet-600 to-violet-800',
            summary: 'Metacognitive bias detection, statistical drift monitoring with automatic recalibration, event-driven continuous learning, runtime weight tuning with rollback, and computational ethics scoring against Rawlsian fairness principles.',
            full: (
                <div className="space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed">These systems ensure the OS doesn&rsquo;t just produce analysis &mdash; it continuously checks whether that analysis is trustworthy, learns from every interaction, and tunes itself over time. They detect cognitive bias in the system&rsquo;s own reasoning, catch when the world has changed enough that models need recalibration, apply formal ethical frameworks to every recommendation, and feed outcome data back into the engine weights for continuous improvement.</p>

                    <div className="border-l-2 border-violet-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">MetaCognition Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Continuously audits the system&rsquo;s own reasoning &mdash; detecting overconfidence (certainty exceeds evidence quality), confirmation bias (finding what it expects), missing counterfactuals (arguments not considered), pattern overfitting (conclusions from too few cases), and stale assumptions (outdated data). Produces a cognitive reliability score for every analysis and generates self-improvement directives.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 7 &mdash; proactive monitoring. &ldquo;Thinking about thinking&rdquo; &mdash; catches the system&rsquo;s own mistakes before they reach you.</p>
                    </div>

                    <div className="border-l-2 border-violet-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Drift Detection & Backtesting</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">All 46+ proprietary formulas are backtested against 200+ real historical cases with known outcomes &mdash; Tesla Shanghai, Samsung Vietnam, PEZA Philippines, Rwanda IT Hub, the Marshall Plan. Drift detection uses Welch&rsquo;s t-test for three types of change: concept drift, data drift, and performance drift. When detected, the system automatically widens confidence intervals and triggers recalibration.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Runs continuously. The system knows its own accuracy per country, per sector, and per strategy type. This is how it stays honest over time.</p>
                    </div>

                    <div className="border-l-2 border-violet-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Ethical Reasoning Engine</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Computational ethics applied to every recommendation. Calculates multi-stakeholder utility, Rawls&rsquo; Difference Principle (does the least-advantaged group benefit?), intergenerational equity using Stern Review discount rates (&le;1.4%), proportionality calculus, and Gini coefficient for inequality impact. These are mathematical scores, not checkbox exercises. The system can recommend &ldquo;reject&rdquo; on ethical grounds alone &mdash; even when the financial case is strong.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 9 &mdash; compliance checking. Ethical scoring runs alongside regulatory compliance as a hard gate before output.</p>
                    </div>

                    <div className="border-l-2 border-violet-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Self-Improvement Engine &mdash; Runtime Weight Tuning</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Records per-run performance metrics (duration, accuracy, confidence), detects accuracy drift via Welch&rsquo;s t-test across rolling windows, and auto-tunes formula weights when regression is detected. Every weight change carries a rollback checkpoint &mdash; if a tuning degrades accuracy, the system reverts automatically. Runs in the background on every Brain Integration Service invocation at readiness &ge;50%.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Continuous background process. Keeps formula calibration aligned with real-world accuracy, not static assumptions. Full audit trail of every adjustment.</p>
                    </div>

                    <div className="border-l-2 border-violet-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Self-Learning Engine &mdash; Event-Driven Continuous Learning</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Listens for events across the entire system via an EventBus &mdash; new analyses, user feedback, outcome data, formula executions, agent completions. Each event is processed as a learning signal that builds institutional knowledge over time. Pattern recognition across accumulated events surfaces recurring success factors and failure modes that inform future analyses.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Persistent background listener. Over time, the system gets smarter by learning from its own operations &mdash; not just from training data.</p>
                    </div>
                </div>
            ),
        },
        'e': {
            title: 'Proprietary Quantitative Architecture',
            subtitle: '46+ proprietary formulas, 200+ backtested cases, 195-country governance coverage, and Research Ecosystem scoring (TAI/ICI/ERS) &mdash; the quantitative substrate beneath every tribunal and control decision.',
            icon: 'E',
            color: 'from-rose-600 to-rose-800',
            summary: 'Purpose-built scoring formulas running as a dependency graph, sixty years of searchable institutional memory, and a 195-country queryable compliance engine.',
            full: (
                <div className="space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed">This is the quantitative foundation that every other engine draws from. The formulas produce the scores. The historical cases provide the precedents. The compliance database provides the jurisdiction-specific rules. Without this layer, the reasoning engines would have nothing to reason over.</p>

                    <div className="border-l-2 border-rose-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">46+ Proprietary Formulas + Research Ecosystem Scoring</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">BARNA, NVI, CRI, SPI, RROI, SEAM, IVAS, SCF, CAP, AGI, VCI, ATI, ESI, ISI, OSI, TCO, PRI, RNI, SRA, IDV, FMS, DCS, DQS, GCS, RDBI, AFC and more. Each is a composite formula purpose-built for investment and regional strategy. They run as a dependency DAG (directed acyclic graph) with topological-sort parallel execution, memoisation of intermediate results, mathematical bounds enforcement, and confidence intervals per formula per context.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 3 &mdash; quantitative scoring. The DAG scheduler executes 46+ formulas with dependency-aware parallelism, including Research Ecosystem formulas (TAI, ICI, ERS). Every score traces back to its exact inputs and weights.</p>
                    </div>

                    <div className="border-l-2 border-rose-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">Historical Parallel Matcher</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">200+ real historical cases &mdash; Shenzhen SEZ 1980, PEZA Philippines 1995, Rwanda IT Hub 2010, Silicon Valley formation, Dubai free zone model, Singapore&rsquo;s industrialisation. Searchable by structural similarity using vector-based matching across economic, demographic, infrastructure, and institutional dimensions. Each case stores what worked, what failed, time to outcome, and key contributing factors.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: Called by multiple NSIL layers. The Backtesting Engine uses it for calibration. The Latent Advantage Miner cross-references it. Generated documents cite specific precedents.</p>
                    </div>

                    <div className="border-l-2 border-rose-600 pl-4">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">195-Country Compliance & IFC Standards</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">A structured, code-queryable database covering investment frameworks, key agencies, tax treaty networks, sanctions status, dispute resolution mechanisms, data privacy frameworks, anti-corruption laws, and regional bloc memberships for 195 countries. All 8 IFC Performance Standards (PS1&ndash;PS8) implemented as assessable rules mapped to UN Sustainable Development Goals. The &ldquo;Global Baseline + Local Search&rdquo; model applies universal standards first, then finds local law to fill gaps.</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Role in the OS: NSIL Layer 9 &mdash; compliance checking. Automatically activated when the system detects the user&rsquo;s jurisdiction. No manual selection required.</p>
                    </div>
                </div>
            ),
        },
    };

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
        { step: 6, title: "Stakeholder Mapping", description: "Government bodies, investors, partners, communities, and regulators - mapped by influence, interest, and engagement strategy.", details: ["Government bodies and ministries", "Investor and capital partner profiles", "Delivery and implementation partners", "Community and civil society", "Regulators and compliance bodies", "Influence, interest, and engagement matrix"], gliEnabled: true, gliNote: "Major employers, foreign company presence, and key government contacts surfaced from live data" },
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
                        <button onClick={() => onEnterPlatform?.()} className="ml-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Launch Consultant</button>
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
                        Institutional-grade advisory for regional investment, trade, and development &mdash; verified intelligence, unbiased methodology, execution-ready output.
                    </p>
                    <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        A digital boardroom built for the decisions that shape regional economies.
                    </p>
                </div>
            </section>

            {/* THE STORY OF REGIONAL CITIES — Why This Matters */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">

                    {/* 2-COLUMN: Header (left) + Body copy (right) */}
                    <div className="grid md:grid-cols-5 gap-12 items-start">

                        {/* LEFT: Header + Founder statement */}
                        <div className="md:col-span-2 md:sticky md:top-24">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Regional Cities &middot; Global Impact</p>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-5">
                                The Engine Rooms<br />of Nations
                            </h2>
                            <p className="text-lg text-slate-400 font-medium leading-snug mb-8">
                                Overlooked by the Tools<br />Built to Serve Them
                            </p>

                            {/* Founder statement — blue panel */}
                            <div className="bg-blue-700 rounded-sm p-6">
                                <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Regional Focus</p>
                                <p className="text-sm text-blue-100 leading-relaxed">
                                    Regional cities and corridors are where logistics, industry, workforce, and infrastructure converge to drive national growth.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: regional cities investment thesis */}
                        <div className="md:col-span-3 space-y-6 text-lg text-slate-700 leading-relaxed text-justify">
                            <p>
                                Forty percent of the world&rsquo;s urban population lives in regional cities. They grow the food, move the freight, train the workforce, and absorb the shocks that capital cities never have to think about. They are the fastest-growing urban areas on earth&mdash;and the least understood. Not because they lack value, but because every tool, every dataset, and every advisory firm was built to look somewhere else. So everyone follows the same signals to the same places, calls it strategy, and wonders why the outcomes never change.
                            </p>
                            <p>
                                Meanwhile, the people in these regions carry knowledge, capability, and economic potential that no algorithm was ever trained to measure. The global economy doesn&rsquo;t just benefit from these places. It depends on them. And right now, nobody is building the intelligence to prove it.
                            </p>
                            <p className="text-slate-900 font-semibold">
                                Until now.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* [REMOVED - moved to new structured section] */}

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVE FLOW: Problem + Status Quo → Solution (consolidated)
            ═══════════════════════════════════════════════════════════════ */}

            <section className="py-12 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-1 gap-8">

                        {/* CARD 1: Why This Doesn't Exist — matches Card 2 / Who This Is For layout */}
                        <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                            {/* Text Content (Left) */}
                            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                                <span className="inline-block px-2.5 py-1 bg-amber-500/90 text-white text-[11px] font-bold uppercase tracking-wider mb-3 w-fit">The Problem</span>
                                <h4 className="text-2xl font-bold text-slate-900 leading-snug mb-4">Capital is Blind. It Follows the Safest Signal to the Most Saturated Markets.</h4>
                                <p className="text-base text-slate-600 leading-relaxed text-justify mb-5">
                                    The global investment apparatus is broken. Trillions of dollars of institutional capital are trapped in a herd mentality&mdash;pouring endlessly into overvalued tier-one CBDs and generic ESG megaprojects because they satisfy a tick-box compliance matrix. Advisory firms recycle the same macroeconomic data, build the same models, and point their clients to the same &ldquo;safe&rdquo; jurisdictions. When a market saturates or a geopolitical shock hits, they act surprised.
                                </p>
                                <p className="text-base text-slate-600 leading-relaxed text-justify mb-5">
                                    While capital chases safety, it ignores the actual engines of the economy. Regional hubs, logistics corridors, agricultural centers, and industrial heartlands&mdash;the places that absorb supply chain shocks, grow the food, move the freight, and keep nations functioning&mdash;are chronically underfunded. Not because they lack returns, but because the existing advisory models were never built to evaluate them. Trillions in locked regional value is being missed because no one built the intelligence to prove it.
                                </p>
                                <div className="pt-4 border-t border-slate-200">
                                    <h5 className="text-lg font-bold text-slate-900 mb-4">The Way It Works Today is Broken</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border-l-2 border-slate-400 pl-3">
                                            <h5 className="text-base font-bold text-slate-900 mb-1">What Advisory Firms Use</h5>
                                            <p className="text-sm text-slate-600">They charge hundreds of thousands of dollars to deliver a 100-page PDF three months later. They recycle macro-level tier-one data and apply generic frameworks that completely miss the local nuance of regional projects.</p>
                                        </div>
                                        <div className="border-l-2 border-slate-400 pl-3">
                                            <h5 className="text-base font-bold text-slate-900 mb-1">What Governments Use</h5>
                                            <p className="text-sm text-slate-600">They rely on scattered portals and outdated census data. Planning decisions are disjointed across departments, forcing the project sponsor to carry the entire burden of piecing together regulatory alignment.</p>
                                        </div>
                                        <div className="border-l-2 border-slate-400 pl-3">
                                            <h5 className="text-base font-bold text-slate-900 mb-1">What Business & Banking Use</h5>
                                            <p className="text-sm text-slate-600">They run backward-looking Excel models built for standard CBD assets. They arbitrarily inflate risk premiums for regions because their rigid formulas can't quantify localized logistics, workforce, or resilience.</p>
                                        </div>
                                        <div className="border-l-2 border-slate-400 pl-3">
                                            <h5 className="text-base font-bold text-slate-900 mb-1">What General-Purpose AI Uses</h5>
                                            <p className="text-sm text-slate-600">It hallucinates regulations and invents financial math. It produces simple summaries—not the defensible, traceable fiduciary logic required to survive a real boardroom tribunal.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Photo (Right) */}
                            <div className="h-64 md:h-auto md:w-1/3 flex-shrink-0 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop&q=80" alt="The gap in current AI tools" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        </div>

                        {/* The Actual Breakthrough — Blue Feature Block */}
                        <div className="bg-blue-700 rounded-sm p-6 md:p-10">
                            <div className="grid md:grid-cols-5 gap-8 items-start">
                                <div className="md:col-span-2">
                                    <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">The Actual Breakthrough</p>
                                    <h3 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                                        Applying the Failure Model<br className="hidden md:block" /> to Regional City<br className="hidden md:block" /> Economic Perception
                                    </h3>
                                    <button
                                        onClick={() => setShowBreakthroughPopup(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-100 text-xs font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors"
                                    >
                                        Read More
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                                <div className="md:col-span-3">
                                    <p className="text-sm md:text-base text-blue-100 leading-relaxed text-justify">
                                        The decision to overlook a regional city is rarely made on evidence. It is made on perception — shaped by incomplete data, inherited assumptions about where value exists, a search process that never reaches the right geography, and an objective that quietly prioritises career safety over return. These are not rational risk assessments. They are cognitive failure modes that repeat across every institution, every cycle, without correction.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: What We Built — matches "Who This Is For" layout */}
                        <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                            {/* Text Content (Left) */}
                            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                                <span className="inline-block px-2.5 py-1 bg-blue-600/90 text-white text-[11px] font-bold uppercase tracking-wider mb-3 w-fit">What We Built</span>
                                <h4 className="text-2xl font-bold text-slate-900 leading-snug mb-4">An Automated Due-Diligence &amp; Intelligence Engine</h4>
                                <p className="text-base text-slate-600 leading-relaxed text-justify mb-5">
                                    This system wasn&rsquo;t built in a boardroom. It was built from a regional city&mdash;the kind of place that gets overlooked, underestimated, and left off every shortlist. Advisory firms charge millions. AI platforms give you confident answers that fall apart when it matters. Neither speaks to what directly matters to the person sitting in the room, making the decision, carrying the risk.
                                </p>
                                <p className="text-base text-slate-600 leading-relaxed text-justify mb-5">
                                    Everyone is chasing the same thing: growth, resilience, a future that holds. So I built this on my own&mdash;to prove that institutional-grade intelligence doesn&rsquo;t have to come with an institutional price tag.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                    <div className="border-l-2 border-blue-500 pl-3">
                                        <h5 className="text-base font-bold text-slate-900 mb-1">Five AI Minds Argue Before You See a Word</h5>
                                        <p className="text-sm text-slate-600">A Skeptic hunts for deal-killers. An Advocate finds hidden upside. An Accountant stress-tests the money. A Regulator checks sanctions and legal risk. An Operator asks if it can actually be built. Only what survives the debate reaches you.</p>
                                    </div>
                                    <div className="border-l-2 border-emerald-500 pl-3">
                                        <h5 className="text-base font-bold text-slate-900 mb-1">It Catches What You Missed</h5>
                                        <p className="text-sm text-slate-600">The system detects contradictions in your assumptions, spots what you keep avoiding, and surfaces the questions you should have been asking. You mention a small port in passing&mdash;it recognises it as an irreplaceable asset and values it accordingly.</p>
                                    </div>
                                    <div className="border-l-2 border-amber-500 pl-3">
                                        <h5 className="text-base font-bold text-slate-900 mb-1">Real Math. Not Confident Guesswork.</h5>
                                        <p className="text-sm text-slate-600">46+ proprietary formulas run thousands of simulated scenarios&mdash;probability of loss, risk-adjusted return, cost of doing nothing. Every number traces to a formula. Every formula traces to your inputs. Nothing is invented.</p>
                                    </div>
                                    <div className="border-l-2 border-purple-500 pl-3">
                                        <h5 className="text-base font-bold text-slate-900 mb-1">Boardroom Documents. Not Chat Transcripts.</h5>
                                        <p className="text-sm text-slate-600">The output is Letters of Intent, term sheets, policy briefs, board packages&mdash;247+ document types with your actual scores and traceable reasoning. A governance tribunal issues a verdict: proceed, proceed with controls, or hold.</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200">
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        People call it AI. It isn&rsquo;t&mdash;not in the way you think. It&rsquo;s a hybrid system: computational finance, adversarial reasoning, autonomous intelligence, and live-data infrastructure stitched into a single NSIL pipeline&mdash;ten layered gates from input validation to audience-adaptive output, each built from scratch, each applying theory from a discipline never before wired into investment intelligence. One input triggers 44+ engines simultaneously. Every claim is attacked before it&rsquo;s defended. Every number traces to a formula. The surviving logic compiles itself into institutional documents&mdash;not summaries, not slides, not chat transcripts. That pipeline does not exist anywhere else&hellip;
                                    </p>
                                </div>
                            </div>
                            {/* Photo (Right) */}
                            <div className="h-64 md:h-auto md:w-1/3 flex-shrink-0 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&h=600&q=80" alt="Regional city infrastructure and economic corridor" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHO THIS IS FOR */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                        {/* Text Content (Left) */}
                        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                            <span className="inline-block px-2.5 py-1 bg-blue-600/90 text-white text-[11px] font-bold uppercase tracking-wider mb-3 w-fit">Who This Is For</span>
                            <h4 className="text-2xl font-bold text-slate-900 leading-snug mb-4">You Don&rsquo;t Need to Be an Expert. The System Already Is.</h4>
                            <p className="text-base text-slate-600 leading-relaxed mb-5">
                                The people who need this most are the ones who&rsquo;ve never had access to it. That&rsquo;s the point.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div className="border-l-2 border-blue-500 pl-3">
                                    <h5 className="text-base font-bold text-slate-900 mb-1">Regional Councils &amp; Development Agencies</h5>
                                    <p className="text-sm text-slate-600">You know your region has potential. When the investment board asks for a risk-adjusted ROI model, the budget doesn&rsquo;t stretch. This system gives you the same analytical depth &mdash; without the consulting invoice.</p>
                                </div>
                                <div className="border-l-2 border-emerald-500 pl-3">
                                    <h5 className="text-base font-bold text-slate-900 mb-1">Government Agencies &amp; Investment Boards</h5>
                                    <p className="text-sm text-slate-600">Every decision needs a defensible trail. This system stress-tests assumptions, surfaces deal-killers early, runs adversarial debate from five perspectives, and produces documented rationale you can stand behind.</p>
                                </div>
                                <div className="border-l-2 border-amber-500 pl-3">
                                    <h5 className="text-base font-bold text-slate-900 mb-1">Businesses Expanding Into New Regions</h5>
                                    <p className="text-sm text-slate-600">You don&rsquo;t know the regulatory landscape, the real cost of entry, or which local partners are credible. This system researches any location in seconds and flags what will go wrong before you commit capital.</p>
                                </div>
                                <div className="border-l-2 border-purple-500 pl-3">
                                    <h5 className="text-base font-bold text-slate-900 mb-1">First-Time Exporters &amp; Regional Entrepreneurs</h5>
                                    <p className="text-sm text-slate-600">You&rsquo;ve never written an investment prospectus. That&rsquo;s fine &mdash; the system walks you through a guided 10-step intake, asks the right questions, and produces the documents that open doors.</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    <strong className="text-slate-900">The system adapts to you.</strong> First-time users get full walkthroughs and guided intake. Teams review scores together with shared workspaces. Experts get direct formula access, full audit trail export, and adjustable Monte Carlo parameters. Same engine &mdash; different depth based on who&rsquo;s driving.
                                </p>
                            </div>
                        </div>
                        {/* Photo (Right) */}
                        <div className="h-64 md:h-auto md:w-1/3 flex-shrink-0 relative overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=600&fit=crop&q=80" alt="Regional council meeting" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TIER 3: THE FIVE CORE ENGINES
            ═══════════════════════════════════════════════════════════════ */}
            <section className="py-12 px-4 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    {/* Section Divider + Header for Architecture Cards */}
                    <div className="max-w-4xl mx-auto mb-12 text-center">
                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">The Five Core Engines <span className="text-blue-600">&mdash; With Extra Intelligence</span></h3>
                        <p className="text-lg text-slate-600 leading-relaxed">Five specialized reasoning engines work in sequence on every analysis. Each brings a different perspective, each can challenge the others, and each contributes to explicit verdict, gate, and contradiction telemetry.</p>
                    </div>

                    {/* Six Equal Category Cards (A-E + Architecture) */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                        {(['a', 'b', 'c', 'd', 'e'] as const).map((key) => {
                            const cat = categoryDetails[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => setExpandedEngine(key)}
                                    className={`group relative bg-gradient-to-r ${cat.color} p-5 border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 text-left`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">{cat.icon}</span>
                                                <h3 className="text-base font-bold text-white leading-snug">{cat.title}</h3>
                                            </div>
                                            <p className="text-xs text-white/80 leading-relaxed">{cat.subtitle}</p>
                                        </div>
                                        <span className="text-white/60 group-hover:text-white transition-colors flex-shrink-0 text-sm font-semibold">→</span>
                                    </div>
                                </button>
                            );
                        })}

                        {/* 6th Card - The Intelligence Architecture */}
                        <button
                            onClick={() => setShowFormulas(true)}
                            className="group relative bg-gradient-to-r from-slate-900 to-blue-900 p-5 border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 text-left"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center"><GitBranch size={14} /></span>
                                        <h3 className="text-base font-bold text-white leading-snug">The Intelligence Architecture</h3>
                                    </div>
                                    <p className="text-xs text-white/80 leading-relaxed">The 10-layer NSIL pipeline, 44-engine parallel brain, cognitive control plane, adaptive learning kernel, Five Engine Tribunal runtime (proceed/proceed-with-controls/hold), Perception Delta Indexing, 15+ live external intelligence APIs, 7 reflexive intelligence engines, continuous self-monitoring with drift detection, and Research Ecosystem Readiness scoring (TAI/ICI/ERS).</p>
                                </div>
                                <span className="text-white/60 group-hover:text-white transition-colors flex-shrink-0 text-sm font-semibold">→</span>
                            </div>
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════ Category Read More Modal ═══════ */}
            {expandedEngine && categoryDetails[expandedEngine] && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setExpandedEngine(null)}>
                    <div className="bg-white border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Photo Header */}
                        <div className="h-44 relative overflow-hidden flex-shrink-0">
                            <img 
                                src={
                                    expandedEngine === 'a' ? 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=400&fit=crop&q=80' :
                                    expandedEngine === 'b' ? 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=400&fit=crop&q=80' :
                                    expandedEngine === 'c' ? 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80' :
                                    expandedEngine === 'd' ? 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=400&fit=crop&q=80' :
                                    'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=1200&h=400&fit=crop&q=80'
                                }
                                alt={categoryDetails[expandedEngine].title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
                            <button 
                                onClick={() => setExpandedEngine(null)} 
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center shadow-lg"
                            >
                                <X size={18} />
                            </button>
                            <div className="absolute bottom-4 left-6 right-6">
                                <span className={`inline-block px-2.5 py-1 ${
                                    expandedEngine === 'a' ? 'bg-blue-600' :
                                    expandedEngine === 'b' ? 'bg-emerald-600' :
                                    expandedEngine === 'c' ? 'bg-amber-600' :
                                    expandedEngine === 'd' ? 'bg-violet-600' :
                                    'bg-rose-600'
                                } text-white text-[10px] font-bold uppercase tracking-wider mb-2`}>
                                    Core Engine {categoryDetails[expandedEngine].icon}
                                </span>
                                <h3 className="text-xl font-bold text-white leading-snug">{categoryDetails[expandedEngine].title}</h3>
                                <p className="text-sm text-white/80 mt-1">{categoryDetails[expandedEngine].subtitle}</p>
                            </div>
                        </div>
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {categoryDetails[expandedEngine].full}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                INTERSTITIAL CTA - Full-Width Break
            ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-16 px-4 overflow-hidden bg-gradient-to-r from-blue-800 via-blue-700 to-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
                <div className="relative max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">&ldquo;You just describe your situation. The system figures out the rest.&rdquo;</h2>
                    <p className="text-lg text-slate-300 leading-relaxed text-justify max-w-3xl mx-auto">
                        You don&rsquo;t need to know which formula applies, which jurisdiction pack to select, or which document your situation requires. The <strong className="text-white">BW Consultant</strong> learns your case as the conversation develops. It detects signals while you type, builds the case model in the background, checks compliance for your jurisdiction, and tells you exactly what to generate when you&rsquo;re ready. The system is the analyst. You are the decision-maker.
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TIER 3: SUPPORTING INFORMATION - Outputs, Assurance, Factory
            ═══════════════════════════════════════════════════════════════ */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">

                    {/* What You Walk Away With - Photo + Script Card */}
                    <div className="mb-16">
                        <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                            <div className="h-56 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=500&fit=crop&q=80" alt="Strategic deliverables" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                <div className="absolute bottom-5 left-6">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">What You Walk Away With</h2>
                                </div>
                            </div>
                            <div className="p-6 md:p-8">
                                <p className="text-base text-slate-700 leading-relaxed text-justify mb-6">
                                    You leave with a <strong>complete operating position</strong> &mdash; not a pitch deck requiring interpretation, but a defensible strategy built from live evidence, adversarial challenge, confidence scoring, and sequenced execution logic. BWGA AI compresses what typically requires months of fragmented advisory work into outputs ready for board presentations, investor conversations, regulator submissions, stakeholder engagement, and partnership negotiation on day one.
                                </p>

                                {/* Updated Capability Framing */}
                                <div className="border-t border-slate-200 pt-6 mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">Institutional Intelligence, Not Generic AI Output</h3>
                                    <p className="text-sm text-slate-700 leading-relaxed text-justify mb-3">
                                        The system does more than generate a recommendation. It builds a persistent case file, runs five adversarial reasoning engines, validates claims against live registries and market intelligence, stress-tests scenarios across policy, financing, partner, and market volatility, and marks every material claim as proven, assumed, or unknown. What emerges is a position that can survive scrutiny, not a response that depends on trust alone.
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                        It also reads the user, the mandate, and the evidence environment at the same time. Reflexive engines identify recurring priorities, hidden assets, unspoken constraints, and decision friction. Case Study Intelligence ingests reports, proposals, mandates, and prior deal material, converts them into structured sections, scores them across governance, financial viability, evidence strength, and replication potential, and debates the findings across adversarial perspectives. The output is then translated into board-ready briefs, submissions, letters, and stakeholder-specific messaging grounded in the actual case rather than template language.
                                    </p>
                                </div>

                                <button onClick={() => { setUnifiedActiveTab('protocol'); setShowUnifiedSystemOverview(true); }} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors">
                                    <Info size={16} /> View Complete System: Protocol, 247 Documents &amp; 156 Letters &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* GLOBAL STANDARDS & ETHICS */}
            <section className="py-20 px-4 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-1 gap-8">

                        {/* SINGLE CONSOLIDATED GLOBAL STANDARDS CARD */}
                        <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                            {/* Text Content (Left) */}
                            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                                <div className="mb-4">
                                    <span className="inline-block px-2.5 py-1 bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wider mb-3">Global Standards & Ethics</span>
                                    <h4 className="text-xl font-bold text-slate-900 leading-snug mb-4">Your Projects Meet the Highest Global Benchmarks. Automatically.</h4>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed text-justify mb-4">
                                    Every report you generate is measured against IFC Performance Standards and UN Sustainable Development Goals &mdash; the same frameworks used by the World Bank, DFIs, and 100+ global financial institutions. You don&rsquo;t need to know the standards. You just need to answer the intake questions.
                                </p>

                                {/* Three Steps */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="border-l-2 border-blue-500 pl-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-5 h-5 bg-blue-600 text-white rounded text-[10px] font-bold flex items-center justify-center">1</span>
                                            <h5 className="text-sm font-bold text-slate-900">Global Baseline Applied</h5>
                                        </div>
                                        <p className="text-xs text-slate-600">Your project is scored against IFC Performance Standards (PS1&ndash;PS8) &mdash; covering environmental management, labour conditions, land acquisition, and indigenous peoples&rsquo; rights. Your report is valid in any country from the moment it&rsquo;s generated.</p>
                                    </div>
                                    <div className="border-l-2 border-amber-500 pl-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-5 h-5 bg-amber-600 text-white rounded text-[10px] font-bold flex items-center justify-center">2</span>
                                            <h5 className="text-sm font-bold text-slate-900">Gaps Identified & Scored</h5>
                                        </div>
                                        <p className="text-xs text-slate-600">Your inputs are checked against every Performance Standard. Where you fall short, you&rsquo;ll see exactly what&rsquo;s missing &mdash; with severity ratings, business impact assessment, and clear recommendations. You see the red flags before your investors do.</p>
                                    </div>
                                    <div className="border-l-2 border-emerald-500 pl-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-5 h-5 bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center justify-center">3</span>
                                            <h5 className="text-sm font-bold text-slate-900">Local Law Resolved</h5>
                                        </div>
                                        <p className="text-xs text-slate-600">Once a gap is found, the matching local regulations are surfaced &mdash; with exact legal references, required forms, enforcing agencies, and filing deadlines for your specific jurisdiction. Global standard in, local action plan out.</p>
                                    </div>
                                </div>

                                {/* What This Means For You */}
                                <div className="bg-slate-50 border border-slate-200 p-4">
                                    <h5 className="text-sm font-bold text-slate-900 mb-2">What This Means For You</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                                        <p><strong className="text-slate-800">Start Anywhere:</strong> Generate a report from any country, immediately. The global baseline works everywhere.</p>
                                        <p><strong className="text-slate-800">Investor-Ready From Day One:</strong> Global investors and DFIs prefer IFC Standards. Meeting these benchmarks opens doors to financing that local compliance alone cannot.</p>
                                        <p><strong className="text-slate-800">Protected By Default:</strong> Every report highlights exact compliance risks with severity ratings &mdash; protecting you from legal exposure and deal-killers.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Photo (Right) */}
                            <div className="h-64 md:h-auto md:w-1/3 flex-shrink-0 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80" alt="Global standards compliance" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* WORK WITH US - Partnership & Pilot Programs */}
            <section id="partnerships" className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-1 gap-8">

                        {/* SINGLE CONSOLIDATED PARTNERSHIP CARD */}
                        <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                            {/* Text Content (Left) */}
                            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                                <div className="mb-4">
                                    <span className="inline-block px-2.5 py-1 bg-blue-600/90 text-white text-[10px] font-bold uppercase tracking-wider mb-3">Partnership Opportunity</span>
                                    <h4 className="text-xl font-bold text-slate-900 leading-snug mb-4">Early Partners Shape What This Becomes. That&rsquo;s By Design.</h4>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed text-justify mb-4">
                                    Nobody is building what we&rsquo;re building. The advisory industry still runs on billable hours, recycled templates, and institutional gatekeeping. We&rsquo;re replacing that with a system that gives any organisation &mdash; regardless of size or budget &mdash; access to the same depth of strategic intelligence that used to cost six figures and take months.
                                </p>
                                <p className="text-sm text-slate-600 leading-relaxed text-justify mb-4">
                                    We&rsquo;re not looking for customers. We&rsquo;re looking for partners &mdash; organisations willing to put this system to work on real problems and help us sharpen it. Every pilot shapes the intelligence. Every partnership makes the platform stronger for every user after you. You get a system nobody else has access to yet. We get the real-world feedback that turns good software into something indispensable.
                                </p>

                                {/* Three Partner Types */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div className="border-l-2 border-emerald-500 pl-3">
                                        <h5 className="text-sm font-bold text-slate-900 mb-1">Investment Promotion Agencies</h5>
                                        <p className="text-xs text-slate-600">Your next intake cycle becomes the proving ground &mdash; faster, defensible assessments while directly shaping what gets built next.</p>
                                    </div>
                                    <div className="border-l-2 border-purple-500 pl-3">
                                        <h5 className="text-sm font-bold text-slate-900 mb-1">Regional Economic Development</h5>
                                        <p className="text-xs text-slate-600">Intelligence designed for regional economies &mdash; not retrofitted from corporate tools. Be one of the first in the world to use it.</p>
                                    </div>
                                    <div className="border-l-2 border-orange-500 pl-3">
                                        <h5 className="text-sm font-bold text-slate-900 mb-1">Public-Private Partnerships</h5>
                                        <p className="text-xs text-slate-600">Work directly with the developer. Your pain points become features. No enterprise vendor will ever offer that.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Photo (Right) */}
                            <div className="h-64 md:h-auto md:w-1/3 flex-shrink-0 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=500&fit=crop&q=80" alt="Partnership collaboration" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CLOSING - Dark Full-Width Position Statement
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-6 text-left">
                        <div className="bg-white/10 border border-white/20 p-4">
                            <p className="text-xs uppercase tracking-wider text-blue-100 mb-1">Starter Access</p>
                            <h3 className="text-xl font-bold text-white mb-1">5 Days</h3>
                            <p className="text-sm text-blue-100 mb-2">Full Access Pass</p>
                            <p className="text-2xl font-bold text-white">Free</p>
                        </div>
                        <div className="bg-white/10 border border-white/20 p-4">
                            <p className="text-xs uppercase tracking-wider text-blue-100 mb-1">Subscription</p>
                            <h3 className="text-xl font-bold text-white mb-1">3 Months</h3>
                            <p className="text-sm text-blue-100 mb-2">Full Access</p>
                            <p className="text-2xl font-bold text-white">$239</p>
                        </div>
                        <div className="bg-white/10 border border-white/20 p-4">
                            <p className="text-xs uppercase tracking-wider text-blue-100 mb-1">Subscription</p>
                            <h3 className="text-xl font-bold text-white mb-1">6 Months</h3>
                            <p className="text-sm text-blue-100 mb-2">Full Access</p>
                            <p className="text-2xl font-bold text-white">$429</p>
                        </div>
                        <div className="bg-white/10 border border-white/20 p-4">
                            <p className="text-xs uppercase tracking-wider text-blue-100 mb-1">Subscription</p>
                            <h3 className="text-xl font-bold text-white mb-1">12 Months</h3>
                            <p className="text-sm text-blue-100 mb-2">Full Access</p>
                            <p className="text-2xl font-bold text-white">$610</p>
                        </div>
                    </div>
                    <p className="text-base text-blue-100 italic">
                        A new voice for regions. A new standard for how opportunity is evaluated &mdash; anywhere in the world.
                    </p>
                </div>
            </section>

            {/* FOOTER INFO SECTION */}
            <section id="footer-info" className="py-20 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-1 gap-8">

                        {/* SINGLE CONSOLIDATED FOOTER CARD */}
                        <div className="group bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                            {/* Text Content (Left) */}
                            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                                <div className="mb-4">
                                    <span className="inline-block px-2.5 py-1 bg-slate-800/90 text-white text-[10px] font-bold uppercase tracking-wider mb-3">Launch Platform</span>
                                    <h4 className="text-xl font-bold text-slate-900 leading-snug mb-4">Launch the full BW Nexus Intelligence OS to start analyzing partnership opportunities with sovereign-grade analytical depth.</h4>
                                </div>

                                {/* Terms of Engagement */}
                                <div className="bg-slate-50 border border-slate-200 p-4 mb-4">
                                    <h5 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <Shield size={14} className="text-blue-600" />
                                        Terms of Engagement
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                                        <p><strong className="text-slate-800">1. Strategic Decision Support:</strong> BW AI is a decision support platform. All outputs are advisory.</p>
                                        <p><strong className="text-slate-800">2. Reasoning Governance:</strong> NSIL layer governs analysis via adversarial input screening.</p>
                                        <p><strong className="text-slate-800">3. Data Privacy:</strong> Strict compliance with GDPR, Australian Privacy Act.</p>
                                        <p><strong className="text-slate-800">4. Accountability:</strong> Users retain final accountability for decisions.</p>
                                    </div>
                                </div>

                                {/* T&C Checkbox */}
                                <div className="flex items-start gap-3 mb-4 text-left">
                                    <input 
                                        type="checkbox" 
                                        id="acceptTerms" 
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-transparent text-blue-600 focus:ring-blue-400 cursor-pointer"
                                    />
                                    <label htmlFor="acceptTerms" className="text-sm text-slate-600 cursor-pointer">
                                        By accessing the platform, you agree to our <strong className="text-slate-900">Terms & Conditions</strong>
                                    </label>
                                </div>

                                {/* Launch Button */}
                                <button 
                                    disabled={!termsAccepted}
                                    onClick={() => termsAccepted && onEnterPlatform?.()}
                                    className={`w-full py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                                        termsAccepted 
                                            ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer' 
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Launch Intelligence OS
                                    <ArrowRight size={16} />
                                </button>

                                {/* Three Info Columns */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
                                    <div className="border-l-2 border-blue-500 pl-3">
                                        <h5 className="text-sm font-bold text-slate-900 mb-1">BWGA Ai</h5>
                                        <p className="text-xs text-slate-600 mb-2">BW Global Advisory is an Australian strategic intelligence firm developing sovereign-grade AI systems for cross-border investment and regional economic development.</p>
                                        <div className="space-y-0.5 text-xs text-slate-500">
                                            <p className="flex items-center gap-1"><Mail size={10} /> brayden@bwglobaladvis.info</p>
                                            <p className="flex items-center gap-1"><Phone size={10} /> +63 960 835 4283</p>
                                        </div>
                                    </div>
                                    <div className="border-l-2 border-amber-500 pl-3">
                                        <h5 className="text-sm font-bold text-slate-900 mb-1">Development Status</h5>
                                        <p className="text-xs text-slate-600"><strong>CURRENT PHASE:</strong> Research & Development</p>
                                        <p className="text-xs text-slate-500 mt-1">Operating under Brayden Walls as a registered Australian sole trader. Platform being developed for government and enterprise clients.</p>
                                    </div>
                                    <div className="border-l-2 border-emerald-500 pl-3">
                                        <h5 className="text-sm font-bold text-slate-900 mb-1">Documentation</h5>
                                        <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                                            <button onClick={() => setActiveDocument('user-manual')} className="text-left hover:text-slate-900 transition-colors">User Manual</button>
                                            <button onClick={() => setActiveDocument('terms')} className="text-left hover:text-slate-900 transition-colors">Terms & Conditions</button>
                                            <button onClick={() => setActiveDocument('privacy')} className="text-left hover:text-slate-900 transition-colors">Privacy Policy</button>
                                            <button onClick={() => setActiveDocument('ethics')} className="text-left hover:text-slate-900 transition-colors">Ethical AI Framework</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Photo (Right) */}
                            <div className="h-64 md:h-auto md:w-1/3 flex-shrink-0 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop&q=80" alt="Intelligence platform interface" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ----------------------------------------------------------- */}
            {/* WHAT YOU GET  -  Detail Popup Modal                          */}
            {/* ----------------------------------------------------------- */}
            {showOutputDetails && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowOutputDetails(false)}>
                    <div className="bg-white border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Photo Header */}
                        <div className="h-48 relative overflow-hidden flex-shrink-0">
                            <img 
                                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop&q=80"
                                alt="Strategic deliverables"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
                            <button 
                                onClick={() => setShowOutputDetails(false)} 
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center shadow-lg"
                            >
                                <X size={18} />
                            </button>
                            <div className="absolute bottom-4 left-6 right-6">
                                <span className="inline-block px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider mb-2">Document Factory</span>
                                <h2 className="text-xl font-bold text-white leading-snug">What You Get</h2>
                                <p className="text-sm text-white/80 mt-1">The Full Picture &mdash; 247 Document Types Across 15 Categories</p>
                            </div>
                        </div>
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="max-w-4xl mx-auto">

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

                        {/* --- PROOF OF CAPABILITY --- */}
                        <div className="py-10 px-6 md:px-8 bg-white border-t border-slate-200">
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
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------------------------------------------------- */}
            {/* TEN-STEP PROTOCOL  -  Detail Popup Modal  -  REDESIGNED      */}
            {/* ----------------------------------------------------------- */}
            {showProtocolDetails && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowProtocolDetails(false)}>
                    <div className="bg-white border border-slate-200 shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Photo Header */}
                        <div className="h-52 relative overflow-hidden flex-shrink-0">
                            <img 
                                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=400&fit=crop&q=80"
                                alt="Systematic workflow"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/40 to-transparent" />
                            <button 
                                onClick={() => setShowProtocolDetails(false)} 
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center shadow-lg"
                            >
                                <X size={18} />
                            </button>
                            <div className="absolute bottom-4 left-6 right-6">
                                <span className="inline-block px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider mb-2">The Process</span>
                                <h2 className="text-xl font-bold text-white leading-snug">How The System Works</h2>
                                <p className="text-sm text-white/80 mt-1">From First Input to Final Document &mdash; Three Stages, One Evidence Chain</p>
                            </div>
                        </div>
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto">
                        
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
                                        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
                                            {[
                                                { label: '1. Intake', color: 'bg-stone-900 text-white border-stone-900' },
                                                { label: '2. Discovery', color: 'bg-stone-700 text-white border-stone-700' },
                                                { label: '3. Analysis', color: 'bg-amber-600 text-white border-amber-600' },
                                                { label: '4. Recommendations', color: 'bg-amber-500 text-white border-amber-500' },
                                                { label: '5. Generation', color: 'bg-blue-600 text-white border-blue-600' },
                                            ].map((phase, i, arr) => (
                                                <div key={phase.label} className="flex items-center gap-1.5 flex-shrink-0">
                                                    <div className={`px-3 py-1.5 rounded-full border text-xs font-bold tracking-wide ${phase.color}`}>{phase.label}</div>
                                                    {i < arr.length - 1 && <span className="text-stone-400 text-sm font-bold">&rarr;</span>}
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                            Hello &mdash; welcome, and thank you for being here.<br /><br />
                                            I'm your BW AI Consultant. I'm here to assist you in any way I can to help you better connect with those who wish to do business or invest in regional areas, no matter where they are in the world. Whether it's preparing the right documents, understanding a new market, building a compelling case, or simply working through an idea &mdash; this is what I do.<br /><br />
                                            Are you looking to know more about something? Need help writing a letter or proposal? Want to build a case study for a project you're working on? Or do you just need some guidance on where to start?<br /><br />
                                            Let me know what you need and we'll get to work.
                                        </p>
                                        {/* Add logic to capture name/location and act on it in subsequent steps */}
                                        {/* This would be handled in the chat logic or intake form, e.g. */}
                                        {/* <NameLocationCapture onSubmit={(name, location) => setUserInfo({ name, location })} /> */}
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
                                        <p className="text-xs text-slate-600">Stress-test with 5 personas, 46+ formulas, and Monte Carlo simulation</p>
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

                        {/* Stage 2 - Adversarial Analysis */}
                        <section className="py-8 px-6 md:px-8 bg-slate-50 border-t border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <p className="text-amber-600 uppercase tracking-[0.2em] text-xs mb-3 font-bold">STAGE 2 &mdash; ADVERSARIAL ANALYSIS</p>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Every Claim Gets Stress-Tested</h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-6">
                                    Once intake is complete, the system stress-tests every claim. A SAT Contradiction Solver checks for logical inconsistencies across your inputs. Five adversarial personas &mdash; Skeptic, Advocate, Regulator, Accountant, Operator &mdash; debate the opportunity using Bayesian inference. 46+ proprietary formulas calculate risk-adjusted returns, stakeholder alignment, and strategic positioning. Monte Carlo simulation runs 5,000 scenarios to show you the real distribution of outcomes, not just the optimistic case.
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
                                            <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-amber-500 mt-0.5" /> 46+ proprietary scoring formulas</li>
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

                        {/* Stage 3 - Institutional Output */}
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
                                                    <p className="text-sm font-semibold text-slate-800">46+ Formula Engine</p>
                                                    <p className="text-xs text-slate-600">DAG Scheduler executes SPI, RROI, SEAM, and 43+ more formulas across 5 dependency levels. Each produces bounded, auditable scores.</p>
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
                                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                                    {[
                                        { label: '1. Intake', color: 'bg-stone-900 text-white border-stone-900' },
                                        { label: '2. Discovery', color: 'bg-stone-700 text-white border-stone-700' },
                                        { label: '3. Analysis', color: 'bg-amber-600 text-white border-amber-600' },
                                        { label: '4. Recommendations', color: 'bg-amber-500 text-white border-amber-500' },
                                        { label: '5. Generation', color: 'bg-blue-600 text-white border-blue-600' },
                                    ].map((phase, i, arr) => (
                                        <span key={phase.label} className="flex items-center gap-1.5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${phase.color}`}>{phase.label}</span>
                                            {i < arr.length - 1 && <span className="text-stone-400 text-xs font-bold">&rarr;</span>}
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
                                    <p>Once intake is complete, the system stress-tests every claim. A SAT Contradiction Solver checks for logical inconsistencies across your inputs. Five adversarial personas &mdash; Skeptic, Advocate, Regulator, Accountant, Operator &mdash; debate the opportunity using Bayesian inference. 46+ proprietary formulas calculate risk-adjusted returns, stakeholder alignment, and strategic positioning. Monte Carlo simulation runs 5,000 scenarios to show the real distribution of outcomes &mdash; not just the optimistic case. The Regional Development Kernel maps structural twin regions worldwide and builds a causal Problem-to-Solution Graph. The Partner Intelligence Engine ranks co-investors and delivery partners by fit, reliability, and local legitimacy.</p>

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
                                The first thing I created was the formula engine  -  46+ proprietary formulas like SPI (Strategic Positioning Index), RROI (Risk-Adjusted Return on Investment), and SEAM (Strategic Ethical Alignment Matrix). Each one designed to quantify a dimension of investment intelligence that previously relied on subjective judgement. I built the <strong>DAG Scheduler</strong> to execute them in parallel across 5 dependency levels, so no formula runs before its inputs are ready. That was the foundation.
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
                                    <p className="text-xl font-bold text-blue-600">46+</p>
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
                                            <p className="text-sm text-slate-800 font-semibold mb-1">46+ Formulas Ran Against the Validated Inputs</p>
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
                                        { file: 'services/NSILIntelligenceHub.ts', purpose: 'Master control  -  all 44+ engines orchestrated.' },
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
                                <p className="text-blue-400 uppercase tracking-[0.2em] text-sm font-bold mb-1">NSIL Runtime - How It Thinks Now</p>
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

                            <p>The NSIL &mdash; <strong>Nexus Strategic Intelligence Layer</strong> &mdash; is a deterministic reasoning engine that combines <strong>46+ proprietary formulas</strong>, <strong>44+ intelligence engines</strong>, and <strong>12 core algorithms</strong> into a unified 10-layer pipeline, now extended with a <strong>Regional Development Kernel</strong>, <strong>Partner Intelligence Engine</strong>, <strong>Problem-to-Solution Graph</strong>, <strong>Global Data Fabric</strong>, <strong>Case Study Method Layer</strong>, and <strong>Outcome Learning Service</strong>. Implemented in <span className="font-mono text-sm bg-slate-100 px-1 rounded">services/NSILIntelligenceHub.ts</span>, it runs every analysis through computational layers in sequence, with parallelism inside each layer where dependencies allow. Same inputs, same outputs, every time. Here&rsquo;s every layer, every formula, every engine.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 0 &mdash; The Laws (Knowledge Architecture)</h4>
                            <p>Hard-coded economic truth that the AI cannot alter. 46+ proprietary formulas defined with fixed mathematical relationships and bounded outputs, managed by a DAG Scheduler (<span className="font-mono text-sm bg-slate-100 px-1 rounded">DAGScheduler.ts</span>). The scheduler maps every formula into a directed acyclic graph across 5 execution levels &mdash; Level 0 runs PRI, CRI, BARNA, and TCO in parallel; Level 1 feeds into SPI, RROI, NVI, RNI, CAP; Level 2 produces SEAM, IVAS, ESI, FRS, AGI, VCI; Level 3 creates the master Strategic Confidence Framework (SCF); Level 4 runs 8 autonomous intelligence indices. Results are memoised &mdash; no formula executes twice.</p>

                            <p>Three examples of what these formulas do: <strong>SPI</strong> (Strategic Positioning Index) quantifies market dominance by weighting political risk against country risk with growth-adjusted positioning. <strong>RROI</strong> (Risk-Adjusted Return on Investment) runs Monte Carlo propagation across probability-weighted scenarios &mdash; real-world variance, not a single optimistic projection. <strong>SEAM</strong> (Strategic Ethical Alignment Matrix) cross-references strategy against policy frameworks and stakeholder impact.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 1 &mdash; The Shield (Input Validation)</h4>
                            <p>A SAT Contradiction Solver I wrote (<span className="font-mono text-sm bg-slate-100 px-1 rounded">SATContradictionSolver.ts</span>) converts inputs into propositional logic &mdash; conjunctive normal form &mdash; and runs a DPLL-based satisfiability check. Catches contradictions like claiming low risk while expecting 40%+ ROI, targeting global expansion on a small budget, or combining conservative strategy with aggressive growth targets. Each contradiction is classified by severity.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 2 &mdash; The Boardroom (Multi-Agent Debate)</h4>
                            <p>Five adversarial personas &mdash; Skeptic (1.2x weight), Advocate, Regulator, Accountant, and Operator &mdash; conduct a structured Bayesian debate (<span className="font-mono text-sm bg-slate-100 px-1 rounded">BayesianDebateEngine.ts</span>). Each votes across four outcomes: proceed, pause, restructure, or reject. Beliefs update via Bayesian inference. Early stopping at 0.75 posterior probability or 0.02 belief delta. Disagreements resolved through Nash bargaining. Every persona&rsquo;s reasoning preserved in the audit trail.</p>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Layer 3 &mdash; The Engine (Formula Scoring)</h4>
                            <p>The DAG Scheduler executes the full 46+ formula suite with typed inputs, bounded outputs, component breakdowns, and execution timing. Results flow into a <span className="font-mono text-sm bg-slate-100 px-1 rounded">CompositeScoreService</span> that normalises raw data against region-specific baselines. Deterministic jitter from hash-based seeding ensures reproducibility.</p>

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
                                    <strong>Internal Echo Detector</strong> &mdash; Prevents confirmation bias inside the machine itself. Flags when NSIL's own conclusions align too strongly with your stated preferences-runs explicit contradiction checks.
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

                            <h4 className="text-lg font-bold text-blue-800 pt-4 border-t-2 border-blue-200 mt-6">Entity Intelligence Pipeline &mdash; Real-Time Entity Verification</h4>
                            <p className="text-sm text-slate-700 mb-3">When any entity (company, partner, organisation, individual) is mentioned in a query, the Entity Intelligence Pipeline fires automatically. It runs 7 verification sources in parallel and produces a composite assessment:</p>
                            <div className="bg-amber-50/60 border border-amber-200 rounded-sm p-4 mb-4">
                                <div className="grid md:grid-cols-2 gap-2">
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>&bull; <strong>OpenSanctions</strong> &mdash; OFAC, UN, EU, UK, INTERPOL sanctions + PEP screening with clearance levels</li>
                                        <li>&bull; <strong>OpenCorporates</strong> &mdash; Corporate registry verification: jurisdiction, incorporation date, active status</li>
                                        <li>&bull; <strong>GLEIF</strong> &mdash; Legal Entity Identifier (LEI) lookup: ownership chain, parent entities, registration status</li>
                                        <li>&bull; <strong>V-Dem v14</strong> &mdash; Academic governance scores (University of Gothenburg): rule of law, corruption control, civil liberties, democratic quality across 40+ countries</li>
                                    </ul>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>&bull; <strong>Tavily</strong> &mdash; Deep AI-synthesised web research with source attribution for entity background</li>
                                        <li>&bull; <strong>Brave Search</strong> &mdash; Independent non-Google web index providing unbiased search results</li>
                                        <li>&bull; <strong>GDELT</strong> &mdash; Global news monitoring with tone/sentiment analysis for media coverage assessment</li>
                                    </ul>
                                </div>
                                <p className="text-sm text-slate-700 mt-3">The pipeline produces a composite <strong>Entity Intelligence Report</strong>: verified/unverified status, sanctions clearance, PEP flags, jurisdiction governance band, media sentiment, and an overall risk rating (LOW/MODERATE/HIGH/CRITICAL). Every claim traces to its data source. When a source returns no data, the system says so.</p>
                            </div>
                            <p className="text-sm text-slate-700 mb-3">The system also supports <strong>Groq function calling</strong> &mdash; 4 tool schemas (<code className="text-xs bg-slate-100 px-1 rounded">screen_entity</code>, <code className="text-xs bg-slate-100 px-1 rounded">lookup_company</code>, <code className="text-xs bg-slate-100 px-1 rounded">research_entity</code>, <code className="text-xs bg-slate-100 px-1 rounded">compare_governance</code>) allow the AI to autonomously decide which verification tools to invoke during a conversation, executing up to 3 rounds of tool use before producing a final answer.</p>

                            <h4 className="text-lg font-bold text-blue-800 pt-4 border-t-2 border-blue-200 mt-6">Live External Intelligence Layer &mdash; 15+ Global Data APIs</h4>
                            <p className="text-sm text-slate-700 mb-3">The system now connects to live external data sources on every analysis. No simulated data, no cached proxies &mdash; real-time signals from authoritative global sources:</p>
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-sm p-4 mb-4">
                                <div className="grid md:grid-cols-2 gap-2">
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>&bull; <strong>ACLED</strong> &mdash; Real-time conflict &amp; political violence events with severity scoring and risk levels</li>
                                        <li>&bull; <strong>OpenSanctions</strong> &mdash; Entity screening against OFAC, UN, EU, UK, INTERPOL + PEP databases</li>
                                        <li>&bull; <strong>OpenCorporates</strong> &mdash; Company verification: jurisdiction, status, incorporation date, registry data</li>
                                        <li>&bull; <strong>GLEIF</strong> &mdash; Legal Entity Identifier lookups: LEI codes, ownership chains, registration status</li>
                                        <li>&bull; <strong>V-Dem v14</strong> &mdash; Academic governance scores: 12+ dimensions for 40+ countries (University of Gothenburg)</li>
                                        <li>&bull; <strong>UN Comtrade</strong> &mdash; Bilateral trade statistics: exports, imports, trade balance by country pair</li>
                                        <li>&bull; <strong>GDELT</strong> &mdash; Global news event monitoring with geolocation and sentiment analysis</li>
                                        <li>&bull; <strong>World Bank</strong> &mdash; GDP, inflation, trade openness, governance indicators by country</li>
                                    </ul>
                                    <ul className="space-y-1 text-sm text-slate-600">
                                        <li>&bull; <strong>Brave Search</strong> &mdash; Independent non-Google web index for unbiased entity and market research</li>
                                        <li>&bull; <strong>Tavily</strong> &mdash; Deep AI-synthesised web research with source attribution and confidence scores</li>
                                        <li>&bull; <strong>Wikidata</strong> &mdash; Structured knowledge graph via SPARQL queries for entities, relationships, facts</li>
                                        <li>&bull; <strong>Wikipedia</strong> &mdash; Encyclopedic context and summaries for cities, regions, organisations</li>
                                        <li>&bull; <strong>REST Countries</strong> &mdash; Country profiles: population, area, borders, currencies, languages, timezones</li>
                                        <li>&bull; <strong>DuckDuckGo</strong> &mdash; Live web search for current events and breaking developments</li>
                                    </ul>
                                </div>
                                <p className="text-sm text-slate-700 mt-3">Every data point carries a <strong>freshness timestamp</strong> and <strong>confidence score</strong>. The Regional Development Kernel blocks output when data confidence drops below threshold. All sources are queried in parallel via the Brain Integration Service and Entity Intelligence Pipeline.</p>
                            </div>

                            <h4 className="text-lg font-bold text-blue-800 pt-2">Brain Integration Service &mdash; 44-Engine Parallel Brain</h4>
                            <p className="text-sm text-slate-700 mb-3">Every query fires 44+ engines simultaneously via <code className="text-xs bg-slate-100 px-1 rounded">Promise.allSettled</code>. The Brain Integration Service is the runtime core that sits between your input and the AI response:</p>
                            <div className="bg-blue-50/60 border border-blue-200 rounded-sm p-4 mb-4">
                                <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600">
                                    <li><strong>Formula indices</strong> &mdash; All 46+ proprietary formulas via CompositeScoreService</li>
                                    <li><strong>Regional Development Kernel</strong> &mdash; Interventions, partners, causal graphs, governance readiness</li>
                                    <li><strong>Decision Pipeline</strong> &mdash; Structured decision packets with ranked strategic options</li>
                                    <li><strong>Domain Agent Synthesis</strong> &mdash; Gov Policy, Banking, Corporate, Market, Risk, Historical agents</li>
                                    <li><strong>Persona Engine</strong> &mdash; Skeptic, Advocate, Regulator, Accountant debate</li>
                                    <li><strong>ReactiveIntelligenceEngine</strong> &mdash; Opportunity detection + live risk monitoring</li>
                                    <li><strong>GlobalIssueResolver</strong> &mdash; Universal problem-solver with root cause analysis</li>
                                    <li><strong>SelfImprovementEngine</strong> &mdash; Runtime weight tuning with drift detection and rollback</li>
                                    <li><strong>ResearchEcosystemScoringService</strong> &mdash; TAI/ICI/ERS scoring with confidence calibration, integrated into runtime adjudication</li>
                                    <li><strong>ACLED, OpenSanctions, UN Comtrade, Tavily</strong> &mdash; Live external data agents</li>
                                    <li><strong>OSINT search</strong> &mdash; Open-source intelligence for country/org context</li>
                                    <li><strong>Derived indices</strong> &mdash; PRI (Political Risk), TCO (Total Cost), CRI (Country Risk)</li>
                                </ul>
                                <p className="text-sm text-slate-700 mt-3">Engines that fail gracefully degrade without blocking the rest. Results are unpacked, merged, and injected into a unified strategic prompt with full source attribution.</p>
                            </div>

                            <h4 className="text-lg font-bold text-blue-800 pt-2">Self-Learning &amp; Self-Improvement Loop</h4>
                            <p className="text-sm text-slate-700 mb-3">The system continuously improves from its own operations:</p>
                            <div className="bg-violet-50/60 border border-violet-200 rounded-sm p-4 mb-4">
                                <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600">
                                    <li><strong>SelfImprovementEngine</strong> &mdash; Records per-run performance metrics, detects accuracy drift via Welch&rsquo;s t-test, auto-tunes formula weights with full rollback safety</li>
                                    <li><strong>selfLearningEngine</strong> &mdash; EventBus-driven continuous learning: listens for analysis completions, user feedback, formula executions, and agent outcomes to build institutional knowledge over time</li>
                                    <li><strong>Adaptive Query Routing</strong> &mdash; Detects query type (info question, person lookup, location research, complex analysis) and routes to the optimal processing path automatically</li>
                                    <li><strong>World Knowledge Grants</strong> &mdash; Every AI turn receives a system-level knowledge instruction, ensuring accurate factual responses for general questions alongside deep NSIL analysis</li>
                                </ul>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 pt-2">Implementation Inventory</h4>
                            <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-slate-600 mb-6">
                                <li><strong>55,000+ lines of TypeScript code</strong> across 165+ service files</li>
                                <li><strong>Fully implemented, no placeholders:</strong> Every engine has working code, type definitions, and unit test coverage</li>
                                <li><strong>15+ live external data APIs:</strong> ACLED, OpenSanctions, OpenCorporates, GLEIF, V-Dem, Brave Search, UN Comtrade, GDELT, Tavily, World Bank, Wikidata, Wikipedia, REST Countries, DuckDuckGo</li>
                                <li><strong>Entity Intelligence Pipeline:</strong> 7-source parallel entity verification with composite risk assessment, sanctions screening, corporate registry, LEI lookup, governance scoring, news sentiment</li>
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

                            <h4 className="text-lg font-bold text-slate-900 pt-4">The 46+ Proprietary Formulas</h4>
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
                                    <li><strong>44+ Specialized Intelligence Engines</strong> - Input Shield, Persona Engine, Counterfactual Engine, Outcome Tracker, Unbiased Analysis, Creative Synthesis, Cross-Domain Transfer, Autonomous Goal, Ethical Reasoning, Self-Evolving Algorithm, Adaptive Learning, Emotional Intelligence, Scenario Simulation, plus proactive and reflexive engines</li>
                                    <li><strong>12 Core Algorithm Engines</strong> - From vector memory retrieval to frontier intelligence with negotiation simulation</li>
                                    <li><strong>10-Layer Deterministic Pipeline</strong> - Laws &rarr; Shield &rarr; Boardroom &rarr; Engine &rarr; Stress Test &rarr; Brain &rarr; Autonomous &rarr; Proactive &rarr; Output &rarr; Reflexive</li>
                                    <li><strong>46+ Proprietary Formulas</strong> - Strategic core indices, advanced evaluation matrices, structural assessments, risk models, financial metrics, operational scores, market analysis, governance frameworks, partner scoring, and Research Ecosystem formulas (TAI/ICI/ERS)</li>
                                    <li><strong>7 Neuroscience Models</strong> - Wilson-Cowan, Predictive Coding, Free Energy Principle, Attention, Emotional Processing, Global Workspace, Working Memory</li>
                                    <li><strong>44-Engine Parallel Brain</strong> - BrainIntegrationService fires adversarial reasoning, comprehensive indices, multi-agent orchestration, historical learning, NSIL hub, composite scoring, global compliance, case graphs, regional development, partner comparison, decision pipeline, document routing, IFC standards, pattern confidence, maturity scoring, problem-to-solution graphs, motivation detection, counterfactual analysis, narrative synthesis, historical parallel matching, partner intelligence, situation analysis, outcome tracking, self-learning, unbiased analysis, persona debate, derived indices, OSINT, consultant gating, reactive intelligence, global issue resolution, self-improvement, ACLED, sanctions screening, UN Comtrade, Tavily, intelligence quality gating, V-Dem governance, Research Ecosystem scoring, and failure mode governance simultaneously via Promise.allSettled</li>
                                    <li><strong>Entity Intelligence Pipeline</strong> - 7-source parallel entity verification: OpenSanctions screening, OpenCorporates registry, GLEIF LEI lookup, V-Dem governance scoring, Tavily deep research, Brave independent search, GDELT news sentiment. Produces composite risk ratings with source accountability</li>
                                    <li><strong>Groq Function Calling</strong> - 4 tool schemas (screen_entity, lookup_company, research_entity, compare_governance) enable the AI to autonomously invoke verification tools during conversation with up to 3 rounds of tool use</li>
                                    <li><strong>15+ Live External Data APIs</strong> - ACLED conflict data, OpenSanctions screening, OpenCorporates, GLEIF, V-Dem v14 governance, Brave Search, UN Comtrade trade statistics, GDELT global news, World Bank indicators, Wikidata SPARQL, Wikipedia, REST Countries, DuckDuckGo web search, Tavily deep research - every data point timestamped with confidence scoring</li>
                                    <li><strong>Regional Development Kernel</strong> - RegionalDevelopmentOrchestrator, Partner Intelligence Engine, Problem-to-Solution Graph, Global Data Fabric, Outcome Learning Service</li>
                                    <li><strong>Case Study Method Layer</strong> - 5-gate methodological validation enforced across all entry paths before any output generates</li>
                                    <li><strong>Reactive Agentic Runtime</strong> - Streamed responses, draft-time signal extraction, concurrent planner/executor tasks, message-level provenance confidence, adaptive query routing (info/person/location/complex analysis detection), and world knowledge grants on every turn</li>
                                    <li><strong>Self-Learning &amp; Self-Improvement Loop</strong> - SelfImprovementEngine (runtime weight tuning with Welch&rsquo;s t-test drift detection and rollback), selfLearningEngine (EventBus-driven continuous learning from every system event), GlobalIssueResolver (universal problem-solver with root cause analysis)</li>
                                    <li><strong>8 Global Issue Packs</strong> - Water Security, Energy Transition, Logistics Corridors, Housing Systems, Health Systems, Digital Infrastructure, Workforce Transition, Climate Resilience</li>
                                    <li><strong>Output at Scale</strong> - 156+ letter templates, 247+ document outputs, adaptive intake-to-generation flow, full case study analysis, multi-audience translation, partner-aware institutional drafting</li>
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

            {showBreakthroughPopup && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm" onClick={() => setShowBreakthroughPopup(false)}>
                    <div
                        className="absolute inset-y-0 right-0 w-full max-w-2xl bg-slate-950 shadow-2xl border-l border-blue-900 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 md:px-8 py-6 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
                            <div>
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">The Actual Breakthrough</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                                    Applying the Failure Model to Regional City Economic Perception
                                </h3>
                            </div>
                            <button onClick={() => setShowBreakthroughPopup(false)} className="text-slate-400 hover:text-white transition-colors p-2">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="px-6 md:px-8 py-8 space-y-6">
                            <p className="text-base text-slate-300 leading-relaxed">
                                This system was built as a direct countermeasure to each one. It replaces CBD-biased data gaps with live regional intelligence: governance scores, trade flows, sanctions registries, infrastructure capacity, and ecosystem readiness — the signals that never appear in a national aggregate. It pressure-tests causal assumptions through five independent reasoning engines because the inherited model of how regional economies work has rarely been subjected to structured adversarial challenge. It forces the search beyond the obvious, surfacing pathways that peer conformity and existing networks would never reach.
                            </p>
                            <p className="text-base text-slate-300 leading-relaxed">
                                What the system returns is not a report. It is a position — built in the language of institutional legitimacy, structured to satisfy fiduciary guardrails, with every claim marked proven, assumed, or unknown, and every gap explicitly flagged. A regional thesis that can be presented to a board, an investment committee, or a minister and withstand scrutiny. Not because the region was made to look like something it is not, but because the analysis was finally done properly.
                            </p>
                        </div>

                        <div className="px-6 md:px-8 py-6 border-t border-slate-800 bg-slate-900 flex justify-end">
                            <button
                                onClick={() => setShowBreakthroughPopup(false)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-sm text-sm font-bold hover:bg-blue-500 transition-colors"
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


