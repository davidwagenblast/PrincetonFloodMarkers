import { useEffect, useRef } from 'react';
import {
  CONDITIONS,
  FLOOD_TYPES,
  LOCATION_SOURCES,
  MARKER_KINDS,
  MARKER_TYPES,
  MONUMENT_TYPES,
  SETTINGS,
  formatFloodDate,
  ngsDatasheetUrl,
  toDMS,
} from '../lib/format.js';
import { floodPinSvg, geodeticPinSvg } from '../lib/pins.js';

const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
    {children}
  </a>
);

/** 1.2 -> "1.2 m (3.9 ft)"; embeds are often read by a US audience, so heights show both units. */
function heightWithFeet(v, datum) {
  if (v == null) return null;
  const text = `${Number(v.toFixed(2))} m (${(v * 3.28084).toFixed(1)} ft)`;
  return datum ? `${text} · ${datum}` : text;
}

function addedOn(createdAt) {
  const date = createdAt && new Date(`${createdAt.replace(' ', 'T')}Z`);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
}

/** The headline figures shown large at the top: what most readers came to see. */
function highlights(m) {
  if (m.kind === 'geodetic') {
    const datasheet = ngsDatasheetUrl(m.pid);
    return [
      ['Elevation', heightWithFeet(m.orthometric_height_m, m.vertical_datum)],
      ['PID', m.pid && (datasheet ? <ExternalLink href={datasheet}>{m.pid} ↗</ExternalLink> : m.pid)],
      ['Year set', m.year_set],
    ];
  }
  return [
    ['Flood date', formatFloodDate(m.flood_date)],
    ['Water height above ground', heightWithFeet(m.height_above_ground_m)],
  ];
}

function sections(m) {
  const place = [m.locality, m.country].filter(Boolean).join(', ');
  const accuracy = m.location_accuracy_m != null ? ` (±${Math.round(m.location_accuracy_m)} m)` : '';
  const location = [
    'Location',
    [
      ['Place', place],
      ['Coordinates', toDMS(m.latitude, m.longitude)],
      ['Located by', `${LOCATION_SOURCES[m.location_source] ?? 'Unknown'}${accuracy}`],
    ],
  ];

  if (m.kind === 'geodetic') {
    return [
      [
        'Survey mark',
        [
          ['Designation', m.designation],
          ['Agency', m.agency],
          ['Monument type', MONUMENT_TYPES[m.monument_type]],
          ['Setting', SETTINGS[m.setting]],
          ['Stamping', m.stamping && `“${m.stamping}”`],
          ['Horizontal datum', m.horizontal_datum],
          ['Condition', CONDITIONS[m.condition]],
        ],
      ],
      location,
    ];
  }
  return [
    [
      'Flood event',
      [
        ['Event', m.event_name],
        ['Flood type', FLOOD_TYPES[m.flood_type]],
        ['Cause', m.cause],
        ['Waterbody', m.waterbody],
      ],
    ],
    [
      'Heights',
      [
        ['Ground above sea level', heightWithFeet(m.ground_elevation_m)],
        ['Flood level above sea level', heightWithFeet(m.flood_elevation_m, m.vertical_datum)],
      ],
    ],
    [
      'The marker',
      [
        ['Type', MARKER_TYPES[m.marker_type]],
        ['Inscription', m.inscription && `“${m.inscription}”`],
        ['Condition', CONDITIONS[m.condition]],
      ],
    ],
    location,
  ];
}

/**
 * Full details of one marker, laid out for reading in an embedded map:
 * headline figures first, then labelled sections that skip anything not recorded.
 */
export default function MarkerDetails({ marker: m, onClose, fullMapUrl }) {
  const headingRef = useRef(null);

  // Move focus to the panel when a new marker opens, so keyboard and screen reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [m.id]);

  const facts = highlights(m).filter(([, v]) => v);
  const groups = sections(m)
    .map(([title, rows]) => [title, rows.filter(([, v]) => v)])
    .filter(([, rows]) => rows.length);
  const added = addedOn(m.created_at);
  const directions = `https://www.openstreetmap.org/directions?to=${m.latitude}%2C${m.longitude}#map=17/${m.latitude}/${m.longitude}`;

  return (
    <aside className={`fm-details kind-${m.kind}`} aria-labelledby="fm-details-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="fm-details-head">
        <span
          className="fm-details-icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: m.kind === 'geodetic' ? geodeticPinSvg() : floodPinSvg() }}
        />
        <div className="fm-details-heading">
          <span className={`fm-badge kind-${m.kind}`}>{MARKER_KINDS[m.kind]}</span>
          <h2 id="fm-details-title" ref={headingRef} tabIndex={-1}>
            {m.title}
          </h2>
          {m.kind === 'flood' && m.event_name && <p className="fm-details-sub">{m.event_name}</p>}
          {m.kind === 'geodetic' && m.designation && <p className="fm-details-sub">{m.designation}</p>}
        </div>
        <button type="button" className="fm-details-close" onClick={onClose} aria-label="Close marker details">
          ×
        </button>
      </header>

      <div className="fm-details-body">
        {m.photo_url && (
          <a className="fm-details-photo" href={m.photo_url} target="_blank" rel="noopener noreferrer" title="Open full-size photo">
            <img src={m.photo_url} alt={`Photo of ${m.title}`} loading="lazy" />
          </a>
        )}

        {facts.length > 0 && (
          <dl className="fm-details-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {groups.map(([title, rows]) => (
          <section key={title} className="fm-details-section">
            <h3>{title}</h3>
            <dl>
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {m.notes && (
          <section className="fm-details-section">
            <h3>Contributor notes</h3>
            <p className="fm-details-notes">{m.notes}</p>
          </section>
        )}

        {m.source_reference && (
          <section className="fm-details-section">
            <h3>Source</h3>
            <p className="fm-details-notes">
              {isHttpUrl(m.source_reference) ? <ExternalLink href={m.source_reference}>{m.source_reference}</ExternalLink> : m.source_reference}
            </p>
          </section>
        )}

        <p className="fm-details-credit">
          Contributed by {m.contributor_name || 'Anonymous'}
          {added && ` · Added ${added}`}
        </p>
      </div>

      <footer className="fm-details-actions">
        <a className="fm-button small" href={fullMapUrl} target="_blank" rel="noopener">
          View on full map ↗
        </a>
        <a className="fm-button small secondary" href={directions} target="_blank" rel="noopener noreferrer">
          Directions ↗
        </a>
      </footer>
    </aside>
  );
}
