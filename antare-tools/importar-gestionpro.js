/*
 * INSTRUCCIONES (PC de desarrollo):
 * 1. Colocar antare-data.json en esta misma carpeta antare-tools/
 * 2. Asegurarse de que Docker esté corriendo: cd gestion-pro && docker-compose up -d
 * 3. cd antare-tools && npm install
 * 4. node importar-gestionpro.js --dry-run   ← revisar primero sin escribir nada
 * 5. node importar-gestionpro.js             ← migración real
 *
 * Flags disponibles:
 *   --dry-run           Simula todo sin escribir en PostgreSQL
 *   --solo-clientes     Solo importa clientes (Paso 1)
 *   --solo-proveedores  Solo importa proveedores (Paso 2)
 *   --solo-cxc          Solo importa CxC (Paso 3, requiere clientes ya migrados)
 *   --solo-cxp          Solo importa CxP (Paso 4, requiere proveedores ya migrados)
 */

const path = require('path');

// El .env vive en gestion-pro/backend/.env (un nivel más adentro)
const envPath = path.join(__dirname, '../gestion-pro/backend/.env');
require('dotenv').config({ path: envPath });

// Verificar que la variable cargó — falla rápido con mensaje claro
if (!process.env.DATABASE_URL) {
  console.error(`❌ No se pudo cargar DATABASE_URL desde:\n   ${envPath}`);
  console.error('   Verifica que el archivo .env exista en esa ruta.');
  process.exit(1);
}

const { Pool } = require('pg');
const fs = require('fs');

// ── Flags de ejecución ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun          = args.includes('--dry-run');
const soloClientes    = args.includes('--solo-clientes');
const soloProveedores = args.includes('--solo-proveedores');
const soloCxc         = args.includes('--solo-cxc');
const soloCxp         = args.includes('--solo-cxp');
const modoSolo        = soloClientes || soloProveedores || soloCxc || soloCxp;
const ejecutarTodo    = !modoSolo;

// ── Conexión PostgreSQL ───────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Formatea un RIF de Antare al formato venezolano con guión.
 * Ej: 'J294570917' → 'J29457091-7'
 */
const formatearRif = (rifAntare) => {
  if (!rifAntare) return null;
  const rif = rifAntare.trim();
  if (rif.length < 2) return rif;
  return `${rif.slice(0, -1)}-${rif.slice(-1)}`;
};

/**
 * Calcula el estado de una CxC/CxP a partir de los montos y vencimiento.
 * Usa una tolerancia de 1 centavo para evitar errores de punto flotante.
 */
const calcularEstado = (montoTotal, cancelado, vencimiento) => {
  const mont = parseFloat(montoTotal) || 0;
  const canc = parseFloat(cancelado)  || 0;
  const hoy  = new Date();

  if (mont - canc <= 0.01) return 'pagada';

  const fechaVenc = vencimiento ? new Date(vencimiento) : null;
  if (fechaVenc && fechaVenc < hoy) return 'vencida';
  if (canc > 0) return 'parcial';
  return 'pendiente';
};

/**
 * Calcula el monto convertido.
 * USD → VES: monto * tasa
 * VES → USD: monto / tasa
 * Si tasa es 0 o null, usa 1 para evitar división por cero.
 */
const calcularConvertido = (monto, moneda, tasa) => {
  const t = parseFloat(tasa) || 1;
  const m = parseFloat(monto) || 0;
  return moneda === 'USD' ? m * t : m / t;
};

// ── Contadores globales ───────────────────────────────────────────────────────
const contadores = {
  clientes:    { insertados: 0, omitidos: 0, errores: 0 },
  proveedores: { insertados: 0, omitidos: 0, errores: 0 },
  cxc: {
    insertadas: 0, errores: 0,
    porEstado: { pendiente: 0, parcial: 0, pagada: 0, vencida: 0 },
  },
  cxp: {
    insertadas: 0, errores: 0,
    porEstado: { pendiente: 0, parcial: 0, pagada: 0, vencida: 0 },
  },
};

