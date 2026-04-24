import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTasa } from '../../context/TasaContext';
import { useAuth } from '../../context/AuthContext';
import tasaService from '../../services/tasaService';
import { formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const ETIQUETA_FUENTE = {
  bcvapi:   { label: 'API BCV', color: 'text-gp-ok' },
  scraping: { label: 'BCV.org.ve', color: 'text-gp-info' },
};

const TasasPage = () => {
  const { tasaHoy, cargarTasaHoy } = useTasa();
  const { esAdmin } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [editando, setEditando] = useState(false);
  const [buscandoBCV, setBuscandoBCV] = useState(false);
  // Resultado de la búsqueda automática (cuando ya existe tasa del día)
  const [bcvPendiente, setBcvPendiente] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), tasaBcv: '' },
  });

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const { tasas } = await tasaService.listar({ limite: 30 });
      setHistorial(tasas);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  // ── Obtener tasa BCV automáticamente ───────────────────────────────────
  const obtenerBCVAuto = async () => {
    setBuscandoBCV(true);
    setMensaje(null);
    setBcvPendiente(null);
    try {
      const resultado = await tasaService.obtenerBCVAuto();
      const fuenteInfo = ETIQUETA_FUENTE[resultado.fuente] ?? { label: resultado.fuente, color: 'text-gp-text2' };

      if (resultado.guardada) {
        // Se guardó automáticamente
        setMensaje({
          tipo: 'exito',
          texto: `${resultado.mensaje} — Tasa: ${formatearVES(resultado.tasa)} / $1`,
          fuente: fuenteInfo,
        });
        await cargarTasaHoy();
        await cargarHistorial();
      } else {
        // Ya existía tasa del día, mostrar opción de actualizar
        setBcvPendiente({ tasa: resultado.tasa, fuente: fuenteInfo, idExistente: resultado.tasaExistente.id });
        setMensaje({
          tipo: 'info',
          texto: `Tasa obtenida via ${fuenteInfo.label}: ${formatearVES(resultado.tasa)} / $1. Ya existe tasa para hoy — ¿deseas actualizarla?`,
          fuente: fuenteInfo,
        });
      }
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.error || 'No se pudo obtener la tasa automáticamente',
      });
    } finally {
      setBuscandoBCV(false);
    }
  };

  const confirmarActualizarBCV = async () => {
    if (!bcvPendiente) return;
    try {
      await tasaService.actualizar(bcvPendiente.idExistente, bcvPendiente.tasa);
      setMensaje({ tipo: 'exito', texto: `Tasa actualizada a ${formatearVES(bcvPendiente.tasa)} / $1` });
      setBcvPendiente(null);
      await cargarTasaHoy();
      await cargarHistorial();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al actualizar' });
    }
  };

  // ── Formulario manual ──────────────────────────────────────────────────
  const onSubmit = async (datos) => {
    setMensaje(null);
    setBcvPendiente(null);
    try {
      if (editando && tasaHoy) {
        await tasaService.actualizar(tasaHoy.id, parseFloat(datos.tasaBcv));
        setMensaje({ tipo: 'exito', texto: 'Tasa actualizada correctamente' });
        setEditando(false);
      } else {
        await tasaService.crear(parseFloat(datos.tasaBcv), datos.fecha);
        setMensaje({ tipo: 'exito', texto: 'Tasa registrada correctamente' });
      }
      await cargarTasaHoy();
      await cargarHistorial();
      reset({ fecha: hoyDB(), tasaBcv: '' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al guardar la tasa' });
    }
  };

  const iniciarEdicion = () => {
    if (tasaHoy) {
      setValue('tasaBcv', tasaHoy.tasa_bcv);
      setValue('fecha', tasaHoy.fecha);
      setEditando(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Tasa actual ───────────────────────────────────────────────── */}
      <div className="tarjeta">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gp-text">Tasa BCV de Hoy</h3>
          {tasaHoy && esAdmin && (
            <button onClick={iniciarEdicion} className="btn-secundario text-xs">
              Editar
            </button>
          )}
        </div>

        {tasaHoy ? (
          <div className="bg-gp-dorado-dim border border-gp-dorado/20 rounded-lg p-4">
            <p className="text-3xl font-bold text-gp-dorado-t">{formatearVES(tasaHoy.tasa_bcv)}</p>
            <p className="text-sm text-gp-text3 mt-1">por 1 USD — {aFormatoUI(tasaHoy.fecha)}</p>
          </div>
        ) : (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-4 text-yellow-300 text-sm">
            No hay tasa registrada para hoy. Usa el botón BCV o ingresa la tasa manualmente.
          </div>
        )}
      </div>

      {/* ── Obtener tasa automáticamente ─────────────────────────────── */}
      <div className="tarjeta">
        <h3 className="font-semibold text-gp-text mb-3">Obtener Tasa Automáticamente</h3>
        <p className="text-xs text-gp-text3 mb-4">
          Consulta la tasa BCV oficial vía API o scraping directo de bcv.org.ve.
        </p>

        {mensaje && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${
            mensaje.tipo === 'exito' ? 'bg-green-900/30 text-green-300 border-green-700/40' :
            mensaje.tipo === 'info'  ? 'bg-gp-fucsia-dim text-gp-fucsia-t border-gp-fucsia/30' :
                                       'bg-red-900/30 text-red-300 border-red-700/40'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={obtenerBCVAuto}
            disabled={buscandoBCV}
            className="btn-dorado flex items-center gap-2"
          >
            {buscandoBCV ? (
              <>
                <span className="animate-spin">⏳</span> Consultando BCV...
              </>
            ) : (
              <>💱 Obtener Tasa BCV</>
            )}
          </button>

          {bcvPendiente && (
            <button
              onClick={confirmarActualizarBCV}
              className="btn-primario flex items-center gap-2"
            >
              ✓ Actualizar a {formatearVES(bcvPendiente.tasa)}
            </button>
          )}
        </div>
      </div>

      {/* ── Formulario manual ─────────────────────────────────────────── */}
      {(!tasaHoy || editando) && (
        <div className="tarjeta">
          <h3 className="font-semibold text-gp-text mb-4">
            {editando ? 'Actualizar Tasa Manualmente' : 'Registrar Tasa Manualmente'}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gp-text2 mb-1">Fecha</label>
                <input
                  type="date"
                  className="input-campo"
                  {...register('fecha', { required: 'La fecha es requerida' })}
                />
                {errors.fecha && <p className="text-xs text-gp-error mt-1">{errors.fecha.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gp-text2 mb-1">
                  Tasa BCV (Bs. por $1)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`input-campo ${errors.tasaBcv ? 'input-error' : ''}`}
                  placeholder="ej: 42.50"
                  {...register('tasaBcv', {
                    required: 'La tasa es requerida',
                    min: { value: 0.01, message: 'Debe ser mayor a 0' },
                  })}
                />
                {errors.tasaBcv && <p className="text-xs text-gp-error mt-1">{errors.tasaBcv.message}</p>}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={isSubmitting} className="btn-primario">
                {isSubmitting ? 'Guardando...' : editando ? 'Actualizar' : 'Registrar Tasa'}
              </button>
              {editando && (
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={() => { setEditando(false); reset(); setMensaje(null); }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Historial ────────────────────────────────────────────────── */}
      <div className="tarjeta">
        <h3 className="font-semibold text-gp-text mb-4">Historial de Tasas</h3>
        {cargandoHistorial ? (
          <p className="text-sm text-gp-text3 text-center py-4">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-gp-text3 text-center py-4">Sin registros</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gp-border">
                  <th className="text-left py-2 text-gp-text3 font-medium">Fecha</th>
                  <th className="text-right py-2 text-gp-text3 font-medium">Tasa BCV</th>
                  <th className="text-right py-2 text-gp-text3 font-medium">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((t) => (
                  <tr key={t.id} className="border-b border-gp-border hover:bg-gp-hover transition-colors">
                    <td className="py-2.5 text-gp-text">{aFormatoUI(t.fecha)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-gp-dorado-t">
                      {formatearVES(t.tasa_bcv)}
                    </td>
                    <td className="py-2.5 text-right text-gp-text3">{t.registrado_por_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasasPage;
