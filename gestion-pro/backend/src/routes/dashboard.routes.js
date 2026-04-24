const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

// GET /api/dashboard?periodo=dia|semana|mes
router.get('/', dashboardController.resumen);

module.exports = router;
