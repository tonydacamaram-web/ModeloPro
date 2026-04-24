const db = require('../config/db');
const bcrypt = require('bcryptjs');

const PERMISOS_DEFAULT_ADMIN = {
  dashboard: true, tasas: true, ventas: true, gastos: true,
  pos: true, fiscal: true, caja_chica: true,
  cxc: true, cxp: true, nomina: true, usuarios: true,
};
const PERMISOS_DEFAULT_OPERADOR = {
  dashboard: true, tasas: true, ventas: true, gastos: true,
  pos: true, fiscal: true, caja_chica: true,
  cxc: true, cxp: true, nomina: true, usuarios: false,
};

const usuarioModel = {
  // ── Búsquedas ────────────────────────────────────────────────────────────
  async buscarPorEmail(email) {
    const r = await db.query(
      'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) AND activo = true',
      [email]
    );
    return r.rows[0] || null;
  },

  async buscarPorUsername(username) {
    const r = await db.query(
      'SELECT * FROM usuarios WHERE LOWER(username) = LOWER($1) AND activo = true',
      [username]
    );
    return r.rows[0] || null;
  },

  // Detecta automáticamente si el identificador es email o username
  async buscarPorLogin(login) {
    const esEmail = login.includes('@');
    return esEmail
      ? this.buscarPorEmail(login)
      : this.buscarPorUsername(login);
  },

  async buscarPorId(id) {
    const r = await db.query(
      `SELECT id, nombre, email, username, rol, activo, permisos, creado_en
       FROM usuarios WHERE id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  // ── Listado ───────────────────────────────────────────────────────────────
  async listar() {
    const r = await db.query(
      `SELECT id, nombre, email, username, rol, activo, permisos, creado_en
       FROM usuarios ORDER BY nombre`
    );
    return r.rows;
  },

  // ── Crear ─────────────────────────────────────────────────────────────────
  async crear({ nombre, email, username, password, rol = 'operador', permisos }) {
    const hash = await bcrypt.hash(password, 10);
    const permisosFinales = permisos ?? (rol === 'admin'
      ? PERMISOS_DEFAULT_ADMIN
      : PERMISOS_DEFAULT_OPERADOR);

    const r = await db.query(
      `INSERT INTO usuarios (nombre, email, username, password_hash, rol, permisos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, email, username, rol, activo, permisos, creado_en`,
      [nombre, email, username.toLowerCase(), hash, rol, JSON.stringify(permisosFinales)]
    );
    return r.rows[0];
  },

  // ── Actualizar ────────────────────────────────────────────────────────────
  async actualizar(id, { nombre, email, username, rol, activo, permisos }) {
    const r = await db.query(
      `UPDATE usuarios
       SET nombre   = COALESCE($1, nombre),
           email    = COALESCE($2, email),
           username = COALESCE($3, username),
           rol      = COALESCE($4, rol),
           activo   = COALESCE($5, activo),
           permisos = COALESCE($6, permisos)
       WHERE id = $7
       RETURNING id, nombre, email, username, rol, activo, permisos, creado_en`,
      [
        nombre,
        email,
        username ? username.toLowerCase() : null,
        rol,
        activo,
        permisos ? JSON.stringify(permisos) : null,
        id,
      ]
    );
    return r.rows[0] || null;
  },

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  async cambiarPassword(id, nuevaPassword) {
    const hash = await bcrypt.hash(nuevaPassword, 10);
    await db.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [hash, id]
    );
  },

  // ── Eliminar (desactivar) ─────────────────────────────────────────────────
  async eliminar(id) {
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
  },
};

module.exports = usuarioModel;
