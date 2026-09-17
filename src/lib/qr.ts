import QRCode from "qrcode";
import { jsPDF } from "jspdf";

/** Public, shareable verification link for a product code. */
export function verifyUrl(code: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify/${encodeURIComponent(code)}`;
}

/** Renders a QR code (PNG data URL) for any text/link. */
export async function qrDataUrl(text: string, size = 512) {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Triggers a browser download of a single QR code image. */
export async function downloadQrPng(code: string, fileName: string) {
  const dataUrl = await qrDataUrl(verifyUrl(code), 800);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  link.click();
}

export type SheetItem = { code: string; title: string; subtitle?: string };

/** Builds a printable A4 PDF sheet with a grid of labelled QR codes. */
export async function buildQrSheetPdf(items: SheetItem[], heading: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const cols = 3;
  const cellW = 60;
  const cellH = 72;
  const marginX = (pageW - cols * cellW) / 2;
  const marginTop = 24;
  const perPage = cols * 3;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const indexOnPage = i % perPage;

    if (indexOnPage === 0) {
      if (i > 0) doc.addPage();
      doc.setFontSize(14);
      doc.text(heading, marginX, 15);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Page ${Math.floor(i / perPage) + 1}`, pageW - marginX - 15, 15);
      doc.setTextColor(0);
    }

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);
    const x = marginX + col * cellW;
    const y = marginTop + row * cellH;

    const png = await qrDataUrl(verifyUrl(item.code), 600);
    doc.addImage(png, "PNG", x + 6, y, 48, 48);

    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(item.title, cellW - 8), x + 4, y + 54);
    doc.setFontSize(8);
    doc.setTextColor(110);
    if (item.subtitle) doc.text(doc.splitTextToSize(item.subtitle, cellW - 8), x + 4, y + 59);
    doc.text(doc.splitTextToSize(item.code, cellW - 8), x + 4, y + 64);
    doc.setTextColor(0);
  }

  return doc;
}

/** Creates a readable random product code, e.g. SPD-7F3K-92QA. */
export function randomCode(prefix = "SPD") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = (n: number) =>
    Array.from(
      { length: n },
      () => alphabet[Math.floor(Math.random() * alphabet.length)]!,
    ).join("");
  return `${prefix}-${block(4)}-${block(4)}`;
}
