import { Link, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import MapPage from './pages/MapPage.jsx';
import ContributePage from './pages/ContributePage.jsx';

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/contribute" element={<ContributePage />} />
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
