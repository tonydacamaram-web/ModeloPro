const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ventasController = require('../controllers/ventas.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/ventas — historial
router.get('/', ventasController.listar);

// GET /api/ventas/dia/:fecha — ventas de un día
router.get('/dia/:fecha', ventasController.obtenerDia);

// POST /api/ventas — guardar día completo
router.post('/', [
  body('ventas').isArray({ min: 1 }).withMessage('Se requiere al menos una venta'),
  body('ventas.*.metodoPago').notEmpty().withMessage('Método de pago requerido'),
  body('ventas.*.monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  body('ventas.*.moneda').isIn(['VES', 'USD']).withMessage('Moneda inválida'),
  body('fecha').optional().isDate().withMessage('Fecha inválida'),
  validar,
], ventasController.guardarDia);

// DELETE /api/ventas/:id — eliminar (solo admin)
router.delete('/:id', soloAdmin, ventasController.eliminar);

module.exports = router;
