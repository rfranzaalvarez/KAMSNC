import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { initOfflineSync } from './lib/offline';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ChannelsPage from './pages/ChannelsPage';
import PipelinePage from './pages/PipelinePage';
import DashboardPage from './pages/DashboardPage';

initOfflineSync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
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
            <Route path="/login" element={<LoginPage />} />
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
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function CalendarPage() {
  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Agenda</h1>
      <p className="text-sm text-text-secondary">Calendario de visitas — próxima fase</p>
    </div>
  );
}
