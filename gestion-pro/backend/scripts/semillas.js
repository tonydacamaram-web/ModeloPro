/**
 * Script para insertar los datos iniciales (seeds).
 * Uso: node scripts/semillas.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sembrar() {
  const client = await pool.connect();
  try {
    // Usuario admin
    const passwordHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO usuarios (nombre, email, username, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Administrador', 'admin@gestionpro.com', 'admin', passwordHash, 'admin']
    );
    console.log('✅ Usuario admin creado (admin@gestionpro.com / admin123)');

    // Categorías de gasto
    const categorias = [
      ['Servicios Públicos', 'factura'],
      ['Insumos y Materiales', 'factura'],
      ['Alquiler', 'factura'],
      ['Mantenimiento', 'factura'],
      ['Publicidad', 'factura'],
      ['Gastos de Oficina', 'eventual'],
      ['Alimentación Personal', 'eventual'],
      ['Transporte', 'eventual'],
      ['Gastos Varios', 'eventual'],
      ['Compra de Divisas', 'divisas'],
      ['Pago en Divisas', 'divisas'],
    ];

    for (const [nombre, tipo] of categorias) {
      await client.query(
        `INSERT INTO categorias_gasto (nombre, tipo) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [nombre, tipo]
      );
    }
    console.log(`✅ ${categorias.length} categorías de gasto creadas`);
    console.log('\n✅ Datos iniciales insertados correctamente');
  } catch (err) {
    console.error('❌ Error en seeds:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

sembrar();
