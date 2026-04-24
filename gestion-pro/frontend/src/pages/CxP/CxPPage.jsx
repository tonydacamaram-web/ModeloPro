import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useTasa } from '../../context/TasaContext';
import cxpService from '../../services/cxpService';
import { formatearMonto, formatearUSD, formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const METODOS_PAGO = [
  { value: 'efectivo_bs',   label: 'Efectivo Bs' },
  { value: 'efectivo_usd',  label: 'Efectivo USD' },
  { value: 'pago_movil',    label: 'Pago Móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'zelle',         label: 'Zelle' },
  { value: 'binance',       label: 'Binance' },
];

const ESTADO_BADGE = {
  pendiente: 'badge-pendiente',
  parcial:   'badge-parcial',
  pagada:    'badge-pagada',
  vencida:   'badge-vencida',
};

const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  parcial:   'Parcial',
  pagada:    'Pagada',
  vencida:   'Vencida',
};

// ── Modal nuevo proveedor ─────────────────────────────────────────────────────
function ModalNuevoProveedor({ onCreado, onCerrar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');

  const onSubmit = async (datos) => {
    setError('');
    try {
      const proveedor = await cxpService.crearProveedor({
        nombre: datos.nombre, rif: datos.rif, telefono: datos.telefono,
      });
      onCreado(proveedor);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el proveedor');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-gp-card border border-gp-border rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gp-text">Nuevo proveedor</h3>
          <button onClick={onCerrar} className="text-gp-text3 hover:text-gp-text transition-colors">✕</button>
        </div>
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-900/30 text-gp-error border border-red-700/40">{error}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs text-gp-text2 mb-1">Nombre *</label>
            <input className="input-inline w-full" placeholder="Razón social o nombre"
              {...register('nombre', { required: 'El nombre es requerido' })} />
            {errors.nombre && <p className="text-xs text-gp-error mt-1">{errors.nombre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gp-text2 mb-1">RIF</label>
              <input className="input-inline w-full" placeholder="J-12345678-9" {...register('rif')} />
            </div>
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Teléfono</label>
              <input className="input-inline w-full" placeholder="0212-1234567" {...register('telefono')} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primario flex-1 text-sm py-1.5" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear proveedor'}
            </button>
            <button type="button" className="btn-secundario text-sm py-1.5 px-4" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal detalle CxP + pagos ─────────────────────────────────────────────────
function ModalDetalle({ cxpId, esAdmin, onCerrar, onCambiado }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), moneda: 'VES', metodoPago: 'transferencia' },
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await cxpService.obtener(cxpId);
      setDetalle(d);
    } finally {
      setCargando(false);
    }
  }, [cxpId]);

  useEffect(() => { cargar(); }, [cargar]);

  const onSubmitAbono = async (datos) => {
    setError('');
    try {
      await cxpService.crearAbono(cxpId, {
        fecha: datos.fecha, monto: parseFloat(datos.monto),
        moneda: datos.moneda, metodoPago: datos.metodoPago, nota: datos.nota,
      });
      reset({ fecha: hoyDB(), moneda: 'VES', metodoPago: 'transferencia' });
      setMostrarForm(false);
      await cargar();
      onCambiado();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar pago');
    }
  };

  const handleEliminarAbono = async (abonoId) => {
    if (!window.confirm('¿Eliminar este pago?')) return;
    try {
      await cxpService.eliminarAbono(cxpId, abonoId);
      await cargar();
      onCambiado();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3" onClick={onCerrar}>
      <div className="border border-gp-border rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col"
           style={{ backgroundColor: '#111111' }}
           onClick={e => e.stopPropagation()}>

        {/* Cabecera compacta */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gp-border">
          {cargando ? (
            <p className="text-gp-text2 text-xs">Cargando...</p>
          ) : detalle ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gp-text leading-tight truncate">
                  {detalle.proveedor_nombre}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {detalle.proveedor_rif && detalle.proveedor_rif !== detalle.proveedor_nombre && (
                    <span className="text-xs text-gp-text3">{detalle.proveedor_rif}</span>
                  )}
                  <span className={`${ESTADO_BADGE[detalle.estado]} py-0`}>
                    {ESTADO_LABEL[detalle.estado]}
                  </span>
                  {detalle.numero_factura && (
                    <span className="text-xs text-gp-text3">Fact: {detalle.numero_factura}</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <button onClick={onCerrar} className="text-gp-text3 hover:text-gp-text transition-colors ml-3 flex-shrink-0">✕</button>
        </div>

        {detalle && (
          <div className="flex-1 overflow-y-auto rounded-b-xl" style={{ backgroundColor: '#111111' }}>

            {/* Bloque superior: descripción + montos + fechas en una franja */}
            <div className="px-4 py-3 border-b border-gp-border grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Descripción y fechas */}
              <div className="space-y-1.5">
                <p className="text-xs text-gp-text2 leading-snug">{detalle.descripcion}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gp-text3">
                  <span>📅 {aFormatoUI(detalle.fecha)}</span>
                  {detalle.fecha_vencimiento && (
                    <span className={detalle.estado === 'vencida' ? 'text-gp-error font-medium' : ''}>
                      ⏰ Vence: {aFormatoUI(detalle.fecha_vencimiento)}
                    </span>
                  )}
                </div>
              </div>

              {/* Montos en fila compacta */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total',  valor: formatearMonto(detalle.monto_total, detalle.moneda), color: 'text-gp-text' },
                  { label: 'Pagado', valor: formatearMonto(detalle.total_abonado || 0, detalle.moneda), color: 'text-gp-ok' },
                  { label: 'Saldo',  valor: formatearMonto(Math.max(0, detalle.monto_total - (detalle.total_abonado || 0)), detalle.moneda),
                    color: detalle.estado === 'pagada' ? 'text-gp-ok' : 'text-gp-error' },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="bg-gp-card2 border border-gp-border2 rounded-lg px-2 py-2 text-center">
                    <p className="text-[10px] text-gp-text3 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className={`text-xs font-bold ${color} leading-tight`}>{valor}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagos */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gp-text uppercase tracking-wide">
                  Pagos registrados
                  {detalle.abonos?.length > 0 && (
                    <span className="ml-1.5 text-gp-text3 font-normal normal-case">({detalle.abonos.length})</span>
                  )}
                </h4>
                {detalle.estado !== 'pagada' && (
                  <button
                    className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--gp-fucsia)', color: '#fff' }}
                    onClick={() => setMostrarForm(v => !v)}
                  >
                    {mostrarForm ? 'Cancelar' : '+ Pagar'}
                  </button>
                )}
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg text-xs bg-red-900/30 text-gp-error border border-red-700/40">{error}</div>
              )}

              {/* Formulario de abono compacto */}
              {mostrarForm && (
                <form onSubmit={handleSubmit(onSubmitAbono)}
                      className="bg-gp-card2 border border-gp-border2 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-gp-text3 mb-0.5 uppercase tracking-wide">Fecha *</label>
                      <input type="date" className="input-inline w-full text-xs py-1"
                        {...register('fecha', { required: true })} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gp-text3 mb-0.5 uppercase tracking-wide">Monto *</label>
                      <div className="flex gap-1">
                        <input type="number" step="0.01" min="0.01" className="input-inline flex-1 text-xs py-1"
                          placeholder="0.00"
                          {...register('monto', { required: true, min: 0.01 })} />
                        <select className="select-inline text-xs py-1" {...register('moneda')}>
                          <option value="VES">Bs</option>
                          <option value="USD">$</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gp-text3 mb-0.5 uppercase tracking-wide">Método *</label>
                      <select className="select-inline w-full text-xs py-1" {...register('metodoPago', { required: true })}>
                        {METODOS_PAGO.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gp-text3 mb-0.5 uppercase tracking-wide">Nota</label>
                      <input className="input-inline w-full text-xs py-1" placeholder="Ref..."
                        {...register('nota')} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primario text-xs py-1.5 w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Registrar pago'}
                  </button>
                </form>
              )}

              {/* Tabla de pagos compacta */}
              {detalle.abonos?.length === 0 ? (
                <p className="text-xs text-gp-text3 py-2">Sin pagos registrados</p>
              ) : (
                <div className="rounded-lg border border-gp-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gp-card2 text-left border-b border-gp-border">
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gp-text3 uppercase tracking-wide">Fecha</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gp-text3 uppercase tracking-wide">Método</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gp-text3 uppercase tracking-wide text-right">Monto</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gp-text3 uppercase tracking-wide">Nota</th>
                        {esAdmin && <th className="px-3 py-1.5 w-6"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gp-border">
                      {detalle.abonos?.map(a => (
                        <tr key={a.id} className="hover:bg-gp-hover">
                          <td className="px-3 py-1.5 text-xs text-gp-text2 whitespace-nowrap">{aFormatoUI(a.fecha)}</td>
                          <td className="px-3 py-1.5 text-xs text-gp-text2 whitespace-nowrap">
                            {METODOS_PAGO.find(m => m.value === a.metodo_pago)?.label || a.metodo_pago}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-right font-medium text-gp-ok whitespace-nowrap">
                            {formatearMonto(a.monto, a.moneda)}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-gp-text3 max-w-[160px] truncate">
                            {a.nota || '—'}
                          </td>
                          {esAdmin && (
                            <td className="px-3 py-1.5 text-center">
                              <button onClick={() => handleEliminarAbono(a.id)}
                                className="text-gp-text3 hover:text-gp-error transition-colors text-xs leading-none">✕</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const CxPPage = () => {
  const { esAdmin } = useAuth();
  const { tasa } = useTasa();
  const [tab, setTab] = useState('lista');
  const [cuentas, setCuentas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [cxpSeleccionada, setCxpSeleccionada] = useState(null);
  const [mostrarModalProveedor, setMostrarModalProveedor] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), moneda: 'VES' },
  });

  const moneda     = watch('moneda');
  const montoWatch = parseFloat(watch('montoTotal') || 0);
  const equivalente = tasa && montoWatch > 0
    ? (moneda === 'USD'
        ? formatearVES(montoWatch * tasa.tasa_bcv)
        : formatearUSD(montoWatch / tasa.tasa_bcv))
    : null;

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [listado, provs, res] = await Promise.all([
        cxpService.listar({
          estado:      filtroEstado     || undefined,
          proveedorId: filtroProveedor  || undefined,
        }),
        cxpService.listarProveedores(),
        cxpService.resumen(),
      ]);
      setCuentas(listado.cuentas || []);
      setProveedores(provs);
      setResumen(res);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, filtroProveedor]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onSubmit = async (datos) => {
    setMensaje(null);
    try {
      await cxpService.crear({
        proveedorId:      parseInt(datos.proveedorId),
        fecha:            datos.fecha,
        descripcion:      datos.descripcion,
        numeroFactura:    datos.numeroFactura || null,
        montoTotal:       parseFloat(datos.montoTotal),
        moneda:           datos.moneda,
        fechaVencimiento: datos.fechaVencimiento || null,
      });
      reset({ fecha: hoyDB(), moneda: 'VES' });
      mostrarMensaje('exito', 'Cuenta por pagar registrada correctamente');
      await cargarDatos();
      setTab('lista');
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al registrar la cuenta');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta y sus pagos?')) return;
    try {
      await cxpService.eliminar(id);
      await cargarDatos();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleProveedorCreado = (proveedor) => {
    setProveedores(prev => [...prev, proveedor]);
    setMostrarModalProveedor(false);
  };

  const tarjetas = resumen ? [
    { label: 'Pendientes',   valor: resumen.pendientes, color: 'text-gp-warn',    bg: 'bg-amber-900/20  border-amber-700/30' },
    { label: 'Parciales',    valor: resumen.parciales,  color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/30' },
    { label: 'Vencidas',     valor: resumen.vencidas,   color: 'text-gp-error',   bg: 'bg-red-900/20    border-red-700/30' },
    { label: 'Por pagar USD', valor: formatearUSD(resumen.total_pendiente_usd), color: 'text-gp-info',      bg: 'bg-sky-900/20   border-sky-700/30' },
    { label: 'Por pagar VES', valor: formatearVES(resumen.total_pendiente_ves), color: 'text-gp-fucsia-t',  bg: 'bg-gp-fucsia-dim border border-gp-fucsia/20' },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {mensaje && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          mensaje.tipo === 'exito'
            ? 'bg-green-900/30 text-gp-ok border border-green-700/40'
            : 'bg-red-900/30 text-gp-error border border-red-700/40'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gp-card border border-gp-border rounded-xl p-1">
        {[
          { id: 'lista', label: 'Lista de cuentas' },
          { id: 'nueva', label: 'Nueva cuenta' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'text-white' : 'text-gp-text2 hover:text-gp-text hover:bg-gp-hover'
            }`}
            style={tab === t.id ? { backgroundColor: 'var(--gp-fucsia)' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Lista ────────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <div className="space-y-4">

          {resumen && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {tarjetas.map(t => (
                <div key={t.label} className={`rounded-xl p-3 border ${t.bg} text-center`}>
                  <p className={`text-lg font-bold ${t.color}`}>{t.valor}</p>
                  <p className="text-xs text-gp-text3 mt-0.5">{t.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <select className="select-inline" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="vencida">Vencida</option>
              <option value="pagada">Pagada</option>
            </select>
            <select className="select-inline" value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {cargando ? (
            <p className="text-sm text-gp-text3 py-6 text-center">Cargando...</p>
          ) : cuentas.length === 0 ? (
            <div className="bg-gp-card border border-gp-border rounded-xl p-10 text-center">
              <p className="text-gp-text3 text-sm">No hay cuentas por pagar registradas</p>
              <button
                className="mt-3 text-sm font-medium transition-colors"
                style={{ color: 'var(--gp-fucsia)' }}
                onClick={() => setTab('nueva')}
              >
                + Registrar primera cuenta
              </button>
            </div>
          ) : (
            <div className="bg-gp-card border border-gp-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gp-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Proveedor</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Descripción</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Factura</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Fecha</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Vence</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3 text-right">Total</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3 text-right">Pagado</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3 text-right">Saldo</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Estado</th>
                      {esAdmin && <th className="px-4 py-3 w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gp-border">
                    {cuentas.map(c => {
                      const saldo = parseFloat(c.monto_total) - parseFloat(c.total_abonado || 0);
                      return (
                        <tr key={c.id}
                            className="hover:bg-gp-hover cursor-pointer transition-colors"
                            onClick={() => setCxpSeleccionada(c.id)}>
                          <td className="px-4 py-3">
                            <p className="text-gp-text font-medium">{c.proveedor_nombre}</p>
                            {c.proveedor_rif && c.proveedor_rif !== c.proveedor_nombre && (
                              <p className="text-xs text-gp-text3">{c.proveedor_rif}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gp-text2 max-w-xs truncate">{c.descripcion}</td>
                          <td className="px-4 py-3 text-gp-text3 text-xs">{c.numero_factura || '—'}</td>
                          <td className="px-4 py-3 text-gp-text2 whitespace-nowrap">{aFormatoUI(c.fecha)}</td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm ${c.estado === 'vencida' ? 'text-gp-error' : 'text-gp-text2'}`}>
                            {c.fecha_vencimiento ? aFormatoUI(c.fecha_vencimiento) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gp-text whitespace-nowrap">
                            {formatearMonto(c.monto_total, c.moneda)}
                          </td>
                          <td className="px-4 py-3 text-right text-gp-ok whitespace-nowrap">
                            {formatearMonto(c.total_abonado || 0, c.moneda)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {c.estado === 'pagada'
                              ? <span className="text-gp-ok">✓</span>
                              : <span className="text-gp-error font-medium">{formatearMonto(Math.max(0, saldo), c.moneda)}</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={ESTADO_BADGE[c.estado]}>{ESTADO_LABEL[c.estado]}</span>
                          </td>
                          {esAdmin && (
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleEliminar(c.id)}
                                className="text-gp-text3 hover:text-gp-error transition-colors">✕</button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Nueva cuenta ───────────────────────────────────────────────── */}
      {tab === 'nueva' && (
        <div className="bg-gp-card border border-gp-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-gp-text mb-1">Nueva cuenta por pagar</h2>
          <p className="text-xs text-gp-text3 mb-4">Registra una deuda o compromiso de pago con un proveedor.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Proveedor */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Proveedor *</label>
                <div className="flex gap-1.5">
                  <select className="select-inline flex-1"
                    {...register('proveedorId', { required: 'Selecciona un proveedor' })}>
                    <option value="">— Seleccionar —</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}{p.rif ? ` (${p.rif})` : ''}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-secundario text-sm px-2 py-1"
                          onClick={() => setMostrarModalProveedor(true)} title="Nuevo proveedor">+</button>
                </div>
                {errors.proveedorId && <p className="text-xs text-gp-error mt-1">{errors.proveedorId.message}</p>}
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Fecha *</label>
                <input type="date" className="input-inline w-full"
                  {...register('fecha', { required: 'La fecha es requerida' })} />
                {errors.fecha && <p className="text-xs text-gp-error mt-1">{errors.fecha.message}</p>}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Descripción / Producto o servicio *</label>
              <textarea className="input-inline w-full resize-none" rows={2}
                placeholder="Detalle del producto o servicio..."
                {...register('descripcion', { required: 'La descripción es requerida' })} />
              {errors.descripcion && <p className="text-xs text-gp-error mt-1">{errors.descripcion.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Número de factura */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">N° Factura</label>
                <input className="input-inline w-full" placeholder="00-12345"
                  {...register('numeroFactura')} />
              </div>

              {/* Vencimiento */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Fecha de vencimiento</label>
                <input type="date" className="input-inline w-full" {...register('fechaVencimiento')} />
              </div>
            </div>

            {/* Monto */}
            <div className="w-1/2">
              <label className="block text-xs text-gp-text2 mb-1">Monto *</label>
              <div className="flex gap-1.5">
                <input type="number" step="0.01" min="0.01" className="input-inline flex-1"
                  placeholder="0.00"
                  {...register('montoTotal', {
                    required: 'El monto es requerido',
                    min: { value: 0.01, message: 'Monto inválido' },
                  })} />
                <select className="select-inline" {...register('moneda')}>
                  <option value="VES">VES</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              {equivalente && <p className="text-xs text-gp-text3 mt-1">≈ {equivalente}</p>}
              {errors.montoTotal && <p className="text-xs text-gp-error mt-1">{errors.montoTotal.message}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primario" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Registrar cuenta'}
              </button>
              <button type="button" className="btn-secundario"
                      onClick={() => reset({ fecha: hoyDB(), moneda: 'VES' })}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modales */}
      {mostrarModalProveedor && (
        <ModalNuevoProveedor onCreado={handleProveedorCreado} onCerrar={() => setMostrarModalProveedor(false)} />
      )}
      {cxpSeleccionada && (
        <ModalDetalle
          cxpId={cxpSeleccionada}
          esAdmin={esAdmin}
          onCerrar={() => setCxpSeleccionada(null)}
          onCambiado={cargarDatos}
        />
      )}
    </div>
  );
};

export default CxPPage;
