import type { ExtractedPage, PdfExtraction, PositionedTextItem } from "./types";

type PdfInput = File | ArrayBuffer | Uint8Array;

function readWithFileReader(file: File) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(new Uint8Array(reader.result));
      else reject(new Error("The selected file could not be read as binary data."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("The selected file could not be read."));
    reader.onabort = () => reject(new Error("Reading the selected file was cancelled."));
    reader.readAsArrayBuffer(file);
  });
}

async function bytesFrom(input: PdfInput) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof FileReader !== "undefined") {
    try {
      return await readWithFileReader(input);
    } catch (fileReaderError) {
      try {
        return new Uint8Array(await input.arrayBuffer());
      } catch {
        throw fileReaderError;
      }
    }
  }
  return new Uint8Array(await input.arrayBuffer());
}

export async function extractPdf(input: PdfInput): Promise<PdfExtraction> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjs.getDocument({ data: await bytesFrom(input) }).promise;
  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: PositionedTextItem[] = [];

    for (const [index, item] of content.items.entries()) {
      if (!("str" in item) || !item.str.trim()) continue;
      items.push({
        str: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        index,
      });
    }

    pages.push({ pageNumber, width: viewport.width, height: viewport.height, items });
  }

  return { pageCount: pdf.numPages, pages };
}
