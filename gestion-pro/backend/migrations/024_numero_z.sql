-- Migración 024: Número de reporte Z en cierres fiscales
ALTER TABLE cierres_fiscales
  ADD COLUMN IF NOT EXISTS numero_z VARCHAR(20);
