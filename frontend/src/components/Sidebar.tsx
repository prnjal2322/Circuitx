import React from 'react';
import {
  Plus,
  Cpu,
  Zap,
  Binary,
  Code2,
  Layers,
  Activity,
  Radio,
  Wifi,
  HardDrive,
  Terminal,
  Compass,
  Bug,
  Trash2,
  Calculator,
  Settings,
  MessageSquare,
  ChevronRight,
  X,
} from 'lucide-react';
import { Conversation, EngineeringDomain } from '../types';
import { DOMAINS } from '../utils/domains';

interface SidebarProps {
  currentDomain: EngineeringDomain;
  onSelectDomain: (domain: EngineeringDomain) => void;
  onNewChat: (domain?: EngineeringDomain) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (convId: string) => void;
  onDeleteConversation: (convId: string) => void;
  onOpenCircuitSolver: () => void;
  onOpenVisualizations: () => void;
  onOpenSimulation: () => void;
  onOpenCalculators: () => void;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const DOMAIN_ICONS: Record<EngineeringDomain, React.ReactNode> = {
  general: <Cpu size={15} />,
  circuit_analysis: <Zap size={15} />,
  digital_electronics: <Binary size={15} />,
  verilog_hdl: <Code2 size={15} />,
  vlsi_fundamentals: <Layers size={15} />,
  signals_systems: <Activity size={15} />,
  antennas_rf: <Radio size={15} />,
  communication_systems: <Wifi size={15} />,
  embedded_systems: <HardDrive size={15} />,
  matlab_computing: <Terminal size={15} />,
  electromagnetic_theory: <Compass size={15} />,
  simulation_debugging: <Bug size={15} />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentDomain,
  onSelectDomain,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onOpenCircuitSolver,
  onOpenVisualizations,
  onOpenSimulation,
  onOpenCalculators,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0B1120] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-[#0A0E17] rounded-lg flex items-center justify-center text-cyan-400">
                <Cpu size={18} />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                Circuit<span className="text-cyan-400">X</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
                Electronics AI
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-3">
          <button
            onClick={() => onNewChat(currentDomain)}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Navigation & Domain List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          {/* Engineering Domains */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Engineering Disciplines
            </div>
            <div className="space-y-0.5 mt-1">
              {DOMAINS.map((domain) => {
                const isActive = currentDomain === domain.id;
                return (
                  <button
                    key={domain.id}
                    onClick={() => {
                      onSelectDomain(domain.id);
                      onCloseMobile();
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors text-left ${
                      isActive
                        ? 'bg-slate-800/90 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                        {DOMAIN_ICONS[domain.id]}
                      </span>
                      <span className="truncate">{domain.name}</span>
                    </div>
                    {isActive && <ChevronRight size={13} className="text-cyan-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved Conversations */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Saved Conversations</span>
              <span className="text-[10px] text-slate-600 font-mono">{conversations.length}</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {conversations.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-600 italic">No saved chats yet</div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = activeConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-cyan-300 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare size={13} className={isSelected ? 'text-cyan-400' : 'text-slate-500'} />
                        <span className="truncate">{conv.title || 'Untitled Session'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Tools & Settings Bar */}
        <div className="p-3 border-t border-slate-800/80 space-y-1 bg-[#0A0E17]/60">
          <button
            onClick={() => {
              onOpenCircuitSolver();
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors"
          >
            <Zap size={15} className="text-amber-400" />
            <span>MNA Circuit Solver</span>
          </button>
          <button
            onClick={() => {
              onOpenVisualizations();
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors"
          >
            <Activity size={15} className="text-cyan-400" />
            <span>Engineering Visualizations</span>
          </button>
          <button
            onClick={() => {
              onOpenSimulation();
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors"
          >
            <Terminal size={15} className="text-emerald-400" />
            <span>Hardware Simulators</span>
          </button>
          <button
            onClick={() => {
              onOpenCalculators();
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors"
          >
            <Calculator size={15} className="text-cyan-400" />
            <span>Engineering Calculators</span>
          </button>
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors"
          >
            <Settings size={15} className="text-slate-400" />
            <span>Settings & Models</span>
          </button>
        </div>
      </aside>
    </>
  );
};
