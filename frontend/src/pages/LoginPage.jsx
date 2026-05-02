import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../components/AuthProvider';

const NATURGY_LOGO = 'https://www.naturgy.es/content/dam/naturgy/espana/global/logos/logo_naturgy_home_mobile.svg';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Introduce email y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Watermark: logo Naturgy grande de fondo, muy sutil */}
      <img
        src={NATURGY_LOGO}
        alt=""
        className="absolute -top-4 -right-16 w-72 opacity-[0.04] pointer-events-none -rotate-[10deg]"
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo Naturgy real */}
        <div className="flex justify-center mb-8">
          <img
            src={NATURGY_LOGO}
            alt="Naturgy"
            className="h-10"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* App branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary mb-1">KAMApp</h1>
          <p className="text-text-secondary text-sm">CRM para los mejores KAMs</p>
        </div>

        {/* Formulario */}
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-primary mb-5">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-brand-500/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          ¿No tienes cuenta? Contacta con tu administrador.
        </p>

        {/* Footer con logo Naturgy sutil */}
        <div className="text-center mt-10 pt-6 border-t border-surface-3">
          <p className="text-[9px] text-text-muted uppercase tracking-[0.12em] mb-1.5">Powered by</p>
          <img
            src={NATURGY_LOGO}
            alt="Naturgy"
            className="h-4 mx-auto opacity-35"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>
    </div>
  );
}
