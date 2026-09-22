export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details ?? {};
  }
}

/** Fetch wrapper for our API. Sends the header the server's CSRF guard requires. */
export async function api(path, { method = 'GET', json, form, signal } = {}) {
  const headers = { 'X-Requested-With': 'FloodMarkerMap' };
  let body;
  if (form) {
    body = form;
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const res = await fetch(`${import.meta.env.BASE_URL}api${path}`, { method, headers, body, signal, credentials: 'same-origin' });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  // A cancelled request can fail while the body is being read; report it as a cancel, not a bad response.
  signal?.throwIfAborted();
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
  if (data === null && res.status !== 204) throw new ApiError(res.status, 'Unexpected response from server.');
  return data;
}
