-- Migración 015: Tabla de proveedores para CxP
CREATE TABLE IF NOT EXISTS proveedores (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    rif         VARCHAR(20),
    telefono    VARCHAR(20),
    activo      BOOLEAN NOT NULL DEFAULT true,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);
