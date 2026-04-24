const cxpModel       = require('../models/cxp.model');
const proveedorModel = require('../models/proveedor.model');
const tasaModel      = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');

// ── Proveedores ───────────────────────────────────────────────────────────────

exports.listarProveedores = async (req, res, next) => {
  try {
    const proveedores = await proveedorModel.listar({ soloActivos: req.query.activos === 'true' });
    res.json(proveedores);
  } catch (err) { next(err); }
};

exports.crearProveedor = async (req, res, next) => {
  try {
    const { nombre, rif, telefono } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    const proveedor = await proveedorModel.crear({ nombre, rif, telefono });
    res.status(201).json(proveedor);
  } catch (err) { next(err); }
};

exports.actualizarProveedor = async (req, res, next) => {
  try {
    const { nombre, rif, telefono, activo } = req.body;
    const proveedor = await proveedorModel.actualizar(req.params.id, { nombre, rif, telefono, activo });
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (err) { next(err); }
};

// ── Cuentas por Pagar ─────────────────────────────────────────────────────────

exports.listar = async (req, res, next) => {
  try {
    await cxpModel.marcarVencidas();
    const { proveedorId, estado, fechaDesde, fechaHasta, limite, pagina } = req.query;
    const resultado = await cxpModel.listar({ proveedorId, estado, fechaDesde, fechaHasta, limite, pagina });
    res.json(resultado);
  } catch (err) { next(err); }
};

exports.obtener = async (req, res, next) => {
  try {
    const cxp = await cxpModel.buscarPorId(req.params.id);
    if (!cxp) return res.status(404).json({ error: 'Cuenta por pagar no encontrada' });
    const abonos = await cxpModel.listarAbonos(req.params.id);
    res.json({ ...cxp, abonos });
  } catch (err) { next(err); }
};

exports.crear = async (req, res, next) => {
  try {
    const { proveedorId, fecha, descripcion, numeroFactura, montoTotal, moneda, fechaVencimiento } = req.body;
    if (!proveedorId || !fecha || !descripcion || !montoTotal || !moneda) {
      return res.status(400).json({ error: 'proveedorId, fecha, descripcion, montoTotal y moneda son requeridos' });
    }
    const tasa = await tasaModel.buscarPorFecha(fecha);
    if (!tasa) return res.status(400).json({ error: 'No hay tasa registrada para la fecha indicada' });

    const montoConvertido = convertirMonto(parseFloat(montoTotal), moneda, tasa.tasa_bcv);
    const cxp = await cxpModel.crear({
      proveedorId, fecha, descripcion, numeroFactura,
      montoTotal: parseFloat(montoTotal),
      moneda, montoConvertido,
      tasaId: tasa.id,
      fechaVencimiento: fechaVencimiento || null,
      registradoPor: req.usuario.id,
    });
    res.status(201).json(cxp);
  } catch (err) { next(err); }
};

exports.actualizar = async (req, res, next) => {
  try {
    const { descripcion, numeroFactura, montoTotal, fechaVencimiento } = req.body;
    const cxp = await cxpModel.actualizar(req.params.id, { descripcion, numeroFactura, montoTotal, fechaVencimiento });
    if (!cxp) return res.status(404).json({ error: 'Cuenta por pagar no encontrada' });
    res.json(cxp);
  } catch (err) { next(err); }
};

exports.eliminar = async (req, res, next) => {
  try {
    const cxp = await cxpModel.eliminar(req.params.id);
    if (!cxp) return res.status(404).json({ error: 'Cuenta por pagar no encontrada' });
    res.json({ mensaje: 'Cuenta eliminada', cxp });
  } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try {
    await cxpModel.marcarVencidas();
    const datos = await cxpModel.resumen();
    res.json(datos);
  } catch (err) { next(err); }
};

// ── Abonos ────────────────────────────────────────────────────────────────────

exports.listarAbonos = async (req, res, next) => {
  try {
    const abonos = await cxpModel.listarAbonos(req.params.id);
    res.json(abonos);
  } catch (err) { next(err); }
};

exports.crearAbono = async (req, res, next) => {
  try {
    const cuentaId = req.params.id;
    const { fecha, monto, moneda, metodoPago, nota } = req.body;
    if (!fecha || !monto || !moneda || !metodoPago) {
      return res.status(400).json({ error: 'fecha, monto, moneda y metodoPago son requeridos' });
    }
    const tasa = await tasaModel.buscarPorFecha(fecha);
    if (!tasa) return res.status(400).json({ error: 'No hay tasa registrada para la fecha indicada' });

    const abono = await cxpModel.crearAbono({
      cuentaId, fecha,
      monto: parseFloat(monto),
      moneda, metodoPago,
      tasaId: tasa.id,
      nota,
      registradoPor: req.usuario.id,
    });
    res.status(201).json(abono);
  } catch (err) { next(err); }
};

exports.eliminarAbono = async (req, res, next) => {
  try {
    const abono = await cxpModel.eliminarAbono(req.params.abonoId);
    if (!abono) return res.status(404).json({ error: 'Abono no encontrado' });
    res.json({ mensaje: 'Abono eliminado', abono });
  } catch (err) { next(err); }
};
