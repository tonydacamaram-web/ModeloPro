-- Migración 002: Tabla de tasas de cambio diarias (BCV)
CREATE TABLE IF NOT EXISTS tasas_diarias (
    id              SERIAL PRIMARY KEY,
    fecha           DATE UNIQUE NOT NULL,
    tasa_bcv        DECIMAL(12,4) NOT NULL,  -- Bolívares por 1 USD
    registrado_por  INT REFERENCES usuarios(id),
    creado_en       TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda por fecha (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_tasas_fecha ON tasas_diarias(fecha);
