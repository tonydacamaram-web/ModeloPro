const router = require('express').Router();
const ctrl   = require('../controllers/nomina.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

router.use(verificarToken);

// Empleados
router.get('/empleados',          ctrl.listarEmpleados);
router.post('/empleados',         ctrl.crearEmpleado);
router.put('/empleados/:id',      soloAdmin, ctrl.actualizarEmpleado);

// Resumen global
router.get('/resumen',            ctrl.resumen);

// Lista empleados con saldo
router.get('/',                   ctrl.listarConSaldo);

// Detalle de un empleado + movimientos
router.get('/:id',                ctrl.detalleEmpleado);

// Movimientos
router.post('/:id/movimientos',   ctrl.crearMovimiento);
router.delete('/:id/movimientos/:movId', soloAdmin, ctrl.eliminarMovimiento);

module.exports = router;
