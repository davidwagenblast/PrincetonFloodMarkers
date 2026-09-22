import { Router } from 'express';
import { z } from 'zod';
import { BASE_PATH } from '../basePath.js';
import { db } from '../db.js';
import { HttpError } from '../errors.js';
import { createMarkerLimiter } from '../security.js';
import { upload, savePhoto, deletePhoto } from '../uploads.js';
import {
  CONDITIONS,
  LOCATION_SOURCES,
  MARKER_KINDS,
  MONUMENT_TYPES,
  SETTINGS,
  choice,
  coordinate,
  escapeLike,
  notInFuture,
  number,
  parseId,
  text,
} from '../validation.js';

export const markersRouter = Router();

const SELECT_MARKER = `
  SELECT id, kind, contributor_name, title, marker_type,
         designation, pid, agency, monument_type, setting, stamping, year_set,
         orthometric_height_m, horizontal_datum, inscription, condition, photo_path, notes,
         latitude, longitude, location_source, location_accuracy_m, locality, country, waterbody,
         height_above_ground_m, ground_elevation_m, vertical_datum, flood_elevation_m,
         flood_date, event_name, flood_type, cause, source_reference, created_at
  FROM markers`;

function markerPublic({ photo_path, ...marker }) {
  return { ...marker, photo_url: photo_path ? `${BASE_PATH}uploads/${photo_path}` : null };
}

const PARTIAL_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

// Required: kind, title, latitude, longitude, location_source. Everything else is optional.
const markerSchema = z.object({
  kind: z.enum(MARKER_KINDS, { required_error: 'Marker kind is required.' }),
  title: z.string({ required_error: 'Title is required.' }).trim().min(3, 'Give the marker a title of at least 3 characters.').max(120),
  marker_type: choice(['plaque', 'carved_line', 'painted_line', 'post', 'stone', 'building_mark', 'gauge', 'other']),
  inscription: text(500),
  condition: choice(CONDITIONS),
  notes: text(2000),

  latitude: coordinate('Latitude', -90, 90),
  longitude: coordinate('Longitude', -180, 180),
  location_source: z.enum(LOCATION_SOURCES, { required_error: 'Location source is required.' }),
  location_accuracy_m: number(0, 100_000),
  locality: text(120),
  country: text(80),
  waterbody: text(120),

  height_above_ground_m: number(-50, 100),
  ground_elevation_m: number(-500, 9000),
  vertical_datum: text(40),

  flood_date: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().regex(PARTIAL_DATE, 'Use YYYY, YYYY-MM or YYYY-MM-DD.').refine(notInFuture, 'Flood date cannot be in the future.').optional()
  ),
  event_name: text(120),
  flood_type: choice(['riverine', 'coastal', 'storm_surge', 'flash', 'pluvial', 'dam_failure', 'tsunami', 'glacial', 'other']),
  cause: text(200),
  source_reference: text(500),
  contributor_name: text(60),

  designation: text(120),
  pid: text(40),
  agency: text(120),
  monument_type: choice(MONUMENT_TYPES),
  setting: choice(SETTINGS),
  stamping: text(300),
  year_set: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v == null ? undefined : Number(v)),
    z
      .number({ invalid_type_error: 'Year set must be a year.' })
      .int('Year set must be a year.')
      .min(1700, 'Year set must be 1700 or later.')
      .refine((y) => y <= new Date().getUTCFullYear(), 'Year set cannot be in the future.')
      .optional()
  ),
  orthometric_height_m: number(-500, 9000),
  horizontal_datum: text(40),
});

const FIELDS = Object.keys(markerSchema.shape);

// Fields that only apply to one kind; the other kind's fields are stored as NULL.
const FLOOD_ONLY = ['marker_type', 'inscription', 'height_above_ground_m', 'ground_elevation_m', 'flood_date', 'event_name', 'flood_type', 'cause', 'waterbody'];
const GEODETIC_ONLY = ['designation', 'pid', 'agency', 'monument_type', 'setting', 'stamping', 'year_set', 'orthometric_height_m', 'horizontal_datum'];

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  bbox: z
    .string()
    .regex(/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/)
    .transform((s) => s.split(',').map(Number))
    .optional(),
  kind: z.enum(MARKER_KINDS).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

const TEXT_COLUMNS = ['title', 'notes', 'inscription', 'locality', 'country', 'waterbody', 'event_name', 'designation', 'pid', 'stamping', 'agency', 'contributor_name'];

/** Markers inside an optional bounding box, of an optional kind, matching optional search text; newest first. */
function listMarkers({ q, bbox, kind, limit }) {
  const where = [];
  const params = { limit };

  if (kind) {
    params.kind = kind;
    where.push('kind = $kind');
  }
  if (bbox) {
    const [west, south, east, north] = bbox;
    Object.assign(params, { west, south, east, north });
    where.push('latitude BETWEEN $south AND $north');
    // west > east means the box crosses the antimeridian
    where.push(west <= east ? 'longitude BETWEEN $west AND $east' : '(longitude >= $west OR longitude <= $east)');
  }
  if (q) {
    if (q.length >= 3) {
      // Indexed substring search (trigram tokenizer needs at least 3 characters).
      params.match = `"${q.replaceAll('"', '""')}"`;
      where.push('id IN (SELECT rowid FROM markers_fts WHERE markers_fts MATCH $match)');
    } else {
      params.like = `%${escapeLike(q)}%`;
      where.push(`(${TEXT_COLUMNS.map((c) => `${c} LIKE $like ESCAPE '\\'`).join(' OR ')})`);
    }
  }

  // Choose the newest matching ids first (index-only for map views), then load just those rows.
  const sql = `${SELECT_MARKER}
    WHERE id IN (
      SELECT id FROM markers ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY created_at DESC LIMIT $limit
    )
    ORDER BY created_at DESC`;
  return db.prepare(sql).all(params).map(markerPublic);
}

// GET /api/markers?bbox=west,south,east,north&kind=flood&q=text&limit=n
markersRouter.get('/', (req, res) => {
  res.json({ markers: listMarkers(listQuery.parse(req.query)) });
});

const findById = db.prepare(`${SELECT_MARKER} WHERE id = ?`);

/** Column values for insert, with the other kind's fields cleared. */
function markerValues(data) {
  const ignored = new Set(data.kind === 'geodetic' ? FLOOD_ONLY : GEODETIC_ONLY);
  return Object.fromEntries(FIELDS.map((f) => [f, ignored.has(f) ? null : data[f] ?? null]));
}

markersRouter.get('/:id', (req, res) => {
  const row = findById.get(parseId(req.params.id));
  if (!row) throw new HttpError(404, 'Marker not found.');
  res.json({ marker: markerPublic(row) });
});

markersRouter.post('/', createMarkerLimiter, upload.single('photo'), (req, res) => {
  const data = markerSchema.parse(req.body);
  const photoPath = req.file ? savePhoto(req.file) : null;

  try {
    const values = { ...markerValues(data), photo_path: photoPath };
    const columns = Object.keys(values);
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO markers (${columns.join(', ')}) VALUES (${columns.map((c) => `$${c}`).join(', ')})`)
      .run(values);
    res.status(201).json({ marker: markerPublic(findById.get(Number(lastInsertRowid))) });
  } catch (err) {
    deletePhoto(photoPath);
    throw err;
  }
});
