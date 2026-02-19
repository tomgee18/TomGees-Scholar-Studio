
import React, { useMemo } from 'react';

interface MarkdownProps {
  content: string;
  isGenerating?: boolean;
}

export const MarkdownRenderer = ({ content, isGenerating }: MarkdownProps) => {
  const elements = useMemo(() => {
    if (!content) return [];
    
    const lines = content.split('\n');
    const parsedElements: React.ReactNode[] = [];
    
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    
    let inTable = false;
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length > 0) {
        parsedElements.push(renderTable(tableBuffer, `table-${parsedElements.length}`));
        tableBuffer = [];
      }
      inTable = false;
    };

    lines.forEach((line, index) => {
      const key = `line-${index}`;

      // 0. Code Block Logic
      if (line.trim().startsWith('```')) {
        if (inTable) flushTable(); // Close table if code block starts
        
        if (inCodeBlock) {
          // End of block
          parsedElements.push(
            <div key={`${key}-code`} className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-inner">
               <div className="px-4 py-1 bg-white/5 border-b border-white/5 flex gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
               </div>
               <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
                 {codeBuffer.join('\n')}
               </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // 1. Table Logic
      // Simple detection: line starts with |
      if (line.trim().startsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        return;
      } else {
        if (inTable) flushTable();
      }

      // 2. Headers
      if (line.startsWith('# ')) {
        parsedElements.push(
          <h1 key={key} className="text-3xl font-bold text-white mt-8 mb-4 tracking-tight border-b border-white/10 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        parsedElements.push(
          <h2 key={key} className="text-xl font-semibold text-cyberLime mt-6 mb-3 tracking-wide flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-cyberLime/50"></span>
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        parsedElements.push(
          <h3 key={key} className="text-lg font-medium text-deepViolet mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // 3. Blockquotes
      if (line.startsWith('> ')) {
        parsedElements.push(
          <blockquote key={key} className="border-l-2 border-cyberLime/50 pl-4 py-1 my-3 bg-white/5 italic text-gray-400 rounded-r-lg">
            {parseInline(line.replace('> ', ''))}
          </blockquote>
        );
        return;
      }

      // 4. Lists (Bullet)
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        parsedElements.push(
          <li key={key} className="ml-4 pl-2 border-l border-white/10 text-gray-300 my-1 list-none flex items-start gap-2">
            <span className="text-cyberLime mt-2 text-[8px] opacity-70">●</span>
            <span className="leading-relaxed">{parseInline(line.replace(/^[-*]\s/, ''))}</span>
          </li>
        );
        return;
      }
      
      // 5. Numbered Lists
      if (/^\d+\.\s/.test(line.trim())) {
         const numberPart = line.split('.')[0];
         parsedElements.push(
          <div key={key} className="ml-4 flex gap-3 text-gray-300 my-1">
             <span className="text-cyberLime font-mono text-xs mt-1 min-w-[1.5rem] text-right">{numberPart}.</span>
             <span className="leading-relaxed">{parseInline(line.replace(/^\d+\.\s/, ''))}</span>
          </div>
         );
         return;
      }

      // 6. Horizontal Rules
      if (line.trim() === '---' || line.trim() === '***') {
          parsedElements.push(<hr key={key} className="my-8 border-white/10" />);
          return;
      }

      // 7. Paragraphs
      if (line.trim().length > 0) {
        parsedElements.push(
          <p key={key} className="text-gray-300 leading-relaxed mb-3 font-serif opacity-90">
            {parseInline(line)}
          </p>
        );
      } else {
        parsedElements.push(<div key={key} className="h-3" />); // Intelligent spacer
      }
    });

    // Close any open blocks at end of stream
    if (inCodeBlock && codeBuffer.length > 0) {
        parsedElements.push(
            <div key="final-code-partial" className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a]">
               <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed opacity-50">
                 {codeBuffer.join('\n')}
               </pre>
            </div>
        );
    }
    if (inTable && tableBuffer.length > 0) {
        parsedElements.push(renderTable(tableBuffer, `final-table`));
    }

    return parsedElements;
  }, [content]);

  return (
    <div className="markdown-body w-full max-w-none">
      {elements}
      {isGenerating && (
        <span className="inline-block w-2 h-5 ml-1 bg-cyberLime align-middle animate-pulse shadow-[0_0_10px_rgba(132,249,6,0.5)]" />
      )}
    </div>
  );
};

// Inline parser for Bold, Italic, and Code
const parseInline = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-gray-200 italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-white/10 text-cyberLime px-1.5 py-0.5 rounded text-sm font-mono border border-white/5">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

// Table Renderer Helper
const renderTable = (lines: string[], key: string) => {
    // Basic markdown table parsing
    const headerRow = lines[0];
    const separatorRow = lines[1]; // Usually |---|---|
    const bodyRows = lines.slice(2);

    const parseRow = (row: string) => {
        return row.split('|')
            .map(cell => cell.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1); // Remove empty first/last from split if pipe is at edges
    };

    const headers = parseRow(headerRow);
    const rows = bodyRows.map(parseRow);

    return (
        <div key={key} className="my-6 overflow-x-auto rounded-lg border border-white/10 shadow-lg">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-200 uppercase bg-white/10">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="px-6 py-3 border-r border-white/5 last:border-0 font-bold tracking-wider">
                                {parseInline(h)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-black/20 divide-y divide-white/5">
                    {rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                            {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-6 py-4 border-r border-white/5 last:border-0 whitespace-pre-wrap">
                                    {parseInline(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
