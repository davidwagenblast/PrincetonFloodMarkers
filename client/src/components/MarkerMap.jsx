import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { ATTRIBUTION_PREFIX, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '../config.js';
import { AttributionPrefix, LeafletMap, Marker, ScaleControl, TileLayer, ZoomControl } from '../lib/leaflet.jsx';
import { pinFor } from '../lib/pins.js';
import KindToggle from './KindToggle.jsx';
import MarkerPopup from './MarkerPopup.jsx';
import SearchBox, { flyToPlace } from './SearchBox.jsx';

const wrapLng = (x) => (x < -180 || x > 180 ? ((((x + 180) % 360) + 360) % 360) - 180 : x);

function boundsParam(map) {
  // Padded so markers just off-screen are already loaded when panning.
  const b = map.getBounds().pad(0.25);
  const south = Math.max(-90, b.getSouth());
  const north = Math.min(90, b.getNorth());
  const [west, east] = b.getEast() - b.getWest() >= 360 ? [-180, 180] : [wrapLng(b.getWest()), wrapLng(b.getEast())];
  return [west, south, east, north].map((v) => v.toFixed(5)).join(',');
}

/**
 * The public marker map: search, Flood/Geodetic toggle, and marker popups.
 * With onSelect, markers have no popups: clicking one calls onSelect(marker) instead, and
 * selectedId highlights it (used by the embed, which shows details in its own panel).
 * renderControls({ search, toggle }) lets the caller lay out the search box and toggle.
 */
export default function MarkerMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  initialKind = 'both',
  focusId = null,
  onMap,
  onKindChange,
  onSelect,
  selectedId = null,
  showSearch = true,
  renderControls,
  className = '',
}) {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [kind, setKind] = useState(initialKind);
  const [loadError, setLoadError] = useState(null);
  const markerRefs = useRef(new Map());
  const openMarkerId = useRef(null);
  if (onSelect) openMarkerId.current = selectedId;

  const ready = (instance) => {
    setMap(instance);
    onMap?.(instance);
  };

  const changeKind = (next) => {
    setKind(next);
    onKindChange?.(next);
  };

  // Load markers inside the visible area whenever the map stops moving or the kind changes.
  useEffect(() => {
    if (!map) return;
    let controller;
    const load = () => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      const kindParam = kind === 'both' ? '' : `&kind=${kind}`;
      api(`/markers?bbox=${boundsParam(map)}${kindParam}`, { signal })
        .then((d) => {
          // Never drop the marker whose popup is open, even if it left the loaded area.
          setMarkers((prev) => {
            const open = prev.find((m) => m.id === openMarkerId.current);
            return open && !d.markers.some((m) => m.id === open.id) ? [...d.markers, open] : d.markers;
          });
          setLoadError(null);
        })
        .catch((err) => {
          // Only report real trouble: the server failing (5xx) or being unreachable (no status).
          // Cancelled requests and an empty area are not errors.
          if (signal.aborted || err.name === 'AbortError') return;
          if (err.status === undefined || err.status >= 500) setLoadError('Could not load markers.');
        });
    };
    load();
    map.on('moveend', load);
    return () => {
      map.off('moveend', load);
      controller?.abort();
    };
  }, [map, kind]);

  const focusMarker = useCallback(
    (m) => {
      if (!map) return;
      setMarkers((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      map.once('moveend', () => (onSelect ? onSelect(m) : markerRefs.current.get(m.id)?.openPopup()));
      map.flyTo([m.latitude, m.longitude], Math.max(map.getZoom(), 16), { duration: 0.8 });
    },
    [map, onSelect]
  );

  useEffect(() => {
    if (!map || !focusId) return;
    api(`/markers/${encodeURIComponent(focusId)}`)
      .then((d) => focusMarker(d.marker))
      .catch(() => {});
  }, [map, focusId, focusMarker]);

  const search = showSearch && <SearchBox onSelectMarker={focusMarker} onSelectPlace={(p) => map && flyToPlace(map, p)} />;
  const toggle = <KindToggle value={kind} onChange={changeKind} />;

  return (
    <div className={`fm-marker-map ${className}`}>
      <LeafletMap onReady={ready} center={center} zoom={zoom} zoomControl={false} worldCopyJump>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <AttributionPrefix html={ATTRIBUTION_PREFIX} />
        <ScaleControl position="bottomleft" />
        <ZoomControl position="bottomright" />
        {markers.map((m) =>
          onSelect ? (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              icon={pinFor(m.kind, m.id === selectedId)}
              zIndexOffset={m.id === selectedId ? 1000 : 0}
              title={m.title}
              eventHandlers={{ click: () => onSelect(m) }}
            />
          ) : (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              icon={pinFor(m.kind)}
              title={m.title}
              eventHandlers={{
                popupopen: () => (openMarkerId.current = m.id),
                popupclose: () => openMarkerId.current === m.id && (openMarkerId.current = null),
              }}
              markerRef={(ref) => (ref ? markerRefs.current.set(m.id, ref) : markerRefs.current.delete(m.id))}
              popupOptions={{
                className: 'fm-leaflet-popup',
                minWidth: 250,
                maxWidth: 250,
                maxHeight: Math.max(220, window.innerHeight - 220),
                autoPanPaddingTopLeft: [20, 150],
              }}
            >
              <MarkerPopup marker={m} />
            </Marker>
          )
        )}
      </LeafletMap>

      {renderControls ? (
        renderControls({ search, toggle })
      ) : (
        <>
          {search}
          {toggle}
        </>
      )}
      {loadError && <div className="fm-alert error fm-map-error">{loadError}</div>}
    </div>
  );
}
