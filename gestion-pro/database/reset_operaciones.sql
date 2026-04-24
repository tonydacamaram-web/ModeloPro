-- Limpia todas las operaciones, conservando clientes, proveedores,
-- empleados, usuarios, categorías y configuración de tesorería.

BEGIN;

-- Abonos (deben ir antes que las tablas padre por FK)
TRUNCATE TABLE abonos_cxp         RESTART IDENTITY CASCADE;
TRUNCATE TABLE abonos_cxc         RESTART IDENTITY CASCADE;
TRUNCATE TABLE movimientos_nomina RESTART IDENTITY CASCADE;
TRUNCATE TABLE venta_detalles     RESTART IDENTITY CASCADE;

-- Operaciones principales
TRUNCATE TABLE cuentas_por_pagar  RESTART IDENTITY CASCADE;
TRUNCATE TABLE cuentas_por_cobrar RESTART IDENTITY CASCADE;
TRUNCATE TABLE ventas_diarias     RESTART IDENTITY CASCADE;
TRUNCATE TABLE gastos             RESTART IDENTITY CASCADE;
TRUNCATE TABLE cierres_pos        RESTART IDENTITY CASCADE;
TRUNCATE TABLE cierres_fiscales   RESTART IDENTITY CASCADE;
TRUNCATE TABLE caja_chica         RESTART IDENTITY CASCADE;
TRUNCATE TABLE tasas_diarias      RESTART IDENTITY CASCADE;

-- Tablas conservadas (NO se tocan):
-- usuarios, categorias_gasto, clientes, proveedores,
-- empleados, configuracion_tesoreria

COMMIT;
