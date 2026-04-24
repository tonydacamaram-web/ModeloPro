import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTasa } from '../../context/TasaContext';
import { useAuth } from '../../context/AuthContext';
import tesoreriaService from '../../services/tesoreriaService';
import cajaChicaService from '../../services/cajaChicaService';
import TasaAlerta from '../../components/TasaAlerta';
import { formatearVES, formatearUSD, formatearMonto } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

// ── Helpers ─────────────────────────────────────────────────────────────────

const ETIQUETAS_CANAL = {
  efectivo_bs:   'Efectivo Bs.',
  efectivo_usd:  'Efectivo USD',
  pago_movil:    'Pago Móvil',
  biopago:       'BioPago',
  transferencia: 'Transferencia',
  zelle:         'Zelle',
  binance:       'Binance',
  pos:           'POS (todos los bancos)',
};

const iconoCuenta = (nombre) => {
  const n = nombre.toLowerCase();
  if (n.includes('efectivo') && n.includes('usd')) return '💵';
  if (n.includes('efectivo'))  return '💴';
  if (n.includes('chase'))     return '🏛️';
  if (n.includes('binance'))   return '🔶';
  if (n.includes('banco'))     return '🏦';
  return '🏦';
};

const TIPO_ESTILO = {
  asignacion: { badge: 'bg-blue-900/30 text-blue-300 border border-blue-700/40',  icono: '💼', label: 'Asignación' },
  gasto:      { badge: 'bg-red-900/30 text-gp-error border border-red-700/40',    icono: '💸', label: 'Gasto' },
  reposicion: { badge: 'bg-green-900/30 text-gp-ok border border-green-700/40',   icono: '♻️', label: 'Reposición' },
};

