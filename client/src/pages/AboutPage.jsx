import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EmbedBuilder from '../components/EmbedBuilder.jsx';
import { REGION_LABEL, SOURCE_URL } from '../config.js';

// Direct dependencies, by where they run. Keep in step with client/ and server/package.json.
const PACKAGES = [
  {
    group: 'In your browser',
    items: [
      ['React', 'https://react.dev', 'MIT', 'Builds the pages and keeps them up to date as you use them (with React DOM).'],
      ['React Router', 'https://reactrouter.com', 'MIT', 'Moves between the map, Contribute and About pages without reloading.'],
      ['Leaflet', 'https://leafletjs.com', 'BSD-2-Clause', 'Draws the interactive map, pins and controls.'],
      ['exifr', 'https://github.com/MikeKovarik/exifr', 'MIT', 'Reads the location stored in a photo, on your device, to help place a new marker.'],
      ['Poppins (Fontsource)', 'https://fontsource.org/fonts/poppins', 'OFL-1.1', 'The typeface, served from this site rather than a font service.'],
    ],
  },
  {
    group: 'On the server',
    items: [
      ['Node.js', 'https://nodejs.org', 'MIT', 'Runs the server. Its built-in SQLite driver stores the markers, so no database server is needed.'],
      ['Express', 'https://expressjs.com', 'MIT', 'Answers requests for pages, markers and photos.'],
      ['Helmet', 'https://helmetjs.github.io', 'MIT', 'Sets browser security headers, including which sites may embed the map.'],
      ['express-rate-limit', 'https://github.com/express-rate-limit/express-rate-limit', 'MIT', 'Limits how fast one network can submit markers or search places.'],
      ['Multer', 'https://github.com/expressjs/multer', 'MIT', 'Receives uploaded photos.'],
      ['Zod', 'https://zod.dev', 'MIT', 'Checks every submitted marker before it is saved.'],
    ],
  },
  {
    group: 'For building the site',
    items: [
      ['Vite', 'https://vite.dev', 'MIT', 'Bundles the pages for the browser (with @vitejs/plugin-react).'],
      ['concurrently', 'https://github.com/open-cli-tools/concurrently', 'MIT', 'Runs the server and page builder together during development.'],
    ],
  },
];

const SERVICES = [
  [
    'OpenStreetMap',
    'https://www.openstreetmap.org/copyright',
    'Map tiles © OpenStreetMap contributors, available under the Open Database License (ODbL).',
  ],
  [
    'Nominatim',
    'https://nominatim.org',
    'Place search (“Where is this?”), run by the OpenStreetMap Foundation. Searches go through this site’s server, which follows Nominatim’s usage policy.',
  ],
  [
    'NOAA National Geodetic Survey',
    'https://geodesy.noaa.gov/datasheets/',
    'Geodetic markers with a PID link to the official NGS datasheet.',
  ],
];

export default function AboutPage() {
  const { hash } = useLocation();

  // Jump to a section when arriving at a link such as /about#embed.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <main className="fm-page">
      <div className="fm-page-inner fm-about">
        <h1>About</h1>
        <p className="fm-lede">
          FloodMarkerMap is a community map of historical flood markers and geodetic survey marks
          {REGION_LABEL ? ` around ${REGION_LABEL}` : ''}. Anyone can <Link to="/contribute">add a marker</Link>, without an account, so the
          record of how high the water has reached, and the survey marks it is measured against, stays public.
        </p>

        <nav className="fm-about-toc" aria-label="On this page">
          <a href="#open-source">Open source</a>
          <a href="#packages">Packages we use</a>
          <a href="#services">Data &amp; services</a>
          <a href="#embed">Embed the map</a>
        </nav>

        <section id="open-source" className="fm-about-section">
          <h2>Our open-source commitment</h2>
          <ul className="fm-about-list">
            <li>
              <strong>The code is free to use.</strong> FloodMarkerMap is released under the MIT License. You can read, copy, change and run it, including
              for your own town. {SOURCE_URL && <a href={SOURCE_URL}>Get the source code</a>}
              {SOURCE_URL && '.'}
            </li>
            <li>
              <strong>Everything it runs on is open source too.</strong> Every package the site uses is under a license approved by the{' '}
              <a href="https://opensource.org/licenses">Open Source Initiative</a>. Where a popular add-on didn’t meet that bar, we wrote a small
              replacement ourselves (the React bindings for Leaflet).
            </li>
            <li>
              <strong>No tracking.</strong> There are no accounts, cookies, analytics or ads, and fonts are served from this site rather than a third
              party. Photos are resized and stripped of their metadata before they are stored.
            </li>
            <li>
              <strong>Easy to run elsewhere.</strong> One Node.js server and one SQLite file, with settings for another region’s name and starting map
              view.
            </li>
          </ul>
        </section>

        <section id="packages" className="fm-about-section">
          <h2>Packages we use</h2>
          <p className="fm-about-note">
            The main open-source projects behind the site, and the licenses they are shared under. Each one also depends on smaller packages, all
            under open-source licenses.
          </p>
          {PACKAGES.map(({ group, items }) => (
            <div key={group} className="fm-about-group">
              <h3>{group}</h3>
              <ul className="fm-packages">
                {items.map(([name, url, license, purpose]) => (
                  <li key={name}>
                    <div className="fm-package-head">
                      <a href={url}>{name}</a>
                      <span className="fm-license">{license}</span>
                    </div>
                    <p>{purpose}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section id="services" className="fm-about-section">
          <h2>Data &amp; services</h2>
          <ul className="fm-packages">
            {SERVICES.map(([name, url, text]) => (
              <li key={name}>
                <div className="fm-package-head">
                  <a href={url}>{name}</a>
                </div>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="embed" className="fm-about-section">
          <h2>Embed the map</h2>
          <p className="fm-about-note">
            Put the map on your own website, such as a watershed association, library or news story. Visitors can pan, search and click any pin to
            read the marker’s full details without leaving your page.
          </p>
          <EmbedBuilder />
        </section>
      </div>
    </main>
  );
}
