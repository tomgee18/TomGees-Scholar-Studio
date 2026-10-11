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
 * Opens a dedicated print dialog for a specific snippet using a hidden iframe.
 * Avoids window.open popup blockers in both desktop webviews (Tauri/WebView2) and browsers.
 */
export const printSnippetToPdf = (title: string, markdownContent: string) => {
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

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: black;
            line-height: 1.6;
          }
          h1, h2, h3 { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background: #f2f2f2; }
          pre { background: #f8f8f8; padding: 10px; border-radius: 4px; white-space: pre-wrap; }
          @media print {
            body { padding: 0; }
            @page { margin: 2cm; }
          }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">
          <h2 style="margin: 0;">TomGees Scholar Studio</h2>
          <div style="font-size: 12px; color: #555;">${title} • Generated on ${new Date().toLocaleDateString()}</div>
        </div>
        <div id="content" style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${markdownContent}</div>
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
  }, 250);
};
