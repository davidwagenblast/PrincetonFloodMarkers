import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { CONDITIONS, FLOOD_TYPES, LOCATION_SOURCES, MARKER_TYPES, MONUMENT_TYPES, SETTINGS } from '../lib/format.js';
import { floodPinSvg, geodeticPinSvg } from '../lib/pins.js';
import { isValidLatLng, toNumber } from '../lib/geo.js';
import { prepareUpload } from '../lib/photo.js';
import { FieldError, FieldLabel, PhotoField, RequiredLegend, usePhotoInput } from '../components/FormParts.jsx';
import LocationPicker from '../components/LocationPicker.jsx';

const EMPTY = {
  kind: 'flood',
  designation: '',
  pid: '',
  agency: '',
  monument_type: '',
  setting: '',
  stamping: '',
  year_set: '',
  orthometric_height_m: '',
  horizontal_datum: '',
  title: '',
  marker_type: '',
  inscription: '',
  condition: '',
  notes: '',
  latitude: '',
  longitude: '',
  location_source: 'map',
  location_accuracy_m: '',
  locality: '',
  country: '',
  waterbody: '',
  height_above_ground_m: '',
  ground_elevation_m: '',
  vertical_datum: '',
  flood_date: '',
  event_name: '',
  flood_type: '',
  cause: '',
  source_reference: '',
  contributor_name: '',
};

const options = (labels) => [
  <option key="" value="">
    Select…
  </option>,
  ...Object.entries(labels).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  )),
];

