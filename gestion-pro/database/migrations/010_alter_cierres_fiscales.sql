-- Migración 010: Agregar desglose fiscal a cierres_fiscales
-- base_imponible + iva + exento → monto_cierre (total auto-calculado)

ALTER TABLE cierres_fiscales
  ADD COLUMN IF NOT EXISTS base_imponible DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva            DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exento         DECIMAL(15,2) DEFAULT 0;
