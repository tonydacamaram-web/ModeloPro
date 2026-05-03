import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTasa } from '../../context/TasaContext';
import { useAuth } from '../../context/AuthContext';
import ventasService from '../../services/ventasService';
import tasaService from '../../services/tasaService';
import nominaService from '../../services/nominaService';
import valesService from '../../services/valesService';
import TasaAlerta from '../../components/TasaAlerta';
import { formatearVES, formatearUSD } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const METODOS_PAGO = [
  { id: 'efectivo_bs',   label: 'Efectivo Bs.',    monedaDefecto: 'VES', autoSum: false },
  { id: 'efectivo_usd',  label: 'Efectivo USD',     monedaDefecto: 'USD', autoSum: false },
  { id: 'pos_debito',    label: 'POS Débito',       monedaDefecto: 'VES', autoSum: true  },
  { id: 'pos_credito',   label: 'POS Crédito',      monedaDefecto: 'VES', autoSum: true  },
  { id: 'transferencia', label: 'Transferencia',    monedaDefecto: 'VES', autoSum: true  },
  { id: 'pago_movil',    label: 'Pago Móvil',       monedaDefecto: 'VES', autoSum: true  },
  { id: 'zelle',         label: 'Zelle',            monedaDefecto: 'USD', autoSum: false },
  { id: 'binance',       label: 'Binance/USDT',     monedaDefecto: 'USD', autoSum: false },
  { id: 'biopago',       label: 'BioPago',          monedaDefecto: 'VES', autoSum: true  },
];

const BANCOS_VZ = [
  'Banesco Tony',
  'Banesco Modelo',
  'Venezuela',
  'BNC Tony',
  'Venezuela Megasoft',
  'Banesco Megasoft',
];

