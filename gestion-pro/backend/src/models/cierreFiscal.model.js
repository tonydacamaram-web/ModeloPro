const db = require('../config/db');

const cierreFiscalModel = {
  // Listar cierres fiscales con filtros
  async listar({ fechaDesde, fechaHasta, limite = 50, pagina = 1 } = {}) {
    let condiciones = [];
    let params = [];
    let idx = 1;

    if (fechaDesde) { condiciones.push(`cf.fecha >= $${idx++}`); params.push(fechaDesde); }
    if (fechaHasta) { condiciones.push(`cf.fecha <= $${idx++}`); params.push(fechaHasta); }

    const where  = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resultado = await db.query(
      `SELECT cf.*, u.nombre AS registrado_por_nombre
       FROM cierres_fiscales cf
       LEFT JOIN usuarios u ON cf.registrado_por = u.id
       ${where}
       ORDER BY cf.fecha DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM cierres_fiscales cf ${where}`, params
    );

    return { cierres: resultado.rows, total: parseInt(total.rows[0].count) };
  },

  // Obtener por ID
  async buscarPorId(id) {
    const r = await db.query(
      `SELECT cf.*, u.nombre AS registrado_por_nombre
       FROM cierres_fiscales cf
       LEFT JOIN usuarios u ON cf.registrado_por = u.id
       WHERE cf.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  // Obtener por fecha (unicidad)
  async buscarPorFecha(fecha) {
    const r = await db.query(
      'SELECT * FROM cierres_fiscales WHERE fecha = $1', [fecha]
    );
    return r.rows[0] || null;
  },

  // Crear cierre fiscal con desglose
  async crear({ fecha, baseImponible, iva, exento, igtf, nota, registradoPor }) {
    const total = parseFloat((baseImponible + iva + exento + igtf).toFixed(2));
    const r = await db.query(
      `INSERT INTO cierres_fiscales
         (fecha, base_imponible, iva, exento, igtf, monto_cierre, moneda, nota, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,'VES',$7,$8)
       RETURNING *`,
      [fecha, baseImponible, iva, exento, igtf, total, nota || null, registradoPor]
    );
    return r.rows[0];
  },

  // Actualizar cierre (solo admin)
  async actualizar(id, { baseImponible, iva, exento, igtf, nota }) {
    // Recalcular total si cambiaron los componentes
    let setTotal = '';
    if (baseImponible !== undefined || iva !== undefined || exento !== undefined || igtf !== undefined) {
      setTotal = `,
         monto_cierre = COALESCE($1,base_imponible) + COALESCE($2,iva) + COALESCE($3,exento) + COALESCE($4,igtf)`;
    }
    const r = await db.query(
      `UPDATE cierres_fiscales SET
         base_imponible = COALESCE($1, base_imponible),
         iva            = COALESCE($2, iva),
         exento         = COALESCE($3, exento),
         igtf           = COALESCE($4, igtf),
         nota           = COALESCE($5, nota)
         ${setTotal}
       WHERE id = $6
       RETURNING *`,
      [baseImponible, iva, exento, igtf, nota, id]
    );
    return r.rows[0] || null;
  },

  // Eliminar
  async eliminar(id) {
    const r = await db.query(
      'DELETE FROM cierres_fiscales WHERE id = $1 RETURNING *', [id]
    );
    return r.rows[0] || null;
  },

  // Resumen mensual con desglose imponible / exento
  async resumenMensual(anio, mes) {
    const r = await db.query(
      `SELECT
         COUNT(*)                              AS dias_registrados,
         COALESCE(SUM(monto_cierre), 0)        AS total_mes,
         COALESCE(AVG(monto_cierre), 0)        AS promedio_diario,
         COALESCE(SUM(base_imponible), 0)      AS total_base_imponible,
         COALESCE(SUM(iva), 0)                 AS total_iva,
         COALESCE(SUM(exento), 0)              AS total_exento,
         COALESCE(SUM(igtf), 0)               AS total_igtf
       FROM cierres_fiscales
       WHERE EXTRACT(YEAR  FROM fecha) = $1
         AND EXTRACT(MONTH FROM fecha) = $2`,
      [anio, mes]
    );
    return r.rows[0];
  },

  // Resumen por mes para el año dado (para gráfico comparativo)
  async resumenPorMes(anio) {
    const r = await db.query(
      `SELECT
         EXTRACT(MONTH FROM fecha)             AS mes,
         COUNT(*)                              AS dias_registrados,
         COALESCE(SUM(monto_cierre), 0)        AS total_mes,
         COALESCE(AVG(monto_cierre), 0)        AS promedio_diario,
         COALESCE(SUM(base_imponible), 0)      AS total_base_imponible,
         COALESCE(SUM(iva), 0)                 AS total_iva,
         COALESCE(SUM(exento), 0)              AS total_exento,
         COALESCE(SUM(igtf), 0)               AS total_igtf
       FROM cierres_fiscales
       WHERE EXTRACT(YEAR FROM fecha) = $1
       GROUP BY mes
       ORDER BY mes`,
      [anio]
    );
    return r.rows;
  },
};

module.exports = cierreFiscalModel;
