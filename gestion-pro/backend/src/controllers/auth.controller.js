const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');

const generarToken = (usuario) =>
  jwt.sign(
    {
      id:       usuario.id,
      email:    usuario.email,
      username: usuario.username,
      rol:      usuario.rol,
      nombre:   usuario.nombre,
      permisos: usuario.permisos || {},
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

const authController = {
  // ── POST /api/auth/login ──────────────────────────────────────────────────
  // Acepta email O username en el campo "login"
  async login(req, res, next) {
    try {
      const { login, password } = req.body;

      const usuario = await usuarioModel.buscarPorLogin(login);
      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const ok = await bcrypt.compare(password, usuario.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const token = generarToken(usuario);

      res.json({
        token,
        usuario: {
          id:       usuario.id,
          nombre:   usuario.nombre,
          email:    usuario.email,
          username: usuario.username,
          rol:      usuario.rol,
          permisos: usuario.permisos || {},
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // ── GET /api/auth/perfil ──────────────────────────────────────────────────
  async perfil(req, res, next) {
    try {
      const usuario = await usuarioModel.buscarPorId(req.usuario.id);
      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(usuario);
    } catch (err) {
      next(err);
    }
  },

  // ── GET /api/usuarios ─────────────────────────────────────────────────────
  async listar(req, res, next) {
    try {
      const usuarios = await usuarioModel.listar();
      res.json(usuarios);
    } catch (err) {
      next(err);
    }
  },

  // ── POST /api/usuarios ────────────────────────────────────────────────────
  async crear(req, res, next) {
    try {
      const { nombre, email, username, password, rol, permisos } = req.body;

      // Verificar duplicados
      const [porEmail, porUsername] = await Promise.all([
        usuarioModel.buscarPorEmail(email).catch(() => null),
        usuarioModel.buscarPorUsername(username).catch(() => null),
      ]);
      if (porEmail)    return res.status(409).json({ error: 'El email ya está en uso' });
      if (porUsername) return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });

      const nuevo = await usuarioModel.crear({ nombre, email, username, password, rol, permisos });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },

  // ── PUT /api/usuarios/:id ─────────────────────────────────────────────────
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nombre, email, username, password, rol, activo, permisos } = req.body;

      const actualizado = await usuarioModel.actualizar(id, {
        nombre, email, username, rol, activo, permisos,
      });
      if (!actualizado) return res.status(404).json({ error: 'Usuario no encontrado' });

      if (password) {
        await usuarioModel.cambiarPassword(id, password);
      }

      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  // ── DELETE /api/usuarios/:id ──────────────────────────────────────────────
  async eliminar(req, res, next) {
    try {
      const { id } = req.params;
      // No puede eliminarse a sí mismo
      if (parseInt(id) === req.usuario.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }
      await usuarioModel.eliminar(id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
