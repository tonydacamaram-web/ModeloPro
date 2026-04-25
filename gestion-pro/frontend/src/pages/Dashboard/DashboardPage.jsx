import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import { formatearVES, formatearUSD, formatearMonto } from '../../utils/formatMoneda';
import { aFormatoUI } from '../../utils/formatFecha';
import TasaAlerta from '../../components/TasaAlerta';

const COLORES_DONA = ['#e91e8c','#d4a017','#7c3aed','#06b6d4','#22c55e','#f97316','#ec4899','#a855f7','#14b8a6'];

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #353535',
  borderRadius: '8px',
  color: '#f0f0f0',
  fontSize: '12px',
};

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const mesCorto = (ym) => {
  if (!ym) return '';
  const [, m] = ym.split('-');
  return MESES_CORTOS[parseInt(m, 10) - 1] || ym;
};

const periodos = [
  { id: 'dia',    label: 'Hoy' },
  { id: 'semana', label: '7 días' },
  { id: 'mes',    label: 'Este mes' },
];

// ── Componentes locales ───────────────────────────────────────────────────────

const TarjetaMetrica = ({ titulo, principal, secundario, acento, icono, to }) => {
  const colores = {
    fucsia: 'text-gp-fucsia-t',
    dorado: 'text-gp-dorado-t',
    ok:     'text-gp-ok',
    error:  'text-gp-error',
    info:   'text-gp-info',
    warn:   'text-gp-warn',
  };
  const contenido = (
    <div className="tarjeta h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icono}</span>
        <p className="text-xs font-medium text-gp-text3 uppercase tracking-wide">{titulo}</p>
      </div>
      <p className={`text-xl font-bold ${colores[acento] ?? colores.fucsia}`}>{principal}</p>
      {secundario && <p className="text-xs text-gp-text3 mt-1">{secundario}</p>}
    </div>
  );
  return to ? <Link to={to} className="block">{contenido}</Link> : contenido;
};

