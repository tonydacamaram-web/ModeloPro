const db = require('../config/db');

const valesModel = {
  async listar({ empleadoId, estado, fecha, fechaDesde, fechaHasta, limite = 50 } = {}) {
    const conds = [], params = [];
    let idx = 1;
    if (empleadoId) { conds.push(`v.empleado_id = $${idx++}`); params.push(empleadoId); }
    if (estado)     { conds.push(`v.estado = $${idx++}`);      params.push(estado); }
    if (fecha)      { conds.push(`v.fecha = $${idx++}`);       params.push(fecha); }
    if (fechaDesde) { conds.push(`v.fecha >= $${idx++}`);      params.push(fechaDesde); }
    if (fechaHasta) { conds.push(`v.fecha <= $${idx++}`);      params.push(fechaHasta); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const r = await db.query(
      `SELECT v.*, e.nombre AS empleado_nombre, e.cargo AS empleado_cargo, td.tasa_bcv
       FROM vales v
       JOIN empleados e ON v.empleado_id = e.id
       LEFT JOIN tasas_diarias td ON v.tasa_id = td.id
       ${where}
       ORDER BY v.fecha DESC, v.creado_en DESC
       LIMIT $${idx}`,
      [...params, limite]
    );
    return r.rows;
  },

  async buscarPorId(id) {
    const r = await db.query(
      `SELECT v.*, e.nombre AS empleado_nombre, e.cargo AS empleado_cargo, td.tasa_bcv
       FROM vales v
       JOIN empleados e ON v.empleado_id = e.id
       LEFT JOIN tasas_diarias td ON v.tasa_id = td.id
       WHERE v.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  async resumenPorEmpleado() {
    const r = await db.query(
      `SELECT
         e.id   AS empleado_id,
         e.nombre AS empleado_nombre,
         e.cargo  AS empleado_cargo,
         COUNT(v.id)::INT AS cantidad,
         COALESCE(SUM(
           CASE WHEN v.moneda = 'USD' THEN v.monto
                ELSE v.monto / NULLIF(td.tasa_bcv, 0)
           END
         ), 0) AS total_usd
       FROM empleados e
       JOIN vales v ON v.empleado_id = e.id AND v.estado = 'pendiente'
       LEFT JOIN tasas_diarias td ON v.tasa_id = td.id
       GROUP BY e.id, e.nombre, e.cargo
       ORDER BY total_usd DESC`
    );
    return r.rows;
  },

  async crear({ fecha, empleadoId, descripcion, monto, moneda, montoConvertido, tasaId, registradoPor }) {
    // Crea movimiento_nomina tipo venta_credito y lo vincula al vale
    const movRow = await db.query(
      `INSERT INTO movimientos_nomina
         (empleado_id, fecha, tipo, descripcion, monto, moneda, monto_convertido, tasa_id, registrado_por)
       VALUES ($1,$2,'venta_credito',$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [empleadoId, fecha, descripcion || null, monto, moneda, montoConvertido || null, tasaId || null, registradoPor]
    );
    const movId = movRow.rows[0].id;

    const r = await db.query(
      `INSERT INTO vales
         (fecha, empleado_id, descripcion, monto, moneda, monto_convertido, tasa_id, movimiento_nomina_id, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [fecha, empleadoId, descripcion || null, monto, moneda, montoConvertido || null, tasaId || null, movId, registradoPor]
    );
    return r.rows[0];
  },

  async marcarDescontado(id, { fechaAbono, tasaId, registradoPor }) {
    const vale = await this.buscarPorId(id);
    if (!vale) throw new Error('Vale no encontrado');
    if (vale.estado === 'descontado') throw new Error('El vale ya fue descontado');

    await db.query(
      `INSERT INTO movimientos_nomina
         (empleado_id, fecha, tipo, descripcion, monto, moneda, monto_convertido, tasa_id, registrado_por)
       VALUES ($1,$2,'abono',$3,$4,$5,$6,$7,$8)`,
      [
        vale.empleado_id, fechaAbono,
        `Descuento vale ${vale.fecha}${vale.descripcion ? ': ' + vale.descripcion : ''}`,
        vale.monto, vale.moneda, vale.monto_convertido, tasaId, registradoPor,
      ]
    );

    const r = await db.query(
      `UPDATE vales SET estado = 'descontado' WHERE id = $1 RETURNING *`,
      [id]
    );
    return r.rows[0];
  },

  async eliminar(id) {
    const vale = await this.buscarPorId(id);
    if (!vale) return null;

    if (vale.movimiento_nomina_id) {
      await db.query('DELETE FROM movimientos_nomina WHERE id = $1', [vale.movimiento_nomina_id]);
    }

    const r = await db.query('DELETE FROM vales WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  },
};

module.exports = valesModel;
