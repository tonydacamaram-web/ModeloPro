const db = require('../config/db');

const nominaModel = {
  // Lista empleados con saldo pendiente calculado en tiempo real (en USD)
  async listarEmpleadosConSaldo() {
    const r = await db.query(
      `SELECT
         e.*,
         COALESCE(SUM(
           CASE
             WHEN mn.tipo IN ('adelanto','venta_credito')
               THEN mn.monto / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
                    * CASE WHEN mn.moneda = 'USD' THEN COALESCE(td.tasa_bcv, 1) ELSE 1 END
                    / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
             ELSE 0
           END
         ), 0) AS deuda_bruta_usd,
         COALESCE(SUM(
           CASE
             WHEN mn.tipo = 'abono'
               THEN CASE WHEN mn.moneda = 'USD' THEN mn.monto
                         ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
                    END
             ELSE 0
           END
         ), 0) AS abonado_usd,
         COALESCE(SUM(
           CASE
             WHEN mn.tipo IN ('adelanto','venta_credito')
               THEN CASE WHEN mn.moneda = 'USD' THEN mn.monto
                         ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
                    END
             ELSE 0
           END
         ), 0) -
         COALESCE(SUM(
           CASE
             WHEN mn.tipo = 'abono'
               THEN CASE WHEN mn.moneda = 'USD' THEN mn.monto
                         ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
                    END
             ELSE 0
           END
         ), 0) AS saldo_usd
       FROM empleados e
       LEFT JOIN movimientos_nomina mn ON mn.empleado_id = e.id
       LEFT JOIN tasas_diarias td ON mn.tasa_id = td.id
       GROUP BY e.id
       ORDER BY e.activo DESC, e.nombre ASC`
    );
    return r.rows;
  },

  // Movimientos de un empleado
  async listarMovimientos(empleadoId) {
    const r = await db.query(
      `SELECT mn.*, u.nombre AS registrado_por_nombre,
              td.tasa_bcv
       FROM movimientos_nomina mn
       LEFT JOIN usuarios u ON mn.registrado_por = u.id
       LEFT JOIN tasas_diarias td ON mn.tasa_id = td.id
       WHERE mn.empleado_id = $1
       ORDER BY mn.fecha DESC, mn.creado_en DESC`,
      [empleadoId]
    );
    return r.rows;
  },

  // Saldo de un empleado específico en USD
  async saldoEmpleado(empleadoId) {
    const r = await db.query(
      `SELECT
         COALESCE(SUM(
           CASE WHEN mn.tipo IN ('adelanto','venta_credito')
                THEN CASE WHEN mn.moneda = 'USD' THEN mn.monto
                          ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
                     END
                ELSE 0 END
         ), 0) -
         COALESCE(SUM(
           CASE WHEN mn.tipo = 'abono'
                THEN CASE WHEN mn.moneda = 'USD' THEN mn.monto
                          ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv, 1), 0)
                     END
                ELSE 0 END
         ), 0) AS saldo_usd
       FROM movimientos_nomina mn
       LEFT JOIN tasas_diarias td ON mn.tasa_id = td.id
       WHERE mn.empleado_id = $1`,
      [empleadoId]
    );
    return parseFloat(r.rows[0].saldo_usd);
  },

  async crearMovimiento({ empleadoId, fecha, tipo, descripcion, monto, moneda, montoConvertido, tasaId, registradoPor }) {
    const r = await db.query(
      `INSERT INTO movimientos_nomina
         (empleado_id, fecha, tipo, descripcion, monto, moneda, monto_convertido, tasa_id, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [empleadoId, fecha, tipo, descripcion || null, monto, moneda, montoConvertido || null, tasaId || null, registradoPor]
    );
    return r.rows[0];
  },

  async eliminarMovimiento(id) {
    const r = await db.query(
      'DELETE FROM movimientos_nomina WHERE id = $1 RETURNING *', [id]
    );
    return r.rows[0] || null;
  },

  // Resumen global: total deuda pendiente en USD
  async resumenGlobal() {
    const r = await db.query(
      `SELECT
         COUNT(DISTINCT mn.empleado_id) FILTER (
           WHERE mn.empleado_id IN (
             SELECT empleado_id FROM movimientos_nomina
             GROUP BY empleado_id
             HAVING SUM(CASE WHEN tipo IN ('adelanto','venta_credito')
                             THEN CASE WHEN moneda='USD' THEN monto ELSE monto / NULLIF(1,0) END
                             ELSE 0 END) >
                    SUM(CASE WHEN tipo='abono'
                             THEN CASE WHEN moneda='USD' THEN monto ELSE monto / NULLIF(1,0) END
                             ELSE 0 END)
           )
         ) AS empleados_con_deuda,
         COALESCE(SUM(
           CASE WHEN mn.tipo IN ('adelanto','venta_credito')
                THEN CASE WHEN mn.moneda='USD' THEN mn.monto
                          ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv,1), 0) END
                ELSE 0 END
         ) -
         SUM(
           CASE WHEN mn.tipo = 'abono'
                THEN CASE WHEN mn.moneda='USD' THEN mn.monto
                          ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv,1), 0) END
                ELSE 0 END
         ), 0) AS total_deuda_usd
       FROM movimientos_nomina mn
       LEFT JOIN tasas_diarias td ON mn.tasa_id = td.id`
    );
    return r.rows[0];
  },
};

module.exports = nominaModel;
