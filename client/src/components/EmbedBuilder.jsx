import { useState } from 'react';
import { REGION_LABEL } from '../config.js';

const HEIGHTS = [400, 500, 600, 750];

function embedUrl({ kind, search, markerId }) {
  const params = new URLSearchParams();
  if (kind !== 'both') params.set('type', kind);
  if (!search) params.set('search', '0');
  if (/^\d+$/.test(markerId)) params.set('marker', markerId);
  const query = params.toString();
  return new URL(`${import.meta.env.BASE_URL}embed${query ? `?${query}` : ''}`, window.location.origin).href;
}

/** Builds the <iframe> code for putting the map on another website, with a live preview. */
export default function EmbedBuilder() {
  const [kind, setKind] = useState('both');
  const [search, setSearch] = useState(true);
  const [height, setHeight] = useState(500);
  const [markerId, setMarkerId] = useState('');
  const [copied, setCopied] = useState(false);

  const src = embedUrl({ kind, search, markerId: markerId.trim() });
  const title = `${REGION_LABEL ? `${REGION_LABEL} ` : ''}flood marker map`;
  const code = `<iframe src="${src}" title="${title}" width="100%" height="${height}" style="border:0;border-radius:12px" loading="lazy"></iframe>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fm-share">
      <div className="fm-card">
        <h3>Options</h3>
        <div className="fm-field">
          <label htmlFor="embed-kind">Markers shown at first</label>
          <select id="embed-kind" className="fm-input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="both">Flood and geodetic markers</option>
            <option value="flood">Flood markers only</option>
            <option value="geodetic">Geodetic markers only</option>
          </select>
          <small>Visitors can still switch with the toggle on the map.</small>
        </div>
        <div className="fm-field">
          <label htmlFor="embed-height">Height</label>
          <select id="embed-height" className="fm-input" value={height} onChange={(e) => setHeight(Number(e.target.value))}>
            {HEIGHTS.map((h) => (
              <option key={h} value={h}>
                {h} px
              </option>
            ))}
          </select>
          <small>The map fills the width of the space it is placed in.</small>
        </div>
        <div className="fm-field">
          <label htmlFor="embed-marker">Open a marker (ID)</label>
          <input
            id="embed-marker"
            className="fm-input"
            inputMode="numeric"
            value={markerId}
            onChange={(e) => setMarkerId(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 12"
          />
          <small>Optional. Starts zoomed in on one marker with its details open, e.g. for an article about it.</small>
        </div>
        <label className="fm-checkbox">
          <input type="checkbox" checked={search} onChange={(e) => setSearch(e.target.checked)} />
          <span>Show the search bar</span>
        </label>

        <div className="fm-field">
          <label htmlFor="embed-code">Code to paste into your page</label>
          <textarea id="embed-code" className="fm-input fm-share-code" readOnly value={code} onFocus={(e) => e.target.select()} rows={5} />
        </div>
        <button type="button" className="fm-button" onClick={copy}>
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      <div className="fm-share-preview">
        <h3>Preview</h3>
        <iframe key={src} src={src} title={`Preview: ${title}`} style={{ height }} loading="lazy" />
      </div>
    </div>
  );
}
