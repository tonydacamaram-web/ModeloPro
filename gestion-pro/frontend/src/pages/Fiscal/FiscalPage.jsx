import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import fiscalService from '../../services/fiscalService';
import { formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// Tarjeta de resumen reutilizable
const TarjetaResumen = ({ label, valor, color }) => (
  <div className="bg-gp-card border border-gp-border rounded-xl p-4">
    <p className="text-xs text-gp-text3 mb-1">{label}</p>
    <p className="text-base font-bold" style={{ color }}>{valor}</p>
  </div>
);

const FiscalPage = () => {
  const { esAdmin } = useAuth();
  const [cierres, setCierres]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [resumenAnual, setResumenAnual] = useState([]);
  const [resumenMes, setResumenMes]     = useState(null);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [mesSeleccionado, setMesSeleccionado]   = useState(new Date().getMonth() + 1);
  const [mensaje, setMensaje]           = useState(null);
  const [eliminando, setEliminando]     = useState(null);
  const [vistaActiva, setVistaActiva]   = useState('registro');

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fecha: hoyDB(), baseImponible: '', iva: '', exento: '' },
  });

  // Campos observados para auto-calcular el total
  const baseImponible = parseFloat(watch('baseImponible') || 0);
  const iva           = parseFloat(watch('iva')           || 0);
  const exento        = parseFloat(watch('exento')        || 0);
  const totalCierre   = baseImponible + iva + exento;

  // Auto-calcular IVA al cambiar base imponible (16%)
  const handleBaseChange = (e) => {
    const base = parseFloat(e.target.value || 0);
    const ivaCalc = parseFloat((base * 0.16).toFixed(2));
    setValue('iva', ivaCalc > 0 ? ivaCalc : '');
  };

  const cargarCierres = useCallback(async () => {
    try {
      const { cierres: data, total: t } = await fiscalService.listar({ limite: 60 });
      setCierres(data);
      setTotal(t);
    } catch { /* ignorar */ }
  }, []);

  const cargarResumenAnual = useCallback(async (anio) => {
    try {
      const data = await fiscalService.resumenAnual(anio);
      setResumenAnual(data.meses);
    } catch { /* ignorar */ }
  }, []);

  const cargarResumenMes = useCallback(async (anio, mes) => {
    try {
      const data = await fiscalService.resumenMensual(anio, mes);
      setResumenMes(data);
    } catch { /* ignorar */ }
  }, []);

  useEffect(() => {
    cargarCierres();
    cargarResumenAnual(anioSeleccionado);
    cargarResumenMes(anioSeleccionado, mesSeleccionado);
  }, [cargarCierres, cargarResumenAnual, cargarResumenMes, anioSeleccionado, mesSeleccionado]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const onSubmit = async (datos) => {
    setMensaje(null);
    try {
      await fiscalService.crear({
        fecha:         datos.fecha,
        baseImponible: parseFloat(datos.baseImponible || 0),
        iva:           parseFloat(datos.iva           || 0),
        exento:        parseFloat(datos.exento        || 0),
        nota:          datos.nota || undefined,
      });
      mostrarMensaje('exito', 'Cierre fiscal registrado correctamente');
      reset({ fecha: hoyDB(), baseImponible: '', iva: '', exento: '' });
      await cargarCierres();
      await cargarResumenAnual(anioSeleccionado);
      await cargarResumenMes(anioSeleccionado, mesSeleccionado);
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al registrar el cierre');
    }
  };

  const eliminarCierre = async (id) => {
    if (!window.confirm('¿Eliminar este cierre fiscal?')) return;
    setEliminando(id);
    try {
      await fiscalService.eliminar(id);
      await cargarCierres();
      await cargarResumenAnual(anioSeleccionado);
      await cargarResumenMes(anioSeleccionado, mesSeleccionado);
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  // Máximo para gráfico de barras (usar total imponible + exento)
  const maxMes = Math.max(...resumenAnual.map(m => parseFloat(m.total_mes) || 0), 1);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
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
          { id: 'registro',  label: 'Registrar cierre Z' },
          { id: 'resumen',   label: 'Resumen mensual' },
          { id: 'historial', label: 'Historial' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setVistaActiva(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              vistaActiva === tab.id
                ? 'text-white'
                : 'text-gp-text2 hover:text-gp-text hover:bg-gp-hover'
            }`}
            style={vistaActiva === tab.id ? { backgroundColor: 'var(--gp-fucsia)' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Vista: Registro ── */}
      {vistaActiva === 'registro' && (
        <div className="bg-gp-card border border-gp-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-gp-text mb-1">Cierre fiscal Z</h2>
          <p className="text-xs text-gp-text3 mb-4">
            Ingrese los montos del reporte Z de la máquina fiscal. El total se calcula automáticamente.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Fecha */}
            <div className="w-1/2">
              <label className="block text-xs text-gp-text2 mb-1">Fecha</label>
              <input
                type="date"
                className="input-inline w-full"
                {...register('fecha', { required: 'Requerido' })}
              />
              {errors.fecha && <p className="text-xs text-gp-error mt-1">{errors.fecha.message}</p>}
            </div>

            {/* Desglose fiscal */}
            <div className="rounded-lg border border-gp-border2 overflow-hidden">
              {/* Base imponible */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gp-border2">
                <div className="flex-1">
                  <p className="text-sm text-gp-text">Base imponible</p>
                  <p className="text-xs text-gp-text3">Monto gravado antes del IVA</p>
                </div>
                <div className="w-44">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-inline w-full text-right"
                    placeholder="0.00"
                    {...register('baseImponible', {
                      min: { value: 0, message: 'No puede ser negativo' },
                    })}
                    onChange={(e) => {
                      register('baseImponible').onChange(e);
                      handleBaseChange(e);
                    }}
                  />
                </div>
              </div>

              {/* IVA 16% */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gp-border2">
                <div className="flex-1">
                  <p className="text-sm text-gp-text">IVA (16%)</p>
                  <p className="text-xs text-gp-text3">Se calcula al ingresar la base (editable)</p>
                </div>
                <div className="w-44">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-inline w-full text-right"
                    placeholder="0.00"
                    {...register('iva', {
                      min: { value: 0, message: 'No puede ser negativo' },
                    })}
                  />
                </div>
              </div>

              {/* Exento */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gp-border2">
                <div className="flex-1">
                  <p className="text-sm text-gp-text">Exento</p>
                  <p className="text-xs text-gp-text3">Ventas no gravadas con IVA</p>
                </div>
                <div className="w-44">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-inline w-full text-right"
                    placeholder="0.00"
                    {...register('exento', {
                      min: { value: 0, message: 'No puede ser negativo' },
                    })}
                  />
                </div>
              </div>

              {/* Total auto-calculado */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gp-fucsia-dim">
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--gp-fucsia-t)' }}>
                    Total cierre Z
                  </p>
                  <p className="text-xs text-gp-text3">Base + IVA + Exento</p>
                </div>
                <div className="w-44 text-right">
                  <span className="text-base font-bold" style={{ color: 'var(--gp-fucsia)' }}>
                    {totalCierre > 0 ? formatearVES(totalCierre) : 'Bs. 0,00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Nota */}
            <div>
              <label className="block text-xs text-gp-text2 mb-1">Nota (opcional)</label>
              <input
                type="text"
                className="input-inline w-full"
                placeholder="Observaciones del cierre..."
                {...register('nota')}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || totalCierre <= 0}
                className="btn-primario"
              >
                {isSubmitting ? 'Guardando...' : 'Registrar cierre Z'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Vista: Resumen mensual ── */}
      {vistaActiva === 'resumen' && (
        <div className="space-y-4">
          {/* Selectores año / mes */}
          <div className="bg-gp-card border border-gp-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <select
              className="select-inline"
              value={anioSeleccionado}
              onChange={e => setAnioSeleccionado(parseInt(e.target.value))}
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              className="select-inline"
              value={mesSeleccionado}
              onChange={e => setMesSeleccionado(parseInt(e.target.value))}
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Tarjetas del mes — fila 1: totales globales */}
          {resumenMes && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <TarjetaResumen
                  label="Total del mes"
                  valor={formatearVES(resumenMes.total_mes)}
                  color="var(--gp-fucsia)"
                />
                <TarjetaResumen
                  label="Promedio diario"
                  valor={formatearVES(resumenMes.promedio_diario)}
                  color="var(--gp-dorado)"
                />
                <TarjetaResumen
                  label="Días registrados"
                  valor={resumenMes.dias_registrados}
                  color="var(--gp-ok)"
                />
              </div>

              {/* Fila 2: desglose imponible / IVA / exento */}
              <div className="bg-gp-card border border-gp-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gp-border2">
                  <p className="text-sm font-semibold text-gp-text">Desglose fiscal del mes</p>
                </div>
                {[
                  { label: 'Base imponible',      valor: resumenMes.total_base_imponible, color: 'var(--gp-text)' },
                  { label: 'IVA (16%)',            valor: resumenMes.total_iva,            color: 'var(--gp-warn)' },
                  { label: 'Exento',               valor: resumenMes.total_exento,         color: 'var(--gp-info)' },
                ].map(({ label, valor, color }) => {
                  const pct = parseFloat(resumenMes.total_mes) > 0
                    ? ((parseFloat(valor) / parseFloat(resumenMes.total_mes)) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-gp-border2 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm text-gp-text2">{label}</p>
                      </div>
                      <span className="text-xs text-gp-text3 w-12 text-right">{pct}%</span>
                      <span className="text-sm font-semibold w-36 text-right" style={{ color }}>
                        {formatearVES(valor)}
                      </span>
                    </div>
                  );
                })}
                {/* Total */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gp-fucsia-dim">
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: 'var(--gp-fucsia-t)' }}>Total facturado</p>
                  </div>
                  <span className="text-xs text-gp-text3 w-12 text-right">100%</span>
                  <span className="text-base font-bold w-36 text-right" style={{ color: 'var(--gp-fucsia)' }}>
                    {formatearVES(resumenMes.total_mes)}
                  </span>
                </div>
              </div>

              {/* Indicador visual imponible vs exento */}
              {parseFloat(resumenMes.total_mes) > 0 && (
                <div className="bg-gp-card border border-gp-border rounded-xl p-4">
                  <p className="text-xs text-gp-text3 mb-2">Composición de ventas</p>
                  <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                    {(() => {
                      const tot  = parseFloat(resumenMes.total_mes) || 1;
                      const pBase = (parseFloat(resumenMes.total_base_imponible) / tot) * 100;
                      const pIva  = (parseFloat(resumenMes.total_iva) / tot) * 100;
                      const pExento = (parseFloat(resumenMes.total_exento) / tot) * 100;
                      return (
                        <>
                          {pBase  > 0 && <div style={{ width: `${pBase}%`,   backgroundColor: 'var(--gp-fucsia)', borderRadius: '4px 0 0 4px' }} />}
                          {pIva   > 0 && <div style={{ width: `${pIva}%`,    backgroundColor: 'var(--gp-warn)' }} />}
                          {pExento > 0 && <div style={{ width: `${pExento}%`, backgroundColor: 'var(--gp-info)', borderRadius: '0 4px 4px 0' }} />}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-4 mt-2">
                    {[
                      { color: 'var(--gp-fucsia)', label: 'Base imponible' },
                      { color: 'var(--gp-warn)',   label: 'IVA 16%' },
                      { color: 'var(--gp-info)',   label: 'Exento' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gp-text3">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Gráfico comparativo anual */}
          <div className="bg-gp-card border border-gp-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gp-text mb-4">
              Ventas fiscales por mes — {anioSeleccionado}
            </h3>
            {resumenAnual.length === 0 ? (
              <p className="text-center text-gp-text3 text-sm py-6">Sin datos para {anioSeleccionado}</p>
            ) : (
              <div className="space-y-2">
                {MESES.map((nombreMes, i) => {
                  const datoMes    = resumenAnual.find(m => parseInt(m.mes) === i + 1);
                  const totalMes   = datoMes ? parseFloat(datoMes.total_mes) : 0;
                  const imponible  = datoMes ? parseFloat(datoMes.total_base_imponible) : 0;
                  const exento     = datoMes ? parseFloat(datoMes.total_exento) : 0;
                  const pct        = maxMes > 0 ? (totalMes / maxMes) * 100 : 0;
                  const pctImp     = totalMes > 0 ? (imponible / totalMes) * 100 : 0;
                  const pctExento  = totalMes > 0 ? (exento / totalMes) * 100 : 0;
                  const esActual   = i + 1 === mesSeleccionado;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 text-xs text-gp-text3 text-right">{nombreMes.slice(0,3)}</span>
                      <div className="flex-1 h-5 bg-gp-card2 rounded overflow-hidden flex">
                        {totalMes > 0 ? (
                          <>
                            <div style={{ width: `${pct * pctImp / 100}%`, backgroundColor: esActual ? 'var(--gp-fucsia)' : 'var(--gp-dorado)' }} />
                            <div style={{ width: `${pct * pctExento / 100}%`, backgroundColor: esActual ? 'var(--gp-fucsia-dim)' : 'var(--gp-card)' }} />
                          </>
                        ) : null}
                      </div>
                      <span className="w-28 text-xs text-right" style={{ color: totalMes > 0 ? 'var(--gp-text2)' : 'var(--gp-text3)' }}>
                        {totalMes > 0 ? formatearVES(totalMes) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vista: Historial ── */}
      {vistaActiva === 'historial' && (
        <div className="bg-gp-card border border-gp-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gp-text">Historial de cierres Z</h2>
            <span className="text-xs text-gp-text3">{total} registros</span>
          </div>

          {cierres.length === 0 ? (
            <p className="text-center text-gp-text3 text-sm py-8">No hay cierres fiscales registrados</p>
          ) : (
            <div className="space-y-2">
              {cierres.map(c => (
                <div
                  key={c.id}
                  className="px-3 py-3 rounded-lg border border-gp-border2 bg-gp-card2"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">🧾</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <span className="text-sm font-semibold text-gp-text">{aFormatoUI(c.fecha)}</span>
                        <span className="text-base font-bold" style={{ color: 'var(--gp-fucsia)' }}>
                          {formatearVES(c.monto_cierre)}
                        </span>
                      </div>
                      {/* Desglose inline */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <span className="text-xs text-gp-text3">
                          Base: <span className="text-gp-text2">{formatearVES(c.base_imponible)}</span>
                        </span>
                        <span className="text-xs text-gp-text3">
                          IVA: <span style={{ color: 'var(--gp-warn)' }}>{formatearVES(c.iva)}</span>
                        </span>
                        <span className="text-xs text-gp-text3">
                          Exento: <span style={{ color: 'var(--gp-info)' }}>{formatearVES(c.exento)}</span>
                        </span>
                      </div>
                      {c.nota && <p className="text-xs text-gp-text3 mt-0.5 truncate">{c.nota}</p>}
                    </div>
                    {esAdmin && (
                      <button
                        onClick={() => eliminarCierre(c.id)}
                        disabled={eliminando === c.id}
                        className="text-gp-error text-xs hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors disabled:opacity-40 shrink-0"
                      >
                        {eliminando === c.id ? '...' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FiscalPage;
