const db = require('../config/db');

const tasaModel = {
  // Obtener tasa de una fecha específica (o de hoy si no se indica)
  async buscarPorFecha(fecha) {
    const resultado = await db.query(
      'SELECT t.*, u.nombre AS registrado_por_nombre FROM tasas_diarias t LEFT JOIN usuarios u ON t.registrado_por = u.id WHERE t.fecha = $1',
      [fecha]
    );
    return resultado.rows[0] || null;
  },

  // Obtener la tasa del día actual
  async obtenerHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    return this.buscarPorFecha(hoy);
  },

  // Tasa más reciente registrada (fallback cuando no hay tasa exacta para la fecha)
  async buscarMasReciente() {
    const resultado = await db.query(
      'SELECT * FROM tasas_diarias ORDER BY fecha DESC LIMIT 1'
    );
    return resultado.rows[0] || null;
  },

  // Listar tasas con filtro opcional por rango de fechas
  async listar({ fechaDesde, fechaHasta, limite = 30, pagina = 1 } = {}) {
    let condiciones = [];
    let params = [];
    let idx = 1;

    if (fechaDesde) {
      condiciones.push(`t.fecha >= $${idx++}`);
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      condiciones.push(`t.fecha <= $${idx++}`);
      params.push(fechaHasta);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resultado = await db.query(
      `SELECT t.*, u.nombre AS registrado_por_nombre
       FROM tasas_diarias t
       LEFT JOIN usuarios u ON t.registrado_por = u.id
       ${where}
       ORDER BY t.fecha DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM tasas_diarias t ${where}`,
      params
    );

    return { tasas: resultado.rows, total: parseInt(total.rows[0].count) };
  },

  // Registrar nueva tasa del día
  async crear({ fecha, tasaBcv, registradoPor }) {
    const resultado = await db.query(
      'INSERT INTO tasas_diarias (fecha, tasa_bcv, registrado_por) VALUES ($1, $2, $3) RETURNING *',
      [fecha, tasaBcv, registradoPor]
    );
    return resultado.rows[0];
  },

  // Actualizar tasa existente (solo admin)
  async actualizar(id, { tasaBcv }) {
    const resultado = await db.query(
      'UPDATE tasas_diarias SET tasa_bcv = $1 WHERE id = $2 RETURNING *',
      [tasaBcv, id]
    );
    return resultado.rows[0] || null;
  },
};

module.exports = tasaModel;
