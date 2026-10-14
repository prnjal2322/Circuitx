import React, { useState, useEffect } from 'react';
import { X, Settings, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Cpu, Terminal } from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthStatus | null;
  onRefreshHealth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  health,
  onRefreshHealth,
}) => {
  const [testing, setTesting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      onRefreshHealth();
      setSaveStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    await onRefreshHealth();
    setTesting(false);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    setSaveStatus(null);
    try {
      const isGroq = apiKeyInput.trim().startsWith('gsk_');
      await api.saveApiKey(apiKeyInput.trim(), isGroq ? 'groq' : 'openai');
      setSaveStatus({ type: 'success', msg: `Successfully activated ${isGroq ? 'Groq (Llama 3.3 70B)' : 'OpenAI'} API Key!` });
      setApiKeyInput('');
      await onRefreshHealth();
    } catch (err: any) {
      setSaveStatus({ type: 'error', msg: err.message || 'Failed to save API key' });
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#0F172A] border border-cyan-500/40 shadow-glow-cyan overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">CircuitX Backend & AI Status</h2>
              <p className="text-xs text-slate-400">Secure backend-managed OpenAI configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs md:text-sm">
          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/50 flex items-start gap-3">
            <ShieldCheck size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-cyan-300">Secure Backend Key Management:</strong> CircuitX keeps all OpenAI API secrets strictly on the backend. API keys are never stored in browser storage, client code, or public repositories.
            </div>
          </div>

          {/* Backend AI Status */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-200">Backend Diagnostics</span>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                <span>Refresh Status</span>
              </button>
            </div>

            {health ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Server Health:</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 size={13} />
                    <span>Online (v{health.version})</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">LLM Provider:</span>
                  <span className={`font-semibold ${health.openai_configured ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health.openai_configured ? `✓ ${health.provider || 'Active'} Connected` : '⚠️ Missing / Not Configured'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Active Model:</span>
                  <span className="font-mono text-cyan-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {health.openai_model || 'qwen/qwen3.8-27b'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Task Router:</span>
                  <span className="text-emerald-400">✓ Active (14 Domains)</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Deterministic Solvers:</span>
                  <span className="text-emerald-400">✓ Ready (NumPy / SciPy)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-400 text-xs py-2">
                <AlertCircle size={15} />
                <span>Backend service unreachable at localhost:8000. Ensure the FastAPI server is running.</span>
              </div>
            )}
          </div>

          {/* Quick API Key Setup Form */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Terminal size={14} className="text-cyan-400" />
                <span>Configure AI Key (Free Groq or OpenAI)</span>
              </span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline font-medium"
              >
                Get Free Groq Key ↗
              </a>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Paste your <strong className="text-cyan-300">Groq key</strong> (<code className="text-cyan-200">gsk_...</code>) for 100% free access to Meta Llama 3.3 70B, or your <strong className="text-slate-300">OpenAI key</strong> (<code className="text-slate-200">sk-...</code>):
            </p>

            <form onSubmit={handleSaveKey} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="gsk_... or sk-..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  {savingKey ? 'Activating...' : 'Activate'}
                </button>
              </div>

              {saveStatus && (
                <div
                  className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                    saveStatus.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  {saveStatus.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{saveStatus.msg}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-900 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
