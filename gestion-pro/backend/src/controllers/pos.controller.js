const cierrePosModel = require('../models/cierrePos.model');

const posController = {
  // GET /api/pos
  async listar(req, res, next) {
    try {
      const { fechaDesde, fechaHasta, banco, limite, pagina } = req.query;
      const resultado = await cierrePosModel.listar({
        fechaDesde, fechaHasta, banco,
        limite: limite ? parseInt(limite) : 50,
        pagina: pagina ? parseInt(pagina) : 1,
      });
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/pos/detalles-ventas/:fecha — cierres POS individuales registrados en Ventas
  async detallesVentas(req, res, next) {
    try {
      const detalles = await cierrePosModel.detallesVentasPOS(req.params.fecha);
      res.json({ fecha: req.params.fecha, detalles });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/pos/ventas-dia/:fecha — total ventas POS del día (para mostrar en formulario)
  async ventasDia(req, res, next) {
    try {
      const total = await cierrePosModel.totalVentasPOS(req.params.fecha);
      res.json({ fecha: req.params.fecha, total_ventas_pos: total });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/pos/:id
  async obtener(req, res, next) {
    try {
      const cierre = await cierrePosModel.buscarPorId(req.params.id);
      if (!cierre) return res.status(404).json({ error: 'Cierre POS no encontrado' });
      res.json(cierre);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/pos
  async crear(req, res, next) {
    try {
      const { fecha, banco, numeroLote, montoCierre, moneda, nota } = req.body;
      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      const nuevo = await cierrePosModel.crear({
        fecha: fechaRegistro,
        banco,
        numeroLote,
        montoCierre: parseFloat(montoCierre),
        moneda: moneda || 'VES',
        nota,
        registradoPor: req.usuario.id,
      });

      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/pos/:id (solo admin)
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const cierre = await cierrePosModel.buscarPorId(id);
      if (!cierre) return res.status(404).json({ error: 'Cierre POS no encontrado' });

      const actualizado = await cierrePosModel.actualizar(id, {
        banco:       req.body.banco,
        numeroLote:  req.body.numeroLote,
        montoCierre: req.body.montoCierre ? parseFloat(req.body.montoCierre) : undefined,
        moneda:      req.body.moneda,
        nota:        req.body.nota,
        fecha:       req.body.fecha,
      });
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/pos/:id (solo admin)
  async eliminar(req, res, next) {
    try {
      const eliminado = await cierrePosModel.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: 'Cierre POS no encontrado' });
      res.json({ mensaje: 'Cierre POS eliminado', cierre: eliminado });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = posController;
