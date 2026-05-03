import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import nominaService from '../../services/nominaService';
import valesService from '../../services/valesService';
import { formatearUSD, formatearMonto, formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const TIPOS = [
  { value: 'adelanto',      label: 'Adelanto',        color: 'text-gp-warn' },
  { value: 'venta_credito', label: 'Venta a crédito', color: 'text-gp-info' },
  { value: 'abono',         label: 'Abono',           color: 'text-gp-ok' },
];

const tipoLabel  = (t) => TIPOS.find(x => x.value === t)?.label || t;
const tipoColor  = (t) => TIPOS.find(x => x.value === t)?.color || 'text-gp-text';
const esDebito   = (t) => t === 'adelanto' || t === 'venta_credito';

// ── Modal nuevo empleado ──────────────────────────────────────────────────────
function ModalNuevoEmpleado({ onCreado, onCerrar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');

  const onSubmit = async (datos) => {
    setError('');
    try {
      const emp = await nominaService.crearEmpleado({
        nombre: datos.nombre, cedula: datos.cedula, cargo: datos.cargo,
      });
      onCreado(emp);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el empleado');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-gp-card border border-gp-border rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gp-text">Nuevo empleado</h3>
          <button onClick={onCerrar} className="text-gp-text3 hover:text-gp-text transition-colors">✕</button>
        </div>
        {error && <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-900/30 text-gp-error border border-red-700/40">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs text-gp-text2 mb-1">Nombre *</label>
            <input className="input-inline w-full" placeholder="Nombre completo"
              {...register('nombre', { required: 'El nombre es requerido' })} />
            {errors.nombre && <p className="text-xs text-gp-error mt-1">{errors.nombre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Cédula</label>
              <input className="input-inline w-full" placeholder="V-12345678" {...register('cedula')} />
            </div>
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Cargo</label>
              <input className="input-inline w-full" placeholder="Cajero, Vendedor..." {...register('cargo')} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primario flex-1 text-sm py-1.5" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear empleado'}
            </button>
            <button type="button" className="btn-secundario text-sm py-1.5 px-4" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal detalle empleado ────────────────────────────────────────────────────
function ModalDetalle({ empleadoId, esAdmin, onCerrar, onCambiado }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [valesPendientes, setValesPendientes] = useState([]);
  const [descontando, setDescontando] = useState(null);
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), moneda: 'USD', tipo: 'adelanto' },
  });
  const tipoActual = watch('tipo');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [d, vales] = await Promise.all([
        nominaService.detalleEmpleado(empleadoId),
        valesService.listarPorEmpleado(empleadoId, 'pendiente'),
      ]);
      setDetalle(d);
      setValesPendientes(vales);
    } finally {
      setCargando(false);
    }
  }, [empleadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const onSubmitMov = async (datos) => {
    setError('');
    try {
      await nominaService.crearMovimiento(empleadoId, {
        empleadoId, fecha: datos.fecha,
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        monto: parseFloat(datos.monto),
        moneda: datos.moneda,
      });
      reset({ fecha: hoyDB(), moneda: 'USD', tipo: 'adelanto' });
      setMostrarForm(false);
      await cargar();
      onCambiado();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar movimiento');
    }
  };

  const handleEliminar = async (movId) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await nominaService.eliminarMovimiento(empleadoId, movId);
      await cargar();
      onCambiado();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleDescontarVale = async (valeId) => {
    if (!window.confirm('¿Marcar este vale como descontado en nómina? Se registrará un abono automático.')) return;
    setDescontando(valeId);
    try {
      await valesService.marcarDescontado(valeId);
      await cargar();
      onCambiado();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al descontar el vale');
    } finally {
      setDescontando(null);
    }
  };

  const saldo = detalle?.saldo_usd ?? 0;
  const saldoPositivo = parseFloat(saldo) > 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="border border-gp-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
           style={{ backgroundColor: '#111111' }}
           onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between p-5 border-b border-gp-border">
          {cargando ? (
            <p className="text-gp-text2 text-sm">Cargando...</p>
          ) : detalle ? (
            <div>
              <h3 className="text-base font-semibold text-gp-text">{detalle.empleado.nombre}</h3>
              <div className="flex gap-3 mt-0.5 text-xs text-gp-text3">
                {detalle.empleado.cedula && <span>{detalle.empleado.cedula}</span>}
                {detalle.empleado.cargo  && <span>{detalle.empleado.cargo}</span>}
              </div>
            </div>
          ) : null}
          <button onClick={onCerrar} className="text-gp-text3 hover:text-gp-text transition-colors ml-4">✕</button>
        </div>

        {detalle && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 rounded-b-xl" style={{ backgroundColor: '#111111' }}>

            {/* Saldo */}
            <div className={`rounded-xl p-4 border text-center ${
              saldoPositivo
                ? 'bg-red-900/20 border-red-700/30'
                : 'bg-green-900/20 border-green-700/30'
            }`}>
              <p className="text-xs text-gp-text3 mb-1">Saldo pendiente</p>
              <p className={`text-2xl font-bold ${saldoPositivo ? 'text-gp-error' : 'text-gp-ok'}`}>
                {formatearUSD(Math.abs(saldo))}
              </p>
              <p className="text-xs text-gp-text3 mt-1">
                {saldoPositivo ? 'El empleado adeuda esta cantidad' : 'Sin deuda pendiente'}
              </p>
            </div>

            {/* Vales pendientes de descuento */}
            {valesPendientes.length > 0 && (
              <div className="rounded-xl border border-amber-700/30 bg-amber-900/10 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-amber-700/20">
                  <h4 className="text-sm font-semibold text-amber-300">
                    Vales pendientes de descuento ({valesPendientes.length})
                  </h4>
                </div>
                <div className="divide-y divide-amber-700/20">
                  {valesPendientes.map(v => (
                    <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gp-text3">{aFormatoUI(v.fecha)}</span>
                          {v.descripcion && (
                            <span className="text-xs text-gp-text2 truncate">{v.descripcion}</span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-amber-300 mt-0.5">
                          −{v.moneda === 'USD' ? formatearUSD(v.monto) : formatearVES(v.monto)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDescontarVale(v.id)}
                        disabled={descontando === v.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-green-700/40 text-gp-ok hover:bg-green-900/20 transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        {descontando === v.id ? 'Descontando...' : '✓ Descontar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón + Formulario */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gp-text">Movimientos</h4>
                <button
                  className="text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--gp-fucsia)', color: '#fff' }}
                  onClick={() => setMostrarForm(v => !v)}
                >
                  {mostrarForm ? 'Cancelar' : '+ Movimiento'}
                </button>
              </div>

              {error && (
                <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-900/30 text-gp-error border border-red-700/40">{error}</div>
              )}

              {mostrarForm && (
                <form onSubmit={handleSubmit(onSubmitMov)}
                      className="bg-gp-card2 border border-gp-border2 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">Tipo *</label>
                      <select className="select-inline w-full" {...register('tipo', { required: true })}>
                        {TIPOS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">Fecha *</label>
                      <input type="date" className="input-inline w-full"
                        {...register('fecha', { required: true })} />
                    </div>
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
                          <option value="VES">VES</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gp-text2 mb-1">
                        {tipoActual === 'venta_credito' ? 'Descripción del producto *' : 'Descripción'}
                      </label>
                      <input className="input-inline w-full"
                        placeholder={tipoActual === 'venta_credito' ? 'Detalle del producto...' : 'Nota opcional...'}
                        {...register('descripcion', { required: tipoActual === 'venta_credito' })} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primario text-sm py-1.5 w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Registrar movimiento'}
                  </button>
                </form>
              )}

              {/* Tabla movimientos */}
              {detalle.movimientos.length === 0 ? (
                <p className="text-sm text-gp-text3 py-3">Sin movimientos registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gp-text3 border-b border-gp-border">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium">Descripción</th>
                      <th className="pb-2 font-medium text-right">Monto</th>
                      <th className="pb-2 font-medium text-right">En USD</th>
                      {esAdmin && <th className="pb-2 w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gp-border">
                    {detalle.movimientos.map(m => (
                      <tr key={m.id}>
                        <td className="py-2 text-gp-text2 whitespace-nowrap">{aFormatoUI(m.fecha)}</td>
                        <td className="py-2">
                          <span className={`text-xs font-medium ${tipoColor(m.tipo)}`}>
                            {tipoLabel(m.tipo)}
                          </span>
                        </td>
                        <td className="py-2 text-gp-text3 max-w-xs truncate">{m.descripcion || '—'}</td>
                        <td className={`py-2 text-right font-medium whitespace-nowrap ${
                          esDebito(m.tipo) ? 'text-gp-error' : 'text-gp-ok'
                        }`}>
                          {esDebito(m.tipo) ? '−' : '+'}{formatearMonto(m.monto, m.moneda)}
                        </td>
                        <td className={`py-2 text-right text-xs whitespace-nowrap ${
                          esDebito(m.tipo) ? 'text-gp-error' : 'text-gp-ok'
                        }`}>
                          {m.moneda === 'USD'
                            ? formatearUSD(m.monto)
                            : formatearUSD(m.monto / (m.tasa_bcv || 1))
                          }
                        </td>
                        {esAdmin && (
                          <td className="py-2">
                            <button onClick={() => handleEliminar(m.id)}
                              className="text-gp-text3 hover:text-gp-error transition-colors text-xs">✕</button>
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
const NominaPage = () => {
  const { esAdmin } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [mostrarModalEmpleado, setMostrarModalEmpleado] = useState(false);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [resumen, setResumen] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, res] = await Promise.all([
        nominaService.listarConSaldo(),
        nominaService.resumen(),
      ]);
      setEmpleados(lista);
      setResumen(res);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleEmpleadoCreado = (emp) => {
    setMostrarModalEmpleado(false);
    cargarDatos();
  };

  const visibles = mostrarInactivos
    ? empleados
    : empleados.filter(e => e.activo);

  const conDeuda = visibles.filter(e => parseFloat(e.saldo_usd) > 0);
  const sinDeuda = visibles.filter(e => parseFloat(e.saldo_usd) <= 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Encabezado con resumen + botón */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          {resumen && (
            <>
              <div className="bg-gp-card border border-gp-border rounded-xl px-4 py-3 text-center">
                <p className="text-lg font-bold text-gp-error">{resumen.empleados_con_deuda || 0}</p>
                <p className="text-xs text-gp-text3">Con deuda</p>
              </div>
              <div className="bg-gp-card border border-gp-border rounded-xl px-4 py-3 text-center">
                <p className="text-lg font-bold text-gp-error">{formatearUSD(resumen.total_deuda_usd)}</p>
                <p className="text-xs text-gp-text3">Total adeudado</p>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gp-text2 cursor-pointer select-none">
            <input type="checkbox" checked={mostrarInactivos}
              onChange={e => setMostrarInactivos(e.target.checked)}
              className="rounded" />
            Mostrar inactivos
          </label>
          <button className="btn-primario text-sm" onClick={() => setMostrarModalEmpleado(true)}>
            + Nuevo empleado
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-gp-text3 py-6 text-center">Cargando...</p>
      ) : visibles.length === 0 ? (
        <div className="bg-gp-card border border-gp-border rounded-xl p-10 text-center">
          <p className="text-gp-text3 text-sm">No hay empleados registrados</p>
          <button className="mt-3 text-sm font-medium transition-colors"
            style={{ color: 'var(--gp-fucsia)' }}
            onClick={() => setMostrarModalEmpleado(true)}>
            + Registrar primer empleado
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Con deuda */}
          {conDeuda.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gp-error mb-2 px-1">Con saldo pendiente</p>
              <div className="bg-gp-card border border-gp-border rounded-xl overflow-hidden">
                {conDeuda.map((e, i) => (
                  <EmpleadoFila
                    key={e.id} empleado={e} esAdmin={esAdmin}
                    ultimo={i === conDeuda.length - 1}
                    onClick={() => setSeleccionado(e.id)}
                    onToggleActivo={cargarDatos}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sin deuda */}
          {sinDeuda.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gp-text3 mb-2 px-1">Al día</p>
              <div className="bg-gp-card border border-gp-border rounded-xl overflow-hidden">
                {sinDeuda.map((e, i) => (
                  <EmpleadoFila
                    key={e.id} empleado={e} esAdmin={esAdmin}
                    ultimo={i === sinDeuda.length - 1}
                    onClick={() => setSeleccionado(e.id)}
                    onToggleActivo={cargarDatos}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {mostrarModalEmpleado && (
        <ModalNuevoEmpleado onCreado={handleEmpleadoCreado} onCerrar={() => setMostrarModalEmpleado(false)} />
      )}
      {seleccionado && (
        <ModalDetalle
          empleadoId={seleccionado}
          esAdmin={esAdmin}
          onCerrar={() => setSeleccionado(null)}
          onCambiado={cargarDatos}
        />
      )}
    </div>
  );
};

// ── Fila de empleado ──────────────────────────────────────────────────────────
function EmpleadoFila({ empleado, esAdmin, ultimo, onClick, onToggleActivo }) {
  const saldo = parseFloat(empleado.saldo_usd);
  const tieneDeuda = saldo > 0;

  const toggleActivo = async (e) => {
    e.stopPropagation();
    try {
      await nominaService.actualizarEmpleado(empleado.id, { activo: !empleado.activo });
      onToggleActivo();
    } catch { /* ignorar */ }
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gp-hover transition-colors ${!ultimo ? 'border-b border-gp-border' : ''} ${!empleado.activo ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Avatar inicial */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
             style={{ backgroundColor: 'var(--gp-fucsia-dim)', color: 'var(--gp-fucsia-t)' }}>
          {empleado.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-gp-text">{empleado.nombre}</p>
          <div className="flex gap-2 text-xs text-gp-text3">
            {empleado.cedula && <span>{empleado.cedula}</span>}
            {empleado.cargo  && <span>{empleado.cargo}</span>}
            {!empleado.activo && <span className="text-gp-error">Inactivo</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-sm font-bold ${tieneDeuda ? 'text-gp-error' : 'text-gp-ok'}`}>
            {tieneDeuda ? `−${formatearUSD(saldo)}` : '✓ Al día'}
          </p>
          {tieneDeuda && <p className="text-xs text-gp-text3">pendiente</p>}
        </div>
        {esAdmin && (
          <button
            onClick={toggleActivo}
            className="text-xs text-gp-text3 hover:text-gp-text px-2 py-1 rounded border border-gp-border2 transition-colors"
            title={empleado.activo ? 'Desactivar' : 'Activar'}
          >
            {empleado.activo ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </div>
    </div>
  );
}

export default NominaPage;
