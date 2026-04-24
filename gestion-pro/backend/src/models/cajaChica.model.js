const db = require('../config/db');

const cajaChicaModel = {
  // Listar movimientos con filtros
  async listar({ fechaDesde, fechaHasta, tipo, limite = 50, pagina = 1 } = {}) {
    let condiciones = [];
    let params = [];
    let idx = 1;

    if (fechaDesde) { condiciones.push(`cc.fecha >= $${idx++}`); params.push(fechaDesde); }
    if (fechaHasta) { condiciones.push(`cc.fecha <= $${idx++}`); params.push(fechaHasta); }
    if (tipo)       { condiciones.push(`cc.tipo = $${idx++}`);   params.push(tipo); }

    const where  = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resultado = await db.query(
      `SELECT cc.*, u.nombre AS registrado_por_nombre, t.tasa_bcv
       FROM caja_chica cc
       LEFT JOIN usuarios u ON cc.registrado_por = u.id
       LEFT JOIN tasas_diarias t ON cc.tasa_id = t.id
       ${where}
       ORDER BY cc.fecha DESC, cc.creado_en DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM caja_chica cc ${where}`, params
    );

    return { movimientos: resultado.rows, total: parseInt(total.rows[0].count) };
  },

  // Obtener por ID
  async buscarPorId(id) {
    const r = await db.query(
      `SELECT cc.*, u.nombre AS registrado_por_nombre, t.tasa_bcv
       FROM caja_chica cc
       LEFT JOIN usuarios u ON cc.registrado_por = u.id
       LEFT JOIN tasas_diarias t ON cc.tasa_id = t.id
       WHERE cc.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  // Crear movimiento
  async crear({ tipo, fecha, descripcion, monto, moneda, montoConvertido, tasaId, registradoPor }) {
    const r = await db.query(
      `INSERT INTO caja_chica
         (tipo, fecha, descripcion, monto, moneda, monto_convertido, tasa_id, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [tipo, fecha, descripcion || null, monto, moneda, montoConvertido, tasaId, registradoPor]
    );
    return r.rows[0];
  },

  // Eliminar (solo admin)
  async eliminar(id) {
    const r = await db.query(
      'DELETE FROM caja_chica WHERE id = $1 RETURNING *', [id]
    );
    return r.rows[0] || null;
  },

  // Calcular saldo actual del fondo
  // saldo = SUM(asignaciones + reposiciones) - SUM(gastos)
  async calcularSaldo() {
    const r = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo IN ('asignacion','reposicion') THEN monto ELSE 0 END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0)                       AS gastos
       FROM caja_chica
       WHERE moneda = 'VES'`
    );
    const { entradas, gastos } = r.rows[0];
    return {
      entradas: parseFloat(entradas),
      gastos:   parseFloat(gastos),
      saldo:    parseFloat((entradas - gastos).toFixed(2)),
    };
  },

  // Último fondo asignado (monto de la última asignación)
  async ultimaAsignacion() {
    const r = await db.query(
      `SELECT monto FROM caja_chica
       WHERE tipo = 'asignacion'
       ORDER BY fecha DESC, creado_en DESC
       LIMIT 1`
    );
    return r.rows[0] ? parseFloat(r.rows[0].monto) : 0;
  },
};

module.exports = cajaChicaModel;
