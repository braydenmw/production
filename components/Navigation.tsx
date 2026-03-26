import React, { useState } from 'react';
import {
  Home,
  Bot,
  BarChart3,
  Globe,
  FileText,
  Users,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  Shield,
  Map,
} from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

interface NavItem {
  label: string;
  view: string;
  icon: React.ReactNode;
}

const primaryNav: NavItem[] = [
  { label: 'Home', view: 'landing', icon: <Home className="w-3.5 h-3.5" /> },
  { label: 'Consultant', view: 'consultant-os', icon: <Bot className="w-3.5 h-3.5" /> },
  { label: 'Command Center', view: 'command-center', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { label: 'Location Intel', view: 'global-location-intel', icon: <Globe className="w-3.5 h-3.5" /> },
  { label: 'Reports', view: 'main', icon: <FileText className="w-3.5 h-3.5" /> },
];

const moreNav: NavItem[] = [
  { label: 'Matchmaking', view: 'matchmaking', icon: <Users className="w-3.5 h-3.5" /> },
  { label: 'Intake', view: 'intake', icon: <Map className="w-3.5 h-3.5" /> },
  { label: 'Documents', view: 'documents', icon: <FileText className="w-3.5 h-3.5" /> },
  { label: 'User Manual', view: 'user-manual', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { label: 'Admin', view: 'admin', icon: <Shield className="w-3.5 h-3.5" /> },
];

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const [showMore, setShowMore] = useState(false);
  const [showMobile, setShowMobile] = useState(false);

  const isActive = (view: string) => currentView === view;

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between z-50 relative">
      {/* Logo */}
      <button
        onClick={() => onNavigate('landing')}
        className="flex items-center gap-2 flex-shrink-0"
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0D3A83] to-[#1C53A4] flex items-center justify-center">
          <span className="text-white font-bold text-xs">BW</span>
        </div>
        <span className="font-semibold text-slate-800 text-sm hidden sm:block">BWGA</span>
      </button>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-1">
        {primaryNav.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive(item.view)
                ? 'bg-[#0D3A83] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {/* More dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMore((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            More
            <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
          {showMore && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMore(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                {moreNav.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => {
                      onNavigate(item.view);
                      setShowMore(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      isActive(item.view)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
        onClick={() => setShowMobile((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {showMobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile menu */}
      {showMobile && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50 py-2 md:hidden">
          {[...primaryNav, ...moreNav].map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view);
                setShowMobile(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                isActive(item.view)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navigation;
