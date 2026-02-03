
import React, { memo, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  darkMode: boolean;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button 
      onClick={handleCopy} 
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/90 hover:bg-blue-600 backdrop-blur-md transition-all text-xs font-bold text-white shadow-lg border border-white/10 shrink-0"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      <span>{copied ? 'コピー済み' : 'コピー'}</span>
    </button>
  );
};

const CodeBlock = memo(({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const codeString = String(children).replace(/\n$/, '');

  if (!inline && match) {
    return (
      <div className="group my-5 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 bg-[#1e1e1e] max-w-full relative flex flex-col">
        {/* Sticky Header - 常に上部に固定 */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-[#252526]/95 backdrop-blur-md border-b border-[#333]">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest font-bold">{language}</span>
          <div className="flex items-center gap-3">
            <CopyButton text={codeString} />
            <div className="flex gap-1.5 opacity-40">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto w-full custom-scrollbar-dark relative">
          <SyntaxHighlighter
            {...props}
            style={vscDarkPlus}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              background: '#1e1e1e',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              fontFamily: "'JetBrains Mono', monospace",
              width: '100%',
              minWidth: '100%',
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }
  return <code className={`${className} px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono text-[0.85em] break-all`} {...props}>{children}</code>;
});

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content, darkMode }) => {
  const components = useMemo(() => ({
    code: CodeBlock,
    ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-2 my-4">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-2 my-4">{children}</ol>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-8 mb-4 border-b pb-2 dark:border-gray-700 break-words">{children}</h1>,
    p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-7 break-words whitespace-pre-wrap">{children}</p>,
    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">{children}</a>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-100 dark:bg-gray-800/50 rounded-r italic text-gray-500">{children}</blockquote>,
  }), [darkMode]);

  return (
    <div className={`markdown-body ${darkMode ? 'text-gray-200' : 'text-gray-800'} text-sm w-full max-w-full overflow-hidden`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}, (prev, next) => prev.content === next.content && prev.darkMode === next.darkMode);
