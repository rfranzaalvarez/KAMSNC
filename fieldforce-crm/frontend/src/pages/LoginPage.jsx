import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../components/AuthProvider';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Si ya está autenticado, redirigir
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
      // El redirect lo maneja el Navigate de arriba al cambiar isAuthenticated
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-brand-500 text-2xl">●</span>
            <span className="text-2xl font-extrabold tracking-tight">FieldForce</span>
          </div>
          <p className="text-text-secondary text-sm">CRM para tu equipo comercial</p>
        </div>

        {/* Formulario */}
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
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
                className="w-full px-4 py-3 bg-surface-0 border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
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
                className="w-full px-4 py-3 bg-surface-0 border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
