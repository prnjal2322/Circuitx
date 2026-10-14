import React, { useState, useEffect } from 'react';
import { X, Terminal, Play, CheckCircle2, AlertCircle, RefreshCw, Download, ExternalLink, Code2 } from 'lucide-react';
import { api } from '../services/api';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (text: string) => void;
}

const SAMPLE_VERILOG = {
  counter: {
    name: '4-Bit Counter with Testbench',
    module: `module counter_4bit (
    input  wire       clk,
    input  wire       reset,
    input  wire       enable,
    output reg  [3:0] q
);
    always @(posedge clk or posedge reset) begin
        if (reset)
            q <= 4'b0000;
        else if (enable)
            q <= q + 1;
    end
endmodule`,
    tb: `\`timescale 1ns / 1ps
module tb_counter();
    reg        clk;
    reg        reset;
    reg        enable;
    wire [3:0] q;

    counter_4bit uut (
        .clk(clk),
        .reset(reset),
        .enable(enable),
        .q(q)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, tb_counter);
        clk = 0;
        reset = 1;
        enable = 0;
        #20 reset = 0;
        #10 enable = 1;
        #100;
        $display("Final Counter Value: %d (Expected: 10)", q);
        $finish;
    end
endmodule`
  },
  fsm: {
    name: '101 Sequence Detector FSM',
    module: `module seq_detector (
    input  wire clk,
    input  wire reset,
    input  wire din,
    output reg  detected
);
    localparam S0 = 2'b00, S1 = 2'b01, S2 = 2'b10;
    reg [1:0] state, next_state;

    always @(posedge clk or posedge reset) begin
        if (reset)
            state <= S0;
        else
            state <= next_state;
    end

    always @(*) begin
        detected = 1'b0;
        case (state)
            S0: next_state = din ? S1 : S0;
            S1: next_state = din ? S1 : S2;
            S2: begin
                if (din) begin
                    detected = 1'b1;
                    next_state = S1;
                end else
                    next_state = S0;
            end
            default: next_state = S0;
        endcase
    end
endmodule`,
    tb: `\`timescale 1ns / 1ps
module tb_fsm();
    reg clk, reset, din;
    wire detected;

    seq_detector uut (.clk(clk), .reset(reset), .din(din), .detected(detected));

    always #5 clk = ~clk;

    initial begin
        $dumpfile("dump.vcd");
        $dumpvars(0, tb_fsm);
        clk = 0; reset = 1; din = 0;
        #15 reset = 0;
        // Stream: 1, 0, 1 -> match!
        #10 din = 1;
        #10 din = 0;
        #10 din = 1;
        #10 $display("Sequence complete. Detected flag: %b", detected);
        #20 $finish;
    end
endmodule`
  }
};

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'verilog'>('verilog');
  const [toolsStatus, setToolsStatus] = useState<Record<string, any>>({});
  const [statusLoading, setStatusLoading] = useState<boolean>(false);

  // Verilog Editor State
  const [moduleCode, setModuleCode] = useState<string>(SAMPLE_VERILOG.counter.module);
  const [tbCode, setTbCode] = useState<string>(SAMPLE_VERILOG.counter.tb);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadToolsStatus();
    }
  }, [isOpen]);

  const loadToolsStatus = async () => {
    setStatusLoading(true);
    try {
      const data = await api.getSimulationStatus();
      setToolsStatus(data);
    } catch (e) {
      console.error('Failed to fetch tool status', e);
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRunSimulation = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await api.runVerilogSimulation({
        code: moduleCode,
        testbench_code: tbCode,
        timeout_sec: 5.0
      });
      setSimResult(res);
    } catch (err: any) {
      setSimResult({
        success: false,
        tool_installed: false,
        exit_code: -1,
        stderr: err.message || 'Simulation execution error',
        stdout: '',
        explanation: 'Failed to connect to simulation runner backend.'
      });
    } finally {
      setSimLoading(false);
    }
  };

  const handleRunLinter = async () => {
    setSimLoading(true);
    try {
      const res = await api.lintVerilog({ code: moduleCode + '\n' + tbCode });
      setSimResult({
        success: res.valid,
        tool_installed: false,
        exit_code: res.valid ? 0 : 1,
        stdout: res.syntax_summary,
        stderr: res.errors.join('\n'),
        linter_feedback: res,
        explanation: 'Structural HDL Linter Analysis completed.'
      });
    } catch (err: any) {
      alert(err.message || 'Linter failed');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-[#0F172A] border border-cyan-500/40 shadow-glow-cyan overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Terminal size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                External Simulation & Tool Integrations
              </h2>
              <p className="text-xs text-slate-400">
                Controlled sandboxed HDL & SPICE simulator execution adapters
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

        {/* Tab selection */}
        <div className="flex overflow-x-auto px-4 pt-3 bg-slate-900/60 border-b border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('verilog')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'verilog'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Code2 size={14} />
            <span>Verilog HDL Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Terminal size={14} />
            <span>Tool Discovery & Setup Guide</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Verilog HDL Simulator */}
          {activeTab === 'verilog' && (
            <div className="space-y-5">
              {/* Template pills */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModuleCode(SAMPLE_VERILOG.counter.module);
                      setTbCode(SAMPLE_VERILOG.counter.tb);
                      setSimResult(null);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono"
                  >
                    Load Counter Design
                  </button>
                  <button
                    onClick={() => {
                      setModuleCode(SAMPLE_VERILOG.fsm.module);
                      setTbCode(SAMPLE_VERILOG.fsm.tb);
                      setSimResult(null);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono"
                  >
                    Load FSM Design
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Sandbox Timeout: 5.0s | VCD Waveforms Enabled
                </div>
              </div>

              {/* Code Editors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                    <span>Synthesizable RTL Module (design.v)</span>
                  </div>
                  <textarea
                    value={moduleCode}
                    onChange={(e) => setModuleCode(e.target.value)}
                    rows={12}
                    className="w-full bg-[#0A0E17] border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none leading-relaxed"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                    <span>Simulation Testbench (testbench.v)</span>
                  </div>
                  <textarea
                    value={tbCode}
                    onChange={(e) => setTbCode(e.target.value)}
                    rows={12}
                    className="w-full bg-[#0A0E17] border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRunSimulation}
                  disabled={simLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Play size={15} />
                  <span>{simLoading ? 'Running Simulation in Sandbox...' : 'Run Simulation (Icarus Verilog)'}</span>
                </button>
                <button
                  onClick={handleRunLinter}
                  disabled={simLoading}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                >
                  Structural Linter Check
                </button>
              </div>

              {/* Simulation Result Output */}
              {simResult && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {simResult.success ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-400" />
                      )}
                      <span className="font-bold text-white">
                        {simResult.tool_installed
                          ? `Simulation Result (Exit Code ${simResult.exit_code})`
                          : 'Structural HDL Linter Result'}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                      {simResult.tool_installed ? '[Simulation-Generated Result]' : '[Structural Linter Fallback]'}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs font-sans leading-relaxed">
                    {simResult.explanation}
                  </p>

                  {/* Stdout / Stderr logs */}
                  {simResult.stdout && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Standard Output (Console):</div>
                      <pre className="p-3 rounded-lg bg-[#0A0E17] border border-slate-800 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                        {simResult.stdout}
                      </pre>
                    </div>
                  )}

                  {simResult.stderr && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Console Error / Diagnostic:</div>
                      <pre className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 overflow-x-auto text-[11px] leading-relaxed">
                        {simResult.stderr}
                      </pre>
                    </div>
                  )}

                  {/* Installation Instructions if tool not installed */}
                  {!simResult.tool_installed && simResult.install_instructions && (
                    <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 font-sans space-y-1 text-xs">
                      <div className="font-bold text-cyan-300">How to install Icarus Verilog on your machine:</div>
                      <div className="text-slate-300 text-[11px]">
                        <strong>Windows:</strong> {simResult.install_instructions.windows}
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        <strong>Linux:</strong> {simResult.install_instructions.linux}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Discovery & Tool Setup Guide */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Real environment discovery for optional engineering tools.
                </div>
                <button
                  onClick={loadToolsStatus}
                  disabled={statusLoading}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={statusLoading ? 'animate-spin' : ''} />
                  <span>Refresh Tools</span>
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(toolsConfigEntries(toolsStatus)).map(([key, tool]: [string, any]) => (
                  <div
                    key={key}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{tool.name.replace('_', ' ').toUpperCase()}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            tool.installed
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {tool.installed ? 'Installed & Ready' : 'Not Installed (Optional)'}
                        </span>
                      </div>
                      {tool.version && (
                        <span className="text-[11px] text-cyan-400 font-mono">{tool.version}</span>
                      )}
                    </div>

                    <p className="text-slate-400 text-xs">{tool.description}</p>

                    {!tool.installed && tool.install_instructions && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1">
                        <div>
                          <strong className="text-cyan-400">Windows:</strong> {tool.install_instructions.windows}
                        </div>
                        <div>
                          <strong className="text-cyan-400">Linux:</strong> {tool.install_instructions.linux}
                        </div>
                        <div>
                          <strong className="text-cyan-400">macOS:</strong> {tool.install_instructions.macos}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function toolsConfigEntries(tools: Record<string, any>) {
  if (Object.keys(tools).length > 0) return tools;
  return {
    icarus_verilog: {
      name: 'Icarus Verilog',
      installed: false,
      description: 'IEEE-1364 HDL Simulator and VVP Runtime',
      install_instructions: {
        windows: 'winget install -e --id Bleyer.IcarusVerilog  OR  choco install icarus-verilog',
        linux: 'sudo apt-get install -y iverilog',
        macos: 'brew install icarus-verilog'
      }
    },
    ngspice: {
      name: 'ngspice',
      installed: false,
      description: 'Mixed-Level / Mixed-Signal Circuit Simulator',
      install_instructions: {
        windows: 'winget install ngspice',
        linux: 'sudo apt-get install -y ngspice',
        macos: 'brew install ngspice'
      }
    },
    octave: {
      name: 'GNU Octave',
      installed: false,
      description: 'High-Level Numerical Computing Language',
      install_instructions: {
        windows: 'winget install GNU.Octave',
        linux: 'sudo apt-get install -y octave',
        macos: 'brew install octave'
      }
    }
  };
}
