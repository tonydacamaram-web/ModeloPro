const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const fiscalController = require('../controllers/fiscal.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/fiscal
router.get('/', fiscalController.listar);

// GET /api/fiscal/resumen/:anio/:mes
router.get('/resumen/:anio/:mes', fiscalController.resumenMensual);

// GET /api/fiscal/resumen-anual/:anio
router.get('/resumen-anual/:anio', fiscalController.resumenAnual);

// GET /api/fiscal/:id
router.get('/:id', fiscalController.obtener);

// POST /api/fiscal
router.post('/', [
  body('numeroZ').notEmpty().withMessage('El número de reporte Z es requerido'),
  body('fecha').optional().isDate().withMessage('Fecha inválida'),
  body('baseImponible').optional().isFloat({ min: 0 }).withMessage('Base imponible inválida'),
  body('iva').optional().isFloat({ min: 0 }).withMessage('IVA inválido'),
  body('exento').optional().isFloat({ min: 0 }).withMessage('Exento inválido'),
  body('igtf').optional().isFloat({ min: 0 }).withMessage('IGTF inválido'),
  validar,
], fiscalController.crear);

// PUT /api/fiscal/:id (solo admin)
router.put('/:id', soloAdmin, [
  body('baseImponible').optional().isFloat({ min: 0 }).withMessage('Base imponible inválida'),
  body('iva').optional().isFloat({ min: 0 }).withMessage('IVA inválido'),
  body('exento').optional().isFloat({ min: 0 }).withMessage('Exento inválido'),
  body('igtf').optional().isFloat({ min: 0 }).withMessage('IGTF inválido'),
  validar,
], fiscalController.actualizar);

// DELETE /api/fiscal/:id (solo admin)
router.delete('/:id', soloAdmin, fiscalController.eliminar);

module.exports = router;
