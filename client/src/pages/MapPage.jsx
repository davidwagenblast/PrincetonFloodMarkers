import { useSearchParams } from 'react-router-dom';
import MarkerMap from '../components/MarkerMap.jsx';

const KINDS = ['flood', 'geodetic', 'both'];

export default function MapPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type');

  const setType = (kind) =>
    setParams(
      (p) => {
        if (kind === 'both') p.delete('type');
        else p.set('type', kind);
        return p;
      },
      { replace: true }
    );

  // Optional initial view: /?lat=40.3&lng=-74.6&zoom=14
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const zoom = Number(params.get('zoom'));
  const hasView = params.has('lat') && params.has('lng') && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  return (
    <main className="fm-map-page">
      <MarkerMap
        {...(hasView ? { center: [lat, lng] } : {})}
        {...(zoom >= 1 && zoom <= 19 ? { zoom } : {})}
        initialKind={KINDS.includes(type) ? type : 'both'}
        onKindChange={setType}
        focusId={params.get('marker')}
      />
    </main>
  );
}
