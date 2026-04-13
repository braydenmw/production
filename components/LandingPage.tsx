import React from 'react';
import {
  ArrowRight,
  Bot,
  Globe,
  FileText,
  BarChart3,
  Shield,
  Zap,
  Users,
  ChevronRight,
  Briefcase,
  Map,
  BookOpen,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const features = [
    {
      icon: <Bot className="w-6 h-6" />,
      title: 'BW Consultant OS',
      description:
        'AI-powered case builder with 44-engine parallel analysis. Ask any strategic question and receive consultant-grade intelligence.',
      action: () => onNavigate('consultant-os'),
      cta: 'Open Consultant',
      color: 'from-blue-600 to-blue-800',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      textAccent: 'text-blue-700',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Command Center',
      description:
        'Full platform overview with access to all tools, reports, and intelligence modules in one unified workspace.',
      action: () => onNavigate('command-center'),
      cta: 'Enter Command Center',
      color: 'from-slate-700 to-slate-900',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      textAccent: 'text-slate-700',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Global Location Intelligence',
      description:
        'Research any city or region worldwide. Live data from 15+ APIs covering economy, governance, demographics, and risk.',
      action: () => onNavigate('global-location-intel'),
      cta: 'Explore Locations',
      color: 'from-emerald-600 to-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      textAccent: 'text-emerald-700',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Report Generator',
      description:
        'Generate institutional-grade strategic reports with SPI scoring, risk analysis, and executive-ready outputs.',
      action: () => onNavigate('main'),
      cta: 'Generate Report',
      color: 'from-violet-600 to-violet-800',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      textAccent: 'text-violet-700',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Matchmaking Engine',
      description:
        'Identify and score potential partners, investors, and collaborators using AI-driven compatibility analysis.',
      action: () => onNavigate('matchmaking'),
      cta: 'Find Partners',
      color: 'from-amber-600 to-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      textAccent: 'text-amber-700',
    },
    {
      icon: <Map className="w-6 h-6" />,
      title: 'Intake & Assessment',
      description:
        'Structured intake process to capture your strategic context before analysis begins. Consultant-grade onboarding.',
      action: () => onNavigate('intake'),
      cta: 'Start Intake',
      color: 'from-rose-600 to-rose-800',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      textAccent: 'text-rose-700',
    },
  ];

  const capabilities = [
    { icon: <Shield className="w-5 h-5" />, label: 'Ethical Reasoning Gate' },
    { icon: <Zap className="w-5 h-5" />, label: '44-Engine Parallel Brain' },
    { icon: <BarChart3 className="w-5 h-5" />, label: '46+ Proprietary Formulas' },
    { icon: <Globe className="w-5 h-5" />, label: '15+ Live Data APIs' },
    { icon: <Bot className="w-5 h-5" />, label: 'Autonomous AI Agents' },
    { icon: <Briefcase className="w-5 h-5" />, label: 'Institutional-Grade Output' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F0F7FF] flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D3A83] to-[#1C53A4] flex items-center justify-center">
            <span className="text-white font-bold text-sm">BW</span>
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-sm">BWGA Intelligence Platform</span>
            <span className="ml-2 text-xs text-slate-400 hidden sm:inline">Strategic Advisory OS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('user-manual')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">User Manual</span>
          </button>
          <button
            onClick={() => onNavigate('consultant-os')}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#0D3A83] hover:bg-[#114899] px-3 py-1.5 rounded-md transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Open Consultant</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full px-6 py-16 md:py-24 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>AI-Powered Strategic Intelligence</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
          The BWGA Intelligence
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0D3A83] to-[#1C53A4]">
            Operating System
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed mb-8">
          Institutional-grade strategic advisory powered by 44 parallel AI engines, 46+ proprietary
          formulas, and live intelligence from 15+ global data sources. Built for investment
          promotion, partnership development, and market entry analysis.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate('consultant-os')}
            className="flex items-center justify-center gap-2 bg-[#0D3A83] hover:bg-[#114899] text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-sm"
          >
            <Bot className="w-4 h-4" />
            Open BW Consultant
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('command-center')}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-6 py-3 rounded-lg border border-slate-200 transition-colors shadow-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Command Center
          </button>
        </div>
      </section>

      {/* Capability Pills */}
      <section className="w-full px-6 pb-10 flex justify-center">
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
          {capabilities.map((cap) => (
            <div
              key={cap.label}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-full shadow-sm"
            >
              <span className="text-[#0D3A83]">{cap.icon}</span>
              {cap.label}
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="w-full px-6 pb-16 max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold text-slate-900 text-center mb-2">Platform Modules</h2>
        <p className="text-sm text-slate-500 text-center mb-8">
          Select a module to begin your analysis
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <button
              key={feature.title}
              onClick={feature.action}
              className={`group text-left p-5 rounded-xl border ${feature.border} ${feature.bg} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}
              >
                {feature.icon}
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{feature.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{feature.description}</p>
              <div
                className={`flex items-center gap-1 text-xs font-medium ${feature.textAccent} group-hover:gap-2 transition-all`}
              >
                {feature.cta}
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-slate-200 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          © {new Date().getFullYear()} BWGA Intelligence Platform. All rights reserved.
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('admin')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Admin
          </button>
          <button
            onClick={() => onNavigate('user-manual')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Documentation
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
