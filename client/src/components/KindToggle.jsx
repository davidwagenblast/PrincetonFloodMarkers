import { floodPinSvg, geodeticPinSvg } from '../lib/pins.js';

// value: 'flood' | 'both' | 'geodetic'
const OPTIONS = [
  ['flood', 'Flood', floodPinSvg()],
  ['both', 'Both', null],
  ['geodetic', 'Geodetic', geodeticPinSvg()],
];

const Icon = ({ svg }) => <span className="fm-kind-icon" dangerouslySetInnerHTML={{ __html: svg }} />;

/** Three-position slider choosing which kinds of marker the map shows. */
export default function KindToggle({ value, onChange }) {
  const index = OPTIONS.findIndex(([key]) => key === value);

  return (
    <div className="fm-kind-toggle" role="radiogroup" aria-label="Marker types shown">
      <span className="fm-kind-thumb" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
      {OPTIONS.map(([key, label, svg]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}>
          {svg ? (
            <Icon svg={svg} />
          ) : (
            <span className="fm-kind-icon both" aria-hidden="true">
              <Icon svg={floodPinSvg()} />
              <Icon svg={geodeticPinSvg()} />
            </span>
          )}
          {label}
        </button>
      ))}
    </div>
  );
}