const PanelAlerta = ({ icono, titulo, items, color, to }) => {
  if (!items?.length) return null;
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{icono}</span>
          <p className="text-xs font-semibold text-gp-text">{titulo}</p>
        </div>
        {to && <Link to={to} className="text-xs text-gp-text3 hover:text-gp-text underline">Ver todo →</Link>}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-gp-text2 flex justify-between gap-2">
            <span className="truncate">{item.label}</span>
            {item.valor && <span className="font-medium whitespace-nowrap">{item.valor}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Página ────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const [periodo, setPeriodo] = useState('dia');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const resumen = await dashboardService.resumen(periodo);
      setDatos(resumen);
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  if (cargando) return <div className="text-center py-12 text-gp-text3">Cargando dashboard...</div>;
  if (!datos)   return null;

  const gananciaPositiva = datos.ganancia.usd >= 0;
  const alertas = datos.alertas || {};
  const totalAlertas = (alertas.sinTasa ? 1 : 0)
    + (alertas.posConDif?.length || 0)
    + (alertas.cxcVencidas?.length || 0);

  return (
    <div className="space-y-5">
      <TasaAlerta />

      {/* ── Alertas activas ─────────────────────────────────────────────── */}
      {totalAlertas > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alertas.sinTasa && (
            <PanelAlerta
              icono="⚠️" titulo="Sin tasa del día"
              items={[{ label: 'No se ha registrado la tasa BCV de hoy. Las conversiones no estarán disponibles.' }]}
              color="bg-amber-900/20 border-amber-700/30"
              to="/tasas"
            />
          )}
          {alertas.cxcVencidas?.length > 0 && (
            <PanelAlerta
              icono="🔴" titulo={`CxC vencidas (${alertas.cxcVencidas.length})`}
              items={alertas.cxcVencidas.map(c => ({
                label: `${c.cliente_nombre} — ${c.descripcion?.substring(0, 30)}`,
                valor: formatearMonto(c.monto_total, c.moneda),
              }))}
              color="bg-red-900/20 border-red-700/30"
              to="/cxc"
            />
          )}
{alertas.posConDif?.length > 0 && (
            <PanelAlerta
              icono="🏦" titulo={`Diferencias POS (${alertas.posConDif.length})`}
              items={alertas.posConDif.map(c => ({
                label: `${aFormatoUI(c.fecha)} — ${c.banco}`,
                valor: formatearVES(c.diferencia),
              }))}
              color="bg-orange-900/20 border-orange-700/30"
              to="/pos"
            />
          )}
        </div>
      )}

      {/* ── Selector de período ─────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        {periodos.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodo === p.id
                ? 'bg-gp-fucsia text-white'
                : 'bg-gp-card text-gp-text2 border border-gp-border hover:border-gp-border2'
            }`}
          >
            {p.label}
          </button>
        ))}
        {periodo !== 'dia' && (
          <span className="ml-auto text-xs text-gp-text3">
            {aFormatoUI(datos.fechaDesde)} — {aFormatoUI(datos.fechaHasta)}
          </span>
        )}
      </div>

      {/* ── Tasa del día ────────────────────────────────────────────────── */}
      {datos.tasaHoy && (
        <div className="bg-gp-dorado-dim border border-gp-dorado/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gp-text3 font-medium uppercase tracking-wide">Tasa BCV de hoy</p>
            <p className="text-xl font-bold text-gp-dorado-t mt-0.5">
              {formatearVES(datos.tasaHoy.tasa_bcv)} / $1
            </p>
          </div>
          <Link to="/tasas" className="text-xs text-gp-dorado hover:text-gp-dorado-t underline">
            Ver historial →
          </Link>
        </div>
      )}

      {/* ── Tarjetas Ingresos / Egresos / Ganancia ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TarjetaMetrica
          titulo="Ingresos"
          principal={formatearUSD(datos.ingresos.usd)}
          secundario={formatearVES(datos.ingresos.ves)}
          acento="fucsia" icono="💰"
        />
        <TarjetaMetrica
          titulo="Egresos"
          principal={formatearUSD(datos.egresos.usd)}
          secundario={formatearVES(datos.egresos.ves)}
          acento="error" icono="📋"
        />
        <div className="tarjeta">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{gananciaPositiva ? '📈' : '📉'}</span>
            <p className="text-xs font-medium text-gp-text3 uppercase tracking-wide">Ganancia Neta</p>
          </div>
          <p className={`text-xl font-bold ${gananciaPositiva ? 'text-gp-ok' : 'text-gp-error'}`}>
            {gananciaPositiva ? '+' : ''}{formatearUSD(datos.ganancia.usd)}
          </p>
          <p className="text-xs text-gp-text3 mt-1">{formatearVES(datos.ganancia.ves)}</p>
        </div>
      </div>

      {/* ── Tarjetas CxC / CxP / Nómina ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {datos.cxc?.total_usd != null && (
          <TarjetaMetrica
            titulo="Por Cobrar"
            principal={formatearUSD(datos.cxc.total_usd)}
            secundario={`${datos.cxc.pendientes || 0} pendientes · ${datos.cxc.vencidas || 0} vencidas`}
            acento={parseInt(datos.cxc.vencidas || 0) > 0 ? 'error' : 'info'}
            icono="📥" to="/cxc"
          />
        )}
{datos.nomina?.deuda_total_usd != null && (
          <TarjetaMetrica
            titulo="Nómina — deuda"
            principal={formatearUSD(datos.nomina.deuda_total_usd)}
            secundario={`${datos.nomina.empleados_con_movimientos || 0} empleados con movimientos`}
            acento={parseFloat(datos.nomina.deuda_total_usd || 0) > 0 ? 'warn' : 'ok'}
            icono="👥" to="/nomina"
          />
        )}
      </div>

      {/* ── Gráficos ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Ventas por día */}
        {datos.ventasPorDia?.length > 1 && (
          <div className="tarjeta">
            <h4 className="font-semibold text-gp-text mb-4 text-sm">Ventas por día (USD)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={datos.ventasPorDia}>
                <XAxis dataKey="fecha" tickFormatter={aFormatoUI} tick={{ fontSize: 10, fill: '#6a6a6a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6a6a6a' }} />
                <Tooltip
                  formatter={v => formatearUSD(v)}
                  labelFormatter={aFormatoUI}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="ventas_usd" fill="#e91e8c" radius={[4,4,0,0]} name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Desglose por método */}
        {datos.desglosePorMetodo?.length > 0 && (
          <div className="tarjeta">
            <h4 className="font-semibold text-gp-text mb-4 text-sm">Por método de pago</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={datos.desglosePorMetodo}
                  dataKey="total_usd"
                  nameKey="metodo_pago"
                  cx="50%" cy="50%"
                  outerRadius={70}
                  label={({ metodo_pago, percent }) =>
                    `${metodo_pago.replace(/_/g,' ')} ${(percent*100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {datos.desglosePorMetodo.map((_, i) => (
                    <Cell key={i} fill={COLORES_DONA[i % COLORES_DONA.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => formatearUSD(v)} contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tendencia mensual */}
        {datos.tendenciaMensual?.length > 1 && (
          <div className="tarjeta lg:col-span-2">
            <h4 className="font-semibold text-gp-text mb-4 text-sm">Tendencia mensual — últimos 6 meses (USD)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={datos.tendenciaMensual.map(d => ({ ...d, mesLabel: mesCorto(d.mes) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: '#6a6a6a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6a6a6a' }} />
                <Tooltip
                  formatter={v => formatearUSD(v)}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#b0b0b0' }} />
                <Line
                  type="monotone"
                  dataKey="ventas_usd"
                  stroke="#e91e8c"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#e91e8c' }}
                  name="Ventas USD"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/tasas',  label: 'Registrar tasa',   icono: '💱' },
          { to: '/ventas', label: 'Registrar ventas',  icono: '💰' },
          { to: '/gastos', label: 'Registrar gasto',   icono: '📋' },
          { to: '/fiscal', label: 'Cierre fiscal',     icono: '🧾' },
        ].map((a, i) => (
          <Link key={i} to={a.to} className="tarjeta-hover text-center cursor-pointer">
            <span className="text-2xl block mb-2">{a.icono}</span>
            <p className="text-xs font-medium text-gp-text2">{a.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
