import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarkerDetails from '../components/MarkerDetails.jsx';
import MarkerMap from '../components/MarkerMap.jsx';
import { REGION_LABEL } from '../config.js';

const KINDS = ['flood', 'geodetic', 'both'];
const SITE_URL = import.meta.env.BASE_URL;

/** Link to the full site showing the same view (and marker, if one is open). */
function fullSiteUrl(view, kind, markerId) {
  const params = new URLSearchParams();
  if (markerId) params.set('marker', markerId);
  else if (view) {
    params.set('lat', view.lat.toFixed(5));
    params.set('lng', view.lng.toFixed(5));
    params.set('zoom', view.zoom);
  }
  if (kind !== 'both') params.set('type', kind);
  const query = params.toString();
  return query ? `${SITE_URL}?${query}` : SITE_URL;
}

/**
 * The map for embedding in other sites with an <iframe> (see /share for the code).
 * No site header; marker details open in a side panel (or a bottom sheet on narrow embeds)
 * instead of a small popup, so they stay readable inside a frame.
 *
 * Query options: type=flood|geodetic, lat, lng, zoom, marker=<id>, search=0 (hide search).
 */
export default function EmbedPage() {
  const [params] = useSearchParams();
  const type = params.get('type');
  const initialKind = KINDS.includes(type) ? type : 'both';
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const zoom = Number(params.get('zoom'));
  const hasView = params.has('lat') && params.has('lng') && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  const [kind, setKind] = useState(initialKind);
  const [view, setView] = useState(null);
  const [touched, setTouched] = useState(false);
  const panelRef = useRef(null);
  const topRef = useRef(null);

  const select = useCallback((m) => {
    setSelected(m);
    setTouched(true);
  }, []);
  const close = useCallback(() => setSelected(null), []);

  // Don't hijack the host page's scrolling: the mouse wheel zooms only after the map is clicked or focused.
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    const track = () => {
      const c = map.getCenter();
      setView({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    disable();
    track();
    map.on('click focus', enable);
    map.on('moveend', track);
    container.addEventListener('mouseleave', disable);
    return () => {
      map.off('click focus', enable);
      map.off('moveend', track);
      container.removeEventListener('mouseleave', disable);
    };
  }, [map]);

  // Keep the selected marker in sight: not hidden under the controls or the details panel.
  useEffect(() => {
    if (!map || !selected) return;
    const frame = requestAnimationFrame(() => {
      const size = map.getSize();
      const panel = panelRef.current?.getBoundingClientRect();
      const top = (topRef.current?.getBoundingClientRect().bottom ?? 0) + 30;
      const sideways = panel && panel.width < size.x * 0.8;
      const right = sideways ? size.x - panel.left + 20 : 20;
      const bottom = !sideways && panel ? size.y - panel.top + 20 : 20;
      // Only when there is room left to show it; otherwise leave the map where the reader put it.
      if (size.x - right > 60 && size.y - bottom - top > 60) {
        map.panInside([selected.latitude, selected.longitude], { paddingTopLeft: [20, top], paddingBottomRight: [right, bottom] });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [map, selected]);

  return (
    <main className={`fm-embed${selected ? ' has-details' : ''}`}>
      <MarkerMap
        {...(hasView ? { center: [lat, lng] } : {})}
        {...(zoom >= 1 && zoom <= 19 ? { zoom } : {})}
        initialKind={initialKind}
        onKindChange={setKind}
        focusId={params.get('marker')}
        onMap={setMap}
        onSelect={select}
        selectedId={selected?.id ?? null}
        showSearch={params.get('search') !== '0'}
        renderControls={({ search, toggle }) => (
          <div className="fm-embed-top" ref={topRef}>
            <a className="fm-embed-brand" href={fullSiteUrl(view, kind, selected?.id)} target="_blank" rel="noopener" title="Open the full map in a new tab">
              {REGION_LABEL && <span className="fm-logo-region">{REGION_LABEL}</span>}
              <span className="fm-embed-brand-name">
                FloodMarkerMap <span aria-hidden="true">↗</span>
              </span>
            </a>
            {search && <div className="fm-embed-search">{search}</div>}
            {toggle}
          </div>
        )}
      />

      {!touched && !selected && (
        <p className="fm-embed-hint" aria-hidden="true">
          Click a pin to see the marker's details
        </p>
      )}

      {selected && (
        <div className="fm-embed-panel" ref={panelRef}>
          <MarkerDetails marker={selected} onClose={close} fullMapUrl={fullSiteUrl(null, 'both', selected.id)} />
        </div>
      )}
    </main>
  );
}
