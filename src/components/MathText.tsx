import React from 'react';
import katex from 'katex';

interface MathTextProps {
  content: string;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

export const MathText: React.FC<MathTextProps> = ({ content, className = '', as = 'span' }) => {
  if (!content) return null;

  // Regex matches:
  // 1. $$ ... $$ (display math)
  // 2. \[ ... \] (display math)
  // 3. $ ... $   (inline math)
  // 4. \( ... \) (inline math)
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
  const parts = content.split(regex);

  const renderedElements = parts.map((part, index) => {
    if (!part) return null;

    // Display / Block math $$...$$
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const math = part.slice(2, -2).trim();
      try {
        const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
        return (
          <span
            key={index}
            className="my-2 block overflow-x-auto py-1 text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        return <code key={index} className="text-rose-600 bg-rose-50 px-1 rounded">{part}</code>;
      }
    }

    // Display / Block math \[...\]
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const math = part.slice(2, -2).trim();
      try {
        const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
        return (
          <span
            key={index}
            className="my-2 block overflow-x-auto py-1 text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        return <code key={index} className="text-rose-600 bg-rose-50 px-1 rounded">{part}</code>;
      }
    }

    // Inline math $...$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const math = part.slice(1, -1);
      try {
        const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
        return (
          <span
            key={index}
            className="inline-math px-0.5 align-middle"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        return <code key={index} className="text-rose-600 bg-rose-50 px-1 rounded">{part}</code>;
      }
    }

    // Inline math \(...\)
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const math = part.slice(2, -2);
      try {
        const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
        return (
          <span
            key={index}
            className="inline-math px-0.5 align-middle"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        return <code key={index} className="text-rose-600 bg-rose-50 px-1 rounded">{part}</code>;
      }
    }

    // Regular text (preserves line-breaks)
    return (
      <span key={index} className="whitespace-pre-line">
        {part}
      </span>
    );
  });

  const Component = as;
  return <Component className={`math-content ${className}`}>{renderedElements}</Component>;
};

export default MathText;

