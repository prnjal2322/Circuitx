import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, FileText, CornerDownLeft, Image, FileCode, Check } from 'lucide-react';
import { Attachment, EngineeringDomain } from '../types';
import { DOMAINS } from '../utils/domains';
import { api } from '../services/api';

interface MessageInputProps {
  onSendMessage: (message: string, attachments: Attachment[]) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  currentDomain: EngineeringDomain;
  onChangeDomain: (domain: EngineeringDomain) => void;
  initialText?: string;
}

const getFileTypeBadge = (name: string, type: string): { label: string; color: string } => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['cir', 'net', 'sp', 'spice'].includes(ext || '')) return { label: 'SPICE', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' };
  if (['v', 'sv', 'vhd', 'vhdl'].includes(ext || '')) return { label: 'HDL', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' };
  if (['m', 'matlab'].includes(ext || '')) return { label: 'MATLAB', color: 'text-orange-400 border-orange-500/40 bg-orange-950/40' };
  if (['py', 'c', 'cpp', 'h'].includes(ext || '')) return { label: 'CODE', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40' };
  if (type.startsWith('image/')) return { label: 'IMAGE', color: 'text-purple-400 border-purple-500/40 bg-purple-950/40' };
  return { label: 'FILE', color: 'text-slate-400 border-slate-700 bg-slate-800' };
};

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  currentDomain,
  onChangeDomain,
  initialText = '',
}) => {
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
      textareaRef.current?.focus();
    }
  }, [initialText]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // 1. Read locally for immediate preview/text inspection
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;

        // 2. Upload file to backend server uploads store
        let filePath = undefined;
        try {
          const uploadRes = await api.uploadFile(file);
          filePath = uploadRes.file_path;
        } catch (uploadErr) {
          console.warn('Backend file upload fallback note:', uploadErr);
        }

        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'text/plain',
            content: content || '',
            file_path: filePath,
            size_bytes: file.size,
          },
        ]);
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur px-4 py-3 md:py-4">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {attachments.map((att, i) => {
              const badge = getFileTypeBadge(att.name, att.type);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-slate-200 shadow-sm"
                >
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="font-mono truncate max-w-[140px] text-slate-300">{att.name}</span>
                  {att.size_bytes && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(att.size_bytes / 1024).toFixed(1)}k
                    </span>
                  )}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-0.5 hover:text-rose-400 transition-colors ml-1 text-slate-400"
                    title="Remove attachment"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input box card */}
        <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask CircuitX about circuits, Verilog, DSP, VLSI, RF link budgets... (Enter to send, Shift+Enter for newline)`}
            rows={1}
            disabled={isStreaming}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm md:text-base px-4 pt-3.5 pb-12 rounded-2xl resize-none focus:outline-none"
          />

          {/* Bottom Bar Controls inside input */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-auto">
            {/* Left Controls: File Attachment & Domain Switcher */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".v,.sv,.vhd,.cir,.net,.sp,.m,.py,.c,.cpp,.h,.txt,.json,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                title="Attach Schematics, SPICE Netlist, or Verilog HDL file"
              >
                <Paperclip size={16} />
              </button>

              {/* Quick Domain Selector Dropdown */}
              <select
                value={currentDomain}
                onChange={(e) => onChangeDomain(e.target.value as EngineeringDomain)}
                disabled={isStreaming}
                className="bg-slate-800/80 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded-lg px-2 py-1 border border-slate-700/80 focus:outline-none cursor-pointer"
                title="Active Engineering Domain Focus"
              >
                {DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Right Controls: Send or Stop */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow-md transition-colors animate-pulse"
                >
                  <Square size={13} />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() && attachments.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-glow-sm transition-all"
                >
                  <span>Send</span>
                  <Send size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={11} className="text-slate-400" />
            <span>Press Enter to send, Shift+Enter for new line</span>
          </span>
          <span className="hidden sm:inline">CircuitX Engine v1.0 • Verified NumPy Solvers</span>
        </div>
      </div>
    </div>
  );
};
