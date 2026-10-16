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
    case 'docx':
      return parseDocx(file);
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

const decodeXmlEntities = (text: string): string => {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
};

export const extractTextFromDocxXml = (xml: string): string => {
  const paragraphs: string[] = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    let pText = '';
    const tokenRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)\b[^>]*\/?>/g;
    let tMatch: RegExpExecArray | null;

    while ((tMatch = tokenRegex.exec(pContent)) !== null) {
      if (tMatch[1] !== undefined) {
        pText += decodeXmlEntities(tMatch[1]);
      } else if (tMatch[2] === 'tab') {
        pText += '\t';
      } else if (tMatch[2] === 'br' || tMatch[2] === 'cr') {
        pText += '\n';
      }
    }

    if (pText.trim()) {
      paragraphs.push(pText.trim());
    }
  }

  if (paragraphs.length === 0) {
    const fallbackMatches = [...xml.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    const fallbackText = fallbackMatches.map((m) => decodeXmlEntities(m[1])).join(' ').trim();
    return fallbackText || '[Empty DOCX]';
  }

  return paragraphs.join('\n\n');
};

const inflateRaw = async (compressed: Uint8Array): Promise<Uint8Array> => {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(compressed)).catch(() => {});
  writer.close().catch(() => {});

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLen += value.length;
    }
  }

  const output = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
};

export const parseDocx = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    let eocdOffset = -1;
    const minEocdOffset = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minEocdOffset; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid DOCX archive (missing End of Central Directory)');
    }

    const cdSize = view.getUint32(eocdOffset + 12, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const decoder = new TextDecoder('utf-8');

    let ptr = cdOffset;
    const cdEnd = cdOffset + cdSize;

    while (ptr < cdEnd && ptr + 46 <= bytes.length) {
      if (view.getUint32(ptr, true) !== 0x02014b50) {
        break;
      }
      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const fileNameLength = view.getUint16(ptr + 28, true);
      const extraFieldLength = view.getUint16(ptr + 30, true);
      const commentLength = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLength));

      if (fileName === 'word/document.xml') {
        if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
          throw new Error('Corrupt local file header in DOCX archive');
        }
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressedSlice = bytes.subarray(dataStart, dataStart + compressedSize);

        let xmlBytes: Uint8Array;
        if (compressionMethod === 0) {
          xmlBytes = compressedSlice;
        } else if (compressionMethod === 8) {
          xmlBytes = await inflateRaw(compressedSlice);
        } else {
          throw new Error(`Unsupported DOCX compression method: ${compressionMethod}`);
        }

        const xmlString = decoder.decode(xmlBytes);
        return extractTextFromDocxXml(xmlString);
      }

      ptr += 46 + fileNameLength + extraFieldLength + commentLength;
    }

    throw new Error('DOCX archive does not contain word/document.xml');
  } catch (error: any) {
    console.error('DOCX Parse Error:', error);
    throw new Error(
      `Failed to parse DOCX "${file.name}": ${error.message || 'Unknown error'}`,
      { cause: error }
    );
  }
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
