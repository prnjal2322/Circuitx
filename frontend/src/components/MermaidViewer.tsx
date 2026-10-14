import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Eye, Code, AlertTriangle } from 'lucide-react';

interface MermaidViewerProps {
  chart: string;
}

let mermaidInitialized = false;

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#0B1120',
          primaryColor: '#00F0FF',
          primaryTextColor: '#F1F5F9',
          primaryBorderColor: '#38BDF8',
          lineColor: '#00F0FF',
          secondaryColor: '#1E293B',
          tertiaryColor: '#161F30',
        },
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      });
      mermaidInitialized = true;
    }

    const renderChart = async () => {
      if (!chart.trim()) return;
      const cleanChart = chart.trim();
      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

      try {
        setError(null);
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        setSvgContent(svg);
      } catch (err: any) {
        console.warn('Mermaid render error:', err);
        setError(err.message || 'Failed to render circuit diagram');
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div className="my-4 rounded-lg border border-cyan-500/30 bg-[#0F172A]/90 overflow-hidden shadow-glow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Circuit / Flow Diagram
        </span>
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
          title="Toggle Diagram / Source Code"
        >
          {showCode ? <Eye size={13} /> : <Code size={13} />}
          <span>{showCode ? 'View Diagram' : 'View Code'}</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto flex justify-center">
        {showCode ? (
          <pre className="w-full text-xs font-mono text-cyan-300/90 bg-slate-950/60 p-3 rounded">
            {chart}
          </pre>
        ) : error ? (
          <div className="flex items-center gap-2 text-rose-400 text-xs py-2">
            <AlertTriangle size={15} />
            <span>Diagram could not be rendered: {error}</span>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
};
