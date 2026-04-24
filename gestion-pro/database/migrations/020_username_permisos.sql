-- Migración 020: username único + permisos JSONB por módulo

-- 1. Columna username
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- 2. Columna permisos JSONB
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos JSONB NOT NULL DEFAULT '{}';

-- 3. Generar username desde prefijo del email para usuarios existentes
UPDATE usuarios
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9_]', '_', 'g'))
WHERE username IS NULL OR username = '';

-- 4. Asegurar unicidad: si hay colisión añadir sufijo numérico
-- (en la práctica es raro en instalaciones nuevas)
WITH duplicados AS (
  SELECT id, username,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY id) AS rn
  FROM usuarios
)
UPDATE usuarios u
SET username = d.username || d.id::text
FROM duplicados d
WHERE u.id = d.id AND d.rn > 1;

-- 5. Hacer NOT NULL después de poblar
ALTER TABLE usuarios ALTER COLUMN username SET NOT NULL;

-- 6. Restricción UNIQUE
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_username_key;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_username_key UNIQUE (username);

-- 7. Índice de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- 8. Permisos por defecto según rol
--    admin: todos los módulos en true
--    operador: todos excepto 'usuarios'
UPDATE usuarios
SET permisos = CASE
  WHEN rol = 'admin' THEN
    '{"dashboard":true,"tasas":true,"ventas":true,"gastos":true,"pos":true,"fiscal":true,"caja_chica":true,"cxc":true,"cxp":true,"nomina":true,"usuarios":true}'::jsonb
  ELSE
    '{"dashboard":true,"tasas":true,"ventas":true,"gastos":true,"pos":true,"fiscal":true,"caja_chica":true,"cxc":true,"cxp":true,"nomina":true,"usuarios":false}'::jsonb
END
WHERE permisos = '{}'::jsonb OR permisos IS NULL;
