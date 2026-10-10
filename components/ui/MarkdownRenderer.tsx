import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

interface MarkdownProps {
  content: string;
  isGenerating?: boolean;
}

// Relax sanitization slightly to allow highlight.js classes and table borders
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
  },
};

export const MarkdownRenderer = ({ content, isGenerating }: MarkdownProps) => {
  return (
    <div className="markdown-body w-full max-w-none text-gray-200 leading-relaxed font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-white mt-8 mb-4 tracking-tight border-b border-white/10 pb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-cyberLime mt-6 mb-3 tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyberLime/70"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-deepViolet mt-5 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-300 leading-relaxed mb-4 opacity-95">
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyberLime/50 pl-4 py-1.5 my-4 bg-white/5 italic text-gray-400 rounded-r-lg">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-3 pl-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1.5 my-3 pl-6 text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-300 flex items-start gap-2">
              <span className="text-cyberLime mt-2 text-[8px] opacity-70">●</span>
              <span className="leading-relaxed flex-1">{children}</span>
            </li>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-white/10 shadow-lg">
              <table className="w-full text-sm text-left text-gray-300 border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="text-xs text-gray-200 uppercase bg-white/10 border-b border-white/10 font-mono tracking-wider">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-5 py-3 border-r border-white/5 last:border-0 font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-5 py-3.5 border-t border-r border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              {children}
            </td>
          ),
          pre: ({ children }) => (
            <div className="my-5 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-inner">
              <div className="px-4 py-1.5 bg-white/5 border-b border-white/5 flex gap-2 items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
              <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
                {children}
              </pre>
            </div>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-white/10 text-cyberLime px-1.5 py-0.5 rounded text-xs font-mono border border-white/5">
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
          hr: () => <hr className="my-8 border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>

      {isGenerating && (
        <span className="inline-block w-2 h-5 ml-1 bg-cyberLime align-middle animate-pulse shadow-[0_0_10px_rgba(132,249,6,0.8)]" />
      )}
    </div>
  );
};
