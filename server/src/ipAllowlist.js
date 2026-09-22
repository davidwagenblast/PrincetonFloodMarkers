// Optional IP allowlist. With IP_ALLOWLIST=on, only clients whose address is in one of the
// ranges listed in ip-allowlist.txt (repo root, or IP_ALLOWLIST_FILE) can reach any part of
// the site: pages, API and photos. Anything else, including unset, leaves the site open.
import { BlockList, isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ip-allowlist.txt');

/** Parses "1.2.3.0/24" or "1.2.3.4" lines (with # comments) into a BlockList. Throws on bad lines. */
export function parseAllowlist(text) {
  const list = new BlockList();
  let count = 0;
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const entry = raw.replace(/#.*/, '').trim();
    if (!entry) continue;
    const [address, bits, extra] = entry.split('/');
    const type = isIP(address) === 6 ? 'ipv6' : isIP(address) === 4 ? 'ipv4' : null;
    const max = type === 'ipv6' ? 128 : 32;
    const prefix = bits === undefined ? max : Number(bits);
    if (!type || extra !== undefined || !/^\d+$/.test(bits ?? String(max)) || prefix > max) {
      throw new Error(`ip-allowlist.txt line ${i + 1}: "${entry}" is not a valid address or CIDR range.`);
    }
    list.addSubnet(address, prefix, type);
    count += 1;
  }
  return { list, count };
}

/** True if `ip` (as Express reports it, possibly IPv4-mapped IPv6) is in the list. */
export function isAllowed(list, ip) {
  if (!ip) return false;
  const v4 = ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  const type = isIP(v4);
  return type !== 0 && list.check(v4, type === 6 ? 'ipv6' : 'ipv4');
}

const BLOCKED_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Access restricted</title>
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#222">
<h1>Access restricted</h1><p>This site is currently only available from approved networks.</p></body></html>`;

/** Express middleware, or null when the allowlist is switched off. Fails closed on a missing or empty list. */
export function ipAllowlist() {
  if (process.env.IP_ALLOWLIST !== 'on') return null;

  const file = process.env.IP_ALLOWLIST_FILE ?? DEFAULT_FILE;
  const { list, count } = parseAllowlist(readFileSync(file, 'utf8'));
  if (count === 0) throw new Error(`IP_ALLOWLIST=on but ${file} lists no ranges; refusing to start.`);
  console.log(`IP allowlist on: ${count} range(s) from ${file}`);
  if (!process.env.TRUST_PROXY) {
    console.warn('IP allowlist: TRUST_PROXY is not set. Behind a reverse proxy every visitor will appear as the proxy and be blocked.');
  }

  return (req, res, next) => {
    if (isAllowed(list, req.ip)) return next();
    res.status(403);
    if (req.path.startsWith('/api/')) return res.json({ error: 'Access restricted.' });
    res.type('html').send(BLOCKED_PAGE);
  };
}
