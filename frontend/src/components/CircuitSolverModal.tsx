import React, { useState } from 'react';
import { X, Zap, Cpu, Check, AlertTriangle, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { api } from '../services/api';
import { MathRenderer } from './MathRenderer';

interface CircuitSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (text: string) => void;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Voltage Divider',
    netlist: `* Simple Voltage Divider\nV1 1 0 10V\nR1 1 2 2k\nR2 2 0 2k\n.end`,
    desc: 'Two 2k resistors dividing 10V into 5V.'
  },
  {
    name: 'Wheatstone Bridge',
    netlist: `* Balanced Wheatstone Bridge\nV1 in 0 10V\nR1 in a 100\nR2 in b 100\nR3 a 0 100\nR4 b 0 100\nRgalv a b 50\n.end`,
    desc: 'Bridge with galvanometer resistor across nodes A & B.'
  },
  {
    name: 'Multi-Loop DC Network',
    netlist: `* Multi-Loop Two-Source Circuit\nV1 1 0 12V\nV2 3 0 5V\nR1 1 2 1k\nR2 2 0 2k\nR3 2 3 1.5k\n.end`,
    desc: 'Two voltage sources driving a resistive network.'
  },
  {
    name: 'DC RLC Network',
    netlist: `* DC Steady-State with Inductor & Capacitor\nV1 1 0 12V\nR1 1 2 1k\nC1 2 0 10uF\nL1 2 3 10mH\nRload 3 0 1k\n.end`,
    desc: 'Demonstrates open capacitor and short inductor in DC.'
  }
];

export const CircuitSolverModal: React.FC<CircuitSolverModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat
}) => {
  const [netlist, setNetlist] = useState<string>(SAMPLE_TEMPLATES[0].netlist);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSolve = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.solveCircuit({ netlist });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Circuit solving failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!result || !onInsertToChat) return;
    let summary = `### CircuitX Verified MNA DC Circuit Solution\n\n`;
    summary += `**Nodes (${result.num_nodes}):**\n`;
    for (const [node, volt] of Object.entries(result.nodes)) {
      summary += `- Node **${node}**: ${volt} V\n`;
    }
    summary += `\n**Branches (${result.branches.length}):**\n`;
    for (const b of result.branches) {
      summary += `- **${b.name}** (${b.component_type}): $V = ${b.voltage_V}\\,\\text{V}$, $I = ${b.current_A}\\,\\text{A}$, $P = ${b.power_W}\\,\\text{W}$ [${b.status}]\n`;
    }
    summary += `\n**Physical Conservation Checks:**\n`;
    summary += `- Power Balance Residual (Tellegen): ${result.power_balance_error_W} W\n`;
    summary += `- Kirchhoff's Current Law (KCL) Max Residual: ${result.kcl_max_residual_A} A\n`;
    summary += `- MNA Matrix Condition Number: ${result.matrix_condition_number}\n`;

    onInsertToChat(summary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-[#0F172A] border border-cyan-500/40 shadow-glow-cyan overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Modified Nodal Analysis (MNA) Circuit Solver
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
                  [Calculated Visualization]
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic DC nodal potential, branch current, and power conservation solver
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Template Bar */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-cyan-400" />
              <span>Sample Circuit Topologies</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setNetlist(tmpl.netlist);
                    setResult(null);
                    setError(null);
                  }}
                  className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-all"
                >
                  <div className="text-xs font-semibold text-slate-200">{tmpl.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tmpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SPICE Netlist Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                SPICE Netlist Input (<span className="text-cyan-400 font-mono">Name Node+ Node- Value</span>)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Requires ground node '0' or 'GND'</span>
            </div>
            <textarea
              value={netlist}
              onChange={(e) => setNetlist(e.target.value)}
              rows={6}
              className="w-full bg-[#0A0E17] border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none leading-relaxed"
              placeholder="V1 1 0 10V&#10;R1 1 2 2k&#10;R2 2 0 2k"
            />
          </div>

          {/* Solve Button */}
          <div>
            <button
              onClick={handleSolve}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-glow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Solving in MNA Matrix Engine...</span>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Solve Circuit Operating Point</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Circuit Validation / Matrix Error</div>
                <div className="leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {/* Solution Display */}
          {result && (
            <div className="space-y-5 pt-2">
              {/* Header result row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Check size={16} className="text-emerald-400" />
                  <span>MNA Solution Verified ({result.num_nodes} Nodes, {result.num_elements} Elements)</span>
                </div>
                {onInsertToChat && (
                  <button
                    onClick={handleInsert}
                    className="text-xs text-slate-200 hover:text-cyan-300 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    <span>Insert into chat</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>

              {/* SVG Schematic Diagram */}
              {result.svg_schematic && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-cyan-400" />
                    <span>Generated Circuit Schematic & Potentials</span>
                  </div>
                  <div
                    className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0A0E17]"
                    dangerouslySetInnerHTML={{ __html: result.svg_schematic }}
                  />
                </div>
              )}

              {/* Nodal Potentials & Branches Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Node Voltages Table */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Node Voltages
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono">
                    {Object.entries(result.nodes).map(([node, volt]: [string, any]) => (
                      <div key={node} className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-semibold">Node {node}:</span>
                        <span className="text-cyan-400 font-bold">{volt.toFixed(4)} V</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conservation & Residuals */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Physical Consistency Checks
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Power Supplied:</span>
                      <span className="text-emerald-400 font-bold">{result.total_power_supplied_W.toFixed(4)} W</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Power Dissipated:</span>
                      <span className="text-blue-400 font-bold">{result.total_power_dissipated_W.toFixed(4)} W</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Tellegen Residual (ΔP):</span>
                      <span className="text-slate-300 font-bold">{result.power_balance_error_W.toExponential(2)} W</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Max KCL Residual:</span>
                      <span className="text-slate-300 font-bold">{result.kcl_max_residual_A.toExponential(2)} A</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Matrix Condition No.:</span>
                      <span className="text-slate-300 font-bold">{result.matrix_condition_number}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch Elements Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 overflow-x-auto">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Branch Component Results
                </h4>
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-2">Element</th>
                      <th className="py-2 px-2">Nodes</th>
                      <th className="py-2 px-2">Value</th>
                      <th className="py-2 px-2">Voltage V</th>
                      <th className="py-2 px-2">Current I</th>
                      <th className="py-2 px-2">Power P</th>
                      <th className="py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.branches.map((b: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                        <td className="py-1.5 px-2 font-bold text-cyan-300">{b.name}</td>
                        <td className="py-1.5 px-2 text-slate-400">{b.node_pos} → {b.node_neg}</td>
                        <td className="py-1.5 px-2 text-slate-300">{b.value}</td>
                        <td className="py-1.5 px-2 text-slate-200">{b.voltage_V.toFixed(4)} V</td>
                        <td className="py-1.5 px-2 text-slate-200">{b.current_A.toFixed(4)} A</td>
                        <td className="py-1.5 px-2 text-slate-200">{b.power_W.toFixed(4)} W</td>
                        <td className="py-1.5 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              b.status === 'Supplying'
                                ? 'bg-emerald-950 text-emerald-400'
                                : b.status === 'Absorbing'
                                ? 'bg-amber-950 text-amber-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mathematical Derivation Steps in KaTeX */}
              {result.derivation_steps && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Mathematical Derivation & Analysis Steps
                  </h4>
                  {result.derivation_steps.map((step: string, sIdx: number) => (
                    <div key={sIdx} className="text-xs text-slate-300 font-mono leading-relaxed">
                      <MathRenderer content={step} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
