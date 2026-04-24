const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const tasasController = require('../controllers/tasas.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/tasas/bcv-auto — obtiene tasa BCV automáticamente (dolarapi + scraping)
router.get('/bcv-auto', tasasController.obtenerBCVAuto);

// GET /api/tasas/hoy
router.get('/hoy', tasasController.obtenerHoy);

// GET /api/tasas — historial
router.get('/', tasasController.listar);

// POST /api/tasas — registrar tasa del día
router.post('/', [
  body('tasaBcv')
    .isFloat({ min: 0.01 })
    .withMessage('La tasa BCV debe ser un número positivo'),
  body('fecha')
    .optional()
    .isDate()
    .withMessage('Fecha inválida (formato YYYY-MM-DD)'),
  validar,
], tasasController.crear);

// PUT /api/tasas/:id — actualizar (solo admin)
router.put('/:id', soloAdmin, [
  body('tasaBcv')
    .isFloat({ min: 0.01 })
    .withMessage('La tasa BCV debe ser un número positivo'),
  validar,
], tasasController.actualizar);

module.exports = router;
