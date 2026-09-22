import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from './errors.js';

export const uploadsDir = process.env.UPLOADS_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
mkdirSync(uploadsDir, { recursive: true });

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 40, fieldSize: 10_000 },
});

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const startsWith = (buf, sig) => sig.every((b, i) => buf[i] === b);

// Drop EXIF/XMP (APP1), IPTC (APP13) and comment segments. These can carry
// device serials, timestamps and owner names. Image data is left untouched.
function stripJpegMetadata(buf) {
  const out = [buf.subarray(0, 2)];
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) throw new HttpError(400, 'Photo file is corrupt.');
    const marker = buf[pos + 1];
    if (marker === 0xda) {
      out.push(buf.subarray(pos)); // start of scan: the rest is image data
      return Buffer.concat(out);
    }
    const end = pos + 2 + buf.readUInt16BE(pos + 2);
    if (end > buf.length) throw new HttpError(400, 'Photo file is corrupt.');
    if (marker !== 0xe1 && marker !== 0xed && marker !== 0xfe) out.push(buf.subarray(pos, end));
    pos = end;
  }
  throw new HttpError(400, 'Photo file is corrupt.');
}

const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

function stripPngMetadata(buf) {
  const out = [buf.subarray(0, 8)];
  let pos = 8;
  while (pos + 12 <= buf.length) {
    const end = pos + 12 + buf.readUInt32BE(pos);
    if (end > buf.length) throw new HttpError(400, 'Photo file is corrupt.');
    const type = buf.toString('latin1', pos + 4, pos + 8);
    if (!PNG_METADATA_CHUNKS.has(type)) out.push(buf.subarray(pos, end));
    pos = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

/** Validates by file signature (not the client-supplied MIME type), strips metadata, saves under a random name. */
export function savePhoto(file) {
  let ext, data;
  if (startsWith(file.buffer, JPEG)) {
    ext = 'jpg';
    data = stripJpegMetadata(file.buffer);
  } else if (startsWith(file.buffer, PNG)) {
    ext = 'png';
    data = stripPngMetadata(file.buffer);
  } else {
    throw new HttpError(400, 'Photo must be a JPEG or PNG image.');
  }
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  writeFileSync(join(uploadsDir, name), data);
  return name;
}

export function deletePhoto(name) {
  if (name && /^[a-f0-9]{32}\.(jpg|png)$/.test(name)) rmSync(join(uploadsDir, name), { force: true });
}