// ── PASO 1: Clientes ──────────────────────────────────────────────────────────
const migrarClientes = async (data) => {
  console.log('\n── Paso 1: Clientes ─────────────────────────────────');
  console.log(`   📋 Encontrados en JSON: ${data.clientes.length}`);

  const mapa = {}; // { idCliente_Antare → id_PostgreSQL }

  for (const c of data.clientes) {
    try {
      const nombre    = (c.Descripcion || '').trim() || 'Sin nombre';
      const rifCedula = c.RIF ? c.RIF.trim() : null;
      const telefono  = c.Telefonos
        ? c.Telefonos.split(',')[0].trim().substring(0, 20)
        : null;
      const activo = c.Activo === 1 || c.Activo === true;

      // Verificar duplicado por rif_cedula
      if (rifCedula) {
        const existe = await pool.query(
          'SELECT id FROM clientes WHERE rif_cedula = $1',
          [rifCedula]
        );
        if (existe.rows.length > 0) {
          mapa[c.idCliente] = existe.rows[0].id;
          contadores.clientes.omitidos++;
          console.log(`   ⏭️  Omitido (ya existe): ${nombre} [${rifCedula}]`);
          continue;
        }
      }

      if (dryRun) {
        // En dry-run usamos un id simulado para que los pasos siguientes no fallen
        mapa[c.idCliente] = `dry-${c.idCliente}`;
        contadores.clientes.insertados++;
        console.log(`   ✅ [DRY-RUN] Insertaría: ${nombre} [${rifCedula || 'sin RIF'}]`);
        continue;
      }

      const resultado = await pool.query(
        `INSERT INTO clientes (nombre, rif_cedula, telefono, activo)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [nombre, rifCedula, telefono, activo]
      );
      mapa[c.idCliente] = resultado.rows[0].id;
      contadores.clientes.insertados++;
      console.log(`   ✅ Insertado: ${nombre} [${rifCedula || 'sin RIF'}] → id ${resultado.rows[0].id}`);

    } catch (err) {
      contadores.clientes.errores++;
      console.error(`   ❌ Error en cliente ${c.idCliente} (${c.Descripcion}): ${err.message}`);
    }
  }

  return mapa;
};

// ── PASO 2: Proveedores ───────────────────────────────────────────────────────
const migrarProveedores = async (data) => {
  console.log('\n── Paso 2: Proveedores ──────────────────────────────');

  // Extraer IDs únicos de proveedor desde las CxP
  const idsUnicos = [...new Set(
    data.cuentasPorPagar
      .map(r => r.idProveedor)
      .filter(Boolean)
  )];
  console.log(`   📋 Proveedores únicos en JSON: ${idsUnicos.length}`);

  const mapa = {}; // { idProveedor_Antare → proveedor_id_PostgreSQL }

  for (const idProv of idsUnicos) {
    try {
      const rif    = formatearRif(idProv);
      const nombre = rif || idProv; // Nombre provisional = RIF formateado

      // Verificar duplicado por rif
      if (rif) {
        const existe = await pool.query(
          'SELECT id FROM proveedores WHERE rif = $1',
          [rif]
        );
        if (existe.rows.length > 0) {
          mapa[idProv] = existe.rows[0].id;
          contadores.proveedores.omitidos++;
          console.log(`   ⏭️  Omitido (ya existe): ${nombre}`);
          continue;
        }
      }

      if (dryRun) {
        mapa[idProv] = `dry-${idProv}`;
        contadores.proveedores.insertados++;
        console.log(`   ✅ [DRY-RUN] Insertaría proveedor: ${nombre}`);
        continue;
      }

      const resultado = await pool.query(
        `INSERT INTO proveedores (nombre, rif, activo)
         VALUES ($1, $2, true) RETURNING id`,
        [nombre, rif]
      );
      mapa[idProv] = resultado.rows[0].id;
      contadores.proveedores.insertados++;
      console.log(`   ✅ Insertado proveedor: ${nombre} → id ${resultado.rows[0].id}`);

    } catch (err) {
      contadores.proveedores.errores++;
      console.error(`   ❌ Error en proveedor ${idProv}: ${err.message}`);
    }
  }

  return mapa;
};

// ── PASO 3: Cuentas por Cobrar ────────────────────────────────────────────────
const migrarCxC = async (data, mapaClientes) => {
  console.log('\n── Paso 3: Cuentas por Cobrar ───────────────────────');
  console.log(`   📋 Registros en JSON: ${data.cuentasPorCobrar.length}`);

  // Tasa más reciente disponible (puede ser null si la tabla está vacía)
  const tasaRes = await pool.query(
    'SELECT id FROM tasas_diarias ORDER BY fecha DESC LIMIT 1'
  );
  const tasaId = tasaRes.rows[0]?.id || null;
  if (!tasaId) console.log('   ⚠️  No hay tasas registradas — tasa_id se importará como NULL');

  // Primer usuario admin
  const adminRes = await pool.query(
    "SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1"
  );
  const registradoPor = adminRes.rows[0]?.id || null;

  for (const r of data.cuentasPorCobrar) {
    try {
      const clienteId = mapaClientes[r.idCliente];
      if (!clienteId || String(clienteId).startsWith('dry-') === false && !clienteId) {
        console.log(`   ⚠️  CxC ${r.idMovimientoCuenta}: cliente ${r.idCliente} no encontrado — omitida`);
        continue;
      }
      // En dry-run el clienteId puede ser "dry-xxx", lo validamos diferente
      if (!clienteId) {
        console.log(`   ⚠️  CxC ${r.idMovimientoCuenta}: cliente ${r.idCliente} no encontrado — omitida`);
        continue;
      }

      const montoTotal      = Math.abs(parseFloat(r.Monto) || 0);
      const moneda          = (r.MonedaTransaccion || 'VES').toUpperCase();
      const montoConvertido = calcularConvertido(montoTotal, moneda, r.MonedaTasaDeCambio);
      const estado          = calcularEstado(montoTotal, r.Cancelado, r.Vencimiento);
      const fecha           = r.Fecha ? new Date(r.Fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const fechaVencim     = r.Vencimiento ? new Date(r.Vencimiento).toISOString().split('T')[0] : null;
      const descripcion     = (r.Concepto || 'Importado desde Antare').trim() || 'Importado desde Antare';

      contadores.cxc.porEstado[estado]++;

      if (dryRun) {
        contadores.cxc.insertadas++;
        console.log(`   ✅ [DRY-RUN] CxC ${r.idMovimientoCuenta}: ${moneda} ${montoTotal.toFixed(2)} [${estado}]`);
        continue;
      }

      await pool.query(
        `INSERT INTO cuentas_por_cobrar
           (cliente_id, fecha, descripcion, monto_total, moneda, monto_convertido,
            tasa_id, fecha_vencimiento, estado, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          clienteId, fecha, descripcion, montoTotal, moneda,
          montoConvertido, tasaId, fechaVencim, estado, registradoPor,
        ]
      );
      contadores.cxc.insertadas++;

    } catch (err) {
      contadores.cxc.errores++;
      console.error(`   ❌ Error en CxC ${r.idMovimientoCuenta}: ${err.message}`);
    }
  }
};

