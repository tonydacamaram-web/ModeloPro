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
      const { etiqueta, cuentaDestino, comisionPct, moneda, orden } = req.body;
      const actualizado = await tesoreraModel.actualizarConfiguracion(id, {
        etiqueta,
        cuentaDestino,
        comisionPct: comisionPct !== undefined ? parseFloat(comisionPct) : undefined,
        moneda,
        orden: orden !== undefined ? parseInt(orden) : undefined,
      });
      if (!actualizado) return res.status(404).json({ error: 'Configuración no encontrada' });
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tesoreria/configuracion
  async crear(req, res, next) {
    try {
      const { etiqueta, cuentaDestino, comisionPct, moneda } = req.body;
      const nueva = await tesoreraModel.crear({ etiqueta, cuentaDestino, comisionPct, moneda });
      res.status(201).json(nueva);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tesoreria/bancos-pos
  async listarBancosPos(req, res, next) {
    try {
      const bancos = await tesoreraModel.listarBancosPos();
      res.json(bancos);
    } catch (err) { next(err); }
  },

  // PUT /api/tesoreria/bancos-pos
  async configurarBancosPos(req, res, next) {
    try {
      const { bancos } = req.body;
      const results = await Promise.all(
        bancos.map(b => tesoreraModel.upsertBancoPosConfig(b.banco, b.comisionPct))
      );
      res.json(results);
    } catch (err) { next(err); }
  },

  // DELETE /api/tesoreria/configuracion/:id
  async eliminar(req, res, next) {
    try {
      const CANALES_SISTEMA = [
        'efectivo_bs', 'efectivo_usd', 'pago_movil', 'biopago',
        'transferencia', 'zelle', 'binance', 'pos', 'pos_debito', 'pos_credito',
      ];
      const fila = await tesoreraModel.buscarPorId(req.params.id);
      if (!fila) return res.status(404).json({ error: 'Configuración no encontrada' });
      if (CANALES_SISTEMA.includes(fila.canal)) {
        return res.status(403).json({ error: 'No se puede eliminar un canal del sistema' });
      }
      await tesoreraModel.eliminar(req.params.id);
      res.json({ mensaje: 'Cuenta eliminada' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = tesoreraController;
