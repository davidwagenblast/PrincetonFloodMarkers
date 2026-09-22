import { z } from 'zod';
import { HttpError } from './errors.js';

export const LOCATION_SOURCES = ['map', 'manual', 'geotag', 'gps'];
export const CONDITIONS = ['good', 'worn', 'damaged', 'destroyed', 'unknown'];
export const MARKER_KINDS = ['flood', 'geodetic'];
export const MONUMENT_TYPES = [
  'benchmark_disk',
  'triangulation_disk',
  'reference_mark_disk',
  'azimuth_mark_disk',
  'traverse_disk',
  'gnss_station',
  'bolt_rivet',
  'chiseled_mark',
  'rod_pipe',
  'other',
];
export const SETTINGS = ['bedrock', 'boulder', 'concrete_monument', 'structure', 'sidewalk_curb', 'rod_pipe', 'other'];

const blankToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const text = (max) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

export const number = (min, max) =>
  z.preprocess(
    (v) => (blankToUndefined(v) === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Must be a number.' }).finite().min(min).max(max).optional()
  );

export const choice = (values) => z.preprocess(blankToUndefined, z.enum(values).optional());

export const coordinate = (label, min, max) =>
  z.preprocess(
    (v) => (blankToUndefined(v) === undefined ? undefined : Number(v)),
    z
      .number({ required_error: `${label} is required.`, invalid_type_error: `${label} must be a number.` })
      .min(min, `${label} must be between ${min} and ${max}.`)
      .max(max, `${label} must be between ${min} and ${max}.`)
  );

// One day of slack so contributors ahead of UTC can enter "today".
export const notInFuture = (date) => date <= new Date(Date.now() + 86_400_000).toISOString().slice(0, date.length);

export const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function parseId(value) {
  if (!/^\d{1,15}$/.test(value)) throw new HttpError(404, 'Not found.');
  return Number(value);
}
