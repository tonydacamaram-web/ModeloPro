-- Vincular gastos a cuentas de tesorería para registrar egresos
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS cuenta_destino VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_gastos_cuenta_destino
  ON gastos(cuenta_destino)
  WHERE cuenta_destino IS NOT NULL;
