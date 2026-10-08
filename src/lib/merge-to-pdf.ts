// איחוד קובצי PDF ותמונות לקובץ PDF אחד — בדפדפן בלבד. אין כאן שליחה לרשת או שמירה.
import { PDFDocument } from 'pdf-lib';

export type Skipped = { name: string; reason: string };
export type MergeResult = { bytes: Uint8Array; pages: number; skipped: Skipped[] };

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 20;
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.85;

export const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

const looksEncrypted = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes).includes('/Encrypt');

// pdf-lib's own EncryptedPDFError is transpiled to ES5 and fails `instanceof`, so we use our own marker.
class PasswordProtected extends Error {}

type Drawable = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decodeImage(file: File): Promise<Drawable> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // Fallback for browsers whose createImageBitmap cannot read the format (e.g. HEIC in Safari).
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  }
}

async function imageToJpeg(file: File) {
  const image = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image.source, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => (result ? resolve(result) : reject(new Error('encode'))), 'image/jpeg', JPEG_QUALITY);
    });
    canvas.width = 0;
    canvas.height = 0;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    image.release();
  }
}

export async function mergeToPdf(files: File[], onProgress?: (done: number, total: number) => void): Promise<MergeResult> {
  const output = await PDFDocument.create();
  const skipped: Skipped[] = [];

  for (const [index, file] of files.entries()) {
    try {
      if (isPdf(file)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let source: PDFDocument;
        try {
          source = await PDFDocument.load(bytes);
        } catch (error) {
          if (looksEncrypted(bytes) || /encrypted/i.test(error instanceof Error ? error.message : '')) throw new PasswordProtected();
          throw error;
        }
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach(page => output.addPage(page));
      } else if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name)) {
        const jpeg = await imageToJpeg(file);
        const embedded = await output.embedJpg(jpeg.bytes);
        const landscape = jpeg.width > jpeg.height;
        const [pageWidth, pageHeight] = landscape ? [A4[1], A4[0]] : A4;
        const fit = Math.min((pageWidth - MARGIN * 2) / jpeg.width, (pageHeight - MARGIN * 2) / jpeg.height);
        const drawWidth = jpeg.width * fit;
        const drawHeight = jpeg.height * fit;
        const page = output.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, { x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
      } else {
        skipped.push({ name: file.name, reason: 'סוג קובץ שאינו PDF או תמונה' });
      }
    } catch (error) {
      skipped.push({
        name: file.name,
        reason: error instanceof PasswordProtected
          ? 'הקובץ מוגן (בסיסמה או בהצפנה), ולכן אי אפשר לצרף אותו כמו שהוא. פתחו אותו ושמרו או הדפיסו אותו מחדש כ־PDF רגיל'
          : isPdf(file) ? 'לא ניתן לקרוא את קובץ ה־PDF' : 'לא ניתן לקרוא את התמונה. נסו לשמור אותה כ־JPG',
      });
    }
    onProgress?.(index + 1, files.length);
  }

  const pages = output.getPageCount();
  const bytes = pages > 0 ? await output.save({ useObjectStreams: true }) : new Uint8Array();
  return { bytes, pages, skipped };
}
