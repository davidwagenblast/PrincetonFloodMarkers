import L from 'leaflet';

const PIN_PATH = 'M12 0C5.37 0 0 5.37 0 12c0 9 12 22 12 22s12-13 12-22C24 5.37 18.63 0 12 0z';

// Flood markers: black pin with a ring (as in the design mockup).
export const floodPinSvg = (fill = '#111') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" width="28" height="40" aria-hidden="true">
  <path d="${PIN_PATH}" fill="${fill}"/>
  <circle cx="12" cy="12" r="6" fill="#fff"/>
  <circle cx="12" cy="12" r="3" fill="${fill}"/>
</svg>`;

// Geodetic markers: green pin with the triangle used for survey control points on maps.
export const geodeticPinSvg = (fill = '#17624f') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" width="28" height="40" aria-hidden="true">
  <path d="${PIN_PATH}" fill="${fill}"/>
  <circle cx="12" cy="12" r="7" fill="#fff"/>
  <path d="M12 7.2l4.6 8H7.4z" fill="${fill}"/>
  <circle cx="12" cy="12.6" r="1.1" fill="#fff"/>
</svg>`;

const makePin = (html, className = 'fm-pin') =>
  L.divIcon({
    className,
    html,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -38],
  });

export const markerPin = makePin(floodPinSvg());
export const geodeticPin = makePin(geodeticPinSvg());
export const draftPin = makePin(floodPinSvg('#3f63e0'));

// Enlarged and outlined, for the marker whose details are open in the embed panel.
const selectedMarkerPin = makePin(floodPinSvg(), 'fm-pin fm-pin-selected');
const selectedGeodeticPin = makePin(geodeticPinSvg(), 'fm-pin fm-pin-selected');

export const pinFor = (kind, selected = false) =>
  kind === 'geodetic' ? (selected ? selectedGeodeticPin : geodeticPin) : selected ? selectedMarkerPin : markerPin;
