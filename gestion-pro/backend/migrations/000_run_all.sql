-- Script maestro: ejecuta todas las migraciones en orden
-- Uso: psql -U gestionpro_user -d gestionpro -f database/migrations/000_run_all.sql

\ir 001_usuarios.sql
\ir 002_tasas_diarias.sql
\ir 003_ventas_diarias.sql
\ir 004_categorias_gasto.sql
\ir 005_gastos.sql
\ir 006_venta_detalles.sql
