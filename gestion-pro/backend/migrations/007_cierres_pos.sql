-- Módulo 4: Control de POS
-- Cierres diarios de terminales POS por banco

CREATE TABLE IF NOT EXISTS cierres_pos (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    banco           VARCHAR(100) NOT NULL,
    numero_lote     VARCHAR(50) NOT NULL,
    monto_cierre    DECIMAL(15,2) NOT NULL,
    moneda          VARCHAR(3) NOT NULL DEFAULT 'VES' CHECK (moneda IN ('VES','USD')),
    diferencia      DECIMAL(15,2),
    nota            TEXT,
    registrado_por  INT REFERENCES usuarios(id),
    creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cierres_pos_fecha ON cierres_pos(fecha);
