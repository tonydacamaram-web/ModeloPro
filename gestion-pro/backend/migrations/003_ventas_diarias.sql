-- Migración 003: Tabla de ventas diarias por método de pago
DO $$ BEGIN
  CREATE TYPE metodo_pago AS ENUM (
      'efectivo_bs','efectivo_usd','pos_debito','pos_credito',
      'transferencia','pago_movil','zelle','binance','biopago'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE moneda AS ENUM ('VES', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ventas_diarias (
    id               SERIAL PRIMARY KEY,
    fecha            DATE NOT NULL,
    metodo_pago      metodo_pago NOT NULL,
    monto            DECIMAL(15,2) NOT NULL,
    moneda           moneda NOT NULL,
    monto_convertido DECIMAL(15,2),           -- Equivalente en la otra moneda (auto-calculado)
    tasa_id          INT REFERENCES tasas_diarias(id),
    nota             TEXT,
    registrado_por   INT REFERENCES usuarios(id),
    creado_en        TIMESTAMP DEFAULT NOW(),

    -- Un solo registro por método de pago por día
    CONSTRAINT uq_venta_fecha_metodo UNIQUE (fecha, metodo_pago)
);

-- Índices para filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas_diarias(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_metodo ON ventas_diarias(fecha, metodo_pago);
