export const toNumber = (v) => (v === '' || v == null ? NaN : Number(v));

export const isValidLatLng = (lat, lng) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