/* ── Formatea número: puntos de miles, coma decimal (1.234.567,50) ──────── */
const fmtMiles = (v) => {
  if (v === '' || v === null || v === undefined) return '';
  const [ent, dec] = String(v).split('.');
  const entFmt = (ent || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec !== undefined ? `${entFmt},${dec}` : entFmt;
};

const MontoInput = ({ value, onChange, disabled, placeholder = '0,00', className = '' }) => {
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  const displayFocused = (v) => v ? String(v).replace('.', ',') : '';

  const handleChange = (e) => {
    const raw = e.target.value
      .replace(/[^\d.,]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    onChange(raw);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={focused ? displayFocused(value) : fmtMiles(value)}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
};

let _uid = 0;
const uid = () => ++_uid;

// Suma los montos de un array de operaciones [{monto, ...}]
const sumarOps = (arr) =>
  arr.reduce((s, o) => s + (parseFloat(o.monto) || 0), 0);

const filaInicial = () =>
  METODOS_PAGO.reduce((acc, m) => ({
    ...acc,
    [m.id]: { monto: '', moneda: m.monedaDefecto },
  }), {});

const detallesInicial = () => ({
  pago_movil:    [{ id: uid(), referencia: '', monto: '' }],
  pos:           [{ id: uid(), lote: '', montoDebito: '', montoCredito: '', banco: '' }],
  transferencia: [{ id: uid(), referencia: '', monto: '' }],
  biopago: [
    { slot: 1, monedero_monto: '', monedero_ref: '', banco_monto: '', banco_ref: '' },
    { slot: 2, monedero_monto: '', monedero_ref: '', banco_monto: '', banco_ref: '' },
  ],
});

/* ── Contenedor interior ─────────────────────────────────────────────────── */
const SeccionDetalle = ({ children }) => (
  <div className="mx-3 mb-3 p-3 rounded-lg border border-gp-border"
       style={{ backgroundColor: 'var(--gp-base)' }}>
    {children}
  </div>
);
const LabelDetalle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wide mb-2"
     style={{ color: 'var(--gp-text3)' }}>{children}</p>
);

/* ── Pago Móvil ─────────────────────────────────────────────────────────── */
const DetallePagoMovil = ({ ops, onChange }) => {
  const agregar = () => onChange([...ops, { id: uid(), referencia: '', monto: '' }]);
  const quitar  = (id) => onChange(ops.filter(o => o.id !== id));
  const editar  = (id, campo, val) =>
    onChange(ops.map(o => o.id === id ? { ...o, [campo]: val } : o));

  return (
    <SeccionDetalle>
      <LabelDetalle>Operaciones Pago Móvil</LabelDetalle>
      <div className="space-y-2">
        {ops.map((op, i) => (
          <div key={op.id} className="flex items-center gap-2">
            <span className="text-xs w-5 text-right" style={{ color: 'var(--gp-text3)' }}>{i + 1}.</span>
            <input
              type="text"
              maxLength={4}
              placeholder="Últ. 4 dígitos"
              value={op.referencia}
              onChange={e => editar(op.id, 'referencia', e.target.value.replace(/\D/g, ''))}
              className="input-inline w-32 font-mono text-center"
            />
            <MontoInput
              value={op.monto}
              onChange={val => editar(op.id, 'monto', val)}
              className="input-inline w-32 text-right"
            />
            {ops.length > 1 && (
              <button onClick={() => quitar(op.id)}
                className="text-lg leading-none px-1 hover:opacity-70"
                style={{ color: 'var(--gp-error)' }}>×</button>
            )}
          </div>
        ))}
      </div>
      <button onClick={agregar}
        className="text-xs mt-2 flex items-center gap-1 hover:opacity-80"
        style={{ color: 'var(--gp-fucsia-t)' }}>
        + Agregar operación
      </button>
    </SeccionDetalle>
  );
};

/* ── POS Fusionado (Débito + Crédito por cierre) ─────────────────────────── */
const DetallePOSFusionado = ({ cierres, onChange }) => {
  const siguienteLotePorBanco = (banco) => {
    const nums = cierres
      .filter(c => c.banco === banco)
      .map(c => parseInt(c.lote, 10))
      .filter(n => !isNaN(n));
    return nums.length ? String(Math.max(...nums) + 1) : '';
  };

  const agregar = () =>
    onChange([...cierres, { id: uid(), lote: '', montoDebito: '', montoCredito: '', banco: '' }]);
  const quitar = (id) => onChange(cierres.filter(c => c.id !== id));
  const editar = (id, campo, val) =>
    onChange(cierres.map(c => {
      if (c.id !== id) return c;
      const actualizado = { ...c, [campo]: val };
      // Al seleccionar banco con lote vacío, sugerir siguiente lote de ese banco
      if (campo === 'banco' && val && !c.lote)
        actualizado.lote = siguienteLotePorBanco(val);
      return actualizado;
    }));

  return (
    <SeccionDetalle>
      <LabelDetalle>Cierres POS</LabelDetalle>
      <div className="space-y-4">
        {cierres.map((c, i) => (
          <div key={c.id} className="space-y-1.5">
            <div className="flex items-center gap-2" style={{ color: 'var(--gp-text3)' }}>
              <span className="text-xs font-semibold">Cierre {i + 1}</span>
              {cierres.length > 1 && (
                <button onClick={() => quitar(c.id)}
                  className="ml-auto text-xs hover:opacity-70"
                  style={{ color: 'var(--gp-error)' }}>× Quitar</button>
              )}
            </div>
            <div className="grid grid-cols-[72px_1fr_1fr_1fr] gap-2 items-end">
              {/* Lote */}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--gp-text3)' }}>
                  Lote {c.lote ? <span className="font-mono">/ C{c.lote}</span> : ''}
                </p>
                <input
                  type="text"
                  placeholder="N°"
                  value={c.lote}
                  onChange={e => editar(c.id, 'lote', e.target.value.replace(/\D/g, ''))}
                  className="input-inline w-full font-mono text-center"
                />
              </div>
              {/* Monto Débito */}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--gp-text3)' }}>Débito</p>
                <MontoInput
                  value={c.montoDebito}
                  onChange={val => editar(c.id, 'montoDebito', val)}
                  className="input-inline w-full text-right"
                />
              </div>
              {/* Monto Crédito */}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--gp-text3)' }}>Crédito</p>
                <MontoInput
                  value={c.montoCredito}
                  onChange={val => editar(c.id, 'montoCredito', val)}
                  className="input-inline w-full text-right"
                />
              </div>
              {/* Banco */}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--gp-text3)' }}>Banco</p>
                <select
                  value={c.banco}
                  onChange={e => editar(c.id, 'banco', e.target.value)}
                  className="select-inline w-full"
                >
                  <option value="">Banco…</option>
                  {BANCOS_VZ.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={agregar}
        className="text-xs mt-3 flex items-center gap-1 hover:opacity-80"
        style={{ color: 'var(--gp-fucsia-t)' }}>
        + Agregar cierre
      </button>
    </SeccionDetalle>
  );
};

/* ── Transferencia ──────────────────────────────────────────────────────── */
const DetalleTransferencia = ({ ops, onChange }) => {
  const agregar = () => onChange([...ops, { id: uid(), referencia: '', monto: '' }]);
  const quitar  = (id) => onChange(ops.filter(o => o.id !== id));
  const editar  = (id, campo, val) =>
    onChange(ops.map(o => o.id === id ? { ...o, [campo]: val } : o));

  return (
    <SeccionDetalle>
      <LabelDetalle>Transferencias</LabelDetalle>
      <div className="space-y-2">
        {ops.map((op, i) => (
          <div key={op.id} className="flex items-center gap-2">
            <span className="text-xs w-5 text-right" style={{ color: 'var(--gp-text3)' }}>{i + 1}.</span>
            <input
              type="text"
              placeholder="N° transacción"
              value={op.referencia}
              onChange={e => editar(op.id, 'referencia', e.target.value)}
              className="input-inline flex-1 font-mono"
            />
            <MontoInput
              value={op.monto}
              onChange={val => editar(op.id, 'monto', val)}
              className="input-inline w-32 text-right"
            />
            {ops.length > 1 && (
              <button onClick={() => quitar(op.id)}
                className="text-lg leading-none px-1 hover:opacity-70"
                style={{ color: 'var(--gp-error)' }}>×</button>
            )}
          </div>
        ))}
      </div>
      <button onClick={agregar}
        className="text-xs mt-2 flex items-center gap-1 hover:opacity-80"
        style={{ color: 'var(--gp-fucsia-t)' }}>
        + Agregar transferencia
      </button>
    </SeccionDetalle>
  );
};

/* ── BioPago (desglosado: Monedero + Banco por terminal) ────────────────── */
const DetalleBioPago = ({ slots, onChange, tasaHoy }) => {
  const editar = (slot, campo, val) =>
    onChange(slots.map(s => s.slot === slot ? { ...s, [campo]: val } : s));

  return (
    <SeccionDetalle>
      <LabelDetalle>BioPago por terminal</LabelDetalle>
      <div className="space-y-4">
        {slots.map(s => {
          const totalTerminal =
            (parseFloat(s.monedero_monto) || 0) + (parseFloat(s.banco_monto) || 0);
          return (
            <div key={s.slot}
              className="rounded-lg border border-gp-border p-3"
              style={{ backgroundColor: 'var(--gp-card2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: 'var(--gp-fucsia-t)' }}>
                  Terminal {s.slot}
                </span>
                {totalTerminal > 0 && (
                  <span className="text-xs font-mono" style={{ color: 'var(--gp-text3)' }}>
                    Total: {fmtMiles(totalTerminal.toFixed(2))}
                  </span>
                )}
              </div>
              {/* Monedero */}
              <div className="mb-2">
                <p className="text-xs mb-1 font-medium" style={{ color: 'var(--gp-text3)' }}>
                  💳 Monedero
                </p>
                <div className="flex items-center gap-2">
                  <MontoInput
                    value={s.monedero_monto}
                    onChange={val => editar(s.slot, 'monedero_monto', val)}
                    disabled={!tasaHoy}
                    placeholder="Monto"
                    className="input-inline w-32 text-right"
                  />
                  <input
                    type="text"
                    placeholder="Ref. (opc.)"
                    value={s.monedero_ref}
                    onChange={e => editar(s.slot, 'monedero_ref', e.target.value)}
                    className="input-inline flex-1"
                  />
                </div>
              </div>
              {/* Banco */}
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: 'var(--gp-text3)' }}>
                  🏦 Banco
                </p>
                <div className="flex items-center gap-2">
                  <MontoInput
                    value={s.banco_monto}
                    onChange={val => editar(s.slot, 'banco_monto', val)}
                    disabled={!tasaHoy}
                    placeholder="Monto"
                    className="input-inline w-32 text-right"
                  />
                  <input
                    type="text"
                    placeholder="Ref. (opc.)"
                    value={s.banco_ref}
                    onChange={e => editar(s.slot, 'banco_ref', e.target.value)}
                    className="input-inline flex-1"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SeccionDetalle>
  );
};

/* ── Sección Vales del día ───────────────────────────────────────────────── */
const SeccionVales = ({ fecha, tasaHoy, esAdmin, vales, empleados, onCambio }) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [errorVale, setErrorVale] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { moneda: 'USD' },
  });

  const onSubmit = async (datos) => {
    setErrorVale('');
    try {
      await valesService.crear({
        fecha,
        empleadoId: parseInt(datos.empleadoId),
        descripcion: datos.descripcion || undefined,
        monto:  parseFloat(datos.monto),
        moneda: datos.moneda,
      });
      reset({ moneda: 'USD' });
      setMostrarForm(false);
      onCambio();
    } catch (err) {
      setErrorVale(err.response?.data?.error || 'Error al registrar el vale');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este vale? También se eliminará el movimiento de nómina asociado.')) return;
    setEliminando(id);
    try {
      await valesService.eliminar(id);
      onCambio();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar el vale');
    } finally {
      setEliminando(null);
    }
  };

  const totalUSDVales = vales.reduce((s, v) => {
    const m = parseFloat(v.monto);
    return s + (v.moneda === 'USD' ? m : m / (parseFloat(v.tasa_bcv) || 1));
  }, 0);

  return (
    <div className="rounded-lg border border-amber-700/30 bg-amber-900/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-amber-700/20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-amber-300">Vales del día</span>
          {vales.length > 0 && (
            <span className="text-xs text-amber-400 font-mono">
              {vales.length} vale{vales.length > 1 ? 's' : ''} · −{formatearUSD(totalUSDVales)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm(v => !v)}
          disabled={!tasaHoy || empleados.length === 0}
          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-40"
          style={{ backgroundColor: 'var(--gp-fucsia)', color: '#fff' }}
        >
          {mostrarForm ? 'Cancelar' : '+ Vale'}
        </button>
      </div>

      {errorVale && (
        <div className="px-3 py-2 text-xs text-gp-error bg-red-900/20 border-b border-red-700/30">
          {errorVale}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-3 border-b border-amber-700/20">
          <div>
            <label className="block text-xs text-gp-text2 mb-1">Empleado *</label>
            <select className="select-inline w-full"
              {...register('empleadoId', { required: 'Selecciona un empleado' })}>
              <option value="">— Seleccionar —</option>
              {empleados.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre}{e.cargo ? ` — ${e.cargo}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Monto *</label>
              <div className="flex gap-1">
                <input type="number" step="0.01" min="0.01" className="input-inline flex-1"
                  placeholder="0.00"
                  {...register('monto', { required: true, min: 0.01 })} />
                <select className="select-inline" {...register('moneda')}>
                  <option value="USD">USD</option>
                  <option value="VES">Bs.</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Descripción</label>
              <input className="input-inline w-full" placeholder="Producto o motivo..."
                {...register('descripcion')} />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting}
            className="btn-primario text-sm py-1.5 w-full">
            {isSubmitting ? 'Registrando...' : 'Registrar vale'}
          </button>
        </form>
      )}

      {vales.length === 0 ? (
        <p className="text-xs text-gp-text3 px-3 py-3">Sin vales registrados para este día</p>
      ) : (
        <div className="divide-y divide-amber-700/20">
          {vales.map(v => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gp-text">{v.empleado_nombre}</p>
                {v.descripcion && (
                  <p className="text-xs text-gp-text3 truncate">{v.descripcion}</p>
                )}
              </div>
              <span className="text-sm font-bold text-amber-300 whitespace-nowrap">
                −{v.moneda === 'USD' ? formatearUSD(v.monto) : formatearVES(v.monto)}
              </span>
              {esAdmin && (
                <button
                  onClick={() => handleEliminar(v.id)}
                  disabled={eliminando === v.id}
                  className="text-gp-error text-sm hover:opacity-70 leading-none disabled:opacity-40"
                  title="Eliminar vale"
                >
                  {eliminando === v.id ? '…' : '×'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
const VentasPage = () => {
  const { tasaHoy } = useTasa();
  const { esAdmin } = useAuth();
  const [fecha, setFecha]             = useState(hoyDB());
  const [filas, setFilas]             = useState(filaInicial());
  const [detallesExtra, setDetallesExtra] = useState(detallesInicial());
  const [guardando, setGuardando]     = useState(false);
  const [mensaje, setMensaje]         = useState(null);
  const [historial, setHistorial]     = useState([]);
  const [vistaActiva, setVistaActiva] = useState('registro');
  const [ventaIds, setVentaIds]       = useState({});
  const [tasaPrompt, setTasaPrompt]   = useState(null); // { fecha, valor }
  const [empleados, setEmpleados]     = useState([]);
  const [valesDelDia, setValesDelDia] = useState([]);

  // Devuelve el total auto-calculado para los métodos con autoSum
  const totalAutoSum = (metodoId) => {
    switch (metodoId) {
      case 'biopago':
        return detallesExtra.biopago.reduce((s, t) =>
          s + (parseFloat(t.monedero_monto) || 0) + (parseFloat(t.banco_monto) || 0), 0);
      case 'pago_movil':
        return sumarOps(detallesExtra.pago_movil);
      case 'transferencia':
        return sumarOps(detallesExtra.transferencia);
      case 'pos_debito':
        return sumarOps(detallesExtra.pos.map(c => ({ monto: c.montoDebito })));
      case 'pos_credito':
        return sumarOps(detallesExtra.pos.map(c => ({ monto: c.montoCredito })));
      default:
        return 0;
    }
  };

  const montoEffectivo = (m) =>
    m.autoSum ? (totalAutoSum(m.id) || '') : filas[m.id].monto;

  const cargarDia = useCallback(async (f) => {
    try {
      const { ventas } = await ventasService.obtenerDia(f);
      const nuevasFilas    = filaInicial();
      const nuevosDetalles = detallesInicial();
      const posMap = {};
      const nuevosIds = {};

      ventas.forEach(v => {
        if (v.id) nuevosIds[v.metodo_pago] = v.id;
        const met = METODOS_PAGO.find(m => m.id === v.metodo_pago);
        if (met && !met.autoSum && v.monto !== null)
          nuevasFilas[v.metodo_pago] = { monto: v.monto, moneda: v.moneda };
        else if (met && met.autoSum && v.moneda)
          nuevasFilas[v.metodo_pago] = { monto: '', moneda: v.moneda };

        const detalles = v.detalles || [];

        if (v.metodo_pago === 'biopago') {
          // Reconstruir terminales desde detalles (campo banco = 'monedero' | 'banco')
          const terminales = [
            { slot: 1, monedero_monto: '', monedero_ref: '', banco_monto: '', banco_ref: '' },
            { slot: 2, monedero_monto: '', monedero_ref: '', banco_monto: '', banco_ref: '' },
          ];
          detalles.forEach(d => {
            const t = terminales.find(t => t.slot === d.slot);
            if (!t) return;
            if (d.banco === 'banco') {
              t.banco_monto = d.monto ?? '';
              t.banco_ref = d.referencia ?? '';
            } else {
              // 'monedero' o legacy (sin campo banco)
              t.monedero_monto = d.monto ?? '';
              t.monedero_ref = d.referencia ?? '';
            }
          });
          nuevosDetalles.biopago = terminales;
        } else if (v.metodo_pago === 'pago_movil') {
          nuevosDetalles.pago_movil = detalles.length
            ? detalles.map(d => ({ id: uid(), referencia: d.referencia ?? '', monto: d.monto ?? '' }))
            : [{ id: uid(), referencia: '', monto: '' }];
        } else if (v.metodo_pago === 'transferencia') {
          nuevosDetalles.transferencia = detalles.length
            ? detalles.map(d => ({ id: uid(), referencia: d.referencia ?? '', monto: d.monto ?? '' }))
            : [{ id: uid(), referencia: '', monto: '' }];
        } else if (v.metodo_pago === 'pos_debito') {
          detalles.forEach(d => {
            const lote = d.referencia ?? '';
            if (!posMap[lote]) posMap[lote] = { id: uid(), lote, montoDebito: '', montoCredito: '', banco: d.banco ?? '' };
            posMap[lote].montoDebito = d.monto ?? '';
            if (d.banco) posMap[lote].banco = d.banco;
          });
        } else if (v.metodo_pago === 'pos_credito') {
          detalles.forEach(d => {
            const lote = String(d.referencia ?? '').replace(/^C/i, '');
            if (!posMap[lote]) posMap[lote] = { id: uid(), lote, montoDebito: '', montoCredito: '', banco: d.banco ?? '' };
            posMap[lote].montoCredito = d.monto ?? '';
            if (d.banco) posMap[lote].banco = d.banco;
          });
        }
      });

      const posArray = Object.values(posMap);
      if (posArray.length) nuevosDetalles.pos = posArray;

      setFilas(nuevasFilas);
      setDetallesExtra(nuevosDetalles);
      setVentaIds(nuevosIds);
    } catch { /* día sin registros */ }
  }, []);

  useEffect(() => { cargarDia(fecha); }, [fecha, cargarDia]);

  const cargarValesDelDia = useCallback(async (f) => {
    try {
      const data = await valesService.listar({ fecha: f });
      setValesDelDia(data);
    } catch { setValesDelDia([]); }
  }, []);

  useEffect(() => { cargarValesDelDia(fecha); }, [fecha, cargarValesDelDia]);

  useEffect(() => {
    nominaService.listarEmpleados(true)
      .then(setEmpleados)
      .catch(() => {});
  }, []);

  const calcularEquivalente = (monto, moneda) => {
    if (!monto || !tasaHoy) return null;
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) return null;
    return moneda === 'VES'
      ? formatearUSD(m / parseFloat(tasaHoy.tasa_bcv))
      : formatearVES(m * parseFloat(tasaHoy.tasa_bcv));
  };

  const totalUSD = () => {
    if (!tasaHoy) return 0;
    return METODOS_PAGO.reduce((sum, m) => {
      const monto  = montoEffectivo(m);
      const moneda = filas[m.id].moneda;
      if (!monto) return sum;
      const n = parseFloat(monto);
      if (isNaN(n) || n <= 0) return sum;
      return sum + (moneda === 'USD' ? n : n / parseFloat(tasaHoy.tasa_bcv));
    }, 0);
  };

  const handleMonto  = (id, val) => setFilas(p => ({ ...p, [id]: { ...p[id], monto: val } }));
  const handleMoneda = (id, val) => setFilas(p => ({ ...p, [id]: { ...p[id], moneda: val } }));

  const construirPayload = useCallback((f, filasActuales, detallesActuales) => {
    const montoEfectivoPara = (m) => {
      if (m.id === 'pos_debito')
        return sumarOps(detallesActuales.pos.map(c => ({ monto: c.montoDebito }))) || '';
      if (m.id === 'pos_credito')
        return sumarOps(detallesActuales.pos.map(c => ({ monto: c.montoCredito }))) || '';
      if (m.id === 'biopago')
        return detallesActuales.biopago.reduce((s, t) =>
          s + (parseFloat(t.monedero_monto) || 0) + (parseFloat(t.banco_monto) || 0), 0) || '';
      return m.autoSum ? (sumarOps(detallesActuales[m.id] || []) || '') : filasActuales[m.id].monto;
    };

    const ventas = METODOS_PAGO
      .filter(m => { const monto = montoEfectivoPara(m); return monto && parseFloat(monto) > 0; })
      .map(m => ({ metodoPago: m.id, monto: parseFloat(montoEfectivoPara(m)), moneda: filasActuales[m.id].moneda }));

    const detallesPorMetodo = {};
    const pmOps = detallesActuales.pago_movil.filter(o => o.referencia || o.monto);
    if (pmOps.length)
      detallesPorMetodo.pago_movil = pmOps.map((o, i) => ({ slot: i + 1, referencia: o.referencia || null, monto: o.monto ? parseFloat(o.monto) : null }));

    const cierresPOS = detallesActuales.pos.filter(c => c.montoDebito || c.montoCredito || c.banco);
    const debitos = cierresPOS.filter(c => c.montoDebito && parseFloat(c.montoDebito) > 0)
      .map((c, i) => ({ slot: i + 1, banco: c.banco || null, referencia: c.lote || null, monto: parseFloat(c.montoDebito) }));
    const creditos = cierresPOS.filter(c => c.montoCredito && parseFloat(c.montoCredito) > 0)
      .map((c, i) => ({ slot: i + 1, banco: c.banco || null, referencia: c.lote ? `C${c.lote}` : null, monto: parseFloat(c.montoCredito) }));
    if (debitos.length) detallesPorMetodo.pos_debito = debitos;
    if (creditos.length) detallesPorMetodo.pos_credito = creditos;

    const trOps = detallesActuales.transferencia.filter(o => o.referencia || o.monto);
    if (trOps.length)
      detallesPorMetodo.transferencia = trOps.map((o, i) => ({ slot: i + 1, referencia: o.referencia || null, monto: o.monto ? parseFloat(o.monto) : null }));
    // BioPago: cada terminal genera hasta 2 registros (monedero + banco)
    const bioDetalles = [];
    detallesActuales.biopago.forEach(t => {
      if (t.monedero_monto && parseFloat(t.monedero_monto) > 0) {
        bioDetalles.push({
          slot: t.slot,
          banco: 'monedero',
          monto: parseFloat(t.monedero_monto),
          referencia: t.monedero_ref || null,
        });
      }
      if (t.banco_monto && parseFloat(t.banco_monto) > 0) {
        bioDetalles.push({
          slot: t.slot,
          banco: 'banco',
          monto: parseFloat(t.banco_monto),
          referencia: t.banco_ref || null,
        });
      }
    });
    if (bioDetalles.length)
      detallesPorMetodo.biopago = bioDetalles;

    return { ventas, detallesPorMetodo };
  }, []);

  const guardarDia = async () => {
    if (!tasaHoy) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const { ventas, detallesPorMetodo } = construirPayload(fecha, filas, detallesExtra);
      if (ventas.length === 0) {
        setMensaje({ tipo: 'error', texto: 'Ingresa al menos un monto para guardar' });
        return;
      }
      await ventasService.guardarDia(fecha, ventas, detallesPorMetodo);
      setMensaje({ tipo: 'exito', texto: `Ventas del ${aFormatoUI(fecha)} guardadas correctamente` });
      await cargarDia(fecha);
    } catch (err) {
      if (err.response?.data?.codigo === 'TASA_FALTANTE') {
        setTasaPrompt({ fecha: err.response.data.fecha, valor: '' });
      } else {
        setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al guardar' });
      }
    } finally {
      setGuardando(false);
    }
  };

  const confirmarTasaYGuardar = async () => {
    if (!tasaPrompt?.valor) return;
    setGuardando(true);
    try {
      await tasaService.crear(parseFloat(tasaPrompt.valor), tasaPrompt.fecha);
      setTasaPrompt(null);
      await guardarDia();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al registrar la tasa' });
      setGuardando(false);
    }
  };

  const eliminarMetodo = async (metodoId) => {
    const ids = metodoId === 'pos'
      ? [ventaIds['pos_debito'], ventaIds['pos_credito']].filter(Boolean)
      : [ventaIds[metodoId]].filter(Boolean);
    if (!ids.length) return;
    try {
      await Promise.all(ids.map(id => ventasService.eliminar(id)));
      setMensaje({ tipo: 'exito', texto: 'Entrada eliminada' });
      await cargarDia(fecha);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al eliminar' });
    }
  };

  const handleCambioFecha = useCallback(async (nuevaFecha) => {
    if (tasaHoy) {
      const { ventas, detallesPorMetodo } = construirPayload(fecha, filas, detallesExtra);
      if (ventas.length > 0) {
        try {
          await ventasService.guardarDia(fecha, ventas, detallesPorMetodo);
          setMensaje({ tipo: 'exito', texto: `Ventas del ${aFormatoUI(fecha)} guardadas automáticamente` });
        } catch { /* ignora si no hay tasa u otro error */ }
      }
    }
    setFecha(nuevaFecha);
  }, [fecha, filas, detallesExtra, tasaHoy, construirPayload]);

  const cargarHistorial = useCallback(async () => {
    const { ventas } = await ventasService.listar({ limite: 50 });
    setHistorial(ventas);
  }, []);

  useEffect(() => {
    if (vistaActiva === 'historial') cargarHistorial();
  }, [vistaActiva, cargarHistorial]);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <TasaAlerta />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gp-border">
        {['registro', 'historial'].map(v => (
          <button key={v} onClick={() => setVistaActiva(v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              vistaActiva === v
                ? 'border-gp-fucsia text-gp-fucsia-t'
                : 'border-transparent text-gp-text3 hover:text-gp-text2'
            }`}>
            {v === 'registro' ? 'Registrar Ventas' : 'Historial'}
          </button>
        ))}
      </div>

      {/* ── Registro ─────────────────────────────────────────────────── */}
      {vistaActiva === 'registro' && (
        <div className="tarjeta">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gp-text">Ventas del Día</h3>
            <input
              type="date"
              value={fecha}
              onChange={e => handleCambioFecha(e.target.value)}
              className="input-campo w-auto text-sm"
            />
          </div>

          {mensaje && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              mensaje.tipo === 'exito'
                ? 'bg-green-900/30 text-green-300 border-green-700/40'
                : 'bg-red-900/30 text-red-300 border-red-700/40'
            }`}>{mensaje.texto}</div>
          )}

          {tasaPrompt && (
            <div className="mb-4 p-3 rounded-lg border border-yellow-700/40 bg-yellow-900/20">
              <p className="text-sm text-yellow-200 mb-2 font-medium">
                No hay tasa BCV para el {aFormatoUI(tasaPrompt.fecha)}. Ingresa el valor para continuar:
              </p>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 47.50"
                  value={tasaPrompt.valor}
                  onChange={e => setTasaPrompt(p => ({ ...p, valor: e.target.value }))}
                  className="input-campo w-36 text-right"
                  autoFocus
                />
                <button
                  onClick={confirmarTasaYGuardar}
                  disabled={!tasaPrompt.valor || guardando}
                  className="btn-primario text-sm"
                >
                  {guardando ? 'Guardando...' : 'Confirmar y guardar'}
                </button>
                <button
                  onClick={() => setTasaPrompt(null)}
                  className="text-sm hover:opacity-80"
                  style={{ color: 'var(--gp-text3)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Cabecera */}
          <div className="grid grid-cols-[1fr_68px_128px_88px_28px] gap-2 px-3 pb-1 text-xs font-medium"
               style={{ color: 'var(--gp-text3)' }}>
            <span>Método</span>
            <span className="text-center">Moneda</span>
            <span className="text-right">Monto</span>
            <span className="text-right">Equivalente</span>
            <span></span>
          </div>

          <div className="space-y-1">
            {METODOS_PAGO.map(m => {
              // pos_credito se gestiona dentro de la fila pos_debito fusionada
              if (m.id === 'pos_credito') return null;

              const totalD = m.id === 'pos_debito' ? totalAutoSum('pos_debito') : 0;
              const totalC = m.id === 'pos_debito' ? totalAutoSum('pos_credito') : 0;
              const totalNum = m.autoSum
                ? (m.id === 'pos_debito' ? totalD + totalC : totalAutoSum(m.id))
                : 0;
              const montoVis = m.autoSum ? (totalNum || '') : filas[m.id].monto;

              return (
                <div key={m.id}
                  className="rounded-lg border border-gp-border transition-colors hover:border-gp-border2"
                  style={{ backgroundColor: 'var(--gp-card2)' }}>

                  {/* Fila principal */}
                  <div className="grid grid-cols-[1fr_68px_128px_88px_28px] gap-2 items-center px-3 py-2.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--gp-text)' }}>
                      {m.id === 'pos_debito' ? 'POS' : m.label}
                    </span>

                    {/* Moneda */}
                    <select
                      value={filas[m.id].moneda}
                      onChange={e => handleMoneda(m.id, e.target.value)}
                      className="select-inline text-xs"
                    >
                      <option value="VES">Bs.</option>
                      <option value="USD">USD</option>
                    </select>

                    {/* Monto: POS muestra D+C; otros igual que antes */}
                    {m.id === 'pos_debito' ? (
                      <div className="text-right pr-2 leading-tight">
                        <p className="text-xs font-mono" style={{ color: totalD > 0 ? 'var(--gp-fucsia-t)' : 'var(--gp-text3)' }}>
                          D: {totalD > 0 ? fmtMiles(totalD.toFixed(2)) : '—'}
                        </p>
                        <p className="text-xs font-mono" style={{ color: totalC > 0 ? 'var(--gp-fucsia-t)' : 'var(--gp-text3)' }}>
                          C: {totalC > 0 ? fmtMiles(totalC.toFixed(2)) : '—'}
                        </p>
                      </div>
                    ) : m.autoSum ? (
                      <p className="text-sm font-mono text-right pr-2"
                         style={{ color: totalNum > 0 ? 'var(--gp-fucsia-t)' : 'var(--gp-text3)' }}>
                        {totalNum > 0 ? formatearVES(totalNum) : '—'}
                      </p>
                    ) : (
                      <MontoInput
                        value={filas[m.id].monto}
                        onChange={val => handleMonto(m.id, val)}
                        disabled={!tasaHoy}
                        className="input-inline w-full text-right"
                      />
                    )}

                    {/* Equivalente */}
                    <p className="text-xs text-right truncate" style={{ color: 'var(--gp-text3)' }}>
                      {calcularEquivalente(montoVis, filas[m.id].moneda) || '—'}
                    </p>

                    {/* Botón eliminar (solo si hay registro guardado) */}
                    {(m.id === 'pos_debito'
                        ? (ventaIds['pos_debito'] || ventaIds['pos_credito'])
                        : ventaIds[m.id]
                      ) ? (
                      <button
                        onClick={() => eliminarMetodo(m.id === 'pos_debito' ? 'pos' : m.id)}
                        title="Eliminar registro de este método"
                        className="text-base leading-none hover:opacity-70 flex items-center justify-center"
                        style={{ color: 'var(--gp-error)' }}
                      >×</button>
                    ) : <span />}
                  </div>

                  {/* Sub-formularios */}
                  {m.id === 'pos_debito' && (
                    <DetallePOSFusionado
                      cierres={detallesExtra.pos}
                      onChange={cs => setDetallesExtra(p => ({ ...p, pos: cs }))}
                    />
                  )}
                  {m.id === 'biopago' && (
                    <DetalleBioPago
                      slots={detallesExtra.biopago}
                      onChange={s => setDetallesExtra(p => ({ ...p, biopago: s }))}
                      tasaHoy={tasaHoy}
                    />
                  )}
                  {m.id === 'pago_movil' && (
                    <DetallePagoMovil
                      ops={detallesExtra.pago_movil}
                      onChange={o => setDetallesExtra(p => ({ ...p, pago_movil: o }))}
                    />
                  )}
                  {m.id === 'transferencia' && (
                    <DetalleTransferencia
                      ops={detallesExtra.transferencia}
                      onChange={o => setDetallesExtra(p => ({ ...p, transferencia: o }))}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Vales del día */}
          <div className="mt-3">
            <SeccionVales
              fecha={fecha}
              tasaHoy={tasaHoy}
              esAdmin={esAdmin}
              vales={valesDelDia}
              empleados={empleados}
              onCambio={() => cargarValesDelDia(fecha)}
            />
          </div>

          {/* Total del día */}
          <div className="mt-4 pt-3 border-t border-gp-border2 flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--gp-text)' }}>
              Total del día (USD)
            </span>
            <span className="text-lg font-bold" style={{ color: 'var(--gp-fucsia-t)' }}>
              {formatearUSD(totalUSD())}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={guardarDia} disabled={guardando || !tasaHoy} className="btn-primario">
              {guardando ? 'Guardando...' : 'Guardar día'}
            </button>
          </div>
        </div>
      )}

      {/* ── Historial ────────────────────────────────────────────────── */}
      {vistaActiva === 'historial' && (
        <div className="tarjeta">
          <h3 className="font-semibold text-gp-text mb-4">Historial de Ventas</h3>
          {historial.length === 0 ? (
            <p className="text-sm text-gp-text3 text-center py-4">Sin registros</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gp-border">
                    <th className="text-left py-2 text-gp-text3 font-medium">Fecha</th>
                    <th className="text-left py-2 text-gp-text3 font-medium">Método</th>
                    <th className="text-right py-2 text-gp-text3 font-medium">Monto</th>
                    <th className="text-right py-2 text-gp-text3 font-medium">Equivalente</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(v => (
                    <tr key={v.id} className="border-b border-gp-border/50 hover:bg-gp-hover">
                      <td className="py-2 text-gp-text2">{aFormatoUI(v.fecha)}</td>
                      <td className="py-2 text-gp-text capitalize">{v.metodo_pago.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-right font-mono text-gp-fucsia-t">
                        {v.moneda === 'VES' ? formatearVES(v.monto) : formatearUSD(v.monto)}
                      </td>
                      <td className="py-2 text-right text-gp-text3 text-xs">
                        {v.monto_convertido
                          ? (v.moneda === 'VES' ? formatearUSD(v.monto_convertido) : formatearVES(v.monto_convertido))
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VentasPage;
