import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { initOfflineSync } from './lib/offline';
import LoginPage from './pages/LoginPage';
import ChannelsPage from './pages/ChannelsPage';
import {
  HomePage,
  PipelinePage,
  CalendarPage,
  DashboardPage,
} from './pages/Placeholders';

// Inicializar sincronización offline
initOfflineSync();

// React Query client con defaults sensatos
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min antes de refetch
      gcTime: 1000 * 60 * 10,    // 10 min en caché
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas protegidas con layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<HomePage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Route>

            {/* Ruta de manager (protegida + requiere rol) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireManager>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
            </Route>

            {/* Redirect por defecto */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
