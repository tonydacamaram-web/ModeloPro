import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useTasa } from '../../context/TasaContext';
import cxcService from '../../services/cxcService';
import { formatearMonto, formatearUSD, formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const METODOS_PAGO = [
  { value: 'efectivo_bs',   label: 'Efectivo Bs' },
  { value: 'efectivo_usd',  label: 'Efectivo USD' },
  { value: 'pago_movil',    label: 'Pago Móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'pos_debito',    label: 'POS Débito' },
  { value: 'pos_credito',   label: 'POS Crédito' },
  { value: 'zelle',         label: 'Zelle' },
  { value: 'binance',       label: 'Binance' },
  { value: 'biopago',       label: 'BioPago' },
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

// ── Modal nuevo cliente ───────────────────────────────────────────────────────
function ModalNuevoCliente({ onCreado, onCerrar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');

  const onSubmit = async (datos) => {
    setError('');
    try {
      const cliente = await cxcService.crearCliente({
        nombre: datos.nombre, rifCedula: datos.rifCedula, telefono: datos.telefono,
      });
      onCreado(cliente);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el cliente');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-gp-card border border-gp-border rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gp-text">Nuevo cliente</h3>
          <button onClick={onCerrar} className="text-gp-text3 hover:text-gp-text transition-colors">✕</button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-900/30 text-gp-error border border-red-700/40">{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs text-gp-text2 mb-1">Nombre *</label>
            <input className="input-inline w-full" placeholder="Nombre completo o razón social"
              {...register('nombre', { required: 'El nombre es requerido' })} />
            {errors.nombre && <p className="text-xs text-gp-error mt-1">{errors.nombre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gp-text2 mb-1">RIF / Cédula</label>
              <input className="input-inline w-full" placeholder="J-12345678-9" {...register('rifCedula')} />
            </div>
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Teléfono</label>
              <input className="input-inline w-full" placeholder="0414-1234567" {...register('telefono')} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primario flex-1 text-sm py-1.5" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear cliente'}
            </button>
            <button type="button" className="btn-secundario text-sm py-1.5 px-4" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal detalle CxC + abonos ────────────────────────────────────────────────
function ModalDetalle({ cxcId, esAdmin, onCerrar, onCambiado }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), moneda: 'VES', metodoPago: 'pago_movil' },
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await cxcService.obtener(cxcId);
      setDetalle(d);
    } finally {
      setCargando(false);
    }
  }, [cxcId]);

  useEffect(() => { cargar(); }, [cargar]);

  const onSubmitAbono = async (datos) => {
    setError('');
    try {
      await cxcService.crearAbono(cxcId, {
        fecha: datos.fecha, monto: parseFloat(datos.monto),
        moneda: datos.moneda, metodoPago: datos.metodoPago, nota: datos.nota,
      });
      reset({ fecha: hoyDB(), moneda: 'VES', metodoPago: 'pago_movil' });
      setMostrarForm(false);
      await cargar();
      onCambiado();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar abono');
    }
  };

  const handleEliminarAbono = async (abonoId) => {
    if (!window.confirm('¿Eliminar este abono?')) return;
    try {
      await cxcService.eliminarAbono(cxcId, abonoId);
      await cargar();
      onCambiado();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="border border-gp-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
           style={{ backgroundColor: '#111111' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gp-border">
          {cargando ? (
            <p className="text-gp-text2 text-sm">Cargando...</p>
          ) : detalle ? (
            <div>
              <h3 className="text-base font-semibold text-gp-text">{detalle.cliente_nombre}</h3>
              {detalle.cliente_rif && <p className="text-xs text-gp-text3 mt-0.5">{detalle.cliente_rif}</p>}
            </div>
          ) : null}
          <button onClick={onCerrar} className="text-gp-text3 hover:text-gp-text transition-colors ml-4">✕</button>
        </div>

        {detalle && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 rounded-b-xl" style={{ backgroundColor: '#111111' }}>
            {/* Descripción */}
            <p className="text-sm text-gp-text2">{detalle.descripcion}</p>

            {/* Montos */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total',    valor: formatearMonto(detalle.monto_total, detalle.moneda),           color: 'text-gp-text' },
                { label: 'Abonado',  valor: formatearMonto(detalle.total_abonado || 0, detalle.moneda),    color: 'text-gp-ok' },
                { label: 'Saldo',    valor: formatearMonto(Math.max(0, detalle.monto_total - (detalle.total_abonado || 0)), detalle.moneda),
                  color: detalle.estado === 'pagada' ? 'text-gp-ok' : 'text-gp-warn' },
              ].map(({ label, valor, color }) => (
                <div key={label} className="bg-gp-card2 border border-gp-border2 rounded-lg p-3 text-center">
                  <p className="text-xs text-gp-text3 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{valor}</p>
                </div>
              ))}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-gp-text3">
              <span className={ESTADO_BADGE[detalle.estado]}>{ESTADO_LABEL[detalle.estado]}</span>
              <span>Fecha: {aFormatoUI(detalle.fecha)}</span>
              {detalle.fecha_vencimiento && (
                <span className={detalle.estado === 'vencida' ? 'text-gp-error' : ''}>
                  Vence: {aFormatoUI(detalle.fecha_vencimiento)}
                </span>
              )}
            </div>

            {/* Abonos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gp-text">Abonos</h4>
                {detalle.estado !== 'pagada' && (
                  <button
                    className="text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--gp-fucsia)', color: '#fff' }}
                    onClick={() => setMostrarForm(v => !v)}
                  >
                    {mostrarForm ? 'Cancelar' : '+ Abonar'}
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-900/30 text-gp-error border border-red-700/40">{error}</div>
              )}

              {/* Formulario abono */}
              {mostrarForm && (
                <form onSubmit={handleSubmit(onSubmitAbono)}
                      className="bg-gp-card2 border border-gp-border2 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">Fecha *</label>
                      <input type="date" className="input-inline w-full"
                        {...register('fecha', { required: true })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">Monto *</label>
                      <div className="flex gap-1">
                        <input type="number" step="0.01" min="0.01" className="input-inline flex-1"
                          placeholder="0.00"
                          {...register('monto', { required: true, min: 0.01 })} />
                        <select className="select-inline" {...register('moneda')}>
                          <option value="VES">VES</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">Método *</label>
                      <select className="select-inline w-full" {...register('metodoPago', { required: true })}>
                        {METODOS_PAGO.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">Nota</label>
                      <input className="input-inline w-full" placeholder="Ref. operación..."
                        {...register('nota')} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primario text-sm py-1.5 w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Registrar abono'}
                  </button>
                </form>
              )}

              {/* Tabla abonos */}
              {detalle.abonos?.length === 0 ? (
                <p className="text-sm text-gp-text3 py-3">Sin abonos registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gp-text3 border-b border-gp-border">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Método</th>
                      <th className="pb-2 font-medium text-right">Monto</th>
                      <th className="pb-2 font-medium">Nota</th>
                      {esAdmin && <th className="pb-2 w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gp-border">
                    {detalle.abonos?.map(a => (
                      <tr key={a.id}>
                        <td className="py-2 text-gp-text2">{aFormatoUI(a.fecha)}</td>
                        <td className="py-2 text-gp-text2">
                          {METODOS_PAGO.find(m => m.value === a.metodo_pago)?.label || a.metodo_pago}
                        </td>
                        <td className="py-2 text-right font-medium text-gp-ok">
                          {formatearMonto(a.monto, a.moneda)}
                        </td>
                        <td className="py-2 text-gp-text3">{a.nota || '—'}</td>
                        {esAdmin && (
                          <td className="py-2">
                            <button
                              onClick={() => handleEliminarAbono(a.id)}
                              className="text-gp-text3 hover:text-gp-error transition-colors text-xs"
                            >✕</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const CxCPage = () => {
  const { esAdmin } = useAuth();
  const { tasa } = useTasa();
  const [tab, setTab] = useState('lista');
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [cxcSeleccionada, setCxcSeleccionada] = useState(null);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), moneda: 'USD' },
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
      const [listado, clts, res] = await Promise.all([
        cxcService.listar({
          estado:    filtroEstado   || undefined,
          clienteId: filtroCliente  || undefined,
        }),
        cxcService.listarClientes(),
        cxcService.resumen(),
      ]);
      setCuentas(listado.cuentas || []);
      setClientes(clts);
      setResumen(res);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, filtroCliente]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onSubmit = async (datos) => {
    setMensaje(null);
    try {
      await cxcService.crear({
        clienteId:        parseInt(datos.clienteId),
        fecha:            datos.fecha,
        descripcion:      datos.descripcion,
        montoTotal:       parseFloat(datos.montoTotal),
        moneda:           datos.moneda,
        fechaVencimiento: datos.fechaVencimiento || null,
      });
      reset({ fecha: hoyDB(), moneda: 'USD' });
      mostrarMensaje('exito', 'Cuenta registrada correctamente');
      await cargarDatos();
      setTab('lista');
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al registrar la cuenta');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta y sus abonos?')) return;
    try {
      await cxcService.eliminar(id);
      await cargarDatos();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleClienteCreado = (cliente) => {
    setClientes(prev => [...prev, cliente]);
    setMostrarModalCliente(false);
  };

  // ── Tarjetas resumen ────────────────────────────────────────────────────────
  const tarjetas = resumen ? [
    { label: 'Pendientes', valor: resumen.pendientes, color: 'text-gp-warn',  bg: 'bg-amber-900/20  border-amber-700/30' },
    { label: 'Parciales',  valor: resumen.parciales,  color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/30' },
    { label: 'Vencidas',   valor: resumen.vencidas,   color: 'text-gp-error', bg: 'bg-red-900/20    border-red-700/30' },
    { label: 'Por cobrar USD', valor: formatearUSD(resumen.total_pendiente_usd), color: 'text-gp-info',  bg: 'bg-sky-900/20   border-sky-700/30', wide: true },
    { label: 'Por cobrar VES', valor: formatearVES(resumen.total_pendiente_ves), color: 'text-gp-fucsia-t', bg: 'bg-gp-fucsia-dim border border-gp-fucsia/20', wide: true },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* Mensaje de estado */}
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

      {/* ── Tab: Lista ──────────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <div className="space-y-4">

          {/* Tarjetas resumen */}
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

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <select
              className="select-inline"
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="vencida">Vencida</option>
              <option value="pagada">Pagada</option>
            </select>
            <select
              className="select-inline"
              value={filtroCliente}
              onChange={e => setFiltroCliente(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tabla */}
          {cargando ? (
            <p className="text-sm text-gp-text3 py-6 text-center">Cargando...</p>
          ) : cuentas.length === 0 ? (
            <div className="bg-gp-card border border-gp-border rounded-xl p-10 text-center">
              <p className="text-gp-text3 text-sm">No hay cuentas por cobrar registradas</p>
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
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Cliente</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Descripción</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Fecha</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Vence</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3 text-right">Total</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3 text-right">Abonado</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3 text-right">Saldo</th>
                      <th className="px-4 py-3 text-xs font-medium text-gp-text3">Estado</th>
                      {esAdmin && <th className="px-4 py-3 w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gp-border">
                    {cuentas.map(c => {
                      const saldo = parseFloat(c.monto_total) - parseFloat(c.total_abonado || 0);
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-gp-hover cursor-pointer transition-colors"
                          onClick={() => setCxcSeleccionada(c.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="text-gp-text font-medium">{c.cliente_nombre}</p>
                            {c.cliente_rif && <p className="text-xs text-gp-text3">{c.cliente_rif}</p>}
                          </td>
                          <td className="px-4 py-3 text-gp-text2 max-w-xs truncate">{c.descripcion}</td>
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
                              : <span className="text-gp-warn font-medium">{formatearMonto(Math.max(0, saldo), c.moneda)}</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={ESTADO_BADGE[c.estado]}>{ESTADO_LABEL[c.estado]}</span>
                          </td>
                          {esAdmin && (
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleEliminar(c.id)}
                                className="text-gp-text3 hover:text-gp-error transition-colors"
                              >✕</button>
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
          <h2 className="text-base font-semibold text-gp-text mb-1">Nueva cuenta por cobrar</h2>
          <p className="text-xs text-gp-text3 mb-4">Registra un crédito otorgado a un cliente.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Cliente *</label>
                <div className="flex gap-1.5">
                  <select className="select-inline flex-1"
                    {...register('clienteId', { required: 'Selecciona un cliente' })}>
                    <option value="">— Seleccionar —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}{c.rif_cedula ? ` (${c.rif_cedula})` : ''}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-secundario text-sm px-2 py-1"
                          onClick={() => setMostrarModalCliente(true)} title="Nuevo cliente">+</button>
                </div>
                {errors.clienteId && <p className="text-xs text-gp-error mt-1">{errors.clienteId.message}</p>}
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
              <textarea
                className="input-inline w-full resize-none"
                rows={2}
                placeholder="Detalle del producto o servicio..."
                {...register('descripcion', { required: 'La descripción es requerida' })}
              />
              {errors.descripcion && <p className="text-xs text-gp-error mt-1">{errors.descripcion.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Monto */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Monto *</label>
                <div className="flex gap-1.5">
                  <input type="number" step="0.01" min="0.01" className="input-inline flex-1"
                    placeholder="0.00"
                    {...register('montoTotal', {
                      required: 'El monto es requerido',
                      min: { value: 0.01, message: 'Monto inválido' },
                    })} />
                  <select className="select-inline" {...register('moneda')}>
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
                {equivalente && (
                  <p className="text-xs text-gp-text3 mt-1">≈ {equivalente}</p>
                )}
                {errors.montoTotal && <p className="text-xs text-gp-error mt-1">{errors.montoTotal.message}</p>}
              </div>

              {/* Vencimiento */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Fecha de vencimiento</label>
                <input type="date" className="input-inline w-full" {...register('fechaVencimiento')} />
                <p className="text-xs text-gp-text3 mt-1">Opcional. Si vence sin pago → estado "Vencida"</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primario" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Registrar cuenta'}
              </button>
              <button type="button" className="btn-secundario" onClick={() => reset({ fecha: hoyDB(), moneda: 'USD' })}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modales */}
      {mostrarModalCliente && (
        <ModalNuevoCliente onCreado={handleClienteCreado} onCerrar={() => setMostrarModalCliente(false)} />
      )}
      {cxcSeleccionada && (
        <ModalDetalle
          cxcId={cxcSeleccionada}
          esAdmin={esAdmin}
          onCerrar={() => setCxcSeleccionada(null)}
          onCambiado={cargarDatos}
        />
      )}
    </div>
  );
};

export default CxCPage;
