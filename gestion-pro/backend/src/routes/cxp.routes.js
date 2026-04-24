const router = require('express').Router();
const ctrl   = require('../controllers/cxp.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

router.use(verificarToken);

// Proveedores
router.get('/proveedores',        ctrl.listarProveedores);
router.post('/proveedores',       ctrl.crearProveedor);
router.put('/proveedores/:id',    soloAdmin, ctrl.actualizarProveedor);

// Resumen dashboard
router.get('/resumen',            ctrl.resumen);

// CxP
router.get('/',                   ctrl.listar);
router.get('/:id',                ctrl.obtener);
router.post('/',                  ctrl.crear);
router.put('/:id',                soloAdmin, ctrl.actualizar);
router.delete('/:id',             soloAdmin, ctrl.eliminar);

// Abonos
router.get('/:id/abonos',         ctrl.listarAbonos);
router.post('/:id/abonos',        ctrl.crearAbono);
router.delete('/:id/abonos/:abonoId', soloAdmin, ctrl.eliminarAbono);

module.exports = router;
