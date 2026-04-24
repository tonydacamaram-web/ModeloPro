const db = require('../config/db');

// Recalcula y persiste el estado de una CxC según abonos acumulados
async function recalcularEstado(client, cuentaId) {
  const cxc = await client.query(
    'SELECT monto_total, fecha_vencimiento FROM cuentas_por_cobrar WHERE id = $1',
    [cuentaId]
  );
  if (!cxc.rows[0]) return;

  const { monto_total, fecha_vencimiento } = cxc.rows[0];
  const abonos = await client.query(
    `SELECT COALESCE(SUM(
       CASE WHEN moneda = 'VES' THEN monto ELSE monto * COALESCE(td.tasa_bcv,1) END
     ), 0) AS suma_ves
     FROM abonos_cxc a
     LEFT JOIN tasas_diarias td ON a.tasa_id = td.id
     WHERE a.cuenta_id = $1`,
    [cuentaId]
  );

  const suma = parseFloat(abonos.rows[0].suma_ves);
  const total = parseFloat(monto_total);
  let estado = 'pendiente';

  if (suma >= total) {
    estado = 'pagada';
  } else if (suma > 0) {
    estado = 'parcial';
  } else if (fecha_vencimiento && new Date(fecha_vencimiento) < new Date()) {
    estado = 'vencida';
  }

  await client.query(
    'UPDATE cuentas_por_cobrar SET estado = $1 WHERE id = $2',
    [estado, cuentaId]
  );
}

const cxcModel = {
  // Listar CxC con datos del cliente y saldo calculado
  async listar({ clienteId, estado, fechaDesde, fechaHasta, limite = 50, pagina = 1 } = {}) {
    const conds = [];
    const params = [];
    let idx = 1;

    if (clienteId) { conds.push(`c.id = $${idx++}`); params.push(clienteId); }
    if (estado)    { conds.push(`cxc.estado = $${idx++}`); params.push(estado); }
    if (fechaDesde){ conds.push(`cxc.fecha >= $${idx++}`); params.push(fechaDesde); }
    if (fechaHasta){ conds.push(`cxc.fecha <= $${idx++}`); params.push(fechaHasta); }

    const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const r = await db.query(
      `SELECT
         cxc.*,
         cl.nombre      AS cliente_nombre,
         cl.rif_cedula  AS cliente_rif,
         cl.telefono    AS cliente_telefono,
         u.nombre       AS registrado_por_nombre,
         COALESCE(
           (SELECT SUM(a.monto) FROM abonos_cxc a WHERE a.cuenta_id = cxc.id AND a.moneda = cxc.moneda),
           0
         ) AS total_abonado
       FROM cuentas_por_cobrar cxc
       JOIN clientes cl ON cxc.cliente_id = cl.id
       LEFT JOIN usuarios u ON cxc.registrado_por = u.id
       ${where}
       ORDER BY
         CASE cxc.estado
           WHEN 'vencida'  THEN 1
           WHEN 'pendiente' THEN 2
           WHEN 'parcial'  THEN 3
           WHEN 'pagada'   THEN 4
         END,
         cxc.fecha_vencimiento ASC NULLS LAST,
         cxc.fecha DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM cuentas_por_cobrar cxc
       JOIN clientes cl ON cxc.cliente_id = cl.id
       ${where}`,
      params
    );

    return { cuentas: r.rows, total: parseInt(total.rows[0].count) };
  },

  async buscarPorId(id) {
    const r = await db.query(
      `SELECT cxc.*, cl.nombre AS cliente_nombre, cl.rif_cedula AS cliente_rif
       FROM cuentas_por_cobrar cxc
       JOIN clientes cl ON cxc.cliente_id = cl.id
       WHERE cxc.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  async crear({ clienteId, fecha, descripcion, montoTotal, moneda, montoConvertido, tasaId, fechaVencimiento, registradoPor }) {
    const r = await db.query(
      `INSERT INTO cuentas_por_cobrar
         (cliente_id, fecha, descripcion, monto_total, moneda, monto_convertido, tasa_id, fecha_vencimiento, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [clienteId, fecha, descripcion, montoTotal, moneda, montoConvertido || null, tasaId || null, fechaVencimiento || null, registradoPor]
    );
    return r.rows[0];
  },

  async actualizar(id, { descripcion, montoTotal, fechaVencimiento }) {
    const r = await db.query(
      `UPDATE cuentas_por_cobrar SET
         descripcion       = COALESCE($1, descripcion),
         monto_total       = COALESCE($2, monto_total),
         fecha_vencimiento = COALESCE($3, fecha_vencimiento)
       WHERE id = $4 RETURNING *`,
      [descripcion, montoTotal, fechaVencimiento, id]
    );
    return r.rows[0] || null;
  },

  async eliminar(id) {
    const r = await db.query(
      'DELETE FROM cuentas_por_cobrar WHERE id = $1 RETURNING *', [id]
    );
    return r.rows[0] || null;
  },

  // ── Abonos ────────────────────────────────────────────────────────────────

  async listarAbonos(cuentaId) {
    const r = await db.query(
      `SELECT a.*, u.nombre AS registrado_por_nombre
       FROM abonos_cxc a
       LEFT JOIN usuarios u ON a.registrado_por = u.id
       WHERE a.cuenta_id = $1
       ORDER BY a.fecha DESC, a.creado_en DESC`,
      [cuentaId]
    );
    return r.rows;
  },

  async crearAbono({ cuentaId, fecha, monto, moneda, metodoPago, tasaId, nota, registradoPor }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const r = await client.query(
        `INSERT INTO abonos_cxc
           (cuenta_id, fecha, monto, moneda, metodo_pago, tasa_id, nota, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [cuentaId, fecha, monto, moneda, metodoPago, tasaId || null, nota || null, registradoPor]
      );

      await recalcularEstado(client, cuentaId);
      await client.query('COMMIT');
      return r.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async eliminarAbono(abonoId) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const abono = await client.query(
        'DELETE FROM abonos_cxc WHERE id = $1 RETURNING *', [abonoId]
      );
      if (!abono.rows[0]) { await client.query('ROLLBACK'); return null; }

      await recalcularEstado(client, abono.rows[0].cuenta_id);
      await client.query('COMMIT');
      return abono.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Resumen para dashboard ─────────────────────────────────────────────────
  async resumen() {
    const r = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE estado = 'pendiente')               AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'parcial')                 AS parciales,
         COUNT(*) FILTER (WHERE estado = 'vencida')                 AS vencidas,
         COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('pendiente','parcial','vencida') AND moneda = 'USD'), 0) AS total_pendiente_usd,
         COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('pendiente','parcial','vencida') AND moneda = 'VES'), 0) AS total_pendiente_ves
       FROM cuentas_por_cobrar`
    );
    return r.rows[0];
  },

  // Actualiza vencidas (cron o al listar)
  async marcarVencidas() {
    await db.query(
      `UPDATE cuentas_por_cobrar
       SET estado = 'vencida'
       WHERE fecha_vencimiento < CURRENT_DATE
         AND estado NOT IN ('pagada','vencida')`
    );
  },
};

module.exports = cxcModel;
