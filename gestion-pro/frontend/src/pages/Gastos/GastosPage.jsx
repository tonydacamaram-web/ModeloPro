import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTasa } from '../../context/TasaContext';
import { useAuth } from '../../context/AuthContext';
import gastosService from '../../services/gastosService';
import TasaAlerta from '../../components/TasaAlerta';
import { formatearVES, formatearUSD } from '../../utils/formatMoneda';
import { aFormatoUI, hoyDB } from '../../utils/formatFecha';

const TIPO_ESTILO = {
  factura:  { badge: 'bg-gp-fucsia-dim text-gp-fucsia-t border border-gp-fucsia/30', icono: '🧾' },
  eventual: { badge: 'bg-gp-hover text-gp-text2 border border-gp-border2',           icono: '💳' },
  divisas:  { badge: 'bg-gp-dorado-dim text-gp-dorado-t border border-gp-dorado/30', icono: '💵' },
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

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { tipo: 'eventual', moneda: 'VES', fecha: hoyDB() },
  });

  const tipoSeleccionado = watch('tipo');
  const rifWatched       = watch('proveedorRif');

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

  useEffect(() => {
    cargarCategorias();
    cargarGastos();
    cargarProveedores();
  }, [cargarCategorias, cargarGastos, cargarProveedores]);

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
      });
      setMensaje({ tipo: 'exito', texto: 'Gasto registrado correctamente' });
      reset({ tipo: 'eventual', moneda: 'VES', fecha: hoyDB() });
      await cargarGastos();
      await cargarProveedores(); // refrescar lista después de guardar
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

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <TasaAlerta />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gp-border">
        {['registro', 'historial'].map(v => (
          <button
            key={v}
            onClick={() => setVistaActiva(v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              vistaActiva === v
                ? 'border-gp-fucsia text-gp-fucsia-t'
                : 'border-transparent text-gp-text3 hover:text-gp-text2'
            }`}
          >
            {v === 'registro' ? 'Nuevo Gasto' : `Historial (${total})`}
          </button>
        ))}
      </div>

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
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={!tasaHoy}
                  className={`input-campo ${errors.monto ? 'input-error' : ''}`}
                  placeholder="0.00"
                  {...register('monto', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser > 0' } })}
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

            {/* Campos solo para facturas de proveedor */}
            {tipoSeleccionado === 'factura' && (
              <div className="p-4 bg-gp-card2 rounded-lg border border-gp-border space-y-3">
                <p className="text-xs font-medium text-gp-text3 uppercase tracking-wide">Datos del Proveedor</p>

                {/* Datalists para autocompletado */}
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
    </div>
  );
};

export default GastosPage;
