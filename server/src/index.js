import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csrfGuard } from './security.js';
import { BASE_PATH, stripBasePath } from './basePath.js';
import { errorHandler } from './errors.js';
import { ipAllowlist } from './ipAllowlist.js';
import { uploadsDir } from './uploads.js';
import { markersRouter } from './routes/markers.js';
import { geocodeRouter } from './routes/geocode.js';

const app = express();

// Set when running behind a reverse proxy so rate limits see the real client IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(stripBasePath);

// With IP_ALLOWLIST=on, only the ranges in ip-allowlist.txt can reach anything below.
const allowlist = ipAllowlist();
if (allowlist) app.use(allowlist);

const IMG_SRC = ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'];
app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': IMG_SRC } } }));

const api = express.Router();
api.use(csrfGuard);
api.get('/health', (_req, res) => res.json({ ok: true }));
api.use('/markers', markersRouter);
api.use('/geocode', geocodeRouter);
api.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use('/api', api);

// Uploaded photos: random names, metadata already stripped on upload.
app.get('/uploads/:file', (req, res) => {
  const name = req.params.file;
  if (!/^[a-f0-9]{32}\.(jpg|png)$/.test(name)) return res.status(404).json({ error: 'Not found.' });
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(name, { root: uploadsDir }, (err) => err && !res.headersSent && res.status(404).json({ error: 'Not found.' }));
});

// In production, serve the built React app from the same origin.
const clientDist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
  app.get('/{*splat}', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.use(errorHandler);

const port = process.env.API_PORT ?? 3001;
// HOST=127.0.0.1 accepts connections only from this machine (i.e. through the front web server).
const host = process.env.HOST || undefined;
app.listen(port, host, () => console.log(`Listening on http://${host ?? 'localhost'}:${port}${BASE_PATH}`));
