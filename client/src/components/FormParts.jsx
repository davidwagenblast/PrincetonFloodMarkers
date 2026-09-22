import { useEffect, useState } from 'react';
import { toDMS } from '../lib/format.js';
import { readPhotoGps } from '../lib/photo.js';

/** Label that states explicitly whether the field is required or optional. */
export function FieldLabel({ htmlFor, required = false, children }) {
  return (
    <label htmlFor={htmlFor}>
      {children} {required ? <span className="fm-req">Required</span> : <span className="fm-opt">Optional</span>}
    </label>
  );
}

export function RequiredLegend() {
  return (
    <p className="fm-legend">
      Fields marked <span className="fm-req">Required</span> must be filled in. Everything marked <span className="fm-opt">Optional</span>{' '}
      can be left blank, though every detail helps researchers.
    </p>
  );
}

export const FieldError = ({ message }) => (message ? <span className="fm-field-error">{message}</span> : null);

/** State for an optional photo upload, including any GPS geotag found in it. */
export function usePhotoInput() {
  const [photo, setPhoto] = useState(null); // { file, url, gps }
  const [hasRights, setHasRights] = useState(false);
  const url = photo?.url;

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  async function choose(file) {
    if (!file) {
      setPhoto(null);
      return null;
    }
    setPhoto({ file, url: URL.createObjectURL(file), gps: null });
    const gps = await readPhotoGps(file);
    if (gps) setPhoto((p) => (p?.file === file ? { ...p, gps } : p));
    return gps;
  }

  return { photo, hasRights, setHasRights, choose };
}

export function PhotoField({ input, errors, onGeotag, onUseGeotag }) {
  const { photo, hasRights, setHasRights, choose } = input;

  return (
    <>
      <div className="fm-field">
        <FieldLabel htmlFor="photo">Photo</FieldLabel>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const gps = await choose(e.target.files?.[0]);
            if (gps) onGeotag?.(gps);
          }}
        />
        <small>JPEG, PNG or WebP. Photo will be resized, and available photo location metadata will be used to assist in geolocation.</small>
        {photo && <img className="fm-photo-preview" src={photo.url} alt="Selected photo preview" />}
        {photo?.gps && (
          <div className="fm-alert info" style={{ marginTop: 8 }}>
            Photo geotag found: {toDMS(photo.gps.latitude, photo.gps.longitude)}{' '}
            <button type="button" className="fm-button small secondary" onClick={() => onUseGeotag?.(photo.gps)}>
              Use this location
            </button>
          </div>
        )}
        <FieldError message={errors.photo} />
      </div>
      {photo && (
        <div className="fm-field">
          <label className="fm-checkbox" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={hasRights} onChange={(e) => setHasRights(e.target.checked)} />
            <span>
              I took this photo or have permission to share it. <span className="fm-req">Required with a photo</span>
            </span>
          </label>
          <FieldError message={errors.photo_rights} />
        </div>
      )}
    </>
  );
}
