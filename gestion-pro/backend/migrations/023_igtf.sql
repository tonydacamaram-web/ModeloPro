-- Migración 023: Columna IGTF en cierres fiscales
ALTER TABLE cierres_fiscales
  ADD COLUMN IF NOT EXISTS igtf DECIMAL(15,2) NOT NULL DEFAULT 0;
