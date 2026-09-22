import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { formatFloodDate } from '../lib/format.js';

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5" fill="none" stroke="#fff" strokeWidth="2.4" />
    <path d="M15 15l6 6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

/**
 * Dark search bar from the design mockup.
 * - Typing searches flood markers (title, notes, place, event, contributor).
 * - "Where is this?" (or submitting with no marker matches) looks the text up as a place via OpenStreetMap.
 * - placesOnly: only does place lookups (used on the Contribute map).
 */
export default function SearchBox({ onSelectMarker, onSelectPlace, placesOnly = false, placeholder = 'Search' }) {
  const [query, setQuery] = useState('');
  const [markers, setMarkers] = useState([]);
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setPlaces(null);
    setError(null);
    const term = query.trim();
    if (placesOnly || term.length < 2) {
      setMarkers([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api(`/markers?q=${encodeURIComponent(term)}&limit=8`, { signal: controller.signal })
        .then((d) => {
          setMarkers(d.markers);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, placesOnly]);

  useEffect(() => {
    const onPointerDown = (e) => rootRef.current?.contains(e.target) || setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  async function findPlaces() {
    const term = query.trim();
    if (term.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const d = await api(`/geocode?q=${encodeURIComponent(term)}`);
      setPlaces(d.places);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setOpen(true);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!placesOnly && markers.length) setOpen(true);
    else findPlaces();
  }

  const pickMarker = (m) => {
    setOpen(false);
    onSelectMarker?.(m);
  };
  const pickPlace = (p) => {
    setOpen(false);
    onSelectPlace?.(p);
  };

  const term = query.trim();
  const showMarkers = !placesOnly && term.length >= 2;
  const hasContent = error || places || showMarkers;

  return (
    <div className="fm-search" ref={rootRef} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <form className="fm-search-bar" role="search" onSubmit={submit}>
        <div className="fm-search-field">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => term.length >= 2 && setOpen(true)}
            placeholder={placeholder}
            aria-label={placesOnly ? 'Search for a place' : 'Search flood markers'}
            maxLength={100}
          />
          {!placesOnly && term.length >= 2 && (
            <button type="button" className="fm-where" onClick={findPlaces} title="Find this place on the map">
              Where is this?
            </button>
          )}
        </div>
        <button type="submit" className="fm-search-button" aria-label="Search" disabled={busy}>
          <SearchIcon />
        </button>
      </form>

      {open && hasContent && (
        <div className="fm-search-results">
          {error && <p className="fm-search-empty">{error}</p>}

          {showMarkers && (
            <>
              <h4>Flood markers</h4>
              {markers.length === 0 && <p className="fm-search-empty">No markers match. Try “Where is this?” to find the place.</p>}
              {markers.map((m) => (
                <button key={m.id} type="button" onClick={() => pickMarker(m)}>
                  {m.title}
                  <small>
                    {[
                      m.kind === 'geodetic' ? 'Geodetic' : 'Flood',
                      m.kind === 'geodetic' ? m.designation || m.pid : m.event_name,
                      formatFloodDate(m.flood_date),
                      m.locality,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </button>
              ))}
            </>
          )}

          {places && (
            <>
              <h4>Places</h4>
              {places.length === 0 && <p className="fm-search-empty">No places found.</p>}
              {places.map((p, i) => (
                <button key={i} type="button" onClick={() => pickPlace(p)}>
                  {p.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Moves a Leaflet map to a geocoded place. */
export function flyToPlace(map, place) {
  if (place.bounds?.length === 4) {
    const [south, north, west, east] = place.bounds;
    map.flyToBounds([[south, west], [north, east]], { maxZoom: 16, duration: 0.8 });
  } else {
    map.flyTo([place.latitude, place.longitude], 15, { duration: 0.8 });
  }
}
