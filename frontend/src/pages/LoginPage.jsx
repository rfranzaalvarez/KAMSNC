import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import storeImage from '../assets/naturgy-store.png';

const NATURGY_LOGO = 'https://www.naturgy.es/content/dam/naturgy/espana/global/logos/logo_naturgy_home_mobile.svg';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Introduce email y contraseña'); return; }
    setLoading(true);
    setError('');
    try { await signIn(email, password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!email) { setError('Introduce tu email para recuperar la contraseña'); return; }
    setResetLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(err.message || 'Error al enviar el email de recuperación');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — foto tienda Naturgy (solo desktop) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src={storeImage}
          alt="Tienda Naturgy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay sutil para dar profundidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />

        {/* Logo Naturgy blanco arriba */}
        <div className="absolute top-6 left-6 z-10">
          <img src={NATURGY_LOGO} alt="Naturgy"
            className="h-8 brightness-0 invert opacity-90 drop-shadow-lg"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>

        {/* Footer */}
        <div className="absolute bottom-5 left-6 z-10 text-[10px] text-white/70 drop-shadow-md">
          © {new Date().getFullYear()} Naturgy · KAMApp
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">

        {/* Foto como fondo en móvil */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src={storeImage}
            alt="Tienda Naturgy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-white" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 35%, rgba(255,255,255,0.92) 55%, rgba(255,255,255,1) 68%)' }} />
        </div>

        {/* Logo Naturgy arriba en móvil */}
        <div className="absolute top-4 left-4 z-10 lg:hidden">
          <img src={NATURGY_LOGO} alt="Naturgy"
            className="h-6 brightness-0 invert opacity-90 drop-shadow-lg"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>

        <div className="w-full max-w-sm relative z-10 lg:mt-0 mt-auto mb-6 lg:mb-0">

          {/* Logo y título desktop */}
          <div className="text-center mb-8 hidden lg:block">
            <img src={NATURGY_LOGO} alt="Naturgy" className="h-10 mx-auto mb-4"
              onError={(e) => { e.target.style.display = 'none'; }} />
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary mb-1">KAMApp</h1>
            <p className="text-text-secondary text-sm">CRM para los mejores KAMs</p>
          </div>

          {/* Título móvil */}
          <div className="text-center mb-5 lg:hidden">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary mb-1">KAMApp</h1>
            <p className="text-text-secondary text-xs">CRM para los mejores KAMs</p>
          </div>

          {/* Formulario */}
          <div className="bg-white/[0.97] lg:bg-surface-1 border border-surface-3 rounded-2xl p-6 shadow-sm backdrop-blur-sm lg:backdrop-blur-none">
            {resetMode ? (
              <>
                <h2 className="text-lg font-bold text-text-primary mb-2">Recuperar contraseña</h2>
                {resetSent ? (
                  <div className="py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl">✉️</span>
                    </div>
                    <p className="text-sm text-text-primary text-center font-semibold mb-1">Email enviado</p>
                    <p className="text-xs text-text-secondary text-center mb-4">
                      Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones.
                    </p>
                    <button onClick={() => { setResetMode(false); setResetSent(false); }}
                      className="w-full py-3 border border-surface-3 text-text-secondary font-semibold rounded-xl text-sm hover:bg-surface-2 transition-colors">
                      Volver al login
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-text-secondary mb-4">Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
                    {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">{error}</div>}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@empresa.com" autoComplete="email"
                          className="w-full px-4 py-3 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" />
                      </div>
                      <button onClick={handleResetPassword} disabled={resetLoading}
                        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        {resetLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</> : 'Enviar enlace de recuperación'}
                      </button>
                      <button onClick={() => { setResetMode(false); setError(''); }}
                        className="w-full py-2 text-text-secondary text-sm font-semibold hover:text-text-primary transition-colors">← Volver al login</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-text-primary mb-5">Iniciar sesión</h2>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">{error}</div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com" autoComplete="email"
                      className="w-full px-4 py-3 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Contraseña</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                        className="w-full px-4 py-3 pr-12 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { setResetMode(true); setError(''); }}
                      className="text-xs text-brand-500 font-semibold hover:text-brand-600 transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <button onClick={handleSubmit} disabled={loading}
                    className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-brand-500/20">
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entrando...</> : 'Entrar'}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-text-muted text-xs mt-6">¿No tienes cuenta? Contacta con tu administrador.</p>

          <div className="text-center mt-8 pt-5 border-t border-surface-3">
            <p className="text-[9px] text-text-muted uppercase tracking-[0.12em] mb-1.5">Powered by</p>
            <img src={NATURGY_LOGO} alt="Naturgy" className="h-4 mx-auto opacity-35"
              onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </div>
      </div>
    </div>
  );
}
