import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../components/AuthProvider';

const NATURGY_LOGO = 'https://www.naturgy.es/content/dam/naturgy/espana/global/logos/logo_naturgy_home_mobile.svg';

function OfficeIllustration() {
  return (
    <svg viewBox="0 0 800 900" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="block">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f0f8" />
          <stop offset="100%" stopColor="#d4e4f0" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9bc5e8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7ab0d8" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="warmLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#E87A1E" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8b8a0" />
          <stop offset="100%" stopColor="#b0a090" />
        </linearGradient>
      </defs>

      <rect width="800" height="900" fill="url(#sky)" />

      {/* Edificio */}
      <rect x="100" y="80" width="600" height="620" rx="4" fill="#e0e8f0" />
      <rect x="100" y="80" width="600" height="620" rx="4" fill="url(#glass)" />
      <rect x="100" y="80" width="600" height="8" fill="#8a9ab0" />
      {[160,240,320,400,480,560,640].map((y,i) => <rect key={`h${i}`} x="100" y={y} width="600" height="3" fill="#8a9ab0" opacity="0.5"/>)}
      {[100,250,400,550,700].map((x,i) => <rect key={`v${i}`} x={x} y="80" width="3" fill="#8a9ab0" opacity="0.4" height="620"/>)}

      {/* Ventanas */}
      {[165,245,325,405,485,565].map((y,yi) =>
        [108,258,408,558].map((x,xi) => (
          <g key={`w${yi}${xi}`}>
            <rect x={x} y={y} width="135" height="70" rx="2" fill="#a8cde8" opacity="0.45" />
            <rect x={x} y={y} width="135" height="70" rx="2" fill="#F5A623" opacity="0.06" />
          </g>
        ))
      )}

      {/* Logo Naturgy grande encima de la puerta */}
      <rect x="220" y="520" width="360" height="75" rx="6" fill="white" opacity="0.95"/>
      <rect x="220" y="520" width="360" height="75" rx="6" fill="none" stroke="#ccc" strokeWidth="1" opacity="0.5"/>
      <image href={NATURGY_LOGO} x="260" y="530" width="280" height="55" preserveAspectRatio="xMidYMid meet" />

      {/* Suelo */}
      <rect x="0" y="700" width="800" height="200" fill="url(#floorGrad)"/>
      <rect x="0" y="700" width="800" height="4" fill="#a09080" opacity="0.5"/>

      {/* Entrada */}
      <rect x="280" y="600" width="240" height="100" rx="3" fill="#5a8ab5" opacity="0.6"/>
      <rect x="280" y="600" width="240" height="100" rx="3" fill="url(#warmLight)"/>
      <rect x="395" y="600" width="10" height="100" fill="#8a9ab0" opacity="0.6"/>
      <rect x="275" y="595" width="250" height="8" rx="2" fill="#6a7a8a"/>
      <rect x="240" y="590" width="320" height="10" rx="2" fill="#6a7a8a" opacity="0.7"/>

      {/* Árboles */}
      <rect x="55" y="640" width="12" height="70" rx="3" fill="#6a5a4a"/>
      <circle cx="61" cy="620" r="35" fill="#4a8a5a" opacity="0.7"/>
      <circle cx="45" cy="635" r="25" fill="#3a7a4a" opacity="0.6"/>
      <circle cx="75" cy="630" r="28" fill="#5a9a6a" opacity="0.6"/>
      <rect x="720" y="650" width="12" height="60" rx="3" fill="#6a5a4a"/>
      <circle cx="726" cy="630" r="32" fill="#4a8a5a" opacity="0.7"/>
      <circle cx="710" cy="640" r="22" fill="#3a7a4a" opacity="0.6"/>
      <circle cx="740" cy="638" r="25" fill="#5a9a6a" opacity="0.6"/>

      {/* Personas */}
      <circle cx="200" cy="720" r="8" fill="#4a5568"/>
      <rect x="195" y="728" width="10" height="20" rx="3" fill="#003E6B" opacity="0.8"/>
      <rect x="193" y="748" width="5" height="14" rx="2" fill="#4a5568"/>
      <rect x="202" y="748" width="5" height="14" rx="2" fill="#4a5568"/>
      <circle cx="580" cy="730" r="7" fill="#4a5568"/>
      <rect x="575" y="737" width="10" height="18" rx="3" fill="#E87A1E" opacity="0.7"/>
      <rect x="574" y="755" width="4" height="12" rx="2" fill="#4a5568"/>
      <rect x="582" y="755" width="4" height="12" rx="2" fill="#4a5568"/>
      <circle cx="380" cy="715" r="7" fill="#4a5568"/>
      <rect x="375" y="722" width="10" height="18" rx="3" fill="#5a7a9a" opacity="0.8"/>
      <rect x="374" y="740" width="4" height="12" rx="2" fill="#4a5568"/>
      <rect x="382" y="740" width="4" height="12" rx="2" fill="#4a5568"/>

      {/* Nubes */}
      <ellipse cx="150" cy="50" rx="80" ry="25" fill="white" opacity="0.5"/>
      <ellipse cx="600" cy="35" rx="100" ry="20" fill="white" opacity="0.4"/>
      <ellipse cx="400" cy="60" rx="60" ry="15" fill="white" opacity="0.3"/>

      <rect width="800" height="900" fill="#E87A1E" opacity="0.03"/>
    </svg>
  );
}

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
    if (!email || !password) { setError('Introduce email y contraseña'); return; }
    setLoading(true);
    setError('');
    try { await signIn(email, password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — ilustración oficina (solo desktop) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <OfficeIllustration />
        <div className="absolute top-5 left-5 z-10">
          <img src={NATURGY_LOGO} alt="Naturgy"
            className="h-8 brightness-0 invert opacity-90 drop-shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="absolute bottom-4 left-5 z-10 text-[10px] text-white/50 drop-shadow">
          © {new Date().getFullYear()} Naturgy · KAMApp
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">

        {/* Ilustración como fondo en móvil */}
        <div className="absolute inset-0 lg:hidden">
          <OfficeIllustration />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-white/95" style={{ backdropFilter: 'none' }} />
        </div>

        {/* Logo Naturgy arriba en móvil */}
        <div className="absolute top-4 left-4 z-10 lg:hidden">
          <img src={NATURGY_LOGO} alt="Naturgy"
            className="h-6 brightness-0 invert opacity-90 drop-shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>

        <div className="w-full max-w-sm relative z-10 lg:mt-0 mt-auto mb-6 lg:mb-0">
          {/* Logo y título (visible en desktop, oculto en móvil se muestra más compacto) */}
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
          <div className="bg-surface-1/[0.97] lg:bg-surface-1 border border-surface-3 rounded-2xl p-6 shadow-sm backdrop-blur-sm lg:backdrop-blur-none">
            <h2 className="text-lg font-bold text-text-primary mb-5">Iniciar sesión</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com" autoComplete="email"
                  className="w-full px-4 py-3 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white border border-surface-3 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" />
              </div>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-brand-500/20">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entrando...</>
                ) : 'Entrar'}
              </button>
            </div>
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
