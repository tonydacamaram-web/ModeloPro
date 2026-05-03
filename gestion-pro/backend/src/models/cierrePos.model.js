const db = require('../config/db');

const cierrePosModel = {
  // Listar cierres con filtros opcionales
  async listar({ fechaDesde, fechaHasta, banco, limite = 50, pagina = 1 } = {}) {
    let condiciones = [];
    let params = [];
    let idx = 1;

    if (fechaDesde) { condiciones.push(`cp.fecha >= $${idx++}`); params.push(fechaDesde); }
    if (fechaHasta) { condiciones.push(`cp.fecha <= $${idx++}`); params.push(fechaHasta); }
    if (banco)      { condiciones.push(`cp.banco ILIKE $${idx++}`); params.push(`%${banco}%`); }

    const where  = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resultado = await db.query(
      `SELECT cp.*, u.nombre AS registrado_por_nombre
       FROM cierres_pos cp
       LEFT JOIN usuarios u ON cp.registrado_por = u.id
       ${where}
       ORDER BY cp.fecha DESC, cp.creado_en DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM cierres_pos cp ${where}`, params
    );

    return { cierres: resultado.rows, total: parseInt(total.rows[0].count) };
  },

  // Obtener cierre por ID
  async buscarPorId(id) {
    const r = await db.query(
      `SELECT cp.*, u.nombre AS registrado_por_nombre
       FROM cierres_pos cp
       LEFT JOIN usuarios u ON cp.registrado_por = u.id
       WHERE cp.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  // Crear cierre — calcula diferencia vs ventas POS del día
  async crear({ fecha, banco, numeroLote, montoCierre, moneda, nota, registradoPor }) {
    // Sumar ventas POS (débito + crédito) del mismo día
    const ventasPOS = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM ventas_diarias
       WHERE fecha = $1 AND metodo_pago IN ('pos_debito','pos_credito')`,
      [fecha]
    );
    const totalVentas = parseFloat(ventasPOS.rows[0].total);
    const diferencia  = parseFloat((montoCierre - totalVentas).toFixed(2));

    const r = await db.query(
      `INSERT INTO cierres_pos
         (fecha, banco, numero_lote, monto_cierre, moneda, diferencia, nota, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [fecha, banco, numeroLote, montoCierre, moneda, diferencia, nota || null, registradoPor]
    );
    return { ...r.rows[0], total_ventas_pos: totalVentas };
  },

  // Actualizar cierre (solo admin)
  async actualizar(id, { banco, numeroLote, montoCierre, moneda, nota, fecha }) {
    // Recalcular diferencia si cambió el monto o la fecha
    let diferencia = null;
    if (montoCierre !== undefined || fecha !== undefined) {
      const cierre = await this.buscarPorId(id);
      const fechaFinal   = fecha       || cierre.fecha;
      const montoFinal   = montoCierre !== undefined ? montoCierre : parseFloat(cierre.monto_cierre);

      const ventasPOS = await db.query(
        `SELECT COALESCE(SUM(monto), 0) AS total
         FROM ventas_diarias
         WHERE fecha = $1 AND metodo_pago IN ('pos_debito','pos_credito')`,
        [fechaFinal]
      );
      const totalVentas = parseFloat(ventasPOS.rows[0].total);
      diferencia = parseFloat((montoFinal - totalVentas).toFixed(2));
    }

    const r = await db.query(
      `UPDATE cierres_pos SET
         banco        = COALESCE($1, banco),
         numero_lote  = COALESCE($2, numero_lote),
         monto_cierre = COALESCE($3, monto_cierre),
         moneda       = COALESCE($4, moneda),
         diferencia   = COALESCE($5, diferencia),
         nota         = COALESCE($6, nota),
         fecha        = COALESCE($7, fecha)
       WHERE id = $8
       RETURNING *`,
      [banco, numeroLote, montoCierre, moneda, diferencia, nota, fecha, id]
    );
    return r.rows[0] || null;
  },

  // Eliminar cierre
  async eliminar(id) {
    const r = await db.query(
      'DELETE FROM cierres_pos WHERE id = $1 RETURNING *', [id]
    );
    return r.rows[0] || null;
  },

  // Obtener detalles individuales de cierres POS registrados en Ventas
  async detallesVentasPOS(fecha) {
    const r = await db.query(
      `SELECT
         vd.id,
         vd.referencia AS numero_lote,
         vd.banco,
         vd.monto,
         vda.metodo_pago
       FROM venta_detalles vd
       JOIN ventas_diarias vda ON vd.venta_id = vda.id
       WHERE vda.fecha = $1
         AND vda.metodo_pago IN ('pos_debito', 'pos_credito')
       ORDER BY vda.metodo_pago, vd.slot`,
      [fecha]
    );
    return r.rows;
  },

  // Obtener total ventas POS de un día (para mostrar en el formulario)
  async totalVentasPOS(fecha) {
    const r = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM ventas_diarias
       WHERE fecha = $1 AND metodo_pago IN ('pos_debito','pos_credito')`,
      [fecha]
    );
    return parseFloat(r.rows[0].total);
  },
};

module.exports = cierrePosModel;
