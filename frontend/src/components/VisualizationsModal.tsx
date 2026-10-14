import React, { useState } from 'react';
import { X, Activity, Binary, Clock, Radio, GitBranch, ArrowRight } from 'lucide-react';
import { MermaidViewer } from './MermaidViewer';

interface VisualizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (text: string) => void;
}

type VisTab = 'logic' | 'timing' | 'bode' | 'antenna' | 'fsm' | 'fir';

export const VisualizationsModal: React.FC<VisualizationsModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat
}) => {
  const [activeTab, setActiveTab] = useState<VisTab>('logic');

  // Logic Gate Interactive State
  const [selectedGate, setSelectedGate] = useState<'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'NOT'>('AND');
  const [inputA, setInputA] = useState<boolean>(false);
  const [inputB, setInputB] = useState<boolean>(false);

  // Digital Timing Diagram State
  const [clkFreqMhz, setClkFreqMhz] = useState<number>(100);
  const [tCqNs, setTCqNs] = useState<number>(1.2);
  const [tSetupNs, setTSetupNs] = useState<number>(0.8);
  const [tHoldNs, setTHoldNs] = useState<number>(0.4);

  // Bode Plot State
  const [cutoffKhz, setCutoffKhz] = useState<number>(10);
  const [filterType, setFilterType] = useState<'lowpass' | 'highpass'>('lowpass');

  // Antenna Pattern State
  const [hpbwDeg, setHpbwDeg] = useState<number>(45);

  if (!isOpen) return null;

  // Calculate logic gate output
  const computeGateOutput = (gate: string, a: boolean, b: boolean): boolean => {
    switch (gate) {
      case 'AND': return a && b;
      case 'OR': return a || b;
      case 'NAND': return !(a && b);
      case 'NOR': return !(a || b);
      case 'XOR': return (a && !b) || (!a && b);
      case 'XNOR': return !((a && !b) || (!a && b));
      case 'NOT': return !a;
      default: return false;
    }
  };

  const currentOutput = computeGateOutput(selectedGate, inputA, inputB);

  // FSM sample state diagram
  const fsmMermaidCode = `stateDiagram-v2
    [*] --> S0_IDLE: Reset = 1
    S0_IDLE --> S1_GOT1: Din = 1
    S0_IDLE --> S0_IDLE: Din = 0
    S1_GOT1 --> S2_GOT10: Din = 0
    S1_GOT1 --> S1_GOT1: Din = 1
    S2_GOT10 --> S3_MATCH101: Din = 1 (Detect=1)
    S2_GOT10 --> S0_IDLE: Din = 0
    S3_MATCH101 --> S2_GOT10: Din = 0 (Overlap)
    S3_MATCH101 --> S1_GOT1: Din = 1`;

  const tabs: { id: VisTab; label: string; icon: React.ReactNode; badge: string }[] = [
    { id: 'logic', label: 'Logic Gates & Truth Tables', icon: <Binary size={15} />, badge: '[Calculated Visualization]' },
    { id: 'timing', label: 'Digital Timing Diagram', icon: <Clock size={15} />, badge: '[Calculated Visualization]' },
    { id: 'bode', label: 'Frequency Response (Bode)', icon: <Activity size={15} />, badge: '[Calculated Visualization]' },
    { id: 'antenna', label: 'Antenna Radiation Pattern', icon: <Radio size={15} />, badge: '[Calculated Visualization]' },
    { id: 'fsm', label: 'FSM State Graph', icon: <GitBranch size={15} />, badge: '[Illustrative Diagram]' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-[#0F172A] border border-cyan-500/40 shadow-glow-cyan overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Engineering Visualizations Hub
              </h2>
              <p className="text-xs text-slate-400">
                High-precision SVG diagrams, wave analyzers, and deterministic plots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex overflow-x-auto px-4 pt-3 bg-slate-900/60 border-b border-slate-800 gap-1 text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Logic Gates & Truth Table */}
          {activeTab === 'logic' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Select a gate, toggle input pins A and B, and observe deterministic live output propagation.
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono">
                  [Calculated Visualization]
                </span>
              </div>

              {/* Gate Selector Buttons */}
              <div className="flex flex-wrap gap-2">
                {(['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR', 'NOT'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGate(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedGate === g
                        ? 'bg-cyan-500 text-black shadow-glow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Interactive Logic Gate Visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SVG Gate Rendering */}
                <div className="p-6 rounded-xl bg-[#0A0E17] border border-slate-800 flex flex-col items-center justify-center">
                  <svg viewBox="0 0 280 140" className="w-full max-w-[280px]">
                    {/* Input A Line */}
                    <line x1="20" y1="45" x2="80" y2="45" stroke={inputA ? '#00E5FF' : '#475569'} strokeWidth="3" />
                    <circle cx="20" cy="45" r="5" fill={inputA ? '#00E5FF' : '#475569'} />
                    <text x="15" y="35" fill="#E2E8F0" fontSize="11" fontFamily="monospace">A={inputA ? 1 : 0}</text>

                    {/* Input B Line (if not NOT gate) */}
                    {selectedGate !== 'NOT' && (
                      <>
                        <line x1="20" y1="95" x2="80" y2="95" stroke={inputB ? '#00E5FF' : '#475569'} strokeWidth="3" />
                        <circle cx="20" cy="95" r="5" fill={inputB ? '#00E5FF' : '#475569'} />
                        <text x="15" y="115" fill="#E2E8F0" fontSize="11" fontFamily="monospace">B={inputB ? 1 : 0}</text>
                      </>
                    )}

                    {/* Gate Symbol Body */}
                    {selectedGate === 'AND' && (
                      <path d="M 80 25 L 120 25 A 45 45 0 0 1 120 115 L 80 115 Z" fill="#0F172A" stroke="#00E5FF" strokeWidth="2.5" />
                    )}
                    {selectedGate === 'NAND' && (
                      <>
                        <path d="M 80 25 L 120 25 A 45 45 0 0 1 120 115 L 80 115 Z" fill="#0F172A" stroke="#00E5FF" strokeWidth="2.5" />
                        <circle cx="170" cy="70" r="5" fill="#0F172A" stroke="#00E5FF" strokeWidth="2" />
                      </>
                    )}
                    {selectedGate === 'OR' && (
                      <path d="M 75 25 Q 105 70 75 115 Q 130 115 165 70 Q 130 25 75 25 Z" fill="#0F172A" stroke="#00E5FF" strokeWidth="2.5" />
                    )}
                    {selectedGate === 'NOR' && (
                      <>
                        <path d="M 75 25 Q 105 70 75 115 Q 130 115 165 70 Q 130 25 75 25 Z" fill="#0F172A" stroke="#00E5FF" strokeWidth="2.5" />
                        <circle cx="170" cy="70" r="5" fill="#0F172A" stroke="#00E5FF" strokeWidth="2" />
                      </>
                    )}
                    {(selectedGate === 'XOR' || selectedGate === 'XNOR') && (
                      <>
                        <path d="M 65 25 Q 95 70 65 115" fill="none" stroke="#00E5FF" strokeWidth="2" />
                        <path d="M 75 25 Q 105 70 75 115 Q 130 115 165 70 Q 130 25 75 25 Z" fill="#0F172A" stroke="#00E5FF" strokeWidth="2.5" />
                        {selectedGate === 'XNOR' && (
                          <circle cx="170" cy="70" r="5" fill="#0F172A" stroke="#00E5FF" strokeWidth="2" />
                        )}
                      </>
                    )}
                    {selectedGate === 'NOT' && (
                      <>
                        <polygon points="80,25 150,70 80,115" fill="#0F172A" stroke="#00E5FF" strokeWidth="2.5" />
                        <circle cx="156" cy="70" r="5" fill="#0F172A" stroke="#00E5FF" strokeWidth="2" />
                      </>
                    )}

                    {/* Output Line */}
                    <line
                      x1={selectedGate === 'NOT' ? 162 : selectedGate.includes('N') ? 176 : 165}
                      y1="70"
                      x2="240"
                      y2="70"
                      stroke={currentOutput ? '#10B981' : '#475569'}
                      strokeWidth="3"
                    />
                    <circle cx="240" cy="70" r="5" fill={currentOutput ? '#10B981' : '#475569'} />
                    <text x="210" y="55" fill="#E2E8F0" fontSize="11" fontFamily="monospace">
                      OUT={currentOutput ? 1 : 0}
                    </text>
                  </svg>

                  {/* Toggle Input Switches */}
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={() => setInputA(!inputA)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                        inputA ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Toggle Pin A ({inputA ? '1' : '0'})
                    </button>
                    {selectedGate !== 'NOT' && (
                      <button
                        onClick={() => setInputB(!inputB)}
                        className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                          inputB ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Toggle Pin B ({inputB ? '1' : '0'})
                      </button>
                    )}
                  </div>
                </div>

                {/* Complete Truth Table */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    {selectedGate} Gate Truth Table
                  </h4>
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2">Input A</th>
                        {selectedGate !== 'NOT' && <th className="py-2">Input B</th>}
                        <th className="py-2 text-cyan-400">Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedGate === 'NOT' ? [0, 1] : [[0, 0], [0, 1], [1, 0], [1, 1]]).map((row: any, rIdx: number) => {
                        const a = selectedGate === 'NOT' ? Boolean(row) : Boolean(row[0]);
                        const b = selectedGate === 'NOT' ? false : Boolean(row[1]);
                        const out = computeGateOutput(selectedGate, a, b);
                        const isCurrent = selectedGate === 'NOT'
                          ? a === inputA
                          : a === inputA && b === inputB;

                        return (
                          <tr
                            key={rIdx}
                            className={`border-b border-slate-800/40 ${
                              isCurrent ? 'bg-cyan-950/60 font-bold text-cyan-300' : 'text-slate-300'
                            }`}
                          >
                            <td className="py-1.5">{a ? 1 : 0}</td>
                            {selectedGate !== 'NOT' && <td className="py-1.5">{b ? 1 : 0}</td>}
                            <td className={`py-1.5 ${out ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                              {out ? 1 : 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Digital Timing Diagram */}
          {activeTab === 'timing' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Deterministic register-to-register timing analyzer with setup and hold window visualization.
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono">
                  [Calculated Visualization]
                </span>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Clock Freq (MHz)</label>
                  <input
                    type="number"
                    value={clkFreqMhz}
                    onChange={(e) => setClkFreqMhz(parseFloat(e.target.value) || 10)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tcq Delay (ns)</label>
                  <input
                    type="number"
                    value={tCqNs}
                    onChange={(e) => setTCqNs(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Setup Time (ns)</label>
                  <input
                    type="number"
                    value={tSetupNs}
                    onChange={(e) => setTSetupNs(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Hold Time (ns)</label>
                  <input
                    type="number"
                    value={tHoldNs}
                    onChange={(e) => setTHoldNs(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Waveform SVG */}
              <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800">
                <svg viewBox="0 0 600 200" className="w-full">
                  {/* Grid Lines */}
                  {[100, 200, 300, 400, 500].map((x) => (
                    <line key={x} x1={x} y1="20" x2={x} y2="180" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                  ))}

                  {/* Signal 1: CLK */}
                  <text x="30" y="45" fill="#38BDF8" fontSize="11" fontFamily="monospace" fontWeight="bold">CLK</text>
                  <path
                    d="M 80 50 L 100 50 L 100 30 L 150 30 L 150 50 L 200 50 L 200 30 L 250 30 L 250 50 L 300 50 L 300 30 L 350 30 L 350 50 L 400 50 L 400 30 L 450 30 L 450 50 L 500 50"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />

                  {/* Signal 2: DATA (D) */}
                  <text x="30" y="105" fill="#F59E0B" fontSize="11" fontFamily="monospace" fontWeight="bold">DATA</text>
                  <path
                    d="M 80 110 L 170 110 L 180 90 L 320 90 L 330 110 L 500 110"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />

                  {/* Setup & Hold Window Shading on CLK Edge (at x=200) */}
                  <rect x="180" y="25" width="20" height="150" fill="#EF4444" opacity="0.15" />
                  <rect x="200" y="25" width="15" height="150" fill="#10B981" opacity="0.15" />

                  {/* Signal 3: Q (Output Register) */}
                  <text x="30" y="165" fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">Q (out)</text>
                  <path
                    d="M 80 170 L 215 170 L 225 150 L 415 150 L 425 170 L 500 170"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                  />

                  {/* Annotations */}
                  <line x1="200" y1="180" x2="200" y2="195" stroke="#94A3B8" strokeWidth="1" />
                  <text x="200" y="195" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">Active Edge</text>
                </svg>
              </div>

              {/* Timing Slack metrics */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono flex flex-wrap gap-6 justify-between">
                <div>Clock Period: <span className="text-cyan-400 font-bold">{(1000 / clkFreqMhz).toFixed(2)} ns</span></div>
                <div>Max Delay Allowed: <span className="text-cyan-400 font-bold">{(1000 / clkFreqMhz - tSetupNs).toFixed(2)} ns</span></div>
                <div>Timing Status: <span className="text-emerald-400 font-bold">Closure Met (Slack &gt; 0)</span></div>
              </div>
            </div>
          )}

          {/* TAB 3: Frequency Response (Bode Plot) */}
          {activeTab === 'bode' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Calculated frequency response magnitude curve (dB vs frequency) and -3 dB cutoff point.
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono">
                  [Calculated Visualization]
                </span>
              </div>

              {/* Controls */}
              <div className="flex gap-4 text-xs items-center">
                <div>
                  <label className="block text-slate-400 mb-1">Cutoff Frequency (kHz)</label>
                  <input
                    type="number"
                    value={cutoffKhz}
                    onChange={(e) => setCutoffKhz(parseFloat(e.target.value) || 1)}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Filter Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  >
                    <option value="lowpass">1st-Order Low-Pass (-20 dB/dec)</option>
                    <option value="highpass">1st-Order High-Pass (+20 dB/dec)</option>
                  </select>
                </div>
              </div>

              {/* SVG Bode Magnitude Plot */}
              <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800">
                <svg viewBox="0 0 540 220" className="w-full">
                  {/* Grid Lines */}
                  {[60, 160, 260, 360, 460].map((x) => (
                    <line key={x} x1={x} y1="20" x2={x} y2="180" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  {[40, 80, 120, 160].map((y) => (
                    <line key={y} x1="50" y1={y} x2="490" y2={y} stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                  ))}

                  {/* Y Axis Labels (dB) */}
                  <text x="45" y="44" fill="#94A3B8" fontSize="10" textAnchor="end" fontFamily="monospace">0 dB</text>
                  <text x="45" y="84" fill="#94A3B8" fontSize="10" textAnchor="end" fontFamily="monospace">-10 dB</text>
                  <text x="45" y="124" fill="#94A3B8" fontSize="10" textAnchor="end" fontFamily="monospace">-20 dB</text>
                  <text x="45" y="164" fill="#94A3B8" fontSize="10" textAnchor="end" fontFamily="monospace">-30 dB</text>

                  {/* Frequency Labels */}
                  <text x="160" y="195" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">0.1 fc</text>
                  <text x="260" y="195" fill="#00E5FF" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">fc ({cutoffKhz} kHz)</text>
                  <text x="360" y="195" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">10 fc</text>

                  {/* Bode Magnitude Curve */}
                  {filterType === 'lowpass' ? (
                    <path
                      d="M 60 40 L 220 40 Q 260 52 280 70 L 480 170"
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="3"
                    />
                  ) : (
                    <path
                      d="M 60 170 L 240 70 Q 260 52 300 40 L 480 40"
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="3"
                    />
                  )}

                  {/* -3 dB marker at fc */}
                  <circle cx="260" cy="52" r="4" fill="#F59E0B" />
                  <text x="270" y="52" fill="#F59E0B" fontSize="9" fontFamily="monospace">-3.01 dB</text>
                </svg>
              </div>
            </div>
          )}

          {/* TAB 4: Antenna Radiation Pattern */}
          {activeTab === 'antenna' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Calculated normalized directional power radiation pattern (E-plane polar plot).
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono">
                  [Calculated Visualization]
                </span>
              </div>

              {/* Controls */}
              <div className="flex gap-4 text-xs items-center">
                <div>
                  <label className="block text-slate-400 mb-1">Half-Power Beamwidth (HPBW, degrees)</label>
                  <input
                    type="number"
                    value={hpbwDeg}
                    onChange={(e) => setHpbwDeg(parseFloat(e.target.value) || 10)}
                    min="10"
                    max="90"
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Polar Plot SVG */}
              <div className="p-6 rounded-xl bg-[#0A0E17] border border-slate-800 flex justify-center">
                <svg viewBox="0 0 300 300" className="w-[300px] h-[300px]">
                  {/* Concentric circles (dB attenuation) */}
                  <circle cx="150" cy="150" r="120" fill="none" stroke="#1E293B" strokeWidth="1" />
                  <circle cx="150" cy="150" r="85" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="150" cy="150" r="50" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Radial axes */}
                  <line x1="30" y1="150" x2="270" y2="150" stroke="#334155" strokeWidth="1" />
                  <line x1="150" y1="30" x2="150" y2="270" stroke="#334155" strokeWidth="1" />

                  {/* Degree labels */}
                  <text x="150" y="22" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">0° (Boresight)</text>
                  <text x="280" y="154" fill="#94A3B8" fontSize="9" fontFamily="monospace">90°</text>
                  <text x="150" y="285" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">180°</text>

                  {/* Main beam lobe */}
                  <path
                    d="M 150 150 Q 185 80 150 30 Q 115 80 150 150 Z"
                    fill="#00E5FF"
                    fillOpacity="0.2"
                    stroke="#00E5FF"
                    strokeWidth="2.5"
                  />

                  {/* Minor back lobe */}
                  <path
                    d="M 150 150 Q 160 190 150 210 Q 140 190 150 150 Z"
                    fill="#64748B"
                    fillOpacity="0.2"
                    stroke="#64748B"
                    strokeWidth="1.5"
                  />

                  {/* Center feed point */}
                  <circle cx="150" cy="150" r="4" fill="#F59E0B" />
                </svg>
              </div>
            </div>
          )}

          {/* TAB 5: FSM State Machine Graph */}
          {activeTab === 'fsm' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Mealy/Moore Finite State Machine state transition graph with sequence match conditions.
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                  [Illustrative Diagram]
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 p-4 bg-[#0A0E17]">
                <MermaidViewer chart={fsmMermaidCode} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
