// Minimal React bindings for Leaflet, covering only what this app needs.
// Written in-house so every dependency stays under an OSI-approved license.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';

const MapContext = createContext(null);

export function useLeafletMap() {
  const map = useContext(MapContext);
  if (!map) throw new Error('useLeafletMap must be used inside <LeafletMap>');
  return map;
}

/** Keeps a ref pointing at the latest value, so Leaflet listeners never go stale. */
function useLatest(value) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Creates a Leaflet map. Options are read once on mount, like Leaflet itself.
 * onReady(map) is called with the map instance (and with null on unmount).
 */
export function LeafletMap({ center, zoom, zoomControl = true, worldCopyJump = false, onReady, children }) {
  const containerRef = useRef(null);
  const [map, setMap] = useState(null);
  const initial = useRef({ center, zoom, zoomControl, worldCopyJump });
  const onReadyRef = useLatest(onReady);

  useEffect(() => {
    const instance = L.map(containerRef.current, initial.current);
    setMap(instance);
    onReadyRef.current?.(instance);
    return () => {
      onReadyRef.current?.(null);
      setMap(null);
      instance.remove();
    };
  }, [onReadyRef]);

  return (
    <>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {map && <MapContext.Provider value={map}>{children}</MapContext.Provider>}
    </>
  );
}

/** Subscribes to a map event for the lifetime of the component. */
export function useMapEvent(type, handler) {
  const map = useLeafletMap();
  const handlerRef = useLatest(handler);
  useEffect(() => {
    const listener = (e) => handlerRef.current(e);
    map.on(type, listener);
    return () => map.off(type, listener);
  }, [map, type, handlerRef]);
}

/** Adds a Leaflet layer or control created by `create` while mounted. */
function useMapObject(create) {
  const map = useLeafletMap();
  const createRef = useLatest(create);
  useEffect(() => {
    const object = createRef.current().addTo(map);
    return () => object.remove();
  }, [map, createRef]);
}

export function TileLayer({ url, attribution }) {
  useMapObject(() => L.tileLayer(url, { attribution, maxZoom: 19 }));
  return null;
}

export function ScaleControl({ position = 'bottomleft' }) {
  useMapObject(() => L.control.scale({ position }));
  return null;
}

export function ZoomControl({ position = 'topleft' }) {
  useMapObject(() => L.control.zoom({ position }));
  return null;
}

/** Replaces Leaflet's default attribution prefix. */
export function AttributionPrefix({ html }) {
  const map = useLeafletMap();
  useEffect(() => {
    map.attributionControl?.setPrefix(html);
  }, [map, html]);
  return null;
}

/**
 * A map marker. `children`, if given, are rendered into the marker's popup via a portal,
 * so popup content is ordinary React (with context, state and escaping).
 */
export function Marker({ position, icon, title, zIndexOffset = 0, draggable = false, eventHandlers, markerRef, popupOptions, children }) {
  const map = useLeafletMap();
  const [lat, lng] = position;
  const [marker] = useState(() => L.marker([lat, lng], { icon, title, draggable }));
  const [popupNode] = useState(() => document.createElement('div'));
  const handlersRef = useLatest(eventHandlers ?? {});
  const markerRefRef = useLatest(markerRef);
  const eventTypes = Object.keys(eventHandlers ?? {}).sort().join(' ');
  const hasPopup = Boolean(children);
  const popupOptionsRef = useLatest(popupOptions);

  useEffect(() => {
    marker.addTo(map);
    markerRefRef.current?.(marker);
    return () => {
      markerRefRef.current?.(null);
      marker.remove();
    };
  }, [map, marker, markerRefRef]);

  useEffect(() => {
    marker.setLatLng([lat, lng]);
  }, [marker, lat, lng]);

  useEffect(() => {
    if (icon) marker.setIcon(icon);
  }, [marker, icon]);

  useEffect(() => {
    marker.setZIndexOffset(zIndexOffset);
  }, [marker, zIndexOffset]);

  useEffect(() => {
    if (!eventTypes) return;
    const listeners = eventTypes.split(' ').map((type) => [type, (e) => handlersRef.current[type]?.(e)]);
    listeners.forEach(([type, fn]) => marker.on(type, fn));
    return () => listeners.forEach(([type, fn]) => marker.off(type, fn));
  }, [marker, eventTypes, handlersRef]);

  useEffect(() => {
    if (!hasPopup) return;
    marker.bindPopup(L.popup(popupOptionsRef.current).setContent(popupNode));
    return () => marker.unbindPopup();
  }, [marker, hasPopup, popupNode, popupOptionsRef]);

  return hasPopup ? createPortal(children, popupNode) : null;
}
