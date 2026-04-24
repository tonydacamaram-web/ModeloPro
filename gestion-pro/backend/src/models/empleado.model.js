const db = require('../config/db');

const empleadoModel = {
  async listar({ soloActivos = false } = {}) {
    const where = soloActivos ? 'WHERE activo = true' : '';
    const r = await db.query(
      `SELECT * FROM empleados ${where} ORDER BY nombre ASC`
    );
    return r.rows;
  },

  async buscarPorId(id) {
    const r = await db.query('SELECT * FROM empleados WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async crear({ nombre, cedula, cargo }) {
    const r = await db.query(
      `INSERT INTO empleados (nombre, cedula, cargo)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, cedula || null, cargo || null]
    );
    return r.rows[0];
  },

  async actualizar(id, { nombre, cedula, cargo, activo }) {
    const r = await db.query(
      `UPDATE empleados SET
         nombre = COALESCE($1, nombre),
         cedula = COALESCE($2, cedula),
         cargo  = COALESCE($3, cargo),
         activo = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [nombre, cedula, cargo, activo, id]
    );
    return r.rows[0] || null;
  },
};

module.exports = empleadoModel;
