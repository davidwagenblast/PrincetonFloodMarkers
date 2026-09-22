/** Reads GPS coordinates from a photo's EXIF data, if present. exifr is loaded on demand. */
export async function readPhotoGps(file) {
  try {
    const { default: exifr } = await import('exifr');
    const gps = await exifr.gps(file);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) return gps;
  } catch {
    // No EXIF or unreadable file; not an error for the user.
  }
  return null;
}

/**
 * Re-encodes a photo as a JPEG no larger than maxSize px on its longest side.
 * This applies the EXIF orientation, drops all metadata, and keeps uploads small.
 */
export async function prepareUpload(file, maxSize = 2048) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process photo.'))), 'image/jpeg', 0.85)
  );
}
