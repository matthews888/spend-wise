import type { ExtractedPage, PdfExtraction, PositionedTextItem } from "./types";

type PdfInput = File | ArrayBuffer | Uint8Array;

async function bytesFrom(input: PdfInput) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
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
