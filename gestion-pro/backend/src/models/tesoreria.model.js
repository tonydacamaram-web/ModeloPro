const db = require('../config/db');

const tesoreraModel = {
  // Obtener configuración completa de canales
  async obtenerConfiguracion() {
    const r = await db.query(
      'SELECT * FROM configuracion_tesoreria ORDER BY orden, id'
    );
    return r.rows;
  },

  // Actualizar un canal de configuración
  async actualizarConfiguracion(id, { cuentaDestino, comisionPct }) {
    const r = await db.query(
      `UPDATE configuracion_tesoreria SET
         cuenta_destino = COALESCE($1, cuenta_destino),
         comision_pct   = COALESCE($2, comision_pct),
         actualizado_en = NOW()
       WHERE id = $3
       RETURNING *`,
      [cuentaDestino, comisionPct, id]
    );
    return r.rows[0] || null;
  },

  // Calcular saldo de tesorería agrupado por cuenta destino
  async calcularSaldo({ fechaDesde, fechaHasta } = {}) {
    // ── Construir filtro de fechas ───────────────────────
    const filtroParams = [];
    let idx = 1;
    const filtroSQL = [];
    if (fechaDesde) { filtroSQL.push(`fecha >= $${idx++}`); filtroParams.push(fechaDesde); }
    if (fechaHasta) { filtroSQL.push(`fecha <= $${idx++}`); filtroParams.push(fechaHasta); }
    const whereExtra = filtroSQL.length ? `AND ${filtroSQL.join(' AND ')}` : '';

    // ── 1. Config de canales ─────────────────────────────
    const cfgRes = await db.query(
      'SELECT * FROM configuracion_tesoreria ORDER BY orden, id'
    );
    const cfgByCanal = {};
    cfgRes.rows.forEach(c => { cfgByCanal[c.canal] = c; });

    // ── 2. Ventas por método (excluye POS) ───────────────
    const ventasRes = await db.query(
      `SELECT metodo_pago, moneda, COALESCE(SUM(monto), 0) AS total
       FROM ventas_diarias
       WHERE metodo_pago NOT IN ('pos_debito','pos_credito') ${whereExtra}
       GROUP BY metodo_pago, moneda`,
      filtroParams
    );

    // ── 3. POS por banco y tipo (débito/crédito) desde venta_detalles ──
    const posRes = await db.query(
      `SELECT vd.banco,
              COALESCE(v.moneda, 'VES') AS moneda,
              v.metodo_pago,
              COALESCE(SUM(vd.monto), 0) AS total
       FROM venta_detalles vd
       JOIN ventas_diarias v ON v.id = vd.venta_id
       WHERE v.metodo_pago IN ('pos_debito','pos_credito')
         AND vd.banco IS NOT NULL
         AND vd.monto IS NOT NULL
         ${whereExtra.replace(/fecha/g, 'v.fecha')}
       GROUP BY vd.banco, v.moneda, v.metodo_pago`,
      filtroParams
    );

    // ── 4. Movimientos manuales de caja chica ────────────
    const ccRes = await db.query(
      `SELECT moneda,
         COALESCE(SUM(CASE WHEN tipo IN ('asignacion','reposicion') THEN monto ELSE 0 END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) AS gastos
       FROM caja_chica
       WHERE 1=1 ${whereExtra}
       GROUP BY moneda`,
      filtroParams
    );

    // ── Acumular por cuenta_destino ─────────────────────
    const cuentas = {};

    const agregarACuenta = (nombre, moneda, bruto, comisionPct) => {
      const key = `${nombre}||${moneda}`;
      if (!cuentas[key]) {
        cuentas[key] = { cuenta: nombre, moneda, bruto: 0, comisiones: 0, fuentes: [] };
      }
      const comision = bruto * (parseFloat(comisionPct) / 100);
      cuentas[key].bruto      += bruto;
      cuentas[key].comisiones += comision;
    };

    // Procesar ventas (no-POS)
    ventasRes.rows.forEach(v => {
      const cfg = cfgByCanal[v.metodo_pago];
      if (!cfg) return;
      agregarACuenta(cfg.cuenta_destino, v.moneda, parseFloat(v.total), cfg.comision_pct);
    });

    // Procesar cierres POS — comisión diferenciada por débito/crédito
    posRes.rows.forEach(p => {
      const cfg = cfgByCanal[p.metodo_pago] ?? cfgByCanal['pos'];
      const comision = cfg ? parseFloat(cfg.comision_pct) : 0;
      agregarACuenta(p.banco, p.moneda, parseFloat(p.total), comision);
    });

    // Finalizar cuentas
    const cuentasArray = Object.values(cuentas).map(c => ({
      cuenta:     c.cuenta,
      moneda:     c.moneda,
      bruto:      parseFloat(c.bruto.toFixed(2)),
      comisiones: parseFloat(c.comisiones.toFixed(2)),
      neto:       parseFloat((c.bruto - c.comisiones).toFixed(2)),
    }));

    // Ordenar: primero VES, luego USD; y dentro de cada grupo alfabético
    cuentasArray.sort((a, b) => {
      if (a.moneda !== b.moneda) return a.moneda === 'VES' ? -1 : 1;
      return a.cuenta.localeCompare(b.cuenta);
    });

    // Movimientos manuales
    const manualesVES = ccRes.rows.find(r => r.moneda === 'VES') || { entradas: 0, gastos: 0 };
    const manualesUSD = ccRes.rows.find(r => r.moneda === 'USD') || { entradas: 0, gastos: 0 };

    // Totales globales
    const totalNetoVES = cuentasArray
      .filter(c => c.moneda === 'VES')
      .reduce((s, c) => s + c.neto, 0);
    const totalNetoUSD = cuentasArray
      .filter(c => c.moneda === 'USD')
      .reduce((s, c) => s + c.neto, 0);
    const totalComisionesVES = cuentasArray
      .filter(c => c.moneda === 'VES')
      .reduce((s, c) => s + c.comisiones, 0);
    const totalComisionesUSD = cuentasArray
      .filter(c => c.moneda === 'USD')
      .reduce((s, c) => s + c.comisiones, 0);

    return {
      cuentas: cuentasArray,
      configuracion: cfgRes.rows,
      manuales: {
        VES: {
          entradas: parseFloat(manualesVES.entradas),
          gastos:   parseFloat(manualesVES.gastos),
          neto:     parseFloat(manualesVES.entradas) - parseFloat(manualesVES.gastos),
        },
        USD: {
          entradas: parseFloat(manualesUSD.entradas),
          gastos:   parseFloat(manualesUSD.gastos),
          neto:     parseFloat(manualesUSD.entradas) - parseFloat(manualesUSD.gastos),
        },
      },
      totales: {
        netoVES:       parseFloat(totalNetoVES.toFixed(2)),
        netoUSD:       parseFloat(totalNetoUSD.toFixed(2)),
        comisionesVES: parseFloat(totalComisionesVES.toFixed(2)),
        comisionesUSD: parseFloat(totalComisionesUSD.toFixed(2)),
      },
    };
  },
};

module.exports = tesoreraModel;
