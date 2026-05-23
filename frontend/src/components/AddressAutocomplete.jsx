import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, Edit3 } from 'lucide-react';

/**
 * Autocompletado de direcciones usando Nominatim (OpenStreetMap).
 * Busca calles de España. Si no encuentra, permite entrada manual.
 * 
 * Props:
 * - value: string (dirección actual)
 * - onChange: (address) => void
 * - city: string (ciudad para filtrar)
 * - onCityChange: (city) => void (actualiza la ciudad si la selección la incluye)
 * - placeholder: string
 * - className: string
 */
export default function AddressAutocomplete({ value, onChange, city, onCityChange, placeholder, className }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInputChange(val) {
    setQuery(val);

    if (manualMode) {
      onChange(val);
      return;
    }

    // Debounce la búsqueda
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(val);
    }, 400);
  }

  async function searchAddress(q) {
    setLoading(true);
    try {
      // Usar Nominatim con filtro España
      const searchQuery = city ? `${q}, ${city}, España` : `${q}, España`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}` +
        `&countrycodes=es` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=5` +
        `&accept-language=es`,
        {
          headers: { 'User-Agent': 'CRM-para-KAMs/1.0' },
        }
      );
      const data = await response.json();

      const results = data.map(item => ({
        display: item.display_name.replace(', España', ''),
        road: item.address?.road || item.address?.pedestrian || item.address?.neighbourhood || '',
        house_number: item.address?.house_number || '',
        city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '',
        postcode: item.address?.postcode || '',
        full: item.display_name,
      })).filter(r => r.road); // Solo resultados con calle

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err) {
      console.error('Error buscando dirección:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function selectSuggestion(suggestion) {
    const address = suggestion.house_number
      ? `${suggestion.road}, ${suggestion.house_number}`
      : suggestion.road;
    setQuery(address);
    onChange(address);
    if (suggestion.city && onCityChange) {
      onCityChange(suggestion.city);
    }
    setShowSuggestions(false);
  }

  function toggleManualMode() {
    setManualMode(!manualMode);
    setSuggestions([]);
    setShowSuggestions(false);
    if (!manualMode) {
      // Al pasar a manual, mantener el valor actual
      onChange(query);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0 && !manualMode) setShowSuggestions(true); }}
          placeholder={placeholder || (manualMode ? 'Escribe la dirección manualmente...' : 'Empieza a escribir la calle...')}
          className={className || "w-full px-3 py-2.5 bg-surface-0 border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors"}
        />
        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <button
          type="button"
          onClick={toggleManualMode}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
            manualMode ? 'text-brand-500 bg-brand-50' : 'text-text-muted hover:text-text-secondary'
          }`}
          title={manualMode ? 'Volver a búsqueda automática' : 'Escribir manualmente'}
        >
          {manualMode ? <Search size={13} /> : <Edit3 size={13} />}
        </button>
      </div>

      {manualMode && (
        <p className="text-[9px] text-brand-500 mt-0.5 ml-1">Modo manual · Pulsa 🔍 para volver a la búsqueda</p>
      )}

      {/* Sugerencias */}
      {showSuggestions && !manualMode && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-3 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectSuggestion(s)}
              className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-surface-1 transition-colors border-b border-surface-3 last:border-0"
            >
              <MapPin size={13} className="text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">
                  {s.road}{s.house_number ? `, ${s.house_number}` : ''}
                </div>
                <div className="text-[10px] text-text-muted truncate">
                  {s.city}{s.postcode ? ` · ${s.postcode}` : ''}
                </div>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={toggleManualMode}
            className="w-full px-3 py-2 text-[11px] text-brand-500 font-semibold hover:bg-brand-50 transition-colors text-center"
          >
            ✏️ No encuentro mi calle — escribir manualmente
          </button>
        </div>
      )}
    </div>
  );
}
