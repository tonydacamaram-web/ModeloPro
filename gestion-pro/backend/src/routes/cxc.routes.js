const router     = require('express').Router();
const ctrl       = require('../controllers/cxc.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Clientes
router.get('/clientes',        ctrl.listarClientes);
router.post('/clientes',       ctrl.crearCliente);
router.put('/clientes/:id',    soloAdmin, ctrl.actualizarCliente);

// Resumen dashboard
router.get('/resumen',         ctrl.resumen);

// CxC
router.get('/',                ctrl.listar);
router.get('/:id',             ctrl.obtener);
router.post('/',               ctrl.crear);
router.put('/:id',             soloAdmin, ctrl.actualizar);
router.delete('/:id',          soloAdmin, ctrl.eliminar);

// Abonos
router.get('/:id/abonos',      ctrl.listarAbonos);
router.post('/:id/abonos',     ctrl.crearAbono);
router.delete('/:id/abonos/:abonoId', soloAdmin, ctrl.eliminarAbono);

module.exports = router;
