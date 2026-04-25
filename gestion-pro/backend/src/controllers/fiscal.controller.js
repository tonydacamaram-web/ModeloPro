const cierreFiscalModel = require('../models/cierreFiscal.model');

const fiscalController = {
  // GET /api/fiscal
  async listar(req, res, next) {
    try {
      const { fechaDesde, fechaHasta, limite, pagina } = req.query;
      const resultado = await cierreFiscalModel.listar({
        fechaDesde, fechaHasta,
        limite: limite ? parseInt(limite) : 50,
        pagina: pagina ? parseInt(pagina) : 1,
      });
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/fiscal/resumen/:anio/:mes — resumen de un mes
  async resumenMensual(req, res, next) {
    try {
      const { anio, mes } = req.params;
      const resumen = await cierreFiscalModel.resumenMensual(parseInt(anio), parseInt(mes));
      res.json({ anio: parseInt(anio), mes: parseInt(mes), ...resumen });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/fiscal/resumen-anual/:anio — todos los meses del año
  async resumenAnual(req, res, next) {
    try {
      const { anio } = req.params;
      const meses = await cierreFiscalModel.resumenPorMes(parseInt(anio));
      res.json({ anio: parseInt(anio), meses });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/fiscal/:id
  async obtener(req, res, next) {
    try {
      const cierre = await cierreFiscalModel.buscarPorId(req.params.id);
      if (!cierre) return res.status(404).json({ error: 'Cierre fiscal no encontrado' });
      res.json(cierre);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/fiscal
  async crear(req, res, next) {
    try {
      const { fecha, baseImponible, iva, exento, igtf, nota } = req.body;
      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      // Verificar que no exista cierre para ese día
      const existente = await cierreFiscalModel.buscarPorFecha(fechaRegistro);
      if (existente) {
        return res.status(409).json({
          error: `Ya existe un cierre fiscal para el ${fechaRegistro}. Use editar para modificarlo.`,
        });
      }

      const nuevo = await cierreFiscalModel.crear({
        fecha:         fechaRegistro,
        baseImponible: parseFloat(baseImponible || 0),
        iva:           parseFloat(iva || 0),
        exento:        parseFloat(exento || 0),
        igtf:          parseFloat(igtf || 0),
        nota,
        registradoPor: req.usuario.id,
      });

      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/fiscal/:id (solo admin)
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const cierre = await cierreFiscalModel.buscarPorId(id);
      if (!cierre) return res.status(404).json({ error: 'Cierre fiscal no encontrado' });

      const actualizado = await cierreFiscalModel.actualizar(id, {
        baseImponible: req.body.baseImponible !== undefined ? parseFloat(req.body.baseImponible) : undefined,
        iva:           req.body.iva           !== undefined ? parseFloat(req.body.iva)           : undefined,
        exento:        req.body.exento        !== undefined ? parseFloat(req.body.exento)        : undefined,
        igtf:          req.body.igtf          !== undefined ? parseFloat(req.body.igtf)          : undefined,
        nota:          req.body.nota,
      });
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/fiscal/:id (solo admin)
  async eliminar(req, res, next) {
    try {
      const eliminado = await cierreFiscalModel.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: 'Cierre fiscal no encontrado' });
      res.json({ mensaje: 'Cierre fiscal eliminado', cierre: eliminado });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = fiscalController;
