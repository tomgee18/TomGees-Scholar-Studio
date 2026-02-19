
/**
 * Browser-side file parsing logic.
 * Uses FileReader for text/md and PDF.js (injected via CDN in index.html) for PDFs.
 */

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
    reader.onload = (e) => resolve(e.target?.result as string || "");
    reader.onerror = (e) => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
  try {
    const pdfjs = (window as any).pdfjsLib;

    if (!pdfjs) {
        return `[SYSTEM WARNING: PDF.js library not loaded. Please ensure internet connection to load the CDN.]\n\nFilename: ${file.name}`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    // Limit to first 50 pages to prevent browser crash on massive books
    const maxPages = Math.min(pdf.numPages, 50);

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n--- Page ${i} ---\n${pageText}\n`;
    }

    if (pdf.numPages > maxPages) {
        fullText += `\n[SYSTEM NOTE: PDF truncated after ${maxPages} pages for performance.]`;
    }

    return fullText || "[Empty PDF]";
  } catch (e: any) {
    console.error("PDF Parse Error:", e);
    return `[Error parsing PDF: ${e.message || "Unknown error"}]`;
  }
};
