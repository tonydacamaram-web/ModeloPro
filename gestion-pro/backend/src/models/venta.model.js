const db = require('../config/db');

const METODOS_PAGO = [
  'efectivo_bs', 'efectivo_usd', 'pos_debito', 'pos_credito',
  'transferencia', 'pago_movil', 'zelle', 'binance', 'biopago',
];

const ventaModel = {
  METODOS_PAGO,

  // Obtener todas las ventas de una fecha
  async buscarPorFecha(fecha) {
    const resultado = await db.query(
      `SELECT v.*, t.tasa_bcv, u.nombre AS registrado_por_nombre
       FROM ventas_diarias v
       LEFT JOIN tasas_diarias t ON v.tasa_id = t.id
       LEFT JOIN usuarios u ON v.registrado_por = u.id
       WHERE v.fecha = $1
       ORDER BY v.metodo_pago`,
      [fecha]
    );
    return resultado.rows;
  },

  // Listar ventas con filtros (historial)
  async listar({ fechaDesde, fechaHasta, limite = 30, pagina = 1 } = {}) {
    let condiciones = [];
    let params = [];
    let idx = 1;

    if (fechaDesde) { condiciones.push(`v.fecha >= $${idx++}`); params.push(fechaDesde); }
    if (fechaHasta) { condiciones.push(`v.fecha <= $${idx++}`); params.push(fechaHasta); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resultado = await db.query(
      `SELECT v.*, t.tasa_bcv
       FROM ventas_diarias v
       LEFT JOIN tasas_diarias t ON v.tasa_id = t.id
       ${where}
       ORDER BY v.fecha DESC, v.metodo_pago
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM ventas_diarias v ${where}`, params
    );

    return { ventas: resultado.rows, total: parseInt(total.rows[0].count) };
  },

  // Guardar o actualizar una venta del día (UPSERT por fecha+metodo_pago)
  async upsert({ fecha, metodoPago, monto, moneda, montoConvertido, tasaId, nota, registradoPor }) {
    const resultado = await db.query(
      `INSERT INTO ventas_diarias
         (fecha, metodo_pago, monto, moneda, monto_convertido, tasa_id, nota, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (fecha, metodo_pago)
       DO UPDATE SET
         monto = EXCLUDED.monto,
         moneda = EXCLUDED.moneda,
         monto_convertido = EXCLUDED.monto_convertido,
         tasa_id = EXCLUDED.tasa_id,
         nota = EXCLUDED.nota,
         registrado_por = EXCLUDED.registrado_por
       RETURNING *`,
      [fecha, metodoPago, monto, moneda, montoConvertido, tasaId, nota || null, registradoPor]
    );
    return resultado.rows[0];
  },

  // Eliminar una venta (solo admin)
  async eliminar(id) {
    const resultado = await db.query(
      'DELETE FROM ventas_diarias WHERE id = $1 RETURNING *',
      [id]
    );
    return resultado.rows[0] || null;
  },

  // Totales del día en ambas monedas (para dashboard)
  async totalesPorFecha(fecha) {
    const resultado = await db.query(
      `SELECT
         SUM(CASE WHEN moneda = 'VES' THEN monto ELSE monto_convertido END) AS total_ves,
         SUM(CASE WHEN moneda = 'USD' THEN monto ELSE monto_convertido END) AS total_usd,
         COUNT(*) AS metodos_registrados
       FROM ventas_diarias
       WHERE fecha = $1`,
      [fecha]
    );
    return resultado.rows[0];
  },
};

module.exports = ventaModel;
