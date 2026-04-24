const cajaChicaModel = require('../models/cajaChica.model');
const tasaModel = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');

const cajaChicaController = {
  // GET /api/caja-chica
  async listar(req, res, next) {
    try {
      const { fechaDesde, fechaHasta, tipo, limite, pagina } = req.query;
      const resultado = await cajaChicaModel.listar({
        fechaDesde, fechaHasta, tipo,
        limite: limite ? parseInt(limite) : 50,
        pagina: pagina ? parseInt(pagina) : 1,
      });

      // Incluir saldo y fondo en cada respuesta
      const [saldoData, fondoAsignado] = await Promise.all([
        cajaChicaModel.calcularSaldo(),
        cajaChicaModel.ultimaAsignacion(),
      ]);

      res.json({ ...resultado, ...saldoData, fondo_asignado: fondoAsignado });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/caja-chica/saldo — solo el saldo actual
  async saldo(req, res, next) {
    try {
      const [saldoData, fondoAsignado] = await Promise.all([
        cajaChicaModel.calcularSaldo(),
        cajaChicaModel.ultimaAsignacion(),
      ]);
      res.json({ ...saldoData, fondo_asignado: fondoAsignado });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/caja-chica/:id
  async obtener(req, res, next) {
    try {
      const mov = await cajaChicaModel.buscarPorId(req.params.id);
      if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
      res.json(mov);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/caja-chica
  async crear(req, res, next) {
    try {
      const { tipo, fecha, descripcion, monto, moneda } = req.body;
      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      // Verificar tasa del día
      const tasa = await tasaModel.buscarPorFecha(fechaRegistro);
      if (!tasa) {
        return res.status(422).json({
          error: `No hay tasa BCV para el ${fechaRegistro}. Registre la tasa antes de continuar.`,
        });
      }

      const montoConvertido = convertirMonto(parseFloat(monto), moneda, parseFloat(tasa.tasa_bcv));

      const nuevo = await cajaChicaModel.crear({
        tipo, fecha: fechaRegistro,
        descripcion, monto: parseFloat(monto), moneda,
        montoConvertido, tasaId: tasa.id,
        registradoPor: req.usuario.id,
      });

      // Devolver con saldo actualizado
      const saldoData = await cajaChicaModel.calcularSaldo();
      res.status(201).json({ movimiento: nuevo, ...saldoData });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/caja-chica/:id (solo admin)
  async eliminar(req, res, next) {
    try {
      const eliminado = await cajaChicaModel.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: 'Movimiento no encontrado' });
      res.json({ mensaje: 'Movimiento eliminado', movimiento: eliminado });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = cajaChicaController;
