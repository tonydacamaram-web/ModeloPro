-- Migración 022: Vales de personal (créditos a empleados registrados desde Ventas)
CREATE TABLE IF NOT EXISTS vales (
  id                   SERIAL PRIMARY KEY,
  fecha                DATE NOT NULL,
  empleado_id          INT  NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  descripcion          VARCHAR(200),
  monto                DECIMAL(12,2) NOT NULL,
  moneda               VARCHAR(10)   NOT NULL DEFAULT 'USD',
  monto_convertido     DECIMAL(12,2),
  tasa_id              INT  REFERENCES tasas_diarias(id),
  estado               VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
  movimiento_nomina_id INT  REFERENCES movimientos_nomina(id) ON DELETE SET NULL,
  registrado_por       INT  REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT vales_estado_check CHECK (estado IN ('pendiente', 'descontado'))
);

CREATE INDEX IF NOT EXISTS idx_vales_empleado ON vales(empleado_id);
CREATE INDEX IF NOT EXISTS idx_vales_fecha    ON vales(fecha);
CREATE INDEX IF NOT EXISTS idx_vales_estado   ON vales(estado);
