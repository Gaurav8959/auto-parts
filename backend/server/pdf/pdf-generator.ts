import PdfPrinter from "pdfmake";
import { TDocumentDefinitions } from "pdfmake/interfaces";

// pdfmake draws PDFs in plain JavaScript (no headless browser), so it runs on small/free servers.
// Roboto ships with pdfmake and includes the ₹ sign.
const vfs = require("pdfmake/build/vfs_fonts.js");
const font = (file: string) => Buffer.from(vfs[file], "base64");

const printer = new PdfPrinter({
  Roboto: {
    normal: font("Roboto-Regular.ttf"),
    bold: font("Roboto-Medium.ttf"),
    italics: font("Roboto-Italic.ttf"),
    bolditalics: font("Roboto-MediumItalic.ttf"),
  },
});

export const generatePdf = (doc: TDocumentDefinitions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const pdf = printer.createPdfKitDocument(doc);
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.end();
  });