export default function ContributePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [map, setMap] = useState(null);
  const photoInput = usePhotoInput();

  const isGeodetic = form.kind === 'geodetic';
  const lat = toNumber(form.latitude);
  const lng = toNumber(form.longitude);
  const hasLocation = isValidLatLng(lat, lng);
  const floodElevation = toNumber(form.ground_elevation_m) + toNumber(form.height_above_ground_m);

  const field = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    'aria-invalid': errors[name] ? true : undefined,
    className: 'fm-input',
  });

  function setLocation(latitude, longitude, source, { accuracy, fly = false } = {}) {
    setForm((f) => ({
      ...f,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      location_source: source,
      location_accuracy_m: accuracy != null ? String(Math.round(accuracy)) : f.location_accuracy_m,
    }));
    setErrors(({ latitude: _a, longitude: _b, ...rest }) => rest);
    if (fly && map) map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }

  const coordinateField = (name) => ({
    ...field(name),
    type: 'number',
    step: 'any',
    inputMode: 'decimal',
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value, location_source: 'manual' })),
    onBlur: () => hasLocation && map?.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 }),
  });

  async function submit(e) {
    e.preventDefault();
    setFormError(null);
    const clientErrors = {};
    if (form.title.trim().length < 3) clientErrors.title = 'Title is required (at least 3 characters).';
    if (!hasLocation) clientErrors.latitude = 'Location is required: click the map or enter valid coordinates.';
    if (photoInput.photo && !photoInput.hasRights) clientErrors.photo_rights = 'Please confirm you can share this photo.';
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setFormError('Please fill in the required fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value);
      if (photoInput.photo) body.append('photo', await prepareUpload(photoInput.photo.file), 'photo.jpg');
      const { marker } = await api('/markers', { method: 'POST', form: body });
      navigate(`/?marker=${marker.id}`);
    } catch (err) {
      setErrors(err.details ?? {});
      setFormError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fm-page">
      <div className="fm-page-inner">
        <h1>Contribute a marker</h1>
        <p className="fm-lede">
          Record a flood high-water mark or a geodetic survey mark you've found. Only the type, a title and the location are required.
        </p>

        <div className="fm-contribute">
          <form className="fm-card" onSubmit={submit} noValidate>
            <RequiredLegend />
            {formError && <div className="fm-alert error">{formError}</div>}

            <fieldset className="fm-section">
              <legend>
                What are you reporting? <span className="fm-req">Required</span>
              </legend>
              <div className="fm-kind-choice" role="radiogroup">
                {[
                  ['flood', 'Flood marker', 'A plaque, line or mark showing how high past floodwater rose.', floodPinSvg()],
                  ['geodetic', 'Geodetic marker', 'A survey benchmark, triangulation station, or other control point.', geodeticPinSvg()],
                ].map(([value, label, description, svg]) => (
                  <label key={value} className={`fm-kind-card${form.kind === value ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="kind"
                      value={value}
                      checked={form.kind === value}
                      onChange={() => setForm((f) => ({ ...f, kind: value }))}
                    />
                    <span className="fm-kind-icon" dangerouslySetInnerHTML={{ __html: svg }} aria-hidden="true" />
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="fm-section">
              <legend>The marker</legend>
              <div className="fm-field">
                <FieldLabel htmlFor="title" required>
                  Title
                </FieldLabel>
                <input
                  {...field('title')}
                  maxLength={120}
                  placeholder={isGeodetic ? 'e.g. Princeton Junction benchmark' : "e.g. River's Edge Trail Ida Marker"}
                  required
                  aria-required="true"
                />
                <FieldError message={errors.title} />
              </div>
              <div className="fm-row">
                {!isGeodetic && (
                  <div className="fm-field">
                    <FieldLabel htmlFor="marker_type">Marker type</FieldLabel>
                    <select {...field('marker_type')}>{options(MARKER_TYPES)}</select>
                    <FieldError message={errors.marker_type} />
                  </div>
                )}
                <div className="fm-field">
                  <FieldLabel htmlFor="condition">Condition</FieldLabel>
                  <select {...field('condition')}>{options(CONDITIONS)}</select>
                  <FieldError message={errors.condition} />
                </div>
              </div>
              {!isGeodetic && (
                <div className="fm-field">
                  <FieldLabel htmlFor="inscription">Inscription</FieldLabel>
                  <input {...field('inscription')} maxLength={500} placeholder="Text written on the marker, if any" />
                  <FieldError message={errors.inscription} />
                </div>
              )}
              <PhotoField
                input={photoInput}
                errors={errors}
                onGeotag={(gps) => !hasLocation && setLocation(gps.latitude, gps.longitude, 'geotag', { fly: true })}
                onUseGeotag={(gps) => setLocation(gps.latitude, gps.longitude, 'geotag', { fly: true })}
              />
            </fieldset>

            <fieldset className="fm-section">
              <legend>Location</legend>
              <p className="fm-hint" style={{ marginTop: 0 }}>
                Click the map, drag the pin, use a photo geotag, or type coordinates (decimal degrees, WGS84).
              </p>
              <div className="fm-row">
                <div className="fm-field">
                  <FieldLabel htmlFor="latitude" required>
                    Latitude
                  </FieldLabel>
                  <input {...coordinateField('latitude')} min={-90} max={90} placeholder="40.326744" aria-required="true" />
                  <FieldError message={errors.latitude} />
                </div>
                <div className="fm-field">
                  <FieldLabel htmlFor="longitude" required>
                    Longitude
                  </FieldLabel>
                  <input {...coordinateField('longitude')} min={-180} max={180} placeholder="-74.659364" aria-required="true" />
                  <FieldError message={errors.longitude} />
                </div>
              </div>
              <div className="fm-row">
                <div className="fm-field">
                  <FieldLabel htmlFor="location_source" required>
                    Location source
                  </FieldLabel>
                  <select {...field('location_source')} aria-required="true">
                    {Object.entries(LOCATION_SOURCES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <small>Filled in automatically based on how you set the location.</small>
                </div>
                <div className="fm-field">
                  <FieldLabel htmlFor="location_accuracy_m">Accuracy (± metres)</FieldLabel>
                  <input {...field('location_accuracy_m')} type="number" min={0} step="any" placeholder="e.g. 10" />
                  <FieldError message={errors.location_accuracy_m} />
                </div>
              </div>
              <div className="fm-row">
                <div className="fm-field">
                  <FieldLabel htmlFor="locality">Town / city</FieldLabel>
                  <input {...field('locality')} maxLength={120} />
                </div>
                <div className="fm-field">
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <input {...field('country')} maxLength={80} />
                </div>
              </div>
              {!isGeodetic && (
                <div className="fm-field">
                  <FieldLabel htmlFor="waterbody">River, lake or coast</FieldLabel>
                  <input {...field('waterbody')} maxLength={120} placeholder="e.g. Stony Brook" />
                  <FieldError message={errors.waterbody} />
                </div>
              )}
            </fieldset>

            {isGeodetic && (
              <>
                <fieldset className="fm-section">
                  <legend>Survey mark</legend>
                  <div className="fm-row">
                    <div className="fm-field">
                      <FieldLabel htmlFor="designation">Designation</FieldLabel>
                      <input {...field('designation')} maxLength={120} placeholder="e.g. PRINCETON RM 2" />
                      <small>The station name, often stamped on the disk.</small>
                      <FieldError message={errors.designation} />
                    </div>
                    <div className="fm-field">
                      <FieldLabel htmlFor="pid">PID / station ID</FieldLabel>
                      <input {...field('pid')} maxLength={40} placeholder="e.g. KV1234" />
                      <small>US NGS PIDs link to the official datasheet.</small>
                      <FieldError message={errors.pid} />
                    </div>
                  </div>
                  <div className="fm-row">
                    <div className="fm-field">
                      <FieldLabel htmlFor="monument_type">Monument type</FieldLabel>
                      <select {...field('monument_type')}>{options(MONUMENT_TYPES)}</select>
                      <FieldError message={errors.monument_type} />
                    </div>
                    <div className="fm-field">
                      <FieldLabel htmlFor="setting">Setting</FieldLabel>
                      <select {...field('setting')}>{options(SETTINGS)}</select>
                      <FieldError message={errors.setting} />
                    </div>
                  </div>
                  <div className="fm-field">
                    <FieldLabel htmlFor="stamping">Stamping</FieldLabel>
                    <input {...field('stamping')} maxLength={300} placeholder="Text stamped on the disk, exactly as shown" />
                    <FieldError message={errors.stamping} />
                  </div>
                  <div className="fm-row">
                    <div className="fm-field">
                      <FieldLabel htmlFor="agency">Agency</FieldLabel>
                      <input {...field('agency')} maxLength={120} placeholder="e.g. NGS, USGS, USC&GS, Ordnance Survey" />
                      <FieldError message={errors.agency} />
                    </div>
                    <div className="fm-field">
                      <FieldLabel htmlFor="year_set">Year set</FieldLabel>
                      <input {...field('year_set')} type="number" min={1700} max={new Date().getFullYear()} step={1} placeholder="e.g. 1934" />
                      <FieldError message={errors.year_set} />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="fm-section">
                  <legend>Position & height</legend>
                  <div className="fm-row">
                    <div className="fm-field">
                      <FieldLabel htmlFor="orthometric_height_m">Published elevation (m)</FieldLabel>
                      <input {...field('orthometric_height_m')} type="number" step="any" placeholder="e.g. 31.742" />
                      <small>Orthometric height from the datasheet, if known.</small>
                      <FieldError message={errors.orthometric_height_m} />
                    </div>
                    <div className="fm-field">
                      <FieldLabel htmlFor="vertical_datum">Vertical datum</FieldLabel>
                      <input {...field('vertical_datum')} maxLength={40} placeholder="e.g. NAVD88" />
                      <FieldError message={errors.vertical_datum} />
                    </div>
                  </div>
                  <div className="fm-field">
                    <FieldLabel htmlFor="horizontal_datum">Horizontal datum</FieldLabel>
                    <input {...field('horizontal_datum')} maxLength={40} placeholder="e.g. NAD83(2011)" />
                    <FieldError message={errors.horizontal_datum} />
                  </div>
                </fieldset>
              </>
            )}

            {!isGeodetic && (
            <fieldset className="fm-section">
              <legend>Heights</legend>
              <div className="fm-row">
                <div className="fm-field">
                  <FieldLabel htmlFor="height_above_ground_m">Flood line above ground (m)</FieldLabel>
                  <input {...field('height_above_ground_m')} type="number" step="any" placeholder="3.65" />
                  <FieldError message={errors.height_above_ground_m} />
                </div>
                <div className="fm-field">
                  <FieldLabel htmlFor="ground_elevation_m">Ground above sea level (m)</FieldLabel>
                  <input {...field('ground_elevation_m')} type="number" step="any" placeholder="17" />
                  <FieldError message={errors.ground_elevation_m} />
                </div>
              </div>
              <div className="fm-field">
                <FieldLabel htmlFor="vertical_datum">Vertical datum</FieldLabel>
                <input {...field('vertical_datum')} maxLength={40} placeholder="e.g. NAVD88, EGM96, or unknown" />
                <small>The reference the sea-level height is measured from, if known.</small>
              </div>
              {Number.isFinite(floodElevation) && (
                <div className="fm-computed">
                  Approximate flood height above sea level: <strong>{Number(floodElevation.toFixed(2))}m</strong>
                </div>
              )}
            </fieldset>
            )}

            {!isGeodetic && (
            <fieldset className="fm-section">
              <legend>Flood event</legend>
              <div className="fm-row">
                <div className="fm-field">
                  <FieldLabel htmlFor="flood_date">Flood date</FieldLabel>
                  <input {...field('flood_date')} maxLength={10} placeholder="YYYY-MM-DD" />
                  <small>A year (1927) or month (1927-04) is fine if that's all you know.</small>
                  <FieldError message={errors.flood_date} />
                </div>
                <div className="fm-field">
                  <FieldLabel htmlFor="event_name">Event name</FieldLabel>
                  <input {...field('event_name')} maxLength={120} placeholder="e.g. Hurricane Ida" />
                </div>
              </div>
              <div className="fm-row">
                <div className="fm-field">
                  <FieldLabel htmlFor="flood_type">Flood type</FieldLabel>
                  <select {...field('flood_type')}>{options(FLOOD_TYPES)}</select>
                  <FieldError message={errors.flood_type} />
                </div>
                <div className="fm-field">
                  <FieldLabel htmlFor="cause">Cause</FieldLabel>
                  <input {...field('cause')} maxLength={200} placeholder="e.g. Remnants of hurricane" />
                </div>
              </div>
            </fieldset>
            )}

            <fieldset className="fm-section">
              <legend>Notes & sources</legend>
              <div className="fm-field">
                <FieldLabel htmlFor="notes">Contributor notes</FieldLabel>
                <textarea
                  {...field('notes')}
                  maxLength={2000}
                  placeholder={
                    isGeodetic
                      ? 'How to reach the mark from a known point (a "to reach" description), and anything notable.'
                      : 'Where exactly the marker is, how to find it, anything notable.'
                  }
                />
                <FieldError message={errors.notes} />
              </div>
              <div className="fm-field">
                <FieldLabel htmlFor="source_reference">Source / reference</FieldLabel>
                <input
                  {...field('source_reference')}
                  maxLength={500}
                  placeholder={isGeodetic ? 'Link to datasheet or survey record' : 'Link or citation (news report, USGS, archive…)'}
                />
                <FieldError message={errors.source_reference} />
              </div>
              <div className="fm-field">
                <FieldLabel htmlFor="contributor_name">Your name</FieldLabel>
                <input {...field('contributor_name')} maxLength={60} placeholder="Shown on the marker; leave blank to stay anonymous" />
                <FieldError message={errors.contributor_name} />
              </div>
            </fieldset>

            <p className="fm-hint">
              New markers and their photos appear on the map straight away and can't be edited afterwards, so please check the details
              before submitting.
            </p>
            <button className="fm-button" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Submit marker'}
            </button>
          </form>

          <LocationPicker
            value={hasLocation ? [lat, lng] : null}
            onPick={(la, ln, source, extra) => setLocation(la, ln, source, extra)}
            onMap={setMap}
            onError={setFormError}
          />
        </div>
      </div>
    </main>
  );
}
