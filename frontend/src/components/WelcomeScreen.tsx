import React from 'react';
import { Cpu, Zap, Gauge, Binary, Code2, Layers, Radio, Activity, Bug, Compass, Wifi, Sparkles } from 'lucide-react';
import { EngineeringDomain } from '../types';
import { SUGGESTED_TASK_CARDS, DOMAINS } from '../utils/domains';

interface WelcomeScreenProps {
  currentDomain: EngineeringDomain;
  onSelectTask: (prompt: string, domain?: EngineeringDomain) => void;
}

const ICONS: Record<string, React.ReactNode> = {
  Zap: <Zap size={18} className="text-cyan-400" />,
  Gauge: <Gauge size={18} className="text-blue-400" />,
  Binary: <Binary size={18} className="text-cyan-300" />,
  Code2: <Code2 size={18} className="text-emerald-400" />,
  Layers: <Layers size={18} className="text-amber-400" />,
  Radio: <Radio size={18} className="text-purple-400" />,
  Activity: <Activity size={18} className="text-sky-400" />,
  Bug: <Bug size={18} className="text-rose-400" />,
  Compass: <Compass size={18} className="text-indigo-400" />,
  Wifi: <Wifi size={18} className="text-teal-400" />,
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ currentDomain, onSelectTask }) => {
  const domainMeta = DOMAINS.find((d) => d.id === currentDomain) || DOMAINS[0];
  const isSpecializedDomain = currentDomain !== 'general';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full text-center">
      {/* Circuit IC Chip Icon Banner */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-glow-cyan animate-pulse">
          <div className="w-full h-full bg-[#0A0E17] rounded-2xl flex items-center justify-center">
            <Cpu size={32} className="text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Main Titles */}
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
        Circuit<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">X</span>
      </h1>
      <p className="text-base md:text-lg text-slate-300 font-medium max-w-xl mb-4">
        Your AI-Powered Electronics Engineering Assistant
      </p>

      {/* Active Domain Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-300 mb-6 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span className="font-semibold">{domainMeta.name}</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400 hidden sm:inline">{domainMeta.tagline}</span>
      </div>

      {/* Feature Capabilities Pill */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-[11px] text-slate-400">
        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">
          ⚡ Verified NumPy Calculations
        </span>
        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">
          📐 Native KaTeX Mathematical Equations
        </span>
        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">
          📊 Dynamic Mermaid Schematics
        </span>
        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">
          💻 Synthesizable Verilog & HDL
        </span>
      </div>

      {/* Domain-Specific Workflows (if specialized discipline selected) */}
      {isSpecializedDomain && domainMeta.suggestedTasks && domainMeta.suggestedTasks.length > 0 && (
        <div className="w-full text-left mb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Sparkles size={14} className="text-cyan-400" />
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              {domainMeta.name} Focus Tasks
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {domainMeta.suggestedTasks.map((taskPrompt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectTask(taskPrompt, currentDomain)}
                className="group p-3 rounded-xl bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-left flex items-start gap-2.5 shadow-sm"
              >
                <div className="p-1.5 rounded-md bg-cyan-900/40 text-cyan-400 flex-shrink-0 mt-0.5">
                  <Zap size={14} />
                </div>
                <div className="text-xs text-slate-200 group-hover:text-cyan-200 leading-relaxed font-medium">
                  {taskPrompt}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Engineering Task Cards Grid */}
      <div className="w-full text-left">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
          {isSpecializedDomain ? 'Universal Engineering Task Templates' : 'Suggested Engineering Tasks'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_TASK_CARDS.map((card, idx) => (
            <button
              key={idx}
              onClick={() => onSelectTask(card.prompt, card.domain)}
              className="group p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 transition-all text-left flex items-start gap-3 shadow-sm hover:shadow-glow-sm"
            >
              <div className="p-2 rounded-lg bg-slate-800/80 group-hover:bg-slate-700/80 transition-colors flex-shrink-0">
                {ICONS[card.icon] || <Zap size={18} className="text-cyan-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {card.title}
                </div>
                <div className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {card.prompt}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
