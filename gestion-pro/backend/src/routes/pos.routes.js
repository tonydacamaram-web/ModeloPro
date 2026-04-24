const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const posController = require('../controllers/pos.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/pos
router.get('/', posController.listar);

// GET /api/pos/ventas-dia/:fecha
router.get('/ventas-dia/:fecha', posController.ventasDia);

// GET /api/pos/:id
router.get('/:id', posController.obtener);

// POST /api/pos
router.post('/', [
  body('banco').notEmpty().withMessage('El banco es requerido'),
  body('numeroLote').notEmpty().withMessage('El número de lote es requerido'),
  body('montoCierre').isFloat({ min: 0.01 }).withMessage('El monto del cierre debe ser mayor a 0'),
  body('moneda').optional().isIn(['VES', 'USD']).withMessage('Moneda inválida'),
  body('fecha').optional().isDate().withMessage('Fecha inválida'),
  validar,
], posController.crear);

// PUT /api/pos/:id (solo admin)
router.put('/:id', soloAdmin, [
  body('montoCierre').optional().isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  validar,
], posController.actualizar);

// DELETE /api/pos/:id (solo admin)
router.delete('/:id', soloAdmin, posController.eliminar);

module.exports = router;
