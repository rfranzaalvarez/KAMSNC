import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, Check, X, AlertCircle,
  Loader2, ArrowRight, Download, Eye
} from 'lucide-react';

const CHANNEL_FIELDS = [
  { key: 'name', label: 'Nombre del canal', required: true },
  { key: 'contact_name', label: 'Persona de contacto', required: false },
  { key: 'phone', label: 'Teléfono', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'address', label: 'Dirección', required: false },
  { key: 'city', label: 'Ciudad', required: false },
  { key: 'postal_code', label: 'Código postal', required: false },
  { key: 'channel_type', label: 'Tipo de canal', required: false },
  { key: 'status', label: 'Estado', required: false },
  { key: 'notes', label: 'Notas', required: false },
];

const TYPE_MAP = {
  'distribuidor': 'distributor', 'distributor': 'distributor',
  'instalador': 'installer', 'installer': 'installer',
  'revendedor': 'reseller', 'reseller': 'reseller',
  'comercializadora': 'commercial', 'commercial': 'commercial',
};

const STATUS_MAP = {
  'prospecto': 'prospect', 'prospect': 'prospect',
  'en desarrollo': 'developing', 'developing': 'developing',
  'activo': 'active', 'active': 'active',
  'inactivo': 'inactive', 'inactive': 'inactive',
};

// ============ EXCEL/CSV PARSER ============
async function parseFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Usar la primera hoja
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convertir a JSON (primera fila = cabeceras)
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (jsonData.length === 0) return { headers: [], rows: [], sheetName };

  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map(row => {
    const cleaned = {};
    headers.forEach(h => {
      cleaned[h] = String(row[h] ?? '').trim();
    });
    return cleaned;
  }).filter(row => Object.values(row).some(v => v));

  return { headers, rows, sheetName, totalSheets: workbook.SheetNames.length, allSheets: workbook.SheetNames };
}

