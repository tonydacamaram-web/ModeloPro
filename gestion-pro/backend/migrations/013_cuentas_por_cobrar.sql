-- Migración 013: Cuentas por cobrar
DO $$ BEGIN
  CREATE TYPE estado_cxc AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id                SERIAL PRIMARY KEY,
    cliente_id        INT NOT NULL REFERENCES clientes(id),
    fecha             DATE NOT NULL,
    descripcion       TEXT NOT NULL,
    monto_total       DECIMAL(15,2) NOT NULL,
    moneda            VARCHAR(3) NOT NULL,
    monto_convertido  DECIMAL(15,2),
    tasa_id           INT REFERENCES tasas_diarias(id),
    fecha_vencimiento DATE,
    estado            estado_cxc NOT NULL DEFAULT 'pendiente',
    registrado_por    INT REFERENCES usuarios(id),
    creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);
