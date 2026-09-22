import { useState } from 'react';
import { ATTRIBUTION_PREFIX, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '../config.js';
import { toDMS } from '../lib/format.js';
import { AttributionPrefix, LeafletMap, Marker, TileLayer, useMapEvent } from '../lib/leaflet.jsx';
import { draftPin } from '../lib/pins.js';
import SearchBox, { flyToPlace } from './SearchBox.jsx';

function ClickToPick({ onPick }) {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng.wrap();
    onPick(lat, lng);
  });
  return null;
}

/**
 * Map for choosing a location: click, drag the pin, search for a place, or use device GPS.
 * - value: [lat, lng] or null
 * - onPick(lat, lng, source, { accuracy })
 */
export default function LocationPicker({ value, onPick, onMap, onError }) {
  const [map, setMap] = useState(null);
  const [locating, setLocating] = useState(false);

  const ready = (instance) => {
    setMap(instance);
    onMap?.(instance);
  };

  function locateDevice() {
    if (!navigator.geolocation) return onError?.('Your browser does not support location access.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        onPick(latitude, longitude, 'gps', { accuracy });
        map?.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), { duration: 0.8 });
      },
      (err) => {
        setLocating(false);
        onError?.(`Could not get your location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const start = value ?? DEFAULT_CENTER;

  return (
    <aside className="fm-picker" aria-label="Location picker">
      <SearchBox placesOnly placeholder="Jump to a place…" onSelectPlace={(p) => map && flyToPlace(map, p)} />
      <div className="fm-picker-map">
        <LeafletMap onReady={ready} center={start} zoom={value ? 16 : DEFAULT_ZOOM} worldCopyJump>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <AttributionPrefix html={ATTRIBUTION_PREFIX} />
          <ClickToPick onPick={(lat, lng) => onPick(lat, lng, 'map')} />
          {value && (
            <Marker
              position={value}
              icon={draftPin}
              draggable
              title="Your location (drag to adjust)"
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng().wrap();
                  onPick(p.lat, p.lng, 'map');
                },
              }}
            />
          )}
        </LeafletMap>
      </div>
      <div className="fm-picker-footer">
        <span className="fm-hint">{value ? toDMS(value[0], value[1]) : 'No location selected yet'}</span>
        <button type="button" className="fm-button small secondary" onClick={locateDevice} disabled={locating}>
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
      </div>
    </aside>
  );
}
