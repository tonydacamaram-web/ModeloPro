import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTasa } from '../../context/TasaContext';
import { useAuth } from '../../context/AuthContext';
import posService from '../../services/posService';
import TasaAlerta from '../../components/TasaAlerta';
import { formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const BANCOS = [
  'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial',
  'Bicentenario', 'BNC', 'Bancaribe', 'Sofitasa', 'Bancrecer',
  'Banco Exterior', 'Banco Activo', 'Otro',
];

const POSPage = () => {
  const { tasaHoy } = useTasa();
  const { esAdmin } = useAuth();
  const [cierres, setCierres] = useState([]);
  const [total, setTotal] = useState(0);
  const [ventasDia, setVentasDia] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [cargando, setCargando] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), moneda: 'VES' },
  });

  const fechaWatched = watch('fecha');

  const cargarCierres = useCallback(async () => {
    try {
      const { cierres: data, total: t } = await posService.listar({ limite: 50 });
      setCierres(data);
      setTotal(t);
    } catch { /* ignorar */ }
  }, []);

  const cargarVentasDia = useCallback(async (fecha) => {
    if (!fecha) return;
    setCargando(true);
    try {
      const data = await posService.ventasDia(fecha);
      setVentasDia(data.total_ventas_pos);
    } catch {
      setVentasDia(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCierres();
  }, [cargarCierres]);

  useEffect(() => {
    cargarVentasDia(fechaWatched);
  }, [fechaWatched, cargarVentasDia]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const onSubmit = async (datos) => {
    setMensaje(null);
    try {
      await posService.crear({
        fecha:        datos.fecha,
        banco:        datos.banco,
        numeroLote:   datos.numeroLote,
        montoCierre:  parseFloat(datos.montoCierre),
        moneda:       datos.moneda,
        nota:         datos.nota || undefined,
      });
      mostrarMensaje('exito', 'Cierre POS registrado correctamente');
      reset({ fecha: hoyDB(), moneda: 'VES' });
      await cargarCierres();
      await cargarVentasDia(hoyDB());
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al registrar el cierre');
    }
  };

  const eliminarCierre = async (id) => {
    if (!window.confirm('¿Eliminar este cierre POS?')) return;
    setEliminando(id);
    try {
      await posService.eliminar(id);
      await cargarCierres();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  const diferenciaBadge = (diferencia) => {
    const d = parseFloat(diferencia);
    if (d === 0) return <span className="text-gp-ok text-xs font-semibold">✓ Cuadrado</span>;
    if (d > 0)   return <span className="text-gp-warn text-xs font-semibold">+{formatearVES(d)}</span>;
    return <span className="text-gp-error text-xs font-semibold">{formatearVES(d)}</span>;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <TasaAlerta />

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

      {/* Formulario nuevo cierre */}
      <div className="bg-gp-card border border-gp-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-gp-text mb-4">Registrar cierre POS</h2>

        {/* Resumen ventas POS del día seleccionado */}
        {ventasDia !== null && (
          <div className="mb-4 p-3 rounded-lg border border-gp-border2 bg-gp-card2 flex items-center gap-3">
            <span className="text-xl">🏦</span>
            <div>
              <p className="text-xs text-gp-text3">Ventas POS registradas el {aFormatoUI(fechaWatched)}</p>
              <p className="text-base font-bold" style={{ color: 'var(--gp-fucsia)' }}>
                {cargando ? '...' : formatearVES(ventasDia)}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Fecha</label>
              <input
                type="date"
                className="input-inline w-full"
                {...register('fecha', { required: 'Requerido' })}
              />
              {errors.fecha && <p className="text-xs text-gp-error mt-1">{errors.fecha.message}</p>}
            </div>

            {/* Banco */}
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Banco</label>
              <select className="select-inline w-full" {...register('banco', { required: 'Seleccione un banco' })}>
                <option value="">— Seleccionar —</option>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.banco && <p className="text-xs text-gp-error mt-1">{errors.banco.message}</p>}
            </div>

            {/* Número de lote */}
            <div>
              <label className="block text-xs text-gp-text2 mb-1">N° de lote / cierre</label>
              <input
                type="text"
                className="input-inline w-full"
                placeholder="Ej: 000123"
                {...register('numeroLote', { required: 'Requerido' })}
              />
              {errors.numeroLote && <p className="text-xs text-gp-error mt-1">{errors.numeroLote.message}</p>}
            </div>

            {/* Monto */}
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Monto del cierre</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-inline w-full"
                placeholder="0.00"
                {...register('montoCierre', {
                  required: 'Requerido',
                  min: { value: 0.01, message: 'Debe ser mayor a 0' },
                })}
              />
              {errors.montoCierre && <p className="text-xs text-gp-error mt-1">{errors.montoCierre.message}</p>}
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-xs text-gp-text2 mb-1">Nota (opcional)</label>
            <input
              type="text"
              className="input-inline w-full"
              placeholder="Observación del cierre..."
              {...register('nota')}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !tasaHoy}
              className="btn-primario"
            >
              {isSubmitting ? 'Guardando...' : 'Registrar cierre'}
            </button>
          </div>
        </form>
      </div>

      {/* Historial de cierres */}
      <div className="bg-gp-card border border-gp-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gp-text">Historial de cierres POS</h2>
          <span className="text-xs text-gp-text3">{total} registros</span>
        </div>

        {cierres.length === 0 ? (
          <p className="text-center text-gp-text3 text-sm py-8">No hay cierres registrados</p>
        ) : (
          <div className="space-y-2">
            {cierres.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gp-border2 bg-gp-card2"
              >
                <span className="text-lg">🏦</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gp-text">{c.banco}</span>
                    <span className="text-xs text-gp-text3">Lote {c.numero_lote}</span>
                    <span className="text-xs text-gp-text3">{aFormatoUI(c.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm font-bold" style={{ color: 'var(--gp-fucsia)' }}>
                      {formatearVES(c.monto_cierre)}
                    </span>
                    {diferenciaBadge(c.diferencia)}
                  </div>
                  {c.nota && <p className="text-xs text-gp-text3 mt-0.5 truncate">{c.nota}</p>}
                </div>
                {esAdmin && (
                  <button
                    onClick={() => eliminarCierre(c.id)}
                    disabled={eliminando === c.id}
                    className="text-gp-error text-xs hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors disabled:opacity-40"
                  >
                    {eliminando === c.id ? '...' : 'Eliminar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSPage;
