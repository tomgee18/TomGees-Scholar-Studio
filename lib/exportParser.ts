import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ParsedSections {
  fullText: string;
  examPaper?: string;
  markingScheme?: string;
  ankiDeckText?: string;
  ankiCardCount: number;
  examinerReport?: string;
}

/**
 * Intelligent section parser that segments generated text into modular exportable assets.
 */
export const extractExportSections = (
  fullText: string,
  examinerReport?: string
): ParsedSections => {
  if (!fullText) {
    return { fullText: '', ankiCardCount: 0 };
  }

  const result: ParsedSections = {
    fullText,
    ankiCardCount: 0,
    examinerReport: examinerReport?.trim() || undefined,
  };

  // 1. Extract Mock Exam Paper (Questions Only)
  // Looks for SECTION 2 / Master Mock Examination up until SECTION 3 / Marking Scheme
  const examStartRegex = /(?:###?\s*(?:SECTION\s*2|PART\s*2|Master Mock Examination|Mock Exam))/i;
  const examEndRegex = /(?:###?\s*(?:SECTION\s*3|PART\s*3|Official Marking Scheme|Marking Scheme|Exemplar Answers))/i;

  const examStartIndex = fullText.search(examStartRegex);
  if (examStartIndex !== -1) {
    const afterExamStart = fullText.slice(examStartIndex);
    const examEndRelative = afterExamStart.search(examEndRegex);

    if (examEndRelative !== -1) {
      result.examPaper = afterExamStart.slice(0, examEndRelative).trim();
    } else {
      result.examPaper = afterExamStart.trim();
    }
  }

  // 2. Extract Marking Scheme & Rubrics
  const markingStartIndex = fullText.search(examEndRegex);
  if (markingStartIndex !== -1) {
    const nextSectionRegex = /(?:###?\s*(?:SECTION\s*4|PART\s*4|Common Pitfalls|High-Frequency Exam Traps))/i;
    const afterMarking = fullText.slice(markingStartIndex);
    const nextRelative = afterMarking.search(nextSectionRegex);

    if (nextRelative !== -1) {
      result.markingScheme = afterMarking.slice(0, nextRelative).trim();
    } else {
      result.markingScheme = afterMarking.trim();
    }
  }

  // 3. Extract Active Recall & Flashcards to Anki TSV format (Front \t Back \t Tag)
  const activeRecallRegex = /(?:###?\s*(?:SECTION\s*5|Active Recall|Flashcards|Self-Testing Prompts))/i;
  const activeRecallIndex = fullText.search(activeRecallRegex);

  const cardLines: string[] = [];

  if (activeRecallIndex !== -1) {
    const recallContent = fullText.slice(activeRecallIndex);
    const lines = recallContent.split('\n');

    let currentQuestion = '';
    let currentAnswer = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Detect numbered question: e.g. "1. What is...", "Q1: ...", "- Q: ..."
      const questionMatch = line.match(/^(?:(?:\d+[.)]|Q\d*:|- Q:)\s*)(.+)/i);
      const answerMatch = line.match(/^(?:(?:A\d*:|- A:|Answer:)\s*)(.+)/i);

      if (questionMatch) {
        if (currentQuestion && currentAnswer) {
          cardLines.push(`${cleanForAnki(currentQuestion)}\t${cleanForAnki(currentAnswer)}\tScholarStudio`);
          currentAnswer = '';
        }
        currentQuestion = questionMatch[1];
      } else if (answerMatch) {
        currentAnswer = answerMatch[1];
      } else if (line && currentQuestion && !currentAnswer) {
        // Line following question might be question elaboration or answer
        if (line.toLowerCase().startsWith('answer:') || line.toLowerCase().startsWith('a:')) {
          currentAnswer = line.replace(/^(?:answer:|a:)\s*/i, '');
        }
      }
    }

    if (currentQuestion) {
      cardLines.push(
        `${cleanForAnki(currentQuestion)}\t${cleanForAnki(currentAnswer || 'Refer to Scholar Studio Study Guide')}\tScholarStudio`
      );
    }
  }

  // Fallback: If no dedicated active recall section exists, find question marks across bullet points
  if (cardLines.length === 0) {
    const bulletQuestions = fullText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => (l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l)) && l.includes('?'));

    for (const q of bulletQuestions.slice(0, 20)) {
      const cleanQ = q.replace(/^[-*.\d]+\s*/, '');
      cardLines.push(`${cleanForAnki(cleanQ)}\tRefer to Scholar Studio Study Guide\tScholarStudio`);
    }
  }

  if (cardLines.length > 0) {
    // Standard Anki tab-delimited format header with directives
    const ankiHeader = '#separator:tab\n#html:true\n#tags column:3\n';
    result.ankiDeckText = ankiHeader + cardLines.join('\n');
    result.ankiCardCount = cardLines.length;
  }

  return result;
};