// ── Componente tarjeta de cuenta ─────────────────────────────────────────────
const TarjetaCuenta = ({ cuenta, moneda, bruto, comisiones, neto }) => {
  const hayComision = comisiones > 0;
  const formatear = moneda === 'USD' ? formatearUSD : formatearVES;
  return (
    <div className="bg-gp-card2 border border-gp-border2 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{iconoCuenta(cuenta)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gp-text truncate">{cuenta}</p>
          <p className="text-xs text-gp-text3 mb-2">{moneda}</p>
          <p className="text-xl font-bold" style={{ color: 'var(--gp-fucsia)' }}>
            {formatear(neto)}
          </p>
          {hayComision && (
            <div className="mt-1.5 text-xs text-gp-text3 space-y-0.5">
              <p>Bruto: <span className="text-gp-text2">{formatear(bruto)}</span></p>
              <p>Comisión: <span className="text-gp-error">−{formatear(comisiones)}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Página principal ─────────────────────────────────────────────────────────
const CajaChicaPage = () => {
  const { tasaHoy } = useTasa();
  const { esAdmin } = useAuth();

  const [vistaActiva, setVistaActiva]   = useState('cuentas');
  const [mensaje, setMensaje]           = useState(null);

  // Estado tesorería
  const [saldo, setSaldo]               = useState(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [fechaDesde, setFechaDesde]     = useState('');
  const [fechaHasta, setFechaHasta]     = useState('');

  // Estado configuración (copia local editable)
  const [config, setConfig]             = useState([]);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  // Estado movimientos manuales
  const [movimientos, setMovimientos]   = useState([]);
  const [totalMov, setTotalMov]         = useState(0);
  const [eliminando, setEliminando]     = useState(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { tipo: 'gasto', moneda: 'VES', fecha: hoyDB() },
  });
  const tipoSel = watch('tipo');

  // ── Carga de datos ─────────────────────────────────────────────
  const cargarSaldo = useCallback(async () => {
    setCargandoSaldo(true);
    try {
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;
      const data = await tesoreriaService.saldo(params);
      setSaldo(data);
      setConfig(data.configuracion.map(c => ({ ...c })));
    } catch { /* ignorar */ }
    finally { setCargandoSaldo(false); }
  }, [fechaDesde, fechaHasta]);

  const cargarMovimientos = useCallback(async () => {
    try {
      const data = await cajaChicaService.listar({ limite: 60 });
      setMovimientos(data.movimientos);
      setTotalMov(data.total);
    } catch { /* ignorar */ }
  }, []);

  useEffect(() => { cargarSaldo(); }, [cargarSaldo]);
  useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  // ── Guardar configuración ──────────────────────────────────────
  const guardarConfig = async () => {
    setGuardandoConfig(true);
    try {
      await Promise.all(
        config.map(c => tesoreriaService.actualizarConfiguracion(c.id, {
          cuentaDestino: c.cuenta_destino,
          comisionPct:   parseFloat(c.comision_pct),
        }))
      );
      mostrarMensaje('exito', 'Configuración guardada correctamente');
      await cargarSaldo();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al guardar configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const editarConfig = (id, campo, valor) => {
    setConfig(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c));
  };

  // ── Movimientos manuales ───────────────────────────────────────
  const onSubmitMov = async (datos) => {
    setMensaje(null);
    try {
      await cajaChicaService.crear({
        tipo:        datos.tipo,
        fecha:       datos.fecha,
        descripcion: datos.descripcion || undefined,
        monto:       parseFloat(datos.monto),
        moneda:      datos.moneda,
      });
      mostrarMensaje('exito', 'Movimiento registrado');
      reset({ tipo: 'gasto', moneda: 'VES', fecha: hoyDB() });
      await cargarMovimientos();
      await cargarSaldo();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al registrar movimiento');
    }
  };

  const eliminarMov = async (id) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    setEliminando(id);
    try {
      await cajaChicaService.eliminar(id);
      await cargarMovimientos();
      await cargarSaldo();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al eliminar');
    } finally {
      setEliminando(null); }
  };

  // ── Derivaciones para la vista ─────────────────────────────────
  const cuentasVES = saldo?.cuentas?.filter(c => c.moneda === 'VES') ?? [];
  const cuentasUSD = saldo?.cuentas?.filter(c => c.moneda === 'USD') ?? [];
  const totales    = saldo?.totales ?? {};
  const manualesVES = saldo?.manuales?.VES ?? { neto: 0, gastos: 0, entradas: 0 };
  const manualesUSD = saldo?.manuales?.USD ?? { neto: 0, gastos: 0, entradas: 0 };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <TasaAlerta />

      {/* Mensaje */}
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
          { id: 'cuentas',       label: 'Cuentas' },
          { id: 'config',        label: 'Configuración' },
          { id: 'movimientos',   label: 'Ajustes manuales' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setVistaActiva(tab.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
              vistaActiva === tab.id ? 'text-white' : 'text-gp-text2 hover:text-gp-text hover:bg-gp-hover'
            }`}
            style={vistaActiva === tab.id ? { backgroundColor: 'var(--gp-fucsia)' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ VISTA: CUENTAS ══════════════════════════════════════════ */}
      {vistaActiva === 'cuentas' && (
        <div className="space-y-4">
          {/* Filtro de fechas */}
          <div className="bg-gp-card border border-gp-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gp-text3 mb-1">Desde</label>
              <input
                type="date"
                className="input-inline"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gp-text3 mb-1">Hasta</label>
              <input
                type="date"
                className="input-inline"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
              className="btn-secundario text-xs py-1.5"
            >
              Ver todo
            </button>
            {cargandoSaldo && <span className="text-xs text-gp-text3 self-center">Actualizando...</span>}
          </div>

          {/* Resumen global */}
          {saldo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gp-card border border-gp-border rounded-xl p-4">
                <p className="text-xs text-gp-text3 mb-1">Total en Bolívares</p>
                <p className="text-xl font-bold" style={{ color: 'var(--gp-fucsia)' }}>
                  {formatearVES(totales.netoVES)}
                </p>
                {totales.comisionesVES > 0 && (
                  <p className="text-xs text-gp-error mt-0.5">
                    −{formatearVES(totales.comisionesVES)} en comisiones
                  </p>
                )}
              </div>
              <div className="bg-gp-card border border-gp-border rounded-xl p-4">
                <p className="text-xs text-gp-text3 mb-1">Total en Dólares</p>
                <p className="text-xl font-bold" style={{ color: 'var(--gp-dorado)' }}>
                  {formatearUSD(totales.netoUSD)}
                </p>
                {totales.comisionesUSD > 0 && (
                  <p className="text-xs text-gp-error mt-0.5">
                    −{formatearUSD(totales.comisionesUSD)} en comisiones
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cuentas en VES */}
          {cuentasVES.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gp-text3 uppercase tracking-wider mb-2 px-1">
                Bolívares (VES)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {cuentasVES.map(c => (
                  <TarjetaCuenta key={`${c.cuenta}-VES`} {...c} />
                ))}
              </div>
              {manualesVES.gastos > 0 && (
                <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg border border-gp-border2 bg-gp-card2">
                  <span className="text-sm text-gp-text2">💸 Ajustes manuales (gastos)</span>
                  <span className="text-sm font-semibold text-gp-error">−{formatearVES(manualesVES.gastos)}</span>
                </div>
              )}
            </div>
          )}

          {/* Cuentas en USD */}
          {cuentasUSD.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gp-text3 uppercase tracking-wider mb-2 px-1">
                Dólares (USD)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {cuentasUSD.map(c => (
                  <TarjetaCuenta key={`${c.cuenta}-USD`} {...c} />
                ))}
              </div>
              {manualesUSD.gastos > 0 && (
                <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg border border-gp-border2 bg-gp-card2">
                  <span className="text-sm text-gp-text2">💸 Ajustes manuales (gastos)</span>
                  <span className="text-sm font-semibold text-gp-error">−{formatearUSD(manualesUSD.gastos)}</span>
                </div>
              )}
            </div>
          )}

          {!saldo && !cargandoSaldo && (
            <p className="text-center text-gp-text3 text-sm py-12">
              No hay datos de ventas en el período seleccionado
            </p>
          )}
        </div>
      )}

      {/* ══ VISTA: CONFIGURACIÓN ════════════════════════════════════ */}
      {vistaActiva === 'config' && (
        <div className="bg-gp-card border border-gp-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gp-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gp-text">Canales de cobro</h2>
              <p className="text-xs text-gp-text3 mt-0.5">
                Define a qué cuenta va cada método y su comisión bancaria (%).
              </p>
            </div>
            {esAdmin && (
              <button
                onClick={guardarConfig}
                disabled={guardandoConfig}
                className="btn-primario text-sm py-1.5"
              >
                {guardandoConfig ? 'Guardando...' : 'Guardar todo'}
              </button>
            )}
          </div>

          {/* Cabecera */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gp-card2 border-b border-gp-border2">
            <span className="col-span-3 text-xs text-gp-text3 font-semibold">Canal</span>
            <span className="col-span-5 text-xs text-gp-text3 font-semibold">Cuenta destino</span>
            <span className="col-span-3 text-xs text-gp-text3 font-semibold text-right">Comisión %</span>
            <span className="col-span-1 text-xs text-gp-text3 font-semibold text-center">Mon.</span>
          </div>

          {config.map(c => (
            <div
              key={c.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gp-border2 last:border-0 items-center"
            >
              {/* Etiqueta canal */}
              <div className="col-span-3">
                <p className="text-sm text-gp-text">{ETIQUETAS_CANAL[c.canal] || c.etiqueta}</p>
                <p className="text-xs text-gp-text3">{c.canal}</p>
              </div>

              {/* Cuenta destino — editable */}
              <div className="col-span-5">
                {esAdmin ? (
                  <input
                    type="text"
                    className="input-inline w-full text-sm"
                    value={c.cuenta_destino}
                    onChange={e => editarConfig(c.id, 'cuenta_destino', e.target.value)}
                    disabled={c.canal === 'pos'}
                    title={c.canal === 'pos' ? 'Para POS, la cuenta es el nombre del banco del cierre' : ''}
                  />
                ) : (
                  <span className="text-sm text-gp-text2">{c.cuenta_destino}</span>
                )}
              </div>

              {/* Comisión % — editable */}
              <div className="col-span-3">
                {esAdmin ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input-inline w-full text-sm text-right"
                    value={c.comision_pct}
                    onChange={e => editarConfig(c.id, 'comision_pct', e.target.value)}
                  />
                ) : (
                  <span className="text-sm text-gp-text2 block text-right">{c.comision_pct}%</span>
                )}
              </div>

              {/* Moneda */}
              <div className="col-span-1 text-center">
                <span className={`text-xs font-semibold ${
                  c.moneda === 'USD' ? '' : ''
                }`} style={{ color: c.moneda === 'USD' ? 'var(--gp-dorado)' : 'var(--gp-fucsia)' }}>
                  {c.moneda}
                </span>
              </div>
            </div>
          ))}

          <div className="px-4 py-3 bg-gp-card2">
            <p className="text-xs text-gp-text3">
              💡 Para <strong>POS</strong> la comisión aplica a todos los bancos. La cuenta destino es automáticamente el nombre del banco en cada cierre de lote.<br/>
              Pago Móvil y BioPago van por defecto a <strong>Banco de Venezuela</strong> — edita la cuenta si usas otro banco.
            </p>
          </div>
        </div>
      )}

      {/* ══ VISTA: AJUSTES MANUALES ═════════════════════════════════ */}
      {vistaActiva === 'movimientos' && (
        <div className="space-y-4">
          {/* Formulario */}
          <div className="bg-gp-card border border-gp-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-gp-text mb-4">Registrar ajuste manual</h2>

            <form onSubmit={handleSubmit(onSubmitMov)} className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs text-gp-text2 mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TIPO_ESTILO).map(([tipo, { icono, label }]) => (
                    <label
                      key={tipo}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        tipoSel === tipo
                          ? 'border-gp-fucsia bg-gp-fucsia-dim text-gp-fucsia-t'
                          : 'border-gp-border2 bg-gp-card2 text-gp-text2 hover:bg-gp-hover'
                      }`}
                    >
                      <input type="radio" value={tipo} className="sr-only" {...register('tipo')} />
                      <span>{icono}</span>
                      <span className="font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gp-text2 mb-1">Fecha</label>
                  <input type="date" className="input-inline w-full" {...register('fecha', { required: 'Requerido' })} />
                  {errors.fecha && <p className="text-xs text-gp-error mt-1">{errors.fecha.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gp-text2 mb-1">Monto</label>
                  <input
                    type="number" step="0.01" min="0"
                    className="input-inline w-full"
                    placeholder="0.00"
                    {...register('monto', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser mayor a 0' } })}
                  />
                  {errors.monto && <p className="text-xs text-gp-error mt-1">{errors.monto.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gp-text2 mb-1">Moneda</label>
                <select className="select-inline" {...register('moneda')}>
                  <option value="VES">VES — Bolívares</option>
                  <option value="USD">USD — Dólares</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gp-text2 mb-1">Descripción</label>
                <input
                  type="text"
                  className="input-inline w-full"
                  placeholder="Detalle del ajuste..."
                  {...register('descripcion', {
                    required: tipoSel === 'gasto' ? 'Requerida para gastos' : false,
                  })}
                />
                {errors.descripcion && <p className="text-xs text-gp-error mt-1">{errors.descripcion.message}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !tasaHoy}
                  className="btn-primario"
                >
                  {isSubmitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>

          {/* Historial */}
          <div className="bg-gp-card border border-gp-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gp-text">Historial de ajustes</h2>
              <span className="text-xs text-gp-text3">{totalMov} registros</span>
            </div>

            {movimientos.length === 0 ? (
              <p className="text-center text-gp-text3 text-sm py-8">Sin movimientos registrados</p>
            ) : (
              <div className="space-y-2">
                {movimientos.map(m => {
                  const estilo = TIPO_ESTILO[m.tipo] || TIPO_ESTILO.gasto;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gp-border2 bg-gp-card2">
                      <span className="text-lg">{estilo.icono}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${estilo.badge}`}>
                            {estilo.label}
                          </span>
                          <span className="text-xs text-gp-text3">{aFormatoUI(m.fecha)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-bold" style={{
                            color: m.tipo === 'gasto' ? 'var(--gp-error)' : 'var(--gp-ok)',
                          }}>
                            {m.tipo === 'gasto' ? '−' : '+'}
                            {formatearMonto(m.monto, m.moneda)}
                          </span>
                        </div>
                        {m.descripcion && <p className="text-xs text-gp-text3 mt-0.5 truncate">{m.descripcion}</p>}
                      </div>
                      {esAdmin && (
                        <button
                          onClick={() => eliminarMov(m.id)}
                          disabled={eliminando === m.id}
                          className="text-gp-error text-xs hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        >
                          {eliminando === m.id ? '...' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaChicaPage;
