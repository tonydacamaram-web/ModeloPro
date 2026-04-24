const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

// ── Autenticación ─────────────────────────────────────────────────────────────
// POST /api/auth/login  (acepta email o username en el campo "login")
router.post('/login', [
  body('login').notEmpty().withMessage('Usuario o email requerido').trim(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validar,
], authController.login);

// GET /api/auth/perfil
router.get('/perfil', verificarToken, authController.perfil);

// ── Gestión de usuarios (solo admin) ─────────────────────────────────────────
router.get('/usuarios',     verificarToken, soloAdmin, authController.listar);
router.post('/usuarios',    verificarToken, soloAdmin, [
  body('nombre').notEmpty().withMessage('El nombre es requerido').trim(),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('username')
    .notEmpty().withMessage('El username es requerido')
    .matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Username: 3-30 caracteres, solo letras, números y _'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').optional().isIn(['admin','operador']).withMessage('Rol inválido'),
  validar,
], authController.crear);

router.put('/usuarios/:id', verificarToken, soloAdmin, [
  body('email').optional().isEmail().normalizeEmail(),
  body('username').optional()
    .matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Username inválido'),
  body('password').optional().isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('rol').optional().isIn(['admin','operador']),
  validar,
], authController.actualizar);

router.delete('/usuarios/:id', verificarToken, soloAdmin, authController.eliminar);

module.exports = router;