const cleanForAnki = (text: string): string => {
  return text
    .replace(/\t/g, ' ') // No tabs in field values
    .replace(/\n/g, '<br>') // Convert newlines to HTML breaks for card rendering
    .trim();
};

/**
 * Downloads arbitrary text as a file
 */
export const downloadTextFile = (content: string, filename: string, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Converts markdown text into semantic, accessible HTML for printing or export.
 */
export const markdownToPrintHtml = (markdownContent: string): string => {
  if (!markdownContent) return '';
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm],
      },
      markdownContent
    )
  );
};

/**
 * Opens a dedicated print dialog for a specific snippet using a hidden iframe.
 * Renders rich text HTML typography instead of raw markdown syntax.
 * Avoids window.open popup blockers in both desktop webviews (Tauri/WebView2) and browsers.
 */
export const printSnippetToPdf = (title: string, markdownContent: string) => {
  const renderedHtml = markdownToPrintHtml(markdownContent);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    return;
  }

  const currentDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 15mm 20mm 15mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Charter', 'Georgia', 'Cambria', 'Times New Roman', Times, serif;
            color: #1e293b;
            background: #ffffff;
            line-height: 1.65;
            font-size: 11pt;
            max-width: 820px;
            margin: 0 auto;
            padding: 30px;
          }

          .header-banner {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 28px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .app-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 15pt;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }

          .app-subtitle {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 8.5pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 2px;
          }

          .header-meta {
            text-align: right;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 9pt;
            color: #475569;
          }

          .doc-badge {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 8.5pt;
            margin-bottom: 3px;
            color: #0f172a;
          }

          /* Headings */
          h1, h2, h3, h4, h5, h6 {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            page-break-after: avoid;
            break-after: avoid;
            line-height: 1.25;
          }

          h1 {
            font-size: 22pt;
            font-weight: 800;
            margin-top: 32px;
            margin-bottom: 14px;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 8px;
          }

          h2 {
            font-size: 16pt;
            font-weight: 700;
            color: #1e3a8a;
            margin-top: 26px;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }

          h3 {
            font-size: 13pt;
            font-weight: 600;
            color: #334155;
            margin-top: 20px;
            margin-bottom: 8px;
          }

          h4 {
            font-size: 11pt;
            font-weight: 600;
            color: #475569;
            margin-top: 16px;
            margin-bottom: 6px;
          }

          /* Paragraphs & Text */
          p {
            margin: 0 0 12px 0;
            text-align: justify;
          }

          strong {
            font-weight: 700;
            color: #0f172a;
          }

          em {
            font-style: italic;
          }

          /* Lists */
          ul {
            list-style-type: disc;
            margin: 8px 0 14px 0;
            padding-left: 24px;
          }

          ol {
            list-style-type: decimal;
            margin: 8px 0 14px 0;
            padding-left: 24px;
          }

          li {
            margin-bottom: 6px;
            line-height: 1.55;
          }

          li > p {
            margin: 0;
            display: inline;
          }

          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
            font-size: 9.5pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-weight: 700;
            text-align: left;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
          }

          td {
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            color: #334155;
            vertical-align: top;
          }

          tr:nth-child(even) td {
            background-color: #f8fafc;
          }

          /* Blockquotes */
          blockquote {
            margin: 16px 0;
            padding: 10px 18px;
            border-left: 4px solid #3b82f6;
            background-color: #f8fafc;
            font-style: italic;
            color: #334155;
            border-radius: 0 6px 6px 0;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Code & Blocks */
          pre {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            margin: 16px 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 9pt;
            line-height: 1.45;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 9pt;
            background-color: #f1f5f9;
            color: #0f172a;
            padding: 2px 5px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }

          pre code {
            background: transparent;
            padding: 0;
            border: none;
            font-size: inherit;
          }

          hr {
            border: none;
            border-top: 1px solid #cbd5e1;
            margin: 24px 0;
          }

          /* Print Overrides */
          @media print {
            body {
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <h1 class="app-title">TomGees Scholar Studio</h1>
            <div class="app-subtitle">Academic Intelligence & Study Engine</div>
          </div>
          <div class="header-meta">
            <div class="doc-badge">${title}</div>
            <div>${currentDate}</div>
          </div>
        </div>
        <div id="content" class="rich-content">
          ${renderedHtml}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }
  }, 300);
};
