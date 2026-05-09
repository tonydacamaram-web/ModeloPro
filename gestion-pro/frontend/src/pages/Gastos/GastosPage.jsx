import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts';
import MontoInput from '../../components/MontoInput';
import { useTasa } from '../../context/TasaContext';
import { useAuth } from '../../context/AuthContext';
import gastosService from '../../services/gastosService';
import tesoreriaService from '../../services/tesoreriaService';
import TasaAlerta from '../../components/TasaAlerta';
import { formatearVES, formatearUSD } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const TIPO_ESTILO = {
  factura:  { badge: 'bg-gp-fucsia-dim text-gp-fucsia-t border border-gp-fucsia/30', icono: '🧾' },
  eventual: { badge: 'bg-gp-hover text-gp-text2 border border-gp-border2',           icono: '💳' },
  divisas:  { badge: 'bg-gp-dorado-dim text-gp-dorado-t border border-gp-dorado/30', icono: '💵' },
};

const COLORES = ['#e91e8c','#d4a017','#7c3aed','#06b6d4','#22c55e','#f97316','#a855f7','#14b8a6','#ec4899','#84cc16'];

const PERIODOS = [
  { value: 'mes',       label: 'Este mes' },
  { value: 'trimestre', label: '3 meses'  },
  { value: 'semestre',  label: '6 meses'  },
  { value: 'anio',      label: 'Este año' },
  { value: 'todo',      label: 'Todo'     },
];

const primerDiaMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const nMesesAtras = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().split('T')[0];
};
const primerDiaAnio = () => `${new Date().getFullYear()}-01-01`;

const calcularPeriodo = (p) => {
  const hoy = hoyDB();
  switch (p) {
    case 'mes':       return { desde: primerDiaMes(),  hasta: hoy };
    case 'trimestre': return { desde: nMesesAtras(3),  hasta: hoy };
    case 'semestre':  return { desde: nMesesAtras(6),  hasta: hoy };
    case 'anio':      return { desde: primerDiaAnio(), hasta: hoy };
    default:          return { desde: '',              hasta: ''  };
  }
};

const TooltipGrafica = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gp-card border border-gp-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-gp-text mb-1 max-w-[180px] break-words">{label}</p>
      <p className="text-gp-fucsia-t font-bold">{formatearUSD(payload[0].value)}</p>
      {d?.total_ves > 0 && <p className="text-gp-text3">≈ {formatearVES(d.total_ves)}</p>}
      {d?.cantidad && <p className="text-gp-text3">{d.cantidad} factura{d.cantidad !== 1 ? 's' : ''}</p>}
    </div>
  );
};

const TooltipDona = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gp-card border border-gp-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-gp-text mb-1">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }} className="font-bold">{formatearUSD(payload[0].value)}</p>
    </div>
  );
};

