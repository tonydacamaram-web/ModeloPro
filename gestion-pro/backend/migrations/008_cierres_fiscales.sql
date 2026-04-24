-- Módulo 9: Módulo Fiscal / SENIAT
-- Cierres Z fiscales diarios (siempre en bolívares)

CREATE TABLE IF NOT EXISTS cierres_fiscales (
    id              SERIAL PRIMARY KEY,
    fecha           DATE UNIQUE NOT NULL,
    monto_cierre    DECIMAL(15,2) NOT NULL,
    moneda          VARCHAR(3) NOT NULL DEFAULT 'VES',
    nota            TEXT,
    registrado_por  INT REFERENCES usuarios(id),
    creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cierres_fiscales_fecha ON cierres_fiscales(fecha);
