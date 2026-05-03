const valesModel = require('../models/vales.model');
const tasaModel  = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');

const valesController = {
  // GET /api/vales
  async listar(req, res, next) {
    try {
      const { empleadoId, estado, fecha, fechaDesde, fechaHasta, limite } = req.query;
      const vales = await valesModel.listar({
        empleadoId: empleadoId ? parseInt(empleadoId) : undefined,
        estado, fecha, fechaDesde, fechaHasta,
        limite: limite ? parseInt(limite) : 50,
      });
      res.json(vales);
    } catch (err) { next(err); }
  },

  // GET /api/vales/resumen
  async resumenEmpleados(req, res, next) {
    try {
      const resumen = await valesModel.resumenPorEmpleado();
      res.json(resumen);
    } catch (err) { next(err); }
  },

  // GET /api/vales/empleado/:empleadoId
  async listarPorEmpleado(req, res, next) {
    try {
      const { estado } = req.query;
      const vales = await valesModel.listar({
        empleadoId: parseInt(req.params.empleadoId),
        estado,
      });
      res.json(vales);
    } catch (err) { next(err); }
  },

  // POST /api/vales
  async crear(req, res, next) {
    try {
      const { fecha, empleadoId, descripcion, monto, moneda } = req.body;
      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      const tasa = await tasaModel.buscarPorFecha(fechaRegistro);
      if (!tasa) {
        return res.status(422).json({ error: `No hay tasa BCV registrada para el ${fechaRegistro}` });
      }

      const montoConvertido = convertirMonto(parseFloat(monto), moneda, tasa.tasa_bcv);
      const vale = await valesModel.crear({
        fecha: fechaRegistro,
        empleadoId: parseInt(empleadoId),
        descripcion, monto: parseFloat(monto), moneda,
        montoConvertido, tasaId: tasa.id,
        registradoPor: req.usuario.id,
      });
      res.status(201).json(vale);
    } catch (err) { next(err); }
  },

  // PUT /api/vales/:id/descontar
  async marcarDescontado(req, res, next) {
    try {
      const hoy  = new Date().toISOString().split('T')[0];
      const tasa = await tasaModel.buscarPorFecha(hoy);
      if (!tasa) {
        return res.status(422).json({ error: 'No hay tasa BCV registrada para hoy' });
      }

      const vale = await valesModel.marcarDescontado(req.params.id, {
        fechaAbono: hoy,
        tasaId: tasa.id,
        registradoPor: req.usuario.id,
      });
      res.json(vale);
    } catch (err) { next(err); }
  },

  // DELETE /api/vales/:id  (solo admin)
  async eliminar(req, res, next) {
    try {
      const eliminado = await valesModel.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: 'Vale no encontrado' });
      res.json({ mensaje: 'Vale eliminado', vale: eliminado });
    } catch (err) { next(err); }
  },
};

module.exports = valesController;
