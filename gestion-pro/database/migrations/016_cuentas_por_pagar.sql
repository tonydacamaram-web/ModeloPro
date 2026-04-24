-- Migración 016: Cuentas por pagar
DO $$ BEGIN
  CREATE TYPE estado_cxp AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
    id                SERIAL PRIMARY KEY,
    proveedor_id      INT NOT NULL REFERENCES proveedores(id),
    fecha             DATE NOT NULL,
    descripcion       TEXT NOT NULL,
    numero_factura    VARCHAR(50),
    monto_total       DECIMAL(15,2) NOT NULL,
    moneda            VARCHAR(3) NOT NULL,
    monto_convertido  DECIMAL(15,2),
    tasa_id           INT REFERENCES tasas_diarias(id),
    fecha_vencimiento DATE,
    estado            estado_cxp NOT NULL DEFAULT 'pendiente',
    registrado_por    INT REFERENCES usuarios(id),
    creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);
