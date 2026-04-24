const cxcModel    = require('../models/cxc.model');
const clienteModel = require('../models/cliente.model');
const tasaModel    = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');

// ── Clientes ──────────────────────────────────────────────────────────────────

exports.listarClientes = async (req, res, next) => {
  try {
    const clientes = await clienteModel.listar({ soloActivos: req.query.activos === 'true' });
    res.json(clientes);
  } catch (err) { next(err); }
};

exports.crearCliente = async (req, res, next) => {
  try {
    const { nombre, rifCedula, telefono } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    const cliente = await clienteModel.crear({ nombre, rifCedula, telefono });
    res.status(201).json(cliente);
  } catch (err) { next(err); }
};

exports.actualizarCliente = async (req, res, next) => {
  try {
    const { nombre, rifCedula, telefono, activo } = req.body;
    const cliente = await clienteModel.actualizar(req.params.id, { nombre, rifCedula, telefono, activo });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) { next(err); }
};

// ── Cuentas por Cobrar ────────────────────────────────────────────────────────

exports.listar = async (req, res, next) => {
  try {
    await cxcModel.marcarVencidas();
    const { clienteId, estado, fechaDesde, fechaHasta, limite, pagina } = req.query;
    const resultado = await cxcModel.listar({ clienteId, estado, fechaDesde, fechaHasta, limite, pagina });
    res.json(resultado);
  } catch (err) { next(err); }
};

exports.obtener = async (req, res, next) => {
  try {
    const cxc = await cxcModel.buscarPorId(req.params.id);
    if (!cxc) return res.status(404).json({ error: 'Cuenta por cobrar no encontrada' });
    const abonos = await cxcModel.listarAbonos(req.params.id);
    res.json({ ...cxc, abonos });
  } catch (err) { next(err); }
};

exports.crear = async (req, res, next) => {
  try {
    const { clienteId, fecha, descripcion, montoTotal, moneda, fechaVencimiento } = req.body;
    if (!clienteId || !fecha || !descripcion || !montoTotal || !moneda) {
      return res.status(400).json({ error: 'clienteId, fecha, descripcion, montoTotal y moneda son requeridos' });
    }

    const tasa = await tasaModel.buscarPorFecha(fecha);
    if (!tasa) return res.status(400).json({ error: 'No hay tasa registrada para la fecha indicada' });

    const montoConvertido = convertirMonto(parseFloat(montoTotal), moneda, tasa.tasa_bcv);

    const cxc = await cxcModel.crear({
      clienteId, fecha, descripcion,
      montoTotal: parseFloat(montoTotal),
      moneda, montoConvertido,
      tasaId: tasa.id,
      fechaVencimiento: fechaVencimiento || null,
      registradoPor: req.usuario.id,
    });
    res.status(201).json(cxc);
  } catch (err) { next(err); }
};

exports.actualizar = async (req, res, next) => {
  try {
    const { descripcion, montoTotal, fechaVencimiento } = req.body;
    const cxc = await cxcModel.actualizar(req.params.id, { descripcion, montoTotal, fechaVencimiento });
    if (!cxc) return res.status(404).json({ error: 'Cuenta por cobrar no encontrada' });
    res.json(cxc);
  } catch (err) { next(err); }
};

exports.eliminar = async (req, res, next) => {
  try {
    const cxc = await cxcModel.eliminar(req.params.id);
    if (!cxc) return res.status(404).json({ error: 'Cuenta por cobrar no encontrada' });
    res.json({ mensaje: 'Cuenta eliminada', cxc });
  } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try {
    await cxcModel.marcarVencidas();
    const datos = await cxcModel.resumen();
    res.json(datos);
  } catch (err) { next(err); }
};

// ── Abonos ────────────────────────────────────────────────────────────────────

exports.listarAbonos = async (req, res, next) => {
  try {
    const abonos = await cxcModel.listarAbonos(req.params.id);
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

    const abono = await cxcModel.crearAbono({
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
    const abono = await cxcModel.eliminarAbono(req.params.abonoId);
    if (!abono) return res.status(404).json({ error: 'Abono no encontrado' });
    res.json({ mensaje: 'Abono eliminado', abono });
  } catch (err) { next(err); }
};
