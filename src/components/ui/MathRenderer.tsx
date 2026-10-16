'use client';

import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

function renderMath(math: string, displayMode: boolean, className: string) {
  try {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(math, { displayMode, throwOnError: false }),
        }}
      />
    );
  } catch {
    return <span className="font-mono text-amber-500">{math}</span>;
  }
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const renderFormatted = (text: string) => {
    const paragraphs = text.split(/\n{2,}/);

    return paragraphs.flatMap((para, pIdx) => {
      const blockRegex = /\$\$([\s\S]*?)\$\$/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const elements: React.ReactNode[] = [];

      while ((match = blockRegex.exec(para)) !== null) {
        const textBeforeMath = para.substring(lastIndex, match.index);
        if (textBeforeMath) {
          elements.push(
            <p key={`text_${pIdx}_${lastIndex}`} className="mb-3 leading-relaxed whitespace-pre-line last:mb-0">
              {renderInline(textBeforeMath, `txt_${pIdx}_${lastIndex}`)}
            </p>
          );
        }

        elements.push(
          <div key={`block_${pIdx}_${match.index}`} className="my-3 overflow-x-auto py-2 text-center">
            {renderMath(match[1], true, '')}
          </div>
        );
        lastIndex = match.index + match[0].length;
      }

      const textAfterMath = para.substring(lastIndex);
      if (textAfterMath) {
        if (elements.length === 0) {
          return (
            <p key={`p_${pIdx}`} className="mb-3 leading-relaxed whitespace-pre-line last:mb-0">
              {renderInline(textAfterMath, `txt_${pIdx}_0`)}
            </p>
          );
        }
        elements.push(
          <p key={`text_${pIdx}_${lastIndex}`} className="mb-3 leading-relaxed whitespace-pre-line last:mb-0">
            {renderInline(textAfterMath, `txt_${pIdx}_${lastIndex}`)}
          </p>
        );
      } else if (elements.length === 0) {
        return <p key={`p_${pIdx}`} className="mb-3 leading-relaxed whitespace-pre-line last:mb-0" />;
      }

      return elements;
    });
  };

  const renderInline = (text: string, baseKey: string) => {
    const inlineRegex = /\$([^\$\n]+?)\$/g;
    const items: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        items.push(text.substring(lastIndex, match.index));
      }
      items.push(
        <span
          key={`${baseKey}_${match.index}`}
          className="inline-block max-w-full overflow-x-auto px-1 align-baseline"
        >
          {renderMath(match[1], false, '')}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      items.push(text.substring(lastIndex));
    }

    return items;
  };

  return <div className={`text-inherit ${className}`}>{renderFormatted(content)}</div>;
};
