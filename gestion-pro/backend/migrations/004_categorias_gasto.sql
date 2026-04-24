-- Migración 004: Categorías de gastos (configurables por admin)
DO $$ BEGIN
  CREATE TYPE tipo_gasto AS ENUM ('factura', 'eventual', 'divisas');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS categorias_gasto (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL,
    tipo    tipo_gasto NOT NULL,
    activa  BOOLEAN DEFAULT true
);
