/**
 * Corrección puntual: actualiza el tasa_id de los abonos de vales históricos
 * para que usen la misma tasa que el vale original.
 *
 * Problema: al marcar un vale como descontado, el abono quedaba registrado
 * con el tasa_id del día del descuento, no el del vale. Como saldoEmpleado
 * recalcula USD con monto/tasa_bcv, esto producía un residual en el saldo.
 *
 * Fix: el abono debe compartir el tasa_id del vale para que ambos lados
 * del cálculo usen la misma tasa y el saldo cierre en exactamente $0.
 *
 * Uso: node scripts/fix_abonos_tasa.js [--dry-run]
 */
require('dotenv').config();
const { Pool } = require('pg');

const DRY_RUN = process.argv.includes('--dry-run');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // ── 1. Obtener vales descontados con tasa original ─────────────────────
    const { rows: vales } = await client.query(`
      SELECT v.id, v.empleado_id, v.monto, v.moneda, v.monto_convertido,
             v.tasa_id, v.fecha,
             e.nombre AS empleado_nombre,
             td.tasa_bcv
      FROM vales v
      JOIN empleados e ON v.empleado_id = e.id
      LEFT JOIN tasas_diarias td ON v.tasa_id = td.id
      WHERE v.estado = 'descontado'
        AND v.tasa_id IS NOT NULL
    `);

    // ── 2. Obtener abonos de descuento de vales ────────────────────────────
    const { rows: abonos } = await client.query(`
      SELECT mn.id, mn.empleado_id, mn.monto, mn.moneda,
             mn.monto_convertido, mn.tasa_id, mn.descripcion,
             td.tasa_bcv
      FROM movimientos_nomina mn
      LEFT JOIN tasas_diarias td ON mn.tasa_id = td.id
      WHERE mn.tipo = 'abono'
        AND mn.descripcion LIKE 'Descuento vale %'
    `);

    console.log(`\nVales descontados encontrados : ${vales.length}`);
    console.log(`Abonos de vales encontrados   : ${abonos.length}`);
    if (DRY_RUN) console.log('\n[DRY-RUN — sin cambios en BD]\n');

    let actualizados = 0;
    let sinCambio    = 0;
    let sinMatch     = 0;
    const usados     = new Set(); // IDs de abonos ya asignados

    if (!DRY_RUN) await client.query('BEGIN');

    for (const vale of vales) {
      // Candidatos: mismo empleado, monto, moneda — priorizando el que coincide
      // también en monto_convertido (máxima precisión de match).
      const candidatos = abonos.filter(mn =>
        !usados.has(mn.id) &&
        mn.empleado_id === vale.empleado_id &&
        parseFloat(mn.monto) === parseFloat(vale.monto) &&
        mn.moneda === vale.moneda
      );

      if (candidatos.length === 0) {
        console.log(`⚠  Sin abono para vale #${vale.id} (${vale.empleado_nombre}, ${vale.monto} ${vale.moneda}, fecha ${vale.fecha})`);
        sinMatch++;
        continue;
      }

      // Preferir el que además coincide en monto_convertido
      const exacto = candidatos.find(
        mn => parseFloat(mn.monto_convertido) === parseFloat(vale.monto_convertido)
      );
      const abono = exacto || candidatos[0];
      usados.add(abono.id);

      if (abono.tasa_id === vale.tasa_id) {
        console.log(`—  Abono #${abono.id} ya tiene tasa correcta (vale #${vale.id}, ${vale.empleado_nombre})`);
        sinCambio++;
        continue;
      }

      const diff = abono.tasa_bcv && vale.tasa_bcv
        ? ` (tasa: ${abono.tasa_bcv} → ${vale.tasa_bcv} Bs/$)`
        : '';
      console.log(`✔  Corregir abono #${abono.id} para vale #${vale.id} — ${vale.empleado_nombre}, ${vale.monto} ${vale.moneda}${diff}`);

      if (!DRY_RUN) {
        await client.query(
          'UPDATE movimientos_nomina SET tasa_id = $1 WHERE id = $2',
          [vale.tasa_id, abono.id]
        );
      }
      actualizados++;
    }

    if (!DRY_RUN) await client.query('COMMIT');

    console.log('\n── Resumen ──────────────────────────────────────────────');
    console.log(`  Corregidos  : ${actualizados}`);
    console.log(`  Sin cambio  : ${sinCambio}`);
    console.log(`  Sin match   : ${sinMatch}`);
    if (DRY_RUN) console.log('\n[Modo DRY-RUN — ejecuta sin --dry-run para aplicar los cambios]');
    console.log('─────────────────────────────────────────────────────────\n');
  } catch (err) {
    if (!DRY_RUN) await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
