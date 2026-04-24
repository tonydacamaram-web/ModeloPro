-- Script maestro: ejecuta todos los seeds en orden
-- Uso: psql -U gestionpro_user -d gestionpro -f database/seeds/000_run_all.sql

\ir 001_admin_user.sql
\ir 002_categorias.sql
