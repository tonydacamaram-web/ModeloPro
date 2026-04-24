const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const gastosController = require('../controllers/gastos.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/gastos/proveedores — autocompletado de proveedores
router.get('/proveedores', gastosController.listarProveedores);

// GET /api/gastos
router.get('/', gastosController.listar);

// GET /api/gastos/:id
router.get('/:id', gastosController.obtener);

// POST /api/gastos
router.post('/', [
  body('tipo').isIn(['factura', 'eventual', 'divisas']).withMessage('Tipo de gasto inválido'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida'),
  body('monto').isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  body('moneda').isIn(['VES', 'USD']).withMessage('Moneda inválida'),
  body('fecha').optional().isDate().withMessage('Fecha inválida'),
  validar,
], gastosController.crear);

// PUT /api/gastos/:id (solo admin)
router.put('/:id', soloAdmin, [
  body('descripcion').optional().notEmpty().withMessage('La descripción no puede estar vacía'),
  body('monto').optional().isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  body('moneda').optional().isIn(['VES', 'USD']).withMessage('Moneda inválida'),
  validar,
], gastosController.actualizar);

// DELETE /api/gastos/:id (solo admin)
router.delete('/:id', soloAdmin, gastosController.eliminar);

module.exports = router;
