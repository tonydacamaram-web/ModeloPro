const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const tesoreraController = require('../controllers/tesoreria.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/tesoreria/saldo
router.get('/saldo', tesoreraController.saldo);

// GET /api/tesoreria/configuracion
router.get('/configuracion', tesoreraController.obtenerConfiguracion);

// PUT /api/tesoreria/configuracion/:id (solo admin)
router.put('/configuracion/:id', soloAdmin, [
  body('cuentaDestino').optional().notEmpty().withMessage('La cuenta destino no puede estar vacía'),
  body('comisionPct').optional().isFloat({ min: 0, max: 100 }).withMessage('La comisión debe ser entre 0 y 100'),
  validar,
], tesoreraController.actualizarConfiguracion);

module.exports = router;
