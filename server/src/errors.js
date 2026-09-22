import multer from 'multer';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    const details = {};
    for (const issue of err.issues) details[issue.path.join('.') || 'form'] ??= issue.message;
    return res.status(400).json({ error: 'Please correct the highlighted fields.', details });
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo is too large (max 8 MB).' : 'Invalid upload.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
}