// ── PASO 4: Cuentas por Pagar ─────────────────────────────────────────────────
const migrarCxP = async (data, mapaProveedores) => {
  console.log('\n── Paso 4: Cuentas por Pagar ────────────────────────');
  console.log(`   📋 Registros en JSON: ${data.cuentasPorPagar.length}`);

  // Tasa más reciente
  const tasaRes = await pool.query(
    'SELECT id FROM tasas_diarias ORDER BY fecha DESC LIMIT 1'
  );
  const tasaId = tasaRes.rows[0]?.id || null;

  // Primer usuario admin
  const adminRes = await pool.query(
    "SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1"
  );
  const registradoPor = adminRes.rows[0]?.id || null;

  for (const r of data.cuentasPorPagar) {
    try {
      const proveedorId = mapaProveedores[r.idProveedor];
      if (!proveedorId) {
        console.log(`   ⚠️  CxP ${r.idMovimientoCuenta}: proveedor ${r.idProveedor} no encontrado — omitida`);
        continue;
      }

      const montoTotal      = Math.abs(parseFloat(r.Monto) || 0);
      const moneda          = (r.MonedaTransaccion || 'VES').toUpperCase();
      const montoConvertido = calcularConvertido(montoTotal, moneda, r.MonedaTasaDeCambio);
      const estado          = calcularEstado(montoTotal, r.Cancelado, r.Vencimiento);
      const fecha           = r.Fecha ? new Date(r.Fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const fechaVencim     = r.Vencimiento ? new Date(r.Vencimiento).toISOString().split('T')[0] : null;
      const descripcion     = (r.Concepto || 'Importado desde Antare').trim() || 'Importado desde Antare';

      // Extraer número de factura del campo Concepto
      const matchFactura  = descripcion.match(/[Ff]actura\s+(\S+)/);
      const numeroFactura = matchFactura ? matchFactura[1] : null;

      contadores.cxp.porEstado[estado]++;

      if (dryRun) {
        contadores.cxp.insertadas++;
        console.log(`   ✅ [DRY-RUN] CxP ${r.idMovimientoCuenta}: ${moneda} ${montoTotal.toFixed(2)} [${estado}]${numeroFactura ? ` factura: ${numeroFactura}` : ''}`);
        continue;
      }

      await pool.query(
        `INSERT INTO cuentas_por_pagar
           (proveedor_id, fecha, descripcion, numero_factura, monto_total, moneda,
            monto_convertido, tasa_id, fecha_vencimiento, estado, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          proveedorId, fecha, descripcion, numeroFactura, montoTotal, moneda,
          montoConvertido, tasaId, fechaVencim, estado, registradoPor,
        ]
      );
      contadores.cxp.insertadas++;

    } catch (err) {
      contadores.cxp.errores++;
      console.error(`   ❌ Error en CxP ${r.idMovimientoCuenta}: ${err.message}`);
    }
  }
};

// ── Resumen final ─────────────────────────────────────────────────────────────
const imprimirResumen = (tiempoMs) => {
  const seg = (tiempoMs / 1000).toFixed(2);
  const { clientes, proveedores, cxc, cxp } = contadores;
  const modo = dryRun ? ' [DRY-RUN — nada fue escrito]' : '';

  console.log(`
════════════════════════════════════════
  RESUMEN DE MIGRACIÓN${modo}
════════════════════════════════════════
  Clientes:
    ✅ Insertados:  ${clientes.insertados}
    ⏭️  Omitidos:   ${clientes.omitidos} (ya existían)
    ❌ Errores:     ${clientes.errores}

  Proveedores:
    ✅ Insertados:  ${proveedores.insertados}
    ⏭️  Omitidos:   ${proveedores.omitidos} (ya existían)
    ❌ Errores:     ${proveedores.errores}

  Cuentas por Cobrar:
    ✅ Insertadas:  ${cxc.insertadas}
       pendiente:  ${cxc.porEstado.pendiente}
       parcial:    ${cxc.porEstado.parcial}
       pagada:     ${cxc.porEstado.pagada}
       vencida:    ${cxc.porEstado.vencida}
    ❌ Errores:     ${cxc.errores}

  Cuentas por Pagar:
    ✅ Insertadas:  ${cxp.insertadas}
       pendiente:  ${cxp.porEstado.pendiente}
       parcial:    ${cxp.porEstado.parcial}
       pagada:     ${cxp.porEstado.pagada}
       vencida:    ${cxp.porEstado.vencida}
    ❌ Errores:     ${cxp.errores}

  ⏱️  Tiempo total: ${seg}s
════════════════════════════════════════`);
};

// ── Orquestador principal ─────────────────────────────────────────────────────
const main = async () => {
  const inicio = Date.now();

  if (dryRun) console.log('\n🔍 MODO DRY-RUN — no se escribirá nada en la base de datos\n');

  // Leer el JSON exportado por exportar-antare.js
  const rutaJson = path.join(__dirname, 'antare-data.json');
  if (!fs.existsSync(rutaJson)) {
    console.error('❌ No se encontró antare-data.json en la carpeta antare-tools/');
    console.error('   Copia el archivo generado por exportar-antare.js en esta carpeta.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(rutaJson, 'utf8'));
  console.log(`🔌 JSON cargado (exportado: ${data.exportadoEn})`);
  console.log(`   Clientes: ${data.resumen?.clientes ?? data.clientes?.length}`);
  console.log(`   CxC:      ${data.resumen?.cuentasPorCobrar ?? data.cuentasPorCobrar?.length}`);
  console.log(`   CxP:      ${data.resumen?.cuentasPorPagar ?? data.cuentasPorPagar?.length}`);

  // Verificar conexión PostgreSQL
  try {
    await pool.query('SELECT 1');
    console.log('🔌 PostgreSQL conectado');
  } catch (err) {
    console.error('❌ No se pudo conectar a PostgreSQL:', err.message);
    console.error('   Verifica que Docker esté corriendo: docker-compose up -d');
    process.exit(1);
  }

  let mapaClientes    = {};
  let mapaProveedores = {};

  // Ejecutar pasos según flags
  if (ejecutarTodo || soloClientes) {
    mapaClientes = await migrarClientes(data);
  }

  if (ejecutarTodo || soloProveedores) {
    mapaProveedores = await migrarProveedores(data);
  }

  if (ejecutarTodo || soloCxc) {
    // Si se ejecuta solo CxC, reconstruir el mapa desde la DB
    if (soloCxc && !ejecutarTodo) {
      const rows = await pool.query('SELECT id, rif_cedula FROM clientes WHERE rif_cedula IS NOT NULL');
      // Mapa aproximado por RIF: buscar coincidencias en el JSON
      data.clientes.forEach(c => {
        const match = rows.rows.find(r => r.rif_cedula === c.RIF?.trim());
        if (match) mapaClientes[c.idCliente] = match.id;
      });
    }
    await migrarCxC(data, mapaClientes);
  }

  if (ejecutarTodo || soloCxp) {
    // Si se ejecuta solo CxP, reconstruir el mapa desde la DB
    if (soloCxp && !ejecutarTodo) {
      const rows = await pool.query('SELECT id, rif FROM proveedores WHERE rif IS NOT NULL');
      const idsUnicos = [...new Set(data.cuentasPorPagar.map(r => r.idProveedor).filter(Boolean))];
      idsUnicos.forEach(idProv => {
        const rifFormateado = formatearRif(idProv);
        const match = rows.rows.find(r => r.rif === rifFormateado);
        if (match) mapaProveedores[idProv] = match.id;
      });
    }
    await migrarCxP(data, mapaProveedores);
  }

  imprimirResumen(Date.now() - inicio);
  await pool.end();
};

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  pool.end();
  process.exit(1);
});
