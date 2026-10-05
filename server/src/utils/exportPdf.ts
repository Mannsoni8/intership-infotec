import fs from 'fs';
import PDFDocument from 'pdfkit';
import { FlatBlock } from './blockTree';
import { sanitizeLine } from './sanitize';

const HEADING_SIZES: Record<number, number> = { 1: 20, 2: 17, 3: 14.5, 4: 13, 5: 12, 6: 11 };
const MARGIN = 56;

// The built-in PDF fonts only know Latin characters (WinAnsi). Other characters would
// show as garbage, so we replace them with "?". If PDF_FONT_PATH points to a .ttf font
// that has the characters (for example Noto Sans), that font is used instead.
function pdfText(text: string, unicodeFont: boolean): string {
  if (unicodeFont) return text;
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u20AC]/g, '?');
}

// Builds a PDF from the document blocks. Returns the pdfkit stream (call .pipe on it).
export function blocksToPdf(title: string, blocks: FlatBlock[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true, info: { Title: title } });

  const fontPath = process.env.PDF_FONT_PATH;
  const customFont = !!fontPath && fs.existsSync(fontPath);
  const BODY = customFont ? (fontPath as string) : 'Helvetica';
  const BOLD = customFont ? (fontPath as string) : 'Helvetica-Bold';
  const CODE = 'Courier';
  const fix = (t: string) => pdfText(t, customFont);

  const contentWidth = () => doc.page.width - MARGIN * 2;
  const usableHeight = () => doc.page.height - MARGIN * 2;

  // title
  doc.font(BOLD).fontSize(24).fillColor('#111').text(fix(sanitizeLine(title, 120)), { paragraphGap: 14 });
  doc.moveTo(MARGIN, doc.y).lineTo(doc.page.width - MARGIN, doc.y).strokeColor('#cccccc').stroke();
  doc.moveDown(0.8);

  for (const block of blocks) {
    const text = fix(block.text);

    if (block.type === 'heading') {
      const size = HEADING_SIZES[Math.min(6, Math.max(1, block.level ?? 1))];
      if (doc.y > doc.page.height - MARGIN - 60) doc.addPage(); // do not leave a heading alone at the bottom
      doc.moveDown(0.4);
      doc.font(BOLD).fontSize(size).fillColor('#111').text(text, { paragraphGap: 6 });
    } else if (block.type === 'quote') {
      doc.font(BODY).fontSize(11).fillColor('#555');
      const height = doc.heightOfString(text, { width: contentWidth() - 16 });
      if (height < usableHeight() && doc.y + height > doc.page.height - MARGIN) doc.addPage();
      const top = doc.y;
      doc.text(text, MARGIN + 16, top, { width: contentWidth() - 16 });
      const bottom = doc.y;
      doc.save().rect(MARGIN + 2, top, 3, Math.max(bottom - top, 4)).fill('#bbbbbb').restore();
      doc.x = MARGIN;
      doc.moveDown(0.6);
    } else if (block.type === 'codeBlock') {
      doc.font(CODE).fontSize(9.5);
      const height = doc.heightOfString(text || ' ', { width: contentWidth() - 16 });
      if (height < usableHeight() && doc.y + height + 16 > doc.page.height - MARGIN) doc.addPage();
      const top = doc.y;
      if (height < usableHeight()) {
        doc.save().rect(MARGIN, top, contentWidth(), height + 14).fill('#f3f3f3').restore();
      }
      doc.fillColor('#222').text(text || ' ', MARGIN + 8, top + 7, { width: contentWidth() - 16 });
      doc.x = MARGIN;
      doc.moveDown(0.8);
    } else if (block.type === 'listItem') {
      const indent = MARGIN + block.depth * 18;
      doc.font(BODY).fontSize(11).fillColor('#222');
      const y = doc.y;
      doc.text('\u2022', indent, y, { lineBreak: false });
      doc.text(text, indent + 14, y, { width: contentWidth() - block.depth * 18 - 14 });
      doc.x = MARGIN;
      doc.moveDown(0.25);
    } else {
      doc.font(BODY).fontSize(11).fillColor('#222').text(text, MARGIN, doc.y, {
        width: contentWidth(),
        paragraphGap: 7,
      });
    }
  }

  // page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // so that writing in the footer does not create a new page
    doc.font(BODY).fontSize(9).fillColor('#888');
    doc.text(`Page ${i + 1} of ${range.count}`, 0, doc.page.height - 36, {
      align: 'center',
      width: doc.page.width,
    });
    doc.page.margins.bottom = oldBottom;
  }

  doc.end();
  return doc;
}
