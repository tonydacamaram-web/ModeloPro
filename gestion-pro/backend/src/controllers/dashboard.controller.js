const db = require('../config/db');

const dashboardController = {
  async resumen(req, res, next) {
    try {
      const { periodo = 'dia' } = req.query;
      const hoy = new Date().toISOString().split('T')[0];

      let fechaDesde;
      if (periodo === 'dia') {
        fechaDesde = hoy;
      } else if (periodo === 'semana') {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        fechaDesde = d.toISOString().split('T')[0];
      } else if (periodo === 'mes') {
        fechaDesde = `${hoy.substring(0, 7)}-01`;
      } else {
        fechaDesde = hoy;
      }

      // ── Ventas y gastos del período ───────────────────────────────────────
      const [ventas, gastos, porMetodo, porDia] = await Promise.all([
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN moneda='VES' THEN monto ELSE monto_convertido END),0) AS total_ves,
             COALESCE(SUM(CASE WHEN moneda='USD' THEN monto ELSE monto_convertido END),0) AS total_usd
           FROM ventas_diarias WHERE fecha BETWEEN $1 AND $2`,
          [fechaDesde, hoy]
        ),
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN moneda='VES' THEN monto ELSE monto_convertido END),0) AS total_ves,
             COALESCE(SUM(CASE WHEN moneda='USD' THEN monto ELSE monto_convertido END),0) AS total_usd
           FROM gastos WHERE fecha BETWEEN $1 AND $2`,
          [fechaDesde, hoy]
        ),
        db.query(
          `SELECT metodo_pago,
             SUM(CASE WHEN moneda='USD' THEN monto ELSE monto_convertido END) AS total_usd
           FROM ventas_diarias
           WHERE fecha BETWEEN $1 AND $2 AND monto > 0
           GROUP BY metodo_pago ORDER BY total_usd DESC`,
          [fechaDesde, hoy]
        ),
        db.query(
          `SELECT fecha::text,
             COALESCE(SUM(CASE WHEN moneda='USD' THEN monto ELSE monto_convertido END),0) AS ventas_usd,
             COALESCE(SUM(CASE WHEN moneda='VES' THEN monto ELSE monto_convertido END),0) AS ventas_ves
           FROM ventas_diarias WHERE fecha BETWEEN $1 AND $2
           GROUP BY fecha ORDER BY fecha`,
          [fechaDesde, hoy]
        ),
      ]);

      // ── Tasa del día ──────────────────────────────────────────────────────
      const tasa = await db.query(
        'SELECT * FROM tasas_diarias WHERE fecha = $1', [hoy]
      );

      // ── Tendencia mensual (últimos 6 meses) ───────────────────────────────
      const tendencia = await db.query(
        `SELECT
           TO_CHAR(fecha, 'YYYY-MM') AS mes,
           COALESCE(SUM(CASE WHEN moneda='USD' THEN monto ELSE monto_convertido END),0) AS ventas_usd,
           COALESCE(SUM(CASE WHEN moneda='VES' THEN monto ELSE monto_convertido END),0) AS ventas_ves
         FROM ventas_diarias
         WHERE fecha >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
         GROUP BY mes ORDER BY mes`
      );

      // ── CxC / CxP / Nómina / Alertas avanzadas (tablas opcionales) ────────
      // Se ejecutan con fallback vacío si las tablas aún no existen (migraciones pendientes)
      const consultaSegura = async (sql, params = []) => {
        try { return await db.query(sql, params); }
        catch { return { rows: [{}] }; }
      };

      const cxcResumen    = await consultaSegura(
        `SELECT
           COUNT(*) FILTER (WHERE estado='pendiente') AS pendientes,
           COUNT(*) FILTER (WHERE estado='parcial')   AS parciales,
           COUNT(*) FILTER (WHERE estado='vencida')   AS vencidas,
           COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('pendiente','parcial','vencida') AND moneda='USD'),0) AS total_usd,
           COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('pendiente','parcial','vencida') AND moneda='VES'),0) AS total_ves
         FROM cuentas_por_cobrar`
      );

      const cxpResumen    = await consultaSegura(
        `SELECT
           COUNT(*) FILTER (WHERE estado='pendiente') AS pendientes,
           COUNT(*) FILTER (WHERE estado='parcial')   AS parciales,
           COUNT(*) FILTER (WHERE estado='vencida')   AS vencidas,
           COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('pendiente','parcial','vencida') AND moneda='USD'),0) AS total_usd,
           COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('pendiente','parcial','vencida') AND moneda='VES'),0) AS total_ves
         FROM cuentas_por_pagar`
      );

      const nominaResumen = await consultaSegura(
        `SELECT
           COUNT(DISTINCT mn.empleado_id) AS empleados_con_movimientos,
           COALESCE(
             SUM(CASE WHEN mn.tipo IN ('adelanto','venta_credito')
                      THEN CASE WHEN mn.moneda='USD' THEN mn.monto
                                ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv,1),0) END
                      ELSE 0 END)
             - SUM(CASE WHEN mn.tipo='abono'
                        THEN CASE WHEN mn.moneda='USD' THEN mn.monto
                                  ELSE mn.monto / NULLIF(COALESCE(td.tasa_bcv,1),0) END
                        ELSE 0 END),
           0) AS deuda_total_usd
         FROM movimientos_nomina mn
         LEFT JOIN tasas_diarias td ON mn.tasa_id = td.id`
      );

      const alertasPOS    = await consultaSegura(
        `SELECT id, fecha, banco, diferencia FROM cierres_pos
         WHERE diferencia != 0 AND fecha >= NOW() - INTERVAL '30 days'
         ORDER BY fecha DESC LIMIT 5`
      );

      await consultaSegura(
        `UPDATE cuentas_por_cobrar SET estado='vencida'
         WHERE fecha_vencimiento < CURRENT_DATE AND estado NOT IN ('pagada','vencida')`
      );
      await consultaSegura(
        `UPDATE cuentas_por_pagar SET estado='vencida'
         WHERE fecha_vencimiento < CURRENT_DATE AND estado NOT IN ('pagada','vencida')`
      );

      const cxpProximas   = await consultaSegura(
        `SELECT id, descripcion, fecha_vencimiento, monto_total, moneda,
                p.nombre AS proveedor_nombre
         FROM cuentas_por_pagar cxp
         JOIN proveedores p ON cxp.proveedor_id = p.id
         WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
           AND estado NOT IN ('pagada')
         ORDER BY fecha_vencimiento ASC LIMIT 5`
      );

      const cxcVencidas   = await consultaSegura(
        `SELECT id, descripcion, fecha_vencimiento, monto_total, moneda,
                cl.nombre AS cliente_nombre
         FROM cuentas_por_cobrar cxc
         JOIN clientes cl ON cxc.cliente_id = cl.id
         WHERE estado = 'vencida'
         ORDER BY fecha_vencimiento ASC LIMIT 5`
      );

      const ingresosVes = parseFloat(ventas.rows[0].total_ves);
      const ingresosUsd = parseFloat(ventas.rows[0].total_usd);
      const egresosVes  = parseFloat(gastos.rows[0].total_ves);
      const egresosUsd  = parseFloat(gastos.rows[0].total_usd);

      res.json({
        periodo,
        fechaDesde,
        fechaHasta: hoy,
        tasaHoy: tasa.rows[0] || null,
        ingresos:  { ves: ingresosVes, usd: ingresosUsd },
        egresos:   { ves: egresosVes,  usd: egresosUsd },
        ganancia:  { ves: ingresosVes - egresosVes, usd: ingresosUsd - egresosUsd },
        desglosePorMetodo: porMetodo.rows,
        ventasPorDia:      porDia.rows,
        tendenciaMensual:  tendencia.rows,
        cxc: cxcResumen.rows[0],
        cxp: cxpResumen.rows[0],
        nomina: nominaResumen.rows[0],
        alertas: {
          sinTasa:      !tasa.rows[0],
          posConDif:    alertasPOS.rows,
          cxcVencidas:  cxcVencidas.rows,
          cxpProximas:  cxpProximas.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
