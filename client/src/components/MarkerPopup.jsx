import {
  CONDITIONS,
  FLOOD_TYPES,
  LOCATION_SOURCES,
  MARKER_KINDS,
  MARKER_TYPES,
  MONUMENT_TYPES,
  SETTINGS,
  formatFloodDate,
  formatMeters,
  ngsDatasheetUrl,
  toDMS,
} from '../lib/format.js';

const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc" style={{ color: '#b9c9ff' }}>
    {children}
  </a>
);

const renderRows = (list) =>
  list
    .filter(([, v]) => v)
    .map(([label, value]) => (
      <p key={label}>
        {label}: {value}
      </p>
    ));

function floodRows(m) {
  const floodHeight = formatMeters(m.flood_elevation_m);
  return {
    main: [
      ['Height Above Ground', formatMeters(m.height_above_ground_m)],
      ['Location Height Above Sea Level', formatMeters(m.ground_elevation_m)],
      ['Approximate Flood Height Above Sea Level', floodHeight && `${floodHeight}${m.vertical_datum ? ` (${m.vertical_datum})` : ''}`],
      ['Flood Date', formatFloodDate(m.flood_date)],
    ],
    details: [
      ['Event', m.event_name],
      ['Flood Type', FLOOD_TYPES[m.flood_type]],
      ['Cause', m.cause],
      ['Waterbody', m.waterbody],
      ['Marker Type', MARKER_TYPES[m.marker_type]],
      ['Inscription', m.inscription && `“${m.inscription}”`],
    ],
  };
}

function geodeticRows(m) {
  const datasheet = ngsDatasheetUrl(m.pid);
  return {
    main: [
      ['Designation', m.designation],
      ['PID', m.pid && (datasheet ? <ExternalLink href={datasheet}>{m.pid}</ExternalLink> : m.pid)],
      ['Elevation', formatMeters(m.orthometric_height_m) && `${formatMeters(m.orthometric_height_m)}${m.vertical_datum ? ` (${m.vertical_datum})` : ''}`],
      ['Horizontal Datum', m.horizontal_datum],
    ],
    details: [
      ['Monument Type', MONUMENT_TYPES[m.monument_type]],
      ['Setting', SETTINGS[m.setting]],
      ['Stamping', m.stamping && `“${m.stamping}”`],
      ['Agency', m.agency],
      ['Year Set', m.year_set],
    ],
  };
}

export default function MarkerPopup({ marker: m }) {
  const accuracy = m.location_accuracy_m != null ? ` (±${Math.round(m.location_accuracy_m)}m)` : '';
  const { main, details } = m.kind === 'geodetic' ? geodeticRows(m) : floodRows(m);
  details.push(['Place', [m.locality, m.country].filter(Boolean).join(', ')], ['Condition', CONDITIONS[m.condition]]);

  return (
    <div className="fm-popup">
      <div className="fm-popup-badges">
        <span className={`fm-badge kind-${m.kind}`}>{MARKER_KINDS[m.kind]}</span>
      </div>
      <h3>{m.title}</h3>
      <div className="fm-popup-contributor">Contributor: {m.contributor_name || 'Anonymous'}</div>
      {m.photo_url && <img className="fm-popup-photo" src={m.photo_url} alt={`Photo of ${m.title}`} loading="lazy" />}

      {renderRows([['Geolocation', toDMS(m.latitude, m.longitude)], ['Geolocation Source', `${LOCATION_SOURCES[m.location_source]}${accuracy}`], ...main])}
      {details.some(([, v]) => v) && <div className="fm-popup-gap">{renderRows(details)}</div>}

      {m.notes && <p className="fm-popup-gap">Contributor Notes: {m.notes}</p>}
      {m.source_reference && (
        <p className="fm-popup-gap">
          Source: {isHttpUrl(m.source_reference) ? <ExternalLink href={m.source_reference}>{m.source_reference}</ExternalLink> : m.source_reference}
        </p>
      )}
    </div>
  );
}
