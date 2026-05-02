import { NavLink, Outlet } from 'react-router-dom';
import { Home, Building2, BarChart3, CalendarDays } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { useState, useEffect } from 'react';
import { offlineQueue } from '../lib/offline';

const NATURGY_LOGO = 'https://www.naturgy.es/content/dam/naturgy/espana/global/logos/logo_naturgy_home_mobile.svg';

const navItems = [
  { to: '/home', icon: Home, label: 'Mi día' },
  { to: '/channels', icon: Building2, label: 'Canales' },
  { to: '/pipeline', icon: BarChart3, label: 'Pipeline' },
  { to: '/calendar', icon: CalendarDays, label: 'Agenda' },
];

export function AppLayout() {
  const { profile, signOut, isManager } = useAuthContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkPending = async () => {
      const count = await offlineQueue.count();
      setPendingCount(count);
    };
    checkPending();
    const handleSync = () => checkPending();
    window.addEventListener('offline-sync-complete', handleSync);
    return () => window.removeEventListener('offline-sync-complete', handleSync);
  }, []);

  return (
    <div className="app-container">
      {/* Banner offline */}
      {!isOnline && (
        <div className="bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Sin conexión · Los datos se sincronizarán automáticamente
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full">{pendingCount} pendientes</span>
          )}
        </div>
      )}

      {/* Header: Naturgy | KAMApp */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-surface-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img
            src={NATURGY_LOGO}
            alt="Naturgy"
            className="h-[18px] opacity-60"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="w-px h-4 bg-surface-3" />
          <span className="font-bold text-sm text-text-primary tracking-tight">KAMApp</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white">
              {profile?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || '??'}
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-50 bg-white border border-surface-3 rounded-xl shadow-lg py-2 w-48">
                <div className="px-4 py-2 border-b border-surface-3">
                  <div className="text-sm font-semibold text-text-primary">{profile?.full_name}</div>
                  <div className="text-xs text-text-secondary capitalize">{profile?.role}</div>
                </div>
                {isManager && (
                  <NavLink
                    to="/dashboard"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-1 hover:text-text-primary"
                  >
                    📊 Dashboard Manager
                  </NavLink>
                )}
                <button
                  onClick={() => { setShowMenu(false); signOut(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-surface-1"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="app-content px-4 pt-4 pb-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav border-t border-surface-3">
        <div className="flex justify-around py-2 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'text-brand-500'
                    : 'text-text-muted hover:text-text-secondary'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              <span className="text-[10px] font-semibold">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
