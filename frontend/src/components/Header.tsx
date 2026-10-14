import React from 'react';
import { Menu, Calculator, Download, Trash2, Settings, Zap, Activity, Terminal } from 'lucide-react';
import { EngineeringDomain } from '../types';
import { DOMAINS } from '../utils/domains';

interface HeaderProps {
  currentDomain: EngineeringDomain;
  model: string;
  onOpenMobileMenu: () => void;
  onOpenCircuitSolver: () => void;
  onOpenVisualizations: () => void;
  onOpenSimulation: () => void;
  onOpenCalculators: () => void;
  onOpenExport: () => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  hasMessages: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentDomain,
  model,
  onOpenMobileMenu,
  onOpenCircuitSolver,
  onOpenVisualizations,
  onOpenSimulation,
  onOpenCalculators,
  onOpenExport,
  onClearChat,
  onOpenSettings,
  hasMessages,
}) => {
  const domainMeta = DOMAINS.find((d) => d.id === currentDomain) || DOMAINS[0];

  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur px-4 flex items-center justify-between z-10">
      {/* Left section: mobile hamburger & active domain */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="font-semibold text-sm text-slate-200">{domainMeta.name}</span>
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-cyan-300">
            {model}
          </span>
        </div>
      </div>

      {/* Right section: action icons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onOpenCircuitSolver}
          className="p-2 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          title="Open MNA DC Circuit Solver & Netlist Schematics"
        >
          <Zap size={16} className="text-amber-400" />
          <span className="hidden lg:inline">Circuit Solver</span>
        </button>

        <button
          onClick={onOpenVisualizations}
          className="p-2 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          title="Interactive Engineering Visualizations (Bode, Logic, Timing, Antenna)"
        >
          <Activity size={16} className="text-cyan-400" />
          <span className="hidden lg:inline">Visualizations</span>
        </button>

        <button
          onClick={onOpenSimulation}
          className="p-2 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          title="Hardware Simulators (Icarus Verilog, ngspice, Octave)"
        >
          <Terminal size={16} className="text-emerald-400" />
          <span className="hidden lg:inline">Simulators</span>
        </button>

        <button
          onClick={onOpenCalculators}
          className="p-2 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          title="Open Engineering Numerical Calculators"
        >
          <Calculator size={16} />
          <span className="hidden md:inline">Calculators</span>
        </button>

        <button
          onClick={onOpenExport}
          disabled={!hasMessages}
          className="p-2 text-slate-400 hover:text-cyan-300 disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          title="Export conversation as Markdown, PDF, or JSON"
        >
          <Download size={16} />
          <span className="hidden md:inline">Export</span>
        </button>

        <button
          onClick={onClearChat}
          disabled={!hasMessages}
          className="p-2 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-slate-800 transition-colors"
          title="Clear current conversation"
        >
          <Trash2 size={16} />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors"
          title="Settings and API Configuration"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
