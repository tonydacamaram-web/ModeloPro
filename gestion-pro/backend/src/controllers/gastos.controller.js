const gastoModel = require('../models/gasto.model');
const tasaModel = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');
const db = require('../config/db');

const gastosController = {
  // GET /api/gastos/proveedores — lista de proveedores registrados previamente
  async listarProveedores(req, res, next) {
    try {
      const r = await db.query(
        `SELECT DISTINCT ON (LOWER(TRIM(proveedor_nombre)))
                proveedor_rif, proveedor_nombre
         FROM gastos
         WHERE proveedor_nombre IS NOT NULL AND TRIM(proveedor_nombre) <> ''
         ORDER BY LOWER(TRIM(proveedor_nombre))`
      );
      res.json({ proveedores: r.rows });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/gastos
  async listar(req, res, next) {
    try {
      const { fechaDesde, fechaHasta, tipo, categoriaId, limite, pagina } = req.query;
      const resultado = await gastoModel.listar({
        fechaDesde, fechaHasta, tipo, categoriaId,
        limite: limite ? parseInt(limite) : 30,
        pagina: pagina ? parseInt(pagina) : 1,
      });
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/gastos/:id
  async obtener(req, res, next) {
    try {
      const gasto = await gastoModel.buscarPorId(req.params.id);
      if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });
      res.json(gasto);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/gastos
  async crear(req, res, next) {
    try {
      const {
        fecha, tipo, categoriaId, descripcion, monto, moneda,
        proveedorRif, proveedorNombre, numeroFactura,
      } = req.body;

      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      // Verificar tasa del día
      const tasa = await tasaModel.buscarPorFecha(fechaRegistro);
      if (!tasa) {
        return res.status(422).json({
          error: `No hay tasa BCV para el ${fechaRegistro}. Registre la tasa antes de registrar gastos.`,
        });
      }

      const montoConvertido = convertirMonto(parseFloat(monto), moneda, parseFloat(tasa.tasa_bcv));

      const nuevo = await gastoModel.crear({
        fecha: fechaRegistro, tipo, categoriaId: categoriaId || null,
        descripcion, monto: parseFloat(monto), moneda, montoConvertido,
        tasaId: tasa.id, proveedorRif, proveedorNombre, numeroFactura,
        registradoPor: req.usuario.id,
      });

      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/gastos/:id (solo admin)
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const gasto = await gastoModel.buscarPorId(id);
      if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });

      // Recalcular monto convertido si cambió el monto
      let montoConvertido = gasto.monto_convertido;
      if (req.body.monto || req.body.moneda) {
        const monto = parseFloat(req.body.monto || gasto.monto);
        const moneda = req.body.moneda || gasto.moneda;
        montoConvertido = convertirMonto(monto, moneda, parseFloat(gasto.tasa_bcv));
      }

      const actualizado = await gastoModel.actualizar(id, {
        ...req.body,
        montoConvertido,
      });
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/gastos/:id (solo admin)
  async eliminar(req, res, next) {
    try {
      const eliminado = await gastoModel.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: 'Gasto no encontrado' });
      res.json({ mensaje: 'Gasto eliminado', gasto: eliminado });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = gastosController;
