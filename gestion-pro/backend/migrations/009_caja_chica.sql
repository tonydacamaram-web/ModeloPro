-- Módulo 8: Caja Chica
-- Movimientos del fondo fijo de caja chica

CREATE TABLE IF NOT EXISTS caja_chica (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('asignacion','gasto','reposicion')),
    fecha           DATE NOT NULL,
    descripcion     TEXT,
    monto           DECIMAL(15,2) NOT NULL,
    moneda          VARCHAR(3) NOT NULL CHECK (moneda IN ('VES','USD')),
    monto_convertido DECIMAL(15,2),
    tasa_id         INT REFERENCES tasas_diarias(id),
    registrado_por  INT REFERENCES usuarios(id),
    creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caja_chica_fecha ON caja_chica(fecha);
CREATE INDEX IF NOT EXISTS idx_caja_chica_tipo  ON caja_chica(tipo);
