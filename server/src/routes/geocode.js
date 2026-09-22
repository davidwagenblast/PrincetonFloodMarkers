import { Router } from 'express';
import { HttpError } from '../errors.js';
import { geocodeLimiter } from '../security.js';

// Place search proxied to OpenStreetMap Nominatim so we can honour its usage
// policy (identifying User-Agent, max 1 request/second, caching):
// https://operations.osmfoundation.org/policies/nominatim/
export const geocodeRouter = Router();

const NOMINATIM_URL = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = `PFloodLite/0.1${process.env.NOMINATIM_CONTACT ? ` (${process.env.NOMINATIM_CONTACT})` : ''}`;
const cache = new Map();
const CACHE_MAX = 500;
let nextSlot = 0;

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

geocodeRouter.get('/', geocodeLimiter, async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 200);
  if (q.length < 2) throw new HttpError(400, 'Enter a place to search for.');

  const key = q.toLowerCase();
  if (!cache.has(key)) {
    await throttle();
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': req.get('accept-language') ?? 'en' },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    if (!response?.ok) throw new HttpError(502, 'Place search is unavailable right now.');

    const places = (await response.json()).map((p) => ({
      name: p.display_name,
      latitude: Number(p.lat),
      longitude: Number(p.lon),
      // Nominatim: [south, north, west, east]
      bounds: p.boundingbox?.map(Number),
    }));
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, places);
  }
  res.json({ places: cache.get(key) });
});
