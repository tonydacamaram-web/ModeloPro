-- Migración 019: Movimientos de nómina (adelantos, ventas a crédito, abonos)
DO $$ BEGIN
  CREATE TYPE tipo_movimiento_nomina AS ENUM ('adelanto', 'venta_credito', 'abono');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS movimientos_nomina (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL REFERENCES empleados(id),
    fecha            DATE NOT NULL,
    tipo             tipo_movimiento_nomina NOT NULL,
    descripcion      TEXT,
    monto            DECIMAL(15,2) NOT NULL,
    moneda           VARCHAR(3) NOT NULL,
    monto_convertido DECIMAL(15,2),
    tasa_id          INT REFERENCES tasas_diarias(id),
    registrado_por   INT REFERENCES usuarios(id),
    creado_en        TIMESTAMP NOT NULL DEFAULT NOW()
);
