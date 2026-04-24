const tasaModel = require('../models/tasa.model');
const { fetchBCVRate } = require('../utils/fetchBCV');

const tasasController = {

  // GET /api/tasas/bcv-auto — obtiene la tasa BCV automáticamente y la guarda si no existe
  async obtenerBCVAuto(req, res, next) {
    try {
      const { tasa, fuente } = await fetchBCVRate();
      const hoy = new Date().toISOString().split('T')[0];

      // Si ya existe tasa del día, solo devuelve la tasa obtenida sin guardar
      const existente = await tasaModel.buscarPorFecha(hoy);
      if (existente) {
        return res.json({
          tasa,
          fuente,
          guardada: false,
          mensaje: 'Tasa obtenida. Ya existe una tasa para hoy — confirma para actualizar.',
          tasaExistente: existente,
        });
      }

      // No existe → guarda automáticamente
      const nueva = await tasaModel.crear({
        fecha: hoy,
        tasaBcv: tasa,
        registradoPor: req.usuario.id,
      });
      res.status(201).json({
        tasa,
        fuente,
        guardada: true,
        mensaje: `Tasa obtenida y guardada automáticamente (${fuente === 'bcvapi' ? 'API BCV' : 'BCV.org.ve'})`,
        registro: nueva,
      });
    } catch (err) {
      const status = err.message.includes('manualmente') ? 503 : 500;
      res.status(status).json({ error: err.message });
    }
  },


  // GET /api/tasas/hoy — tasa del día actual
  async obtenerHoy(req, res, next) {
    try {
      const tasa = await tasaModel.obtenerHoy();
      if (!tasa) {
        return res.status(404).json({ error: 'No hay tasa registrada para hoy', tasa: null });
      }
      res.json(tasa);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tasas — historial con filtros
  async listar(req, res, next) {
    try {
      const { fechaDesde, fechaHasta, limite, pagina } = req.query;
      const resultado = await tasaModel.listar({
        fechaDesde,
        fechaHasta,
        limite: limite ? parseInt(limite) : 30,
        pagina: pagina ? parseInt(pagina) : 1,
      });
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tasas — registrar tasa del día
  async crear(req, res, next) {
    try {
      const { fecha, tasaBcv } = req.body;
      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      // Verificar si ya existe tasa para esa fecha
      const existente = await tasaModel.buscarPorFecha(fechaRegistro);
      if (existente) {
        return res.status(409).json({
          error: 'Ya existe una tasa registrada para esta fecha',
          tasa: existente,
        });
      }

      const nueva = await tasaModel.crear({
        fecha: fechaRegistro,
        tasaBcv,
        registradoPor: req.usuario.id,
      });
      res.status(201).json(nueva);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/tasas/:id — actualizar tasa (solo admin)
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { tasaBcv } = req.body;
      const actualizada = await tasaModel.actualizar(id, { tasaBcv });
      if (!actualizada) {
        return res.status(404).json({ error: 'Tasa no encontrada' });
      }
      res.json(actualizada);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = tasasController;
