import React from 'react';
import { X, Download, FileText, Printer, FileCode, Table, Globe } from 'lucide-react';
import { api } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}) => {
  if (!isOpen) return null;

  const handleDownloadMarkdown = () => {
    window.open(api.getExportUrl(conversationId, 'markdown'), '_blank');
    onClose();
  };

  const handleDownloadCsv = () => {
    window.open(api.getExportUrl(conversationId, 'csv'), '_blank');
    onClose();
  };

  const handleDownloadHtml = () => {
    window.open(api.getExportUrl(conversationId, 'html'), '_blank');
    onClose();
  };

  const handleDownloadJson = () => {
    window.open(api.getExportUrl(conversationId, 'json'), '_blank');
    onClose();
  };

  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border border-cyan-500/40 shadow-glow-cyan overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">Export Engineering Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Export <strong className="text-cyan-300">"{conversationTitle}"</strong> into professional engineering documentation formats:
          </p>

          <div className="space-y-2.5">
            <button
              onClick={handleDownloadMarkdown}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Markdown Document (.md)</div>
                <div className="text-xs text-slate-400">Complete derivations, equations, and code blocks</div>
              </div>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400">
                <Globe size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Standalone HTML Report (.html)</div>
                <div className="text-xs text-slate-400">Formatted self-contained technical report</div>
              </div>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-amber-950 text-amber-400">
                <Table size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Numerical Data Table (.csv)</div>
                <div className="text-xs text-slate-400">Tabular format for spreadsheets and data analysis</div>
              </div>
            </button>

            <button
              onClick={handlePrint}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-blue-950 text-blue-400">
                <Printer size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Print / Save as PDF</div>
                <div className="text-xs text-slate-400">Printable browser view for technical reports</div>
              </div>
            </button>

            <button
              onClick={handleDownloadJson}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-3 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-purple-950 text-purple-400">
                <FileCode size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Raw JSON (.json)</div>
                <div className="text-xs text-slate-400">Full conversation object with metadata and timestamps</div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
