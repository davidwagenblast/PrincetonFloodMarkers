// URL path the site is served under (BASE_PATH), e.g. "/PFlood/". Defaults to the domain root.
export const BASE_PATH = `/${(process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

/**
 * Accepts requests with or without the BASE_PATH prefix, so it works whether the front web server
 * passes "/PFlood/api/..." through unchanged or strips it to "/api/...". "/PFlood" redirects to "/PFlood/".
 */
export function stripBasePath(req, res, next) {
  if (BASE_PATH === '/') return next();
  if (req.url === BASE_PATH.slice(0, -1) || req.url.startsWith(`${BASE_PATH.slice(0, -1)}?`)) {
    return res.redirect(301, BASE_PATH + req.url.slice(BASE_PATH.length - 1));
  }
  if (req.url.startsWith(BASE_PATH)) req.url = req.url.slice(BASE_PATH.length - 1);
  next();
}
