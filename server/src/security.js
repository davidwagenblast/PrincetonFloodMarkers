import rateLimit from 'express-rate-limit';
import { HttpError } from './errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// There are no cookies to steal, but this still stops other sites from submitting
// markers through a visitor's browser: we require a custom header (which cross-origin
// pages cannot send without a CORS preflight we never approve) and reject browsers that
// report the request as cross-site.
export function csrfGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const site = req.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return next(new HttpError(403, 'Cross-site request blocked.'));
  }
  if (req.get('x-requested-with') !== 'FloodMarkerMap') {
    return next(new HttpError(403, 'Missing request header.'));
  }
  next();
}

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: message }),
  });

// Contributions are anonymous, so the per-network rate limit is the main guard against floods of spam.
export const createMarkerLimiter = limiter(60 * 60_000, Number(process.env.SUBMISSIONS_PER_HOUR) || 20, 'Submission limit reached. Try again in an hour.');
export const geocodeLimiter = limiter(60_000, 20, 'Too many place searches. Slow down a little.');
