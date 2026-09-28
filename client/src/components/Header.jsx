import { Link, NavLink } from 'react-router-dom';
import { REGION_LABEL } from '../config.js';

export default function Header() {
  return (
    <header className="fm-header">
      <Link to="/" className="fm-logo" aria-label="FloodMarkerMap home">
        {REGION_LABEL && <span className="fm-logo-region">{REGION_LABEL}</span>}
        <span className="fm-logo-name">FloodMarkerMap</span>
      </Link>
      <nav className="fm-nav">
        <NavLink to="/" end>
          Map
        </NavLink>
        <NavLink to="/contribute">Contribute</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
    </header>
  );
}
