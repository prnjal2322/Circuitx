import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  const renderedContent = useMemo(() => {
    if (!content) return [];

    // Parse $$...$$ for block math and $...$ for inline math
    const parts: { type: 'text' | 'inline-math' | 'block-math'; value: string }[] = [];
    let remainder = content;

    while (remainder.length > 0) {
      // Check for block math $$...$$
      const blockMatch = remainder.match(/\$\$([\s\S]*?)\$\$/);
      // Check for inline math $...$
      const inlineMatch = remainder.match(/(?<!\\)\$([^\$\n]+?)\$/);

      let firstMatchIndex = -1;
      let matchType: 'block' | 'inline' | null = null;
      let matchLength = 0;
      let mathContent = '';

      if (blockMatch && blockMatch.index !== undefined) {
        firstMatchIndex = blockMatch.index;
        matchType = 'block';
        matchLength = blockMatch[0].length;
        mathContent = blockMatch[1];
      }

      if (inlineMatch && inlineMatch.index !== undefined) {
        if (firstMatchIndex === -1 || inlineMatch.index < firstMatchIndex) {
          firstMatchIndex = inlineMatch.index;
          matchType = 'inline';
          matchLength = inlineMatch[0].length;
          mathContent = inlineMatch[1];
        }
      }

      if (firstMatchIndex === -1 || matchType === null) {
        // No more math
        parts.push({ type: 'text', value: remainder });
        break;
      }

      // Add text before math
      if (firstMatchIndex > 0) {
        parts.push({ type: 'text', value: remainder.substring(0, firstMatchIndex) });
      }

      // Add math
      parts.push({
        type: matchType === 'block' ? 'block-math' : 'inline-math',
        value: mathContent,
      });

      remainder = remainder.substring(firstMatchIndex + matchLength);
    }

    return parts;
  }, [content]);

  return (
    <>
      {renderedContent.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.value}</span>;
        }

        try {
          const html = katex.renderToString(part.value, {
            displayMode: part.type === 'block-math',
            throwOnError: false,
          });

          return (
            <span
              key={index}
              className={part.type === 'block-math' ? 'block my-3 overflow-x-auto text-center' : 'inline-block px-1'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <code key={index} className="text-cyan-400 font-mono text-sm">
              ${part.value}$
            </code>
          );
        }
      })}
    </>
  );
};
