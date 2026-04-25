/**
 * Script para ejecutar las migraciones SQL en orden.
 * Uso: node scripts/migrar.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRACIONES = [
  '001_usuarios.sql',
  '002_tasas_diarias.sql',
  '003_ventas_diarias.sql',
  '004_categorias_gasto.sql',
  '005_gastos.sql',
  '006_venta_detalles.sql',
  '007_cierres_pos.sql',
  '008_cierres_fiscales.sql',
  '009_caja_chica.sql',
  '010_alter_cierres_fiscales.sql',
  '011_configuracion_tesoreria.sql',
  '012_clientes.sql',
  '013_cuentas_por_cobrar.sql',
  '014_abonos_cxc.sql',
  '015_proveedores.sql',
  '016_cuentas_por_pagar.sql',
  '017_abonos_cxp.sql',
  '018_empleados.sql',
  '019_movimientos_nomina.sql',
  '020_username_permisos.sql',
  '021_pos_comision_split.sql',
  '022_vales.sql',
  '023_igtf.sql',
  '024_numero_z.sql',
];

async function migrar(connectionString) {
  const pool = new Pool({ connectionString: connectionString || process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    for (const archivo of MIGRACIONES) {
      const ruta = path.join(__dirname, '../migrations', archivo);
      const sql = fs.readFileSync(ruta, 'utf8');
      console.log(`▶ Ejecutando: ${archivo}`);
      await client.query(sql);
      console.log(`  ✅ ${archivo} completado`);
    }
    console.log('✅ Todas las migraciones ejecutadas correctamente');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar directamente si se llama con: node scripts/migrar.js
if (require.main === module) {
  migrar().catch(() => process.exit(1));
}

module.exports = migrar;