// ============ STEP 1: FILE UPLOAD ============
function FileUploadStep({ onFileParsed }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setLoading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (!['xlsx', 'xls', 'csv', 'tsv', 'txt'].includes(ext)) {
        setError('Formato no soportado. Usa Excel (.xlsx) o CSV.');
        setLoading(false);
        return;
      }

      const result = await parseFile(file);

      if (result.rows.length === 0) {
        setError('El archivo no contiene datos. Asegúrate de que la primera fila tiene las cabeceras.');
        setLoading(false);
        return;
      }

      onFileParsed({ fileName: file.name, ...result });
    } catch (err) {
      console.error('Error leyendo archivo:', err);
      setError('Error al leer el archivo. Asegúrate de que es un Excel válido.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const downloadTemplate = () => {
    const data = [
      { Nombre: 'Distribuciones García', Contacto: 'Antonio García', Teléfono: '+34 612 345 678', Email: 'antonio@garcia.es', Dirección: 'C/ Gran Vía 42', Ciudad: 'Madrid', Tipo: 'Distribuidor', Estado: 'Activo', Notas: 'Cliente desde 2020' },
      { Nombre: 'Electro Norte S.L.', Contacto: 'Laura Martín', Teléfono: '+34 623 456 789', Email: 'laura@electronorte.com', Dirección: 'Av. de América 15', Ciudad: 'Madrid', Tipo: 'Instalador', Estado: 'Prospecto', Notas: 'Contactar en junio' },
      { Nombre: 'Canal Sur Energía', Contacto: 'Pedro López', Teléfono: '+34 634 567 890', Email: 'pedro@canalsur.es', Dirección: 'C/ Alcalá 200', Ciudad: 'Madrid', Tipo: 'Comercializadora', Estado: 'En desarrollo', Notas: '' },
    ];

    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 25 },
      { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Canales');
    XLSX.writeFile(wb, 'plantilla_canales_kamapp.xlsx');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-text-primary">Importar canales</h2>
          <p className="text-xs text-text-secondary mt-0.5">Sube un Excel con tu cartera de canales</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 hover:bg-surface-3 text-text-secondary text-xs font-semibold rounded-lg transition-colors">
          <Download size={13} />
          Plantilla Excel
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-surface-3 bg-white hover:border-surface-4'
        } ${loading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
      >
        {loading ? (
          <>
            <Loader2 size={36} className="mx-auto mb-3 text-brand-500 animate-spin" />
            <p className="text-sm font-semibold text-text-primary">Leyendo archivo...</p>
          </>
        ) : (
          <>
            <FileSpreadsheet size={36} className="mx-auto mb-3 text-green-600" />
            <p className="text-sm font-semibold text-text-primary mb-1">
              Arrastra tu archivo Excel aquí
            </p>
            <p className="text-xs text-text-muted mb-4">Formatos: .xlsx, .xls, .csv</p>

            <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl cursor-pointer transition-colors">
              <Upload size={14} />
              Seleccionar archivo
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Instrucciones */}
      <div className="mt-5 bg-surface-1 border border-surface-3 rounded-xl p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Cómo preparar tu Excel</h3>
        <div className="text-xs text-text-muted space-y-1.5">
          <p>1. Descarga la <strong>plantilla Excel</strong> con el botón de arriba</p>
          <p>2. Rellena los datos de tus canales (uno por fila)</p>
          <p>3. La columna <strong>Nombre</strong> es obligatoria, el resto son opcionales</p>
          <p>4. Tipos válidos: <span className="text-text-secondary">Distribuidor, Instalador, Revendedor, Comercializadora</span></p>
          <p>5. Estados válidos: <span className="text-text-secondary">Prospecto, En desarrollo, Activo, Inactivo</span></p>
          <p>6. Sube el archivo y revisa la previsualización antes de importar</p>
        </div>
      </div>
    </div>
  );
}

// ============ STEP 2: COLUMN MAPPING ============
function MappingStep({ fileData, onMapped, onBack }) {
  const { headers, rows, sheetName, totalSheets } = fileData;

  const [mapping, setMapping] = useState(() => {
    const autoMap = {};
    const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    headers.forEach(h => {
      const n = normalize(h);
      if (n.includes('nombre') || n === 'name' || n === 'canal' || n === 'empresa') autoMap[h] = 'name';
      else if (n.includes('contacto') || n.includes('contact') || n.includes('persona')) autoMap[h] = 'contact_name';
      else if (n.includes('telefono') || n.includes('phone') || n.includes('tel') || n.includes('movil')) autoMap[h] = 'phone';
      else if (n.includes('email') || n.includes('correo') || n.includes('mail')) autoMap[h] = 'email';
      else if (n.includes('direccion') || n.includes('address') || n.includes('calle') || n.includes('domicilio')) autoMap[h] = 'address';
      else if (n.includes('ciudad') || n.includes('city') || n.includes('poblacion') || n.includes('localidad') || n.includes('municipio')) autoMap[h] = 'city';
      else if (n.includes('postal') || n.includes('cp') || n.includes('zip') || n.includes('codigo')) autoMap[h] = 'postal_code';
      else if (n.includes('tipo') || n.includes('type') || n.includes('categoria') || n.includes('segmento')) autoMap[h] = 'channel_type';
      else if (n.includes('estado') || n.includes('status') || n.includes('situacion')) autoMap[h] = 'status';
      else if (n.includes('nota') || n.includes('note') || n.includes('observ') || n.includes('comentario') || n.includes('descripcion')) autoMap[h] = 'notes';
    });
    return autoMap;
  });

  const nameIsMapped = Object.values(mapping).includes('name');

  function setMap(header, field) {
    setMapping(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([k, v]) => {
        if (v === field && k !== header) delete next[k];
      });
      if (field) next[header] = field;
      else delete next[header];
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-text-primary">Mapear columnas</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {rows.length} filas en hoja "{sheetName}"
            {totalSheets > 1 && ` · ${totalSheets} hojas (usando la primera)`}
          </p>
        </div>
        <button onClick={onBack} className="text-xs text-brand-500 font-semibold hover:text-brand-600">← Volver</button>
      </div>

      <div className="bg-white border border-surface-3 rounded-xl overflow-hidden mb-4">
        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 p-3 bg-surface-1 border-b border-surface-3">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Columna Excel</span>
          <span />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Campo KAMApp</span>
        </div>

        {headers.map(header => {
          const mapped = mapping[header] || '';
          const sampleValues = rows.slice(0, 3).map(r => r[header]).filter(Boolean).join(', ');

          return (
            <div key={header} className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 p-3 border-b border-surface-3 last:border-0">
              <div>
                <div className="text-sm font-semibold text-text-primary">{header}</div>
                <div className="text-[10px] text-text-muted truncate mt-0.5" title={sampleValues}>
                  Ej: {sampleValues || '(vacío)'}
                </div>
              </div>
              <ArrowRight size={14} className="text-text-muted" />
              <select
                value={mapped}
                onChange={(e) => setMap(header, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-500 ${
                  mapped ? 'bg-brand-50 border-brand-200 text-brand-700 font-semibold' : 'bg-white border-surface-3 text-text-muted'
                }`}
              >
                <option value="">— No importar —</option>
                {CHANNEL_FIELDS.map(f => {
                  const usedBy = Object.entries(mapping).find(([k, v]) => v === f.key && k !== header);
                  return (
                    <option key={f.key} value={f.key} disabled={!!usedBy}>
                      {f.label}{f.required ? ' *' : ''}{usedBy ? ` (→ ${usedBy[0]})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      {!nameIsMapped && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mb-4">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          Debes mapear al menos la columna "Nombre del canal" (obligatoria)
        </div>
      )}

      <button
        onClick={() => onMapped(mapping)}
        disabled={!nameIsMapped}
        className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Eye size={16} />
        Previsualizar importación ({rows.length} canales)
      </button>
    </div>
  );
}

// ============ STEP 3: PREVIEW & IMPORT ============
function PreviewStep({ rows, mapping, onImport, onBack, importing, result }) {
  const TYPE_LABELS = { distributor: 'Distribuidor', installer: 'Instalador', reseller: 'Revendedor', commercial: 'Comercializadora', other: 'Otro' };
  const STATUS_LABELS = { prospect: 'Prospecto', developing: 'En desarrollo', active: 'Activo', inactive: 'Inactivo' };

  const mappedRows = rows.map(row => {
    const mapped = {};
    Object.entries(mapping).forEach(([excelCol, field]) => {
      let value = row[excelCol]?.trim() || '';
      if (field === 'channel_type') value = TYPE_MAP[value.toLowerCase()] || 'other';
      else if (field === 'status') value = STATUS_MAP[value.toLowerCase()] || 'prospect';
      mapped[field] = value;
    });
    return mapped;
  });

  const validRows = mappedRows.filter(r => r.name);
  const invalidRows = mappedRows.filter(r => !r.name);

  if (result) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-extrabold text-text-primary mb-1">Importación completada</h2>
        <p className="text-sm text-text-secondary mb-6">
          {result.success} canales importados correctamente
          {result.errors > 0 && ` · ${result.errors} con errores`}
        </p>
        <button onClick={() => window.location.href = '/channels'}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors">
          Ver mis canales
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-text-primary">Previsualización</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {validRows.length} canales listos
            {invalidRows.length > 0 && ` · ${invalidRows.length} sin nombre (se ignorarán)`}
          </p>
        </div>
        <button onClick={onBack} className="text-xs text-brand-500 font-semibold hover:text-brand-600">← Mapeo</button>
      </div>

      <div className="bg-white border border-surface-3 rounded-xl overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1">
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">#</th>
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Nombre</th>
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Contacto</th>
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Teléfono</th>
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Tipo</th>
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Ciudad</th>
              <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {validRows.slice(0, 25).map((row, i) => (
              <tr key={i} className="border-b border-surface-3 last:border-0 hover:bg-surface-1">
                <td className="p-2.5 text-text-muted text-xs">{i + 1}</td>
                <td className="p-2.5 font-semibold text-text-primary">{row.name}</td>
                <td className="p-2.5 text-text-secondary text-xs">{row.contact_name || '-'}</td>
                <td className="p-2.5 text-text-secondary text-xs">{row.phone || '-'}</td>
                <td className="p-2.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">
                    {TYPE_LABELS[row.channel_type] || 'Otro'}
                  </span>
                </td>
                <td className="p-2.5 text-text-secondary text-xs">{row.city || '-'}</td>
                <td className="p-2.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">
                    {STATUS_LABELS[row.status] || 'Prospecto'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {validRows.length > 25 && (
          <div className="p-2.5 text-center text-xs text-text-muted bg-surface-1 border-t border-surface-3">
            ... y {validRows.length - 25} canales más
          </div>
        )}
      </div>

      {invalidRows.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 mb-4">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          {invalidRows.length} fila(s) sin nombre serán ignoradas
        </div>
      )}

      <button
        onClick={() => onImport(validRows)}
        disabled={importing || validRows.length === 0}
        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {importing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Importando {validRows.length} canales...
          </>
        ) : (
          <>
            <Check size={16} />
            Importar {validRows.length} canales
          </>
        )}
      </button>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function ImportPage() {
  const { user } = useAuthContext();
  const [step, setStep] = useState('upload');
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function handleFileParsed(data) {
    setFileData(data);
    setStep('mapping');
  }

  function handleMapped(map) {
    setMapping(map);
    setStep('preview');
  }

  async function handleImport(rows) {
    setImporting(true);
    let success = 0;
    let errors = 0;

    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize).map(row => ({
        name: row.name,
        contact_name: row.contact_name || null,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        city: row.city || null,
        postal_code: row.postal_code || null,
        channel_type: row.channel_type || 'other',
        status: row.status || 'prospect',
        pipeline_stage: row.status === 'active' ? 'active' : 'lead',
        notes: row.notes || null,
        assigned_to: user.id,
      }));

      try {
        const { data, error } = await supabase.from('channels').insert(chunk).select();
        if (error) throw error;
        success += data.length;
      } catch (err) {
        console.error('Error en chunk:', err);
        errors += chunk.length;
      }
    }

    setResult({ success, errors });
    setImporting(false);
  }

  return (
    <div>
      {/* Progress bar */}
      {!result && (
        <div className="flex items-center gap-2 mb-5">
          {['upload', 'mapping', 'preview'].map((s, i) => {
            const labels = ['Subir Excel', 'Mapear columnas', 'Importar'];
            const isActive = s === step;
            const isDone = ['upload', 'mapping', 'preview'].indexOf(step) > i;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  isDone ? 'bg-green-500 text-white' : isActive ? 'bg-brand-500 text-white' : 'bg-surface-2 text-text-muted'
                }`}>
                  {isDone ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-[11px] font-semibold hidden sm:block ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                  {labels[i]}
                </span>
                {i < 2 && <div className={`flex-1 h-0.5 rounded ${isDone ? 'bg-green-500' : 'bg-surface-3'}`} />}
              </div>
            );
          })}
        </div>
      )}

      {step === 'upload' && <FileUploadStep onFileParsed={handleFileParsed} />}
      {step === 'mapping' && fileData && (
        <MappingStep fileData={fileData} onMapped={handleMapped} onBack={() => setStep('upload')} />
      )}
      {step === 'preview' && fileData && (
        <PreviewStep rows={fileData.rows} mapping={mapping} onImport={handleImport}
          onBack={() => setStep('mapping')} importing={importing} result={result} />
      )}
    </div>
  );
}
