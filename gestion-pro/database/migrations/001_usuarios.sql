-- Migración 001: Tabla de usuarios del sistema
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('admin', 'operador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    rol             rol_usuario DEFAULT 'operador',
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda por email (login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
