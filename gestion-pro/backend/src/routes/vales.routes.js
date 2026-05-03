const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const valesController = require('../controllers/vales.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

router.get('/',                        valesController.listar);
router.get('/resumen',                 valesController.resumenEmpleados);
router.get('/empleado/:empleadoId',    valesController.listarPorEmpleado);

router.post('/', [
  body('empleadoId').isInt({ min: 1 }).withMessage('Empleado inválido'),
  body('fecha').isDate().withMessage('Fecha inválida'),
  body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  body('moneda').isIn(['USD', 'VES']).withMessage('Moneda inválida'),
  validar,
], valesController.crear);

router.put('/:id/descontar', valesController.marcarDescontado);
router.delete('/:id', soloAdmin, valesController.eliminar);

module.exports = router;
