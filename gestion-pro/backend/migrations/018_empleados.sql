-- Migración 018: Tabla de empleados
CREATE TABLE IF NOT EXISTS empleados (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(150) NOT NULL,
    cedula    VARCHAR(20) UNIQUE,
    cargo     VARCHAR(100),
    activo    BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
