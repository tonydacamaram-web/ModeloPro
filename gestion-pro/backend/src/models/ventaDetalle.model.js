const db = require('../config/db');

const ventaDetalleModel = {
  // Reemplaza todos los detalles de una venta con los nuevos
  async guardar(ventaId, detalles) {
    await db.query('DELETE FROM venta_detalles WHERE venta_id = $1', [ventaId]);
    if (!detalles || detalles.length === 0) return [];

    const insertados = [];
    for (const d of detalles) {
      const r = await db.query(
        `INSERT INTO venta_detalles (venta_id, slot, referencia, banco, monto)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [ventaId, d.slot || 1, d.referencia || null, d.banco || null, d.monto || null]
      );
      insertados.push(r.rows[0]);
    }
    return insertados;
  },

  // Obtener detalles de múltiples ventas en una sola consulta
  async buscarPorVentaIds(ventaIds) {
    if (!ventaIds.length) return [];
    const r = await db.query(
      'SELECT * FROM venta_detalles WHERE venta_id = ANY($1) ORDER BY venta_id, slot, id',
      [ventaIds]
    );
    return r.rows;
  },
};

module.exports = ventaDetalleModel;
