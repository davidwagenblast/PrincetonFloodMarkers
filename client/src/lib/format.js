export const LOCATION_SOURCES = {
  map: 'Map click',
  manual: 'Manual',
  geotag: 'Photo geotag',
  gps: 'Device GPS',
};

export const MARKER_KINDS = {
  flood: 'Flood marker',
  geodetic: 'Geodetic marker',
};

export const MONUMENT_TYPES = {
  benchmark_disk: 'Benchmark disk',
  triangulation_disk: 'Triangulation station disk',
  reference_mark_disk: 'Reference mark disk',
  azimuth_mark_disk: 'Azimuth mark disk',
  traverse_disk: 'Traverse station disk',
  gnss_station: 'GNSS / GPS station',
  bolt_rivet: 'Bolt or rivet',
  chiseled_mark: 'Chiseled mark (cross, square)',
  rod_pipe: 'Rod or pipe',
  other: 'Other',
};

export const SETTINGS = {
  bedrock: 'Bedrock outcrop',
  boulder: 'Boulder',
  concrete_monument: 'Concrete post / monument',
  structure: 'Building, bridge or other structure',
  sidewalk_curb: 'Sidewalk or curb',
  rod_pipe: 'Driven rod or pipe',
  other: 'Other',
};

/** Link to the US National Geodetic Survey datasheet for 2-letter + 4-digit PIDs. */
export const ngsDatasheetUrl = (pid) =>
  /^[A-Z]{2}\d{4}$/i.test(pid ?? '') ? `https://www.ngs.noaa.gov/cgi-bin/ds_mark.prl?PidBox=${pid.toUpperCase()}` : null;

export const MARKER_TYPES = {
  plaque: 'Plaque',
  carved_line: 'Carved line',
  painted_line: 'Painted line',
  post: 'Post / pole',
  stone: 'Stone',
  building_mark: 'Mark on building',
  gauge: 'Staff gauge',
  other: 'Other',
};

export const FLOOD_TYPES = {
  riverine: 'River (fluvial)',
  coastal: 'Coastal',
  storm_surge: 'Storm surge',
  flash: 'Flash flood',
  pluvial: 'Surface water (pluvial)',
  dam_failure: 'Dam / levee failure',
  tsunami: 'Tsunami',
  glacial: 'Glacial outburst',
  other: 'Other',
};

export const CONDITIONS = {
  good: 'Good',
  worn: 'Worn',
  damaged: 'Damaged',
  destroyed: 'Destroyed',
  unknown: 'Unknown',
};

/** 40.3434, -74.6594 -> 40° 20' 36.24" N, 74° 39' 33.84" W */
export function toDMS(lat, lng) {
  const part = (value, pos, neg) => {
    const hundredths = Math.round(Math.abs(value) * 360000); // hundredths of a second
    const deg = Math.floor(hundredths / 360000);
    const min = Math.floor((hundredths % 360000) / 6000);
    const sec = ((hundredths % 6000) / 100).toFixed(2);
    return `${deg}° ${min}' ${sec}" ${value >= 0 ? pos : neg}`;
  };
  return `${part(lat, 'N', 'S')}, ${part(lng, 'E', 'W')}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

/** Partial ISO dates: "2021-09-01" -> "September 1st, 2021", "1927-04" -> "April 1927", "1927" -> "1927" */
export function formatFloodDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (d) return `${MONTHS[m - 1]} ${ordinal(d)}, ${y}`;
  if (m) return `${MONTHS[m - 1]} ${y}`;
  return String(y);
}

export const formatMeters = (v) => (v == null ? null : `${Number(v.toFixed(2))}m`);
