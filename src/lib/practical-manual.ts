export const MAX_MANUAL_SIZE = 20 * 1024 * 1024;

export async function extractPracticalManualText(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt") {
    const text = await file.text();
    if (!text.trim()) throw new Error("The text file is empty.");
    return text;
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value.trim()) throw new Error("No readable text was found in the DOCX file.");
    return value;
  }

  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
    }

    const text = pages.join("\n").trim();
    if (!text) {
      throw new Error(
        "No selectable text was found. Scanned or image-only PDFs are not supported.",
      );
    }
    return text;
  }

  throw new Error("Choose a PDF, DOCX, or TXT file.");
}
