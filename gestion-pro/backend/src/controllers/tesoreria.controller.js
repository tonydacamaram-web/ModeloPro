const tesoreraModel = require('../models/tesoreria.model');

const tesoreraController = {
  // GET /api/tesoreria/saldo
  async saldo(req, res, next) {
    try {
      const { fechaDesde, fechaHasta } = req.query;
      const datos = await tesoreraModel.calcularSaldo({ fechaDesde, fechaHasta });
      res.json(datos);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tesoreria/configuracion
  async obtenerConfiguracion(req, res, next) {
    try {
      const config = await tesoreraModel.obtenerConfiguracion();
      res.json(config);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/tesoreria/configuracion/:id
  async actualizarConfiguracion(req, res, next) {
    try {
      const { id } = req.params;
      const { cuentaDestino, comisionPct } = req.body;
      const actualizado = await tesoreraModel.actualizarConfiguracion(id, {
        cuentaDestino,
        comisionPct: comisionPct !== undefined ? parseFloat(comisionPct) : undefined,
      });
      if (!actualizado) return res.status(404).json({ error: 'Configuración no encontrada' });
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = tesoreraController;
