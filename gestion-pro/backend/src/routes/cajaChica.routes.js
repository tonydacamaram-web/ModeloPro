const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const cajaChicaController = require('../controllers/cajaChica.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/caja-chica
router.get('/', cajaChicaController.listar);

// GET /api/caja-chica/saldo
router.get('/saldo', cajaChicaController.saldo);

// GET /api/caja-chica/:id
router.get('/:id', cajaChicaController.obtener);

// POST /api/caja-chica
router.post('/', [
  body('tipo').isIn(['asignacion','gasto','reposicion']).withMessage('Tipo inválido'),
  body('monto').isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  body('moneda').isIn(['VES','USD']).withMessage('Moneda inválida'),
  body('fecha').optional().isDate().withMessage('Fecha inválida'),
  validar,
], cajaChicaController.crear);

// DELETE /api/caja-chica/:id (solo admin)
router.delete('/:id', soloAdmin, cajaChicaController.eliminar);

module.exports = router;
