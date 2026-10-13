import React from 'react';
import { ExternalLink, Quote } from 'lucide-react';

interface FormattedMessageViewProps {
  content: string;
  className?: string;
}

/**
 * Parses and renders inline markdown-like styles:
 * - Bold: **text**
 * - Italic: *text*
 * - Underline: __text__
 * - Strikethrough: ~~text~~
 * - Code: `code`
 * - Link: [title](url)
 */
function renderInlineContent(text: string): React.ReactNode[] {
  // Regex to match markdown inline elements
  const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|~~.*?~~|`.*?`|\[.*?\]\(https?:\/\/[^\s\)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-black text-ink-darker dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Underline: __text__
    if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
      return (
        <span key={index} className="underline underline-offset-4 decoration-primary/60 font-semibold">
          {part.slice(2, -2)}
        </span>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through opacity-70">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic font-medium text-ink-darker dark:text-gray-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] text-primary-dark dark:text-primary font-bold border border-gray-200 dark:border-gray-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link: [title](url)
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/);
    if (linkMatch) {
      const [, title, url] = linkMatch;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:text-primary-dark underline underline-offset-2 font-bold transition-colors"
        >
          <span>{title || url}</span>
          <ExternalLink className="w-3 h-3 inline-block" />
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const FormattedMessageView: React.FC<FormattedMessageViewProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  const lines = content.split('\n');

  // Group lines into blocks (paragraphs, lists, blockquotes, headings, dividers)
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentQuote: string[] | null = null;

  const flushList = (key: number) => {
    if (currentList) {
      if (currentList.type === 'ul') {
        blocks.push(
          <ul key={`list-${key}`} className="space-y-1 my-2 pr-4 list-disc list-outside text-gray-800 dark:text-gray-200">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineContent(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`list-${key}`} className="space-y-1 my-2 pr-4 list-decimal list-outside text-gray-800 dark:text-gray-200 font-bold">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed font-normal">
                {renderInlineContent(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const flushQuote = (key: number) => {
    if (currentQuote && currentQuote.length > 0) {
      blocks.push(
        <div
          key={`quote-${key}`}
          className="my-2.5 p-3 rounded-xl border-r-4 border-primary bg-primary/5 dark:bg-primary/10 text-ink-darker dark:text-gray-200 text-xs sm:text-sm flex items-start gap-2.5"
        >
          <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5 opacity-80" />
          <div className="space-y-1 leading-relaxed w-full">
            {currentQuote.map((qLine, qIdx) => (
              <p key={qIdx}>{renderInlineContent(qLine)}</p>
            ))}
          </div>
        </div>
      );
      currentQuote = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check for divider ---
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(idx);
      flushQuote(idx);
      blocks.push(
        <hr key={`hr-${idx}`} className="my-3 border-gray-200 dark:border-gray-700" />
      );
      return;
    }

    // Check for Heading ### or ## or #
    if (trimmed.startsWith('### ')) {
      flushList(idx);
      flushQuote(idx);
      blocks.push(
        <h4 key={`h3-${idx}`} className="text-sm font-black text-ink-darker dark:text-white mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 bg-primary rounded-full inline-block" />
          {renderInlineContent(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList(idx);
      flushQuote(idx);
      blocks.push(
        <h3 key={`h2-${idx}`} className="text-base font-black text-ink-darker dark:text-white mt-3.5 mb-2 flex items-center gap-2">
          <span className="w-2 h-4 bg-primary rounded-full inline-block" />
          {renderInlineContent(trimmed.replace(/^#+\s+/, ''))}
        </h3>
      );
      return;
    }

    // Check for Blockquote >
    if (trimmed.startsWith('> ') || trimmed === '>') {
      flushList(idx);
      if (!currentQuote) currentQuote = [];
      currentQuote.push(trimmed.replace(/^>\s?/, ''));
      return;
    } else {
      flushQuote(idx);
    }

    // Check for Bullet List (• or - or *)
    if (/^[•\-\*]\s+/.test(trimmed)) {
      flushQuote(idx);
      if (!currentList || currentList.type !== 'ul') {
        flushList(idx);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(trimmed.replace(/^[•\-\*]\s+/, ''));
      return;
    }

    // Check for Numbered List (1. or ۱. )
    if (/^([0-9]+|[۰-۹]+)[\.\)]\s+/.test(trimmed)) {
      flushQuote(idx);
      if (!currentList || currentList.type !== 'ol') {
        flushList(idx);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(trimmed.replace(/^([0-9]+|[۰-۹]+)[\.\)]\s+/, ''));
      return;
    }

    // Regular line
    flushList(idx);

    if (trimmed === '') {
      // Empty line / paragraph break
      blocks.push(<div key={`space-${idx}`} className="h-2" />);
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="leading-relaxed min-h-[1.25rem]">
          {renderInlineContent(line)}
        </p>
      );
    }
  });

  flushList(lines.length);
  flushQuote(lines.length);

  return (
    <div className={`space-y-1 leading-relaxed text-xs sm:text-sm ${className}`}>
      {blocks}
    </div>
  );
};
