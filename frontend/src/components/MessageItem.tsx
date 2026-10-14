import React, { useState, useMemo } from 'react';
import { Copy, Check, RotateCw, Cpu, User, FileText, CornerDownRight } from 'lucide-react';
import { Message } from '../types';
import { MarkdownViewer } from './MarkdownViewer';

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onSelectFollowUp?: (question: string) => void;
  isLastAssistant?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onSelectFollowUp,
  isLastAssistant,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract follow-up questions if present in assistant response
  const followUpQuestions = useMemo(() => {
    if (isUser) return [];
    const match = message.content.match(/#### Follow-up Questions:\s*([\s\S]*?)$/i);
    if (!match) return [];

    const lines = match[1].split('\n');
    const questions: string[] = [];
    for (const line of lines) {
      const q = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
      if (q && q.endsWith('?')) {
        questions.push(q);
      }
    }
    return questions.slice(0, 3);
  }, [message.content, isUser]);

  return (
    <div
      className={`py-5 px-4 md:px-8 border-b border-slate-800/60 transition-colors ${
        isUser ? 'bg-slate-900/30' : 'bg-[#0B1120]/70'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 md:gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User size={16} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-[#0A0E17] rounded-lg flex items-center justify-center text-cyan-400">
                <Cpu size={17} />
              </div>
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isUser ? 'text-slate-300' : 'text-cyan-400'}`}>
                {isUser ? 'Engineer' : 'CircuitX'}
              </span>
              {!isUser && message.metadata?.domain && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 text-[10px] font-mono">
                  {message.metadata.domain.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Time / Actions */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {!isUser && (
                <button
                  onClick={handleCopyAnswer}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-800/80 transition-colors"
                  title="Copy full answer"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* User Attachments */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {message.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
                >
                  <FileText size={12} className="text-cyan-400" />
                  <span className="font-mono">{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Message Body */}
          <div className="prose-invert max-w-none text-slate-200">
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed text-slate-100">{message.content}</p>
            ) : (
              <MarkdownViewer content={message.content} />
            )}
          </div>

          {/* Follow-up question chips */}
          {!isUser && followUpQuestions.length > 0 && (
            <div className="pt-3 border-t border-slate-800/60">
              <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <CornerDownRight size={13} className="text-cyan-400" />
                <span>Suggested Follow-Ups:</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {followUpQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectFollowUp?.(q)}
                    className="text-left text-xs bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assistant Action Bar (Regenerate) */}
          {!isUser && isLastAssistant && onRegenerate && (
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
                title="Regenerate this response"
              >
                <RotateCw size={13} />
                <span>Regenerate response</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
