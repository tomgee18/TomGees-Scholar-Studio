import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker locally from pdfjs-dist build
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const parseFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return parsePdf(file);
    case 'md':
    case 'txt':
    default:
      return parseText(file);
  }
};

const parseText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(new Error(`Failed to read text file: ${file.name}`));
    reader.readAsText(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 100);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');

      fullText += `\n--- Page ${i} ---\n${pageText}\n`;
    }

    if (pdf.numPages > maxPages) {
      fullText += `\n[SYSTEM NOTE: PDF truncated after ${maxPages} pages for performance.]`;
    }

    return fullText.trim() || '[Empty PDF]';
  } catch (error: any) {
    console.error('PDF Parse Error:', error);
    throw new Error(`Failed to parse PDF "${file.name}": ${error.message || 'Unknown error'}`, { cause: error });
  }
};