const GastosPage = () => {
  const { tasaHoy } = useTasa();
  const { esAdmin } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [total, setTotal] = useState(0);
  const [vistaActiva, setVistaActiva] = useState('registro');
  const [mensaje, setMensaje] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [cuentasOptions, setCuentasOptions] = useState([]);

  // ── Dashboard proveedores ─────────────────────────────────────────────────
  const [resumen, setResumen] = useState([]);
  const [totalesDash, setTotalesDash] = useState(null);
  const [cargandoDash, setCargandoDash] = useState(false);
  const [periodo, setPeriodo] = useState('mes');
  const initPeriodo = calcularPeriodo('mes');
  const [fechaDesde, setFechaDesde] = useState(initPeriodo.desde);
  const [fechaHasta, setFechaHasta] = useState(initPeriodo.hasta);

  const { register, handleSubmit, watch, reset, setValue, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { tipo: 'eventual', moneda: 'VES', fecha: hoyDB(), monto: 0 },
  });

  const tipoSeleccionado = watch('tipo');

  const cargarCategorias = useCallback(async () => {
    try {
      const data = await gastosService.listarCategorias({ soloActivas: 'true' });
      setCategorias(data);
    } catch { /* ignorar */ }
  }, []);

  const cargarGastos = useCallback(async () => {
    try {
      const { gastos: data, total: t } = await gastosService.listar({ limite: 50 });
      setGastos(data);
      setTotal(t);
    } catch { /* ignorar */ }
  }, []);

  const cargarProveedores = useCallback(async () => {
    try {
      const data = await gastosService.listarProveedores();
      setProveedores(data);
    } catch { /* ignorar */ }
  }, []);

  const cargarCuentas = useCallback(async () => {
    try {
      const config = await tesoreriaService.obtenerConfiguracion();
      const unicas = [...new Set(
        config
          .filter(c => c.canal !== 'pos_debito' && c.canal !== 'pos_credito')
          .map(c => c.cuenta_destino)
          .filter(Boolean)
      )];
      setCuentasOptions(unicas);
    } catch { /* ignorar */ }
  }, []);

  const cargarResumen = useCallback(async () => {
    setCargandoDash(true);
    try {
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;
      const { proveedores: prov, totales } = await gastosService.resumenProveedores(params);
      // pg devuelve NUMERIC como string; convertir a number para que Recharts escale correctamente
      setResumen(prov.map(p => ({
        ...p,
        total_usd: parseFloat(p.total_usd) || 0,
        total_ves: parseFloat(p.total_ves) || 0,
      })));
      setTotalesDash(totales);
    } catch { /* ignorar */ }
    finally { setCargandoDash(false); }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    cargarCategorias();
    cargarGastos();
    cargarProveedores();
    cargarCuentas();
  }, [cargarCategorias, cargarGastos, cargarProveedores, cargarCuentas]);

  useEffect(() => {
    if (vistaActiva !== 'proveedores') return;
    cargarResumen();
  }, [vistaActiva, cargarResumen]);

  const handlePeriodo = (p) => {
    setPeriodo(p);
    const { desde, hasta } = calcularPeriodo(p);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  // Auto-completar nombre cuando el usuario elige un RIF del datalist
  const handleRifChange = (e) => {
    const rif = e.target.value;
    const encontrado = proveedores.find(p => p.proveedor_rif === rif);
    if (encontrado) {
      setValue('proveedorNombre', encontrado.proveedor_nombre, { shouldDirty: true });
    }
  };

  // Auto-completar RIF cuando el usuario elige un nombre del datalist
  const handleNombreChange = (e) => {
    const nombre = e.target.value;
    const encontrado = proveedores.find(
      p => p.proveedor_nombre?.toLowerCase() === nombre.toLowerCase()
    );
    if (encontrado && encontrado.proveedor_rif) {
      setValue('proveedorRif', encontrado.proveedor_rif, { shouldDirty: true });
    }
  };

  const onSubmit = async (datos) => {
    setMensaje(null);
    try {
      await gastosService.crear({
        fecha: datos.fecha,
        tipo: datos.tipo,
        categoriaId: datos.categoriaId || null,
        descripcion: datos.descripcion,
        monto: parseFloat(datos.monto),
        moneda: datos.moneda,
        proveedorRif:    datos.proveedorRif    || undefined,
        proveedorNombre: datos.proveedorNombre || undefined,
        numeroFactura:   datos.numeroFactura   || undefined,
        cuentaDestino:   datos.cuentaDestino   || undefined,
      });
      setMensaje({ tipo: 'exito', texto: 'Gasto registrado correctamente' });
      reset({ tipo: 'eventual', moneda: 'VES', fecha: hoyDB() });
      await cargarGastos();
      await cargarProveedores();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al guardar el gasto' });
    }
  };

  const eliminarGasto = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    setEliminando(id);
    try {
      await gastosService.eliminar(id);
      await cargarGastos();
    } finally {
      setEliminando(null);
    }
  };

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipoSeleccionado);

  // ── Datos para gráficas ──────────────────────────────────────────────────
  const TOP_DONA = 8;
  const donutData = [
    ...resumen.slice(0, TOP_DONA).map(p => ({
      name: p.proveedor_nombre,
      value: parseFloat(p.total_usd),
    })),
    ...(resumen.length > TOP_DONA
      ? [{ name: 'Otros', value: resumen.slice(TOP_DONA).reduce((s, p) => s + parseFloat(p.total_usd), 0) }]
      : []),
  ];

  const totalResumenUSD = resumen.reduce((s, p) => s + parseFloat(p.total_usd), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <TasaAlerta />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gp-border">
        {['registro', 'historial', 'proveedores'].map(v => (
          <button
            key={v}
            onClick={() => setVistaActiva(v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              vistaActiva === v
                ? 'border-gp-fucsia text-gp-fucsia-t'
                : 'border-transparent text-gp-text3 hover:text-gp-text2'
            }`}
          >
            {v === 'registro' ? 'Nuevo Gasto' : v === 'historial' ? `Historial (${total})` : 'Proveedores'}
          </button>
        ))}
      </div>

      {/* ── Registro ──────────────────────────────────────────────────────── */}
      {vistaActiva === 'registro' && (
        <div className="tarjeta">
          <h3 className="font-semibold text-gp-text mb-4">Registrar Gasto</h3>

          {mensaje && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              mensaje.tipo === 'exito'
                ? 'bg-green-900/30 text-green-300 border-green-700/40'
                : 'bg-red-900/30 text-red-300 border-red-700/40'
            }`}>
              {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-3 gap-2">
              {['factura', 'eventual', 'divisas'].map(tipo => (
                <label
                  key={tipo}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer
                               transition-colors capitalize text-sm ${
                    watch('tipo') === tipo
                      ? 'bg-gp-fucsia-dim border-gp-fucsia/50 text-gp-fucsia-t'
                      : 'border-gp-border text-gp-text2 hover:border-gp-border2 hover:bg-gp-hover'
                  }`}
                >
                  <input type="radio" value={tipo} {...register('tipo')} className="sr-only" />
                  <span>{TIPO_ESTILO[tipo]?.icono}</span>
                  {tipo}
                </label>
              ))}
            </div>

            {/* Fecha + Moneda */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gp-text2 mb-1">Fecha</label>
                <input type="date" className="input-campo" {...register('fecha', { required: 'Requerido' })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gp-text2 mb-1">Moneda</label>
                <select className="input-campo" {...register('moneda')}>
                  <option value="VES">Bolívares (Bs.)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
            </div>

            {/* Categoría + Monto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gp-text2 mb-1">Categoría</label>
                <select className="input-campo" {...register('categoriaId')}>
                  <option value="">Sin categoría</option>
                  {categoriasFiltradas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gp-text2 mb-1">Monto</label>
                <Controller name="monto" control={control}
                  rules={{ required: 'Requerido', min: { value: 0.01, message: 'Debe ser > 0' } }}
                  render={({ field }) => (
                    <MontoInput {...field} disabled={!tasaHoy}
                      className={`input-campo ${errors.monto ? 'input-error' : ''}`} />
                  )}
                />
                {errors.monto && <p className="text-xs text-gp-error mt-1">{errors.monto.message}</p>}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gp-text2 mb-1">Descripción</label>
              <textarea
                rows={2}
                className={`input-campo resize-none ${errors.descripcion ? 'input-error' : ''}`}
                placeholder="Descripción del gasto..."
                {...register('descripcion', { required: 'La descripción es requerida' })}
              />
              {errors.descripcion && <p className="text-xs text-gp-error mt-1">{errors.descripcion.message}</p>}
            </div>

            {/* Cuenta que absorbe el egreso */}
            <div>
              <label className="block text-sm font-medium text-gp-text2 mb-1">Débita de cuenta</label>
              <select className="input-campo" {...register('cuentaDestino')}>
                <option value="">— No afectar tesorería —</option>
                {cuentasOptions.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-xs text-gp-text3 mt-1">
                Si se selecciona, el monto se registrará como egreso en esa cuenta de tesorería.
              </p>
            </div>

            {/* Campos solo para facturas de proveedor */}
            {tipoSeleccionado === 'factura' && (
              <div className="p-4 bg-gp-card2 rounded-lg border border-gp-border space-y-3">
                <p className="text-xs font-medium text-gp-text3 uppercase tracking-wide">Datos del Proveedor</p>

                <datalist id="lista-rif">
                  {proveedores.filter(p => p.proveedor_rif).map(p => (
                    <option key={p.proveedor_rif} value={p.proveedor_rif}>{p.proveedor_nombre}</option>
                  ))}
                </datalist>
                <datalist id="lista-nombres">
                  {proveedores.map((p, i) => (
                    <option key={i} value={p.proveedor_nombre} />
                  ))}
                </datalist>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gp-text3 mb-1">RIF Proveedor</label>
                    <input
                      type="text"
                      list="lista-rif"
                      className="input-campo text-sm"
                      placeholder="J-12345678-9"
                      {...register('proveedorRif')}
                      onChange={e => {
                        register('proveedorRif').onChange(e);
                        handleRifChange(e);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gp-text3 mb-1">Nombre Proveedor</label>
                    <input
                      type="text"
                      list="lista-nombres"
                      className="input-campo text-sm"
                      {...register('proveedorNombre')}
                      onChange={e => {
                        register('proveedorNombre').onChange(e);
                        handleNombreChange(e);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gp-text3 mb-1">N° Factura</label>
                    <input type="text" className="input-campo text-sm" {...register('numeroFactura')} />
                  </div>
                </div>

                {proveedores.length > 0 && (
                  <p className="text-xs text-gp-text3">
                    💡 {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} en historial — escribe para autocompletar
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting || !tasaHoy} className="btn-primario">
                {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Historial ─────────────────────────────────────────────────────── */}
      {vistaActiva === 'historial' && (
        <div className="tarjeta">
          <h3 className="font-semibold text-gp-text mb-4">Historial de Gastos</h3>
          {gastos.length === 0 ? (
            <p className="text-sm text-gp-text3 text-center py-4">Sin registros</p>
          ) : (
            <div className="space-y-2">
              {gastos.map(g => (
                <div key={g.id} className="flex items-start justify-between p-3 bg-gp-card2 rounded-lg
                                           border border-gp-border hover:border-gp-border2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gp-text3">{aFormatoUI(g.fecha)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TIPO_ESTILO[g.tipo]?.badge ?? ''}`}>
                        {g.tipo}
                      </span>
                      {g.categoria_nombre && (
                        <span className="text-xs text-gp-text3">{g.categoria_nombre}</span>
                      )}
                    </div>
                    <p className="text-sm text-gp-text mt-1 truncate">{g.descripcion}</p>
                    {g.proveedor_nombre && (
                      <p className="text-xs text-gp-text3 mt-0.5">
                        {g.proveedor_rif && <span className="font-mono">{g.proveedor_rif} — </span>}
                        {g.proveedor_nombre}
                        {g.numero_factura && <span> — Fact. {g.numero_factura}</span>}
                      </p>
                    )}
                    {g.cuenta_destino && (
                      <p className="text-xs text-gp-text3 mt-0.5">
                        🏦 {g.cuenta_destino}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <p className="font-semibold text-gp-dorado-t text-sm">
                      {g.moneda === 'VES' ? formatearVES(g.monto) : formatearUSD(g.monto)}
                    </p>
                    {g.monto_convertido && (
                      <p className="text-xs text-gp-text3">
                        ≈ {g.moneda === 'VES' ? formatearUSD(g.monto_convertido) : formatearVES(g.monto_convertido)}
                      </p>
                    )}
                    {esAdmin && (
                      <button
                        onClick={() => eliminarGasto(g.id)}
                        disabled={eliminando === g.id}
                        className="text-xs text-gp-error hover:text-red-300 mt-1"
                      >
                        {eliminando === g.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dashboard proveedores ─────────────────────────────────────────── */}
      {vistaActiva === 'proveedores' && (
        <div className="space-y-4">

          {/* Filtro de periodo */}
          <div className="tarjeta">
            <div className="flex flex-wrap gap-2 items-center">
              {PERIODOS.map(p => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodo(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    periodo === p.value
                      ? 'bg-gp-fucsia-dim border-gp-fucsia/50 text-gp-fucsia-t'
                      : 'border-gp-border text-gp-text3 hover:border-gp-border2 hover:text-gp-text2'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => { setFechaDesde(e.target.value); setPeriodo(''); }}
                  className="input-inline text-xs"
                />
                <span className="text-gp-text3 text-xs">—</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => { setFechaHasta(e.target.value); setPeriodo(''); }}
                  className="input-inline text-xs"
                />
              </div>
            </div>
          </div>

          {cargandoDash ? (
            <div className="tarjeta text-center py-12">
              <p className="text-gp-text3 text-sm">Cargando datos...</p>
            </div>
          ) : resumen.length === 0 ? (
            <div className="tarjeta text-center py-12">
              <p className="text-gp-text3 text-sm">Sin gastos con proveedor en el período seleccionado</p>
            </div>
          ) : (
            <>
              {/* Tarjetas resumen */}
              {totalesDash && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="tarjeta text-center py-4">
                    <p className="text-xs text-gp-text3 mb-1">Total gastado</p>
                    <p className="text-xl font-bold text-gp-fucsia-t">{formatearUSD(totalesDash.total_usd)}</p>
                    <p className="text-xs text-gp-text3 mt-0.5">{formatearVES(totalesDash.total_ves)}</p>
                  </div>
                  <div className="tarjeta text-center py-4">
                    <p className="text-xs text-gp-text3 mb-1">Proveedores</p>
                    <p className="text-xl font-bold text-gp-dorado-t">{totalesDash.cantidad_proveedores}</p>
                    <p className="text-xs text-gp-text3 mt-0.5">distintos</p>
                  </div>
                  <div className="tarjeta text-center py-4">
                    <p className="text-xs text-gp-text3 mb-1">Facturas</p>
                    <p className="text-xl font-bold text-gp-text">{totalesDash.cantidad_total}</p>
                    <p className="text-xs text-gp-text3 mt-0.5">registradas</p>
                  </div>
                </div>
              )}

              {/* Gráfica de barras horizontal — ranking proveedores */}
              <div className="tarjeta">
                <h3 className="font-semibold text-gp-text mb-4 text-sm">Gasto por proveedor (mayor a menor)</h3>
                <ResponsiveContainer width="100%" height={Math.max(260, resumen.length * 42)}>
                  <BarChart
                    data={resumen}
                    layout="vertical"
                    margin={{ left: 8, right: 32, top: 2, bottom: 2 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#252525" />
                    <XAxis
                      type="number"
                      domain={[0, dataMax => Math.ceil(dataMax * 1.08)]}
                      tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`}
                      tick={{ fill: '#6a6a6a', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="proveedor_nombre"
                      width={155}
                      tick={{ fill: '#b0b0b0', fontSize: 11 }}
                      tickFormatter={v => v.length > 22 ? v.slice(0, 22) + '…' : v}
                    />
                    <Tooltip content={<TooltipGrafica />} cursor={{ fill: '#1e1e1e' }} />
                    <Bar dataKey="total_usd" fill="#e91e8c" radius={[0, 4, 4, 0]}>
                      {resumen.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de dona — distribución */}
              {resumen.length > 1 && (
                <div className="tarjeta">
                  <h3 className="font-semibold text-gp-text mb-4 text-sm">Distribución del gasto</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={COLORES[i % COLORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<TooltipDona />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={v => <span style={{ color: '#b0b0b0', fontSize: 11 }}>{v.length > 18 ? v.slice(0, 18) + '…' : v}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabla ranking completo */}
              <div className="tarjeta overflow-hidden">
                <h3 className="font-semibold text-gp-text mb-4 text-sm">Ranking completo</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gp-border">
                        <th className="text-left py-2 text-gp-text3 font-medium w-6">#</th>
                        <th className="text-left py-2 text-gp-text3 font-medium">Proveedor</th>
                        <th className="text-right py-2 text-gp-text3 font-medium">Total USD</th>
                        <th className="text-right py-2 text-gp-text3 font-medium">Total Bs.</th>
                        <th className="text-right py-2 text-gp-text3 font-medium">%</th>
                        <th className="text-right py-2 text-gp-text3 font-medium">Fact.</th>
                        <th className="text-right py-2 text-gp-text3 font-medium">Último</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.map((p, i) => {
                        const pct = totalResumenUSD > 0
                          ? ((parseFloat(p.total_usd) / totalResumenUSD) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <tr key={i} className="border-b border-gp-border hover:bg-gp-hover transition-colors">
                            <td className="py-2.5 text-gp-text3 font-mono text-xs">{i + 1}</td>
                            <td className="py-2.5">
                              <p className="text-gp-text font-medium truncate max-w-[180px]">{p.proveedor_nombre}</p>
                              {p.proveedor_rif && (
                                <p className="text-xs text-gp-text3 font-mono">{p.proveedor_rif}</p>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-bold font-mono" style={{ color: COLORES[i % COLORES.length] }}>
                              {formatearUSD(p.total_usd)}
                            </td>
                            <td className="py-2.5 text-right text-gp-text3 font-mono text-xs">
                              {formatearVES(p.total_ves)}
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-12 h-1.5 rounded-full bg-gp-border overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: COLORES[i % COLORES.length] }}
                                  />
                                </div>
                                <span className="text-xs text-gp-text3 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right text-gp-text3 text-xs">{p.cantidad}</td>
                            <td className="py-2.5 text-right text-gp-text3 text-xs">{aFormatoUI(p.ultima_fecha)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GastosPage;
