const db = require('../config/db');

const clienteModel = {
  // Listar clientes activos
  async listar({ soloActivos = false } = {}) {
    const where = soloActivos ? 'WHERE activo = true' : '';
    const r = await db.query(
      `SELECT * FROM clientes ${where} ORDER BY nombre ASC`
    );
    return r.rows;
  },

  async buscarPorId(id) {
    const r = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async crear({ nombre, rifCedula, telefono }) {
    const r = await db.query(
      `INSERT INTO clientes (nombre, rif_cedula, telefono)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, rifCedula || null, telefono || null]
    );
    return r.rows[0];
  },

  async actualizar(id, { nombre, rifCedula, telefono, activo }) {
    const r = await db.query(
      `UPDATE clientes SET
         nombre     = COALESCE($1, nombre),
         rif_cedula = COALESCE($2, rif_cedula),
         telefono   = COALESCE($3, telefono),
         activo     = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [nombre, rifCedula, telefono, activo, id]
    );
    return r.rows[0] || null;
  },
};

module.exports = clienteModel;
