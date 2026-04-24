const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const categoriasController = require('../controllers/categorias.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validar');

router.use(verificarToken);

// GET /api/categorias
router.get('/', categoriasController.listar);

// POST /api/categorias (solo admin)
router.post('/', soloAdmin, [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('tipo').isIn(['factura', 'eventual', 'divisas']).withMessage('Tipo inválido'),
  validar,
], categoriasController.crear);

// PUT /api/categorias/:id (solo admin)
router.put('/:id', soloAdmin, categoriasController.actualizar);

module.exports = router;
