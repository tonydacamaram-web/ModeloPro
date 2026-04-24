const db = require('../config/db');

const proveedorModel = {
  async listar({ soloActivos = false } = {}) {
    const where = soloActivos ? 'WHERE activo = true' : '';
    const r = await db.query(
      `SELECT * FROM proveedores ${where} ORDER BY nombre ASC`
    );
    return r.rows;
  },

  async buscarPorId(id) {
    const r = await db.query('SELECT * FROM proveedores WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async crear({ nombre, rif, telefono }) {
    const r = await db.query(
      `INSERT INTO proveedores (nombre, rif, telefono)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, rif || null, telefono || null]
    );
    return r.rows[0];
  },

  async actualizar(id, { nombre, rif, telefono, activo }) {
    const r = await db.query(
      `UPDATE proveedores SET
         nombre   = COALESCE($1, nombre),
         rif      = COALESCE($2, rif),
         telefono = COALESCE($3, telefono),
         activo   = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [nombre, rif, telefono, activo, id]
    );
    return r.rows[0] || null;
  },
};

module.exports = proveedorModel;
