const ventaModel = require('../models/venta.model');
const ventaDetalleModel = require('../models/ventaDetalle.model');
const tasaModel = require('../models/tasa.model');
const { convertirMonto } = require('../utils/moneda');

const ventasController = {
  // GET /api/ventas — historial
  async listar(req, res, next) {
    try {
      const { fechaDesde, fechaHasta, limite, pagina } = req.query;
      const resultado = await ventaModel.listar({
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

  // GET /api/ventas/dia/:fecha — ventas de un día con sus detalles
  async obtenerDia(req, res, next) {
    try {
      const { fecha } = req.params;
      const ventas = await ventaModel.buscarPorFecha(fecha);

      // Cargar detalles de todos los registros con ID
      const ventaIds = ventas.filter(v => v.id).map(v => v.id);
      const todosDetalles = await ventaDetalleModel.buscarPorVentaIds(ventaIds);

      // Armar grilla completa con todos los métodos + detalles adjuntos
      const grillaCompleta = ventaModel.METODOS_PAGO.map(metodo => {
        const registrado = ventas.find(v => v.metodo_pago === metodo);
        if (registrado) {
          return {
            ...registrado,
            detalles: todosDetalles.filter(d => d.venta_id === registrado.id),
          };
        }
        return { metodo_pago: metodo, monto: null, moneda: 'VES', monto_convertido: null, detalles: [] };
      });

      const totales = await ventaModel.totalesPorFecha(fecha);
      res.json({ ventas: grillaCompleta, totales });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/ventas — guardar día completo (array de ventas + detallesPorMetodo)
  async guardarDia(req, res, next) {
    try {
      const { fecha, ventas, detallesPorMetodo = {} } = req.body;
      const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

      // Buscar tasa exacta del día o la más reciente disponible
      const tasa = await tasaModel.buscarPorFecha(fechaRegistro);
      if (!tasa) {
        return res.status(422).json({
          error: `No hay tasa BCV registrada para el ${fechaRegistro}.`,
          codigo: 'TASA_FALTANTE',
          fecha: fechaRegistro,
        });
      }

      // Guardar cada venta y sus detalles
      const resultados = [];
      for (const venta of ventas) {
        if (!venta.monto || parseFloat(venta.monto) <= 0) continue;

        const montoConvertido = convertirMonto(
          parseFloat(venta.monto),
          venta.moneda,
          parseFloat(tasa.tasa_bcv)
        );

        const guardada = await ventaModel.upsert({
          fecha: fechaRegistro,
          metodoPago: venta.metodoPago,
          monto: parseFloat(venta.monto),
          moneda: venta.moneda,
          montoConvertido,
          tasaId: tasa.id,
          nota: venta.nota || null,
          registradoPor: req.usuario.id,
        });

        // Guardar detalles si existen para este método
        const detalles = detallesPorMetodo[venta.metodoPago];
        if (detalles && detalles.length > 0) {
          await ventaDetalleModel.guardar(guardada.id, detalles);
        }

        resultados.push(guardada);
      }

      res.status(201).json({
        mensaje: `${resultados.length} método(s) de pago guardados`,
        ventas: resultados,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/ventas/:id — eliminar (solo admin)
  async eliminar(req, res, next) {
    try {
      const { id } = req.params;
      const eliminada = await ventaModel.eliminar(id);
      if (!eliminada) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }
      res.json({ mensaje: 'Venta eliminada', venta: eliminada });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ventasController;
