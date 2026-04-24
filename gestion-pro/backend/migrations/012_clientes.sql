-- Migración 012: Tabla de clientes para CxC
CREATE TABLE IF NOT EXISTS clientes (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    rif_cedula  VARCHAR(20),
    telefono    VARCHAR(20),
    activo      BOOLEAN NOT NULL DEFAULT true,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);
