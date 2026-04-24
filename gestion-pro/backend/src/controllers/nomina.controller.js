const nominaModel  = require('../models/nomina.model');
const empleadoModel = require('../models/empleado.model');
const tasaModel    = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');

// ── Empleados ─────────────────────────────────────────────────────────────────

exports.listarEmpleados = async (req, res, next) => {
  try {
    const empleados = await empleadoModel.listar({ soloActivos: req.query.activos === 'true' });
    res.json(empleados);
  } catch (err) { next(err); }
};

exports.crearEmpleado = async (req, res, next) => {
  try {
    const { nombre, cedula, cargo } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del empleado es requerido' });
    const empleado = await empleadoModel.crear({ nombre, cedula, cargo });
    res.status(201).json(empleado);
  } catch (err) { next(err); }
};

exports.actualizarEmpleado = async (req, res, next) => {
  try {
    const { nombre, cedula, cargo, activo } = req.body;
    const empleado = await empleadoModel.actualizar(req.params.id, { nombre, cedula, cargo, activo });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) { next(err); }
};

// ── Nómina ────────────────────────────────────────────────────────────────────

exports.listarConSaldo = async (req, res, next) => {
  try {
    const empleados = await nominaModel.listarEmpleadosConSaldo();
    res.json(empleados);
  } catch (err) { next(err); }
};

exports.detalleEmpleado = async (req, res, next) => {
  try {
    const empleado = await empleadoModel.buscarPorId(req.params.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    const movimientos = await nominaModel.listarMovimientos(req.params.id);
    const saldo = await nominaModel.saldoEmpleado(req.params.id);
    res.json({ empleado, movimientos, saldo_usd: saldo });
  } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try {
    const datos = await nominaModel.resumenGlobal();
    res.json(datos);
  } catch (err) { next(err); }
};

exports.crearMovimiento = async (req, res, next) => {
  try {
    const { empleadoId, fecha, tipo, descripcion, monto, moneda } = req.body;
    if (!empleadoId || !fecha || !tipo || !monto || !moneda) {
      return res.status(400).json({ error: 'empleadoId, fecha, tipo, monto y moneda son requeridos' });
    }
    const tiposValidos = ['adelanto', 'venta_credito', 'abono'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Valores permitidos: ${tiposValidos.join(', ')}` });
    }

    const tasa = await tasaModel.buscarPorFecha(fecha);
    if (!tasa) return res.status(400).json({ error: 'No hay tasa registrada para la fecha indicada' });

    const montoConvertido = convertirMonto(parseFloat(monto), moneda, tasa.tasa_bcv);

    const mov = await nominaModel.crearMovimiento({
      empleadoId, fecha, tipo, descripcion,
      monto: parseFloat(monto),
      moneda, montoConvertido,
      tasaId: tasa.id,
      registradoPor: req.usuario.id,
    });
    res.status(201).json(mov);
  } catch (err) { next(err); }
};

exports.eliminarMovimiento = async (req, res, next) => {
  try {
    const mov = await nominaModel.eliminarMovimiento(req.params.movId);
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json({ mensaje: 'Movimiento eliminado', movimiento: mov });
  } catch (err) { next(err); }
};
