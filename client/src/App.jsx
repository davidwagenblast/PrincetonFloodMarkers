import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import MapPage from './pages/MapPage.jsx';
import ContributePage from './pages/ContributePage.jsx';
import EmbedPage from './pages/EmbedPage.jsx';
import SharePage from './pages/SharePage.jsx';

export default function App() {
  // The embeddable map is shown inside other sites, so it has no site header.
  const embedded = /^\/embed\/?$/.test(useLocation().pathname);

  return (
    <>
      {!embedded && <Header />}
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/embed" element={<EmbedPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route
          path="*"
          element={
            <main className="fm-page">
              <div className="fm-page-narrow">
                <h1>Page not found</h1>
                <Link to="/">Back to the map</Link>
              </div>
            </main>
          }
        />
      </Routes>
    </>
  );
}
