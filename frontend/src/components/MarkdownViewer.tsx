import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { MermaidViewer } from './MermaidViewer';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  // Split content by code blocks: ```lang ... ```
  const blocks = React.useMemo(() => {
    const rawBlocks: Array<{
      type: 'text' | 'code' | 'mermaid';
      language?: string;
      content: string;
    }> = [];

    const regex = /```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        rawBlocks.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        });
      }

      const language = match[1]?.trim().toLowerCase() || 'text';
      const code = match[2];

      if (language === 'mermaid') {
        rawBlocks.push({
          type: 'mermaid',
          content: code,
        });
      } else {
        rawBlocks.push({
          type: 'code',
          language,
          content: code,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      rawBlocks.push({
        type: 'text',
        content: content.substring(lastIndex),
      });
    }

    return rawBlocks;
  }, [content]);

  return (
    <div className="space-y-3 leading-relaxed text-slate-200 text-sm md:text-base">
      {blocks.map((block, i) => {
        if (block.type === 'mermaid') {
          return <MermaidViewer key={i} chart={block.content} />;
        }

        if (block.type === 'code') {
          return <CodeBlock key={i} language={block.language || 'code'} code={block.content} />;
        }

        return <TextRenderer key={i} text={block.content} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-[#0B0F19] text-xs md:text-sm font-mono shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Terminal size={13} />
          <span className="font-semibold uppercase tracking-wider text-[11px]">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-slate-800 text-slate-300 transition-colors"
          title="Copy Code"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span className={copied ? 'text-emerald-400' : ''}>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-slate-100 leading-normal">
        <pre>{code}</pre>
      </div>
    </div>
  );
};

const TextRenderer: React.FC<{ text: string }> = ({ text }) => {
  // Split into paragraphs / lines
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Headers
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-base font-semibold text-cyan-300 mt-4 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <MathRenderer content={trimmed.slice(5)} />
            </h4>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-lg font-bold text-slate-100 mt-4 mb-2 border-b border-slate-800 pb-1">
              <MathRenderer content={trimmed.slice(4)} />
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl font-bold text-cyan-400 mt-5 mb-2">
              <MathRenderer content={trimmed.slice(3)} />
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-bold text-slate-100 mt-6 mb-3">
              <MathRenderer content={trimmed.slice(2)} />
            </h1>
          );
        }

        // Horizontal rule
        if (trimmed === '---') {
          return <hr key={idx} className="my-4 border-slate-800" />;
        }

        // Markdown Table
        if (trimmed.includes('|') && trimmed.includes('\n|')) {
          const lines = trimmed.split('\n').filter((l) => l.trim().startsWith('|'));
          if (lines.length >= 2) {
            const headerCells = lines[0]
              .split('|')
              .filter((_, i, arr) => i > 0 && i < arr.length - 1)
              .map((c) => c.trim());

            const bodyLines = lines.slice(2); // Skip header and separator

            return (
              <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-900/90 text-cyan-300 border-b border-slate-800">
                    <tr>
                      {headerCells.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 font-medium">
                          <MathRenderer content={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {bodyLines.map((row, rIdx) => {
                      const cells = row
                        .split('|')
                        .filter((_, i, arr) => i > 0 && i < arr.length - 1)
                        .map((c) => c.trim());
                      return (
                        <tr key={rIdx} className="hover:bg-slate-800/40">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 text-slate-300">
                              <MathRenderer content={cell} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // Callout or blockquote
        if (trimmed.startsWith('>')) {
          const calloutText = trimmed
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join('\n');
          return (
            <div key={idx} className="my-3 p-3 rounded-r border-l-4 border-cyan-500 bg-cyan-950/20 text-slate-300 text-xs md:text-sm">
              <MathRenderer content={calloutText} />
            </div>
          );
        }

        // List item handling
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
          const lines = trimmed.split('\n');
          const isOrdered = /^\d+\.\s/.test(trimmed);

          return isOrdered ? (
            <ol key={idx} className="list-decimal list-inside space-y-1 my-2 pl-2 text-slate-200">
              {lines.map((l, lIdx) => (
                <li key={lIdx}>
                  <MathRenderer content={l.replace(/^\d+\.\s*/, '')} />
                </li>
              ))}
            </ol>
          ) : (
            <ul key={idx} className="list-disc list-inside space-y-1 my-2 pl-2 text-slate-200">
              {lines.map((l, lIdx) => (
                <li key={lIdx}>
                  <MathRenderer content={l.replace(/^[-*]\s*/, '')} />
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraph with KaTeX
        return (
          <p key={idx} className="my-2 text-slate-300">
            <MathRenderer content={trimmed} />
          </p>
        );
      })}
    </>
  );
};
