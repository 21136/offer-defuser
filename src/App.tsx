import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { HomePage } from './pages';
import { useThemeClass } from './hooks/useThemeClass';
import { useTestStore } from './stores/testStore';
import type { Persona } from './models/persona';

// Lazy-loaded pages (code-split for better initial load)
const TestPage = lazy(() => import('./pages/TestPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const DefuserPage = lazy(() => import('./pages/DefuserPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <p className="text-gray-400 animate-pulse">加载中...</p>
    </div>
  );
}

function AppShell() {
  // Sync theme to <html> class
  useThemeClass();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load personas on app init (questions are lazy-loaded by TestPage)
    import('./assets/personas.json')
      .then((personasModule) => {
        const loadedPersonas = (personasModule.default || personasModule) as Persona[];
        setPersonas(loadedPersonas);

        // Hydrate test store from localStorage
        const testStore = useTestStore.getState();
        testStore.hydrateFromStorage(loadedPersonas);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data assets:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-gray-400 animate-pulse">Offer拆弹专家 加载中...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage personas={personas} />} />
        <Route
          path="/result"
          element={<ResultPage personas={personas} />}
        />
        <Route
          path="/defuser"
          element={<DefuserPage personas={personas} />}
        />
        <Route
          path="/gallery"
          element={<GalleryPage personas={personas} />}
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Catch-all: redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
