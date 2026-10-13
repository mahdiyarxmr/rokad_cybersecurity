import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Minus,
  Sparkles,
  Eraser,
  Eye,
  PenLine,
  Smile,
  X,
  Check,
} from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';
import { FormattedMessageView } from './FormattedMessageView';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

const COMMON_TEMPLATES = [
  { label: 'شروع: با سلام و احترام', text: 'با سلام و احترام،\n' },
  { label: 'پایان: با آرزوی توفیق و سربلندی', text: '\nبا آرزوی توفیق و سربلندی' },
  { label: 'پایان: با تشکر و تجدید احترام', text: '\nبا تشکر و تجدید احترام' },
  { label: 'اقدام: جهت استحضار و اقدام لازم', text: '\n> **نکته:** جهت استحضار و اقدام مقتضی ارسال می‌گردد.' },
  { label: 'مهلت: لطفاً تا تاریخ مقرر اقدام فرمایید', text: '\n⚠️ **مهلت اقدام:** لطفاً تا پایان وقت اداری اقدام فرمایید.' },
];

const COMMON_EMOJIS = ['📌', '⚠️', '✅', '🔔', '📅', '📝', '💡', '📢', '🎓', '🤝'];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label = 'متن پیام:',
  placeholder = 'متن پیام خود را اینجا بنویسید...',
  rows = 5,
  required = false,
  disabled = false,
  className = '',
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        templateMenuRef.current &&
        !templateMenuRef.current.contains(e.target as Node)
      ) {
        setShowTemplatesMenu(false);
      }
      if (
        emojiMenuRef.current &&
        !emojiMenuRef.current.contains(e.target as Node)
      ) {
        setShowEmojiMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: insert format wrapping selection or placeholder
  const applyInlineFormat = (prefix: string, suffix: string, defaultPlaceholder: string) => {
    if (disabled) return;
    if (activeTab === 'preview') setActiveTab('edit');

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const targetText = selectedText || defaultPlaceholder;
    const replacement = `${prefix}${targetText}${suffix}`;

    const nextValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      if (!selectedText) {
        // Highlight placeholder so user can immediately type over it
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + defaultPlaceholder.length
        );
      } else {
        textarea.setSelectionRange(
          start + replacement.length,
          start + replacement.length
        );
      }
    }, 0);
  };

  // Helper: insert line-level format (bullets, numbering, quotes, headings)
  const applyLineFormat = (prefixGenerator: (index: number) => string) => {
    if (disabled) return;
    if (activeTab === 'preview') setActiveTab('edit');

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;

    const lines = text.substring(lineStart, lineEnd).split('\n');
    const formattedLines = lines.map((line, idx) => {
      return `${prefixGenerator(idx)}${line}`;
    });

    const replacement = formattedLines.join('\n');
    const nextValue = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 0);
  };

  // Clear format from selected text
  const clearSelectionFormat = () => {
    if (disabled) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    if (!selected) return;

    // Remove markdown tokens
    const cleaned = selected
      .replace(/(\*\*|\*|__|~~|`)/g, '')
      .replace(/^[•\-\*]\s+/gm, '')
      .replace(/^([0-9]+|[۰-۹]+)[\.\)]\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/^###\s+/gm, '');

    const nextValue = text.substring(0, start) + cleaned + text.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + cleaned.length);
    }, 0);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyInlineFormat('**', '**', 'متن پررنگ');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyInlineFormat('*', '*', 'متن مایل');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        applyInlineFormat('__', '__', 'متن زیرخط‌دار');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        openLinkModal();
      }
    }
  };

  const openLinkModal = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const selected = textarea.value.substring(
        textarea.selectionStart,
        textarea.selectionEnd
      );
      setLinkText(selected || '');
    }
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const title = linkText.trim() || url;
    const markdown = `[${title}](${url})`;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const nextValue = text.substring(0, start) + markdown + text.substring(end);
      onChange(nextValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdown.length, start + markdown.length);
      }, 0);
    } else {
      onChange(value ? `${value}\n${markdown}` : markdown);
    }

    setShowLinkModal(false);
    setLinkText('');
    setLinkUrl('');
  };

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const nextValue = text.substring(0, start) + snippet + text.substring(end);
      onChange(nextValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 0);
    } else {
      onChange(value ? `${value}${snippet}` : snippet);
    }
    setShowTemplatesMenu(false);
    setShowEmojiMenu(false);
  };

  // Word & Char Count
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Title */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-ink-darker dark:text-white flex items-center gap-1.5">
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
        </div>
      )}

      {/* Editor Frame */}
      <div
        className={`rounded-2xl border-[1.5px] transition-all bg-white dark:bg-[#151C28] overflow-hidden shadow-2xs ${error
            ? 'border-rose-400 dark:border-rose-600'
            : 'border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'
          }`}
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 sm:p-2.5 bg-gray-50/90 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 select-none">
          {/* Main Formatting Group (Horizontally scrollable on mobile, wrapping smoothly) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {/* Bold */}
            <button
              type="button"
              onClick={() => applyInlineFormat('**', '**', 'متن پررنگ')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="ضخیم / بولد (Ctrl+B)"
            >
              <Bold className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => applyInlineFormat('*', '*', 'متن مایل')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="مایل / ایتالیک (Ctrl+I)"
            >
              <Italic className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onClick={() => applyInlineFormat('__', '__', 'متن زیرخط‌دار')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="خط زیرین (Ctrl+U)"
            >
              <Underline className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onClick={() => applyInlineFormat('~~', '~~', 'متن خط‌خورده')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="خط‌خورده"
            >
              <Strikethrough className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

            {/* Heading */}
            <button
              type="button"
              onClick={() => applyLineFormat(() => '### ')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="سرتیتر / عنوان بخش"
            >
              <Heading2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => applyLineFormat(() => '• ')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="لیست نشانه‌دار / گلوله‌ای"
            >
              <List className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Numbered List */}
            <button
              type="button"
              onClick={() => applyLineFormat((idx) => `${toPersianDigits(idx + 1)}. `)}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="لیست شماره‌دار"
            >
              <ListOrdered className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Quote Block */}
            <button
              type="button"
              onClick={() => applyLineFormat(() => '> ')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="کادر نقل‌قول یا نکته مهم"
            >
              <Quote className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

            {/* Insert Link */}
            <button
              type="button"
              onClick={openLinkModal}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="درج پیوند اینترنتی"
            >
              <Link2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Divider */}
            <button
              type="button"
              onClick={() => insertSnippet('\n---\n')}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary active:bg-primary/15 active:text-primary active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="خط جداکننده افقی"
            >
              <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Clear formatting */}
            <button
              type="button"
              onClick={clearSelectionFormat}
              className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-rose-500 active:bg-rose-500/15 active:text-rose-500 active:scale-90 transition-all touch-manipulation cursor-pointer"
              title="پاک‌کردن قالب‌بندی از متن انتخاب‌شده"
            >
              <Eraser className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* Quick Helpers & Templates (Accessible touch targets on mobile) */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80 relative">
            <div className="flex items-center gap-1.5">
              {/* Quick Emojis Menu */}
              <div className="relative" ref={emojiMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiMenu(!showEmojiMenu)}
                  className={`h-9 px-2.5 sm:h-8 sm:px-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer active:scale-95 ${showEmojiMenu
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60'
                    }`}
                  title="نمادها و شکلک‌های سریع"
                >
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px]">شکلک</span>
                </button>

                {showEmojiMenu && (
                  <div className="absolute right-0 sm:left-0 top-full mt-1.5 p-2.5 bg-white dark:bg-[#1A2230] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-40 grid grid-cols-5 gap-2 w-52 animate-in fade-in zoom-in-95">
                    {COMMON_EMOJIS.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertSnippet(emoji + ' ')}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-primary/10 active:scale-125 transition-transform text-base cursor-pointer touch-manipulation"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pre-made Templates Dropdown */}
              <div className="relative" ref={templateMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
                  className={`h-9 px-3 sm:h-8 sm:px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer active:scale-95 ${showTemplatesMenu
                      ? 'bg-primary/15 text-primary font-black border border-primary/30'
                      : 'hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs">متن‌های آماده</span>
                </button>

                {showTemplatesMenu && (
                  <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#1A2230] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-40 py-2 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1 text-[10px] font-black text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      قالب‌های آماده مکاتبات اداری
                    </div>
                    {COMMON_TEMPLATES.map((tpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertSnippet(tpl.text)}
                        className="w-full text-right px-3.5 py-2.5 text-xs hover:bg-primary/10 hover:text-primary text-gray-700 dark:text-gray-200 active:bg-primary/20 transition-colors font-medium cursor-pointer block truncate touch-manipulation"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Content Area: Write or Preview */}
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full text-xs sm:text-sm p-3.5 bg-transparent text-ink-darker dark:text-white outline-none leading-relaxed font-medium placeholder-gray-400 dark:placeholder-gray-500 resize-y min-h-28"
          />
        ) : (
          <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 min-h-28 max-h-72 overflow-y-auto">
            {value.trim() ? (
              <FormattedMessageView content={value} />
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">
                هنوز متنی وارد نشده است. در تب ویرایش، پیام خود را بنویسید تا پیش‌نمایش آن اینجا ظاهر شود.
              </div>
            )}
          </div>
        )}

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800/80 text-[10px] text-gray-400 font-mono">
          <div className="flex items-center gap-3">
            <span>
              {toPersianDigits(wordCount)} کلمه
            </span>
            <span>•</span>
            <span>
              {toPersianDigits(charCount)} نویسه
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-gray-400">
            <span>راهنما:</span>
            <kbd className="px-1 py-0.5 rounded bg-gray-200/80 dark:bg-gray-800 text-[9px]">Ctrl+B</kbd>
            <span>بولد</span>
            <kbd className="px-1 py-0.5 rounded bg-gray-200/80 dark:bg-gray-800 text-[9px] mr-1">Ctrl+I</kbd>
            <span>مایل</span>
          </div>
        </div>
      </div>

      {/* Link Insertion Modal Dialog */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in">
          <div className="bg-white dark:bg-[#1A2230] border-[1.5px] border-primary-dark/30 dark:border-gray-700 rounded-2xl shadow-xl w-full max-w-sm p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
              <h4 className="text-xs font-black text-ink-darker dark:text-white flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-primary" />
                <span>درج پیوند اینترنتی</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                  عنوان یا متن نمایشی لینک:
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="مثال: دانلود بخشنامه"
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-xs font-medium outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                  آدرس اینترنتی (URL):
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  dir="ltr"
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-xs font-mono outline-none focus:border-primary text-left"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-dark font-black text-xs border border-primary-dark/30 shadow-2xs hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>درج پیوند</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500 font-bold">{error}</p>}
    </div>
  );
};
