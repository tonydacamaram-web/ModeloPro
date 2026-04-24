-- Migración 017: Abonos a cuentas por pagar
CREATE TABLE IF NOT EXISTS abonos_cxp (
    id             SERIAL PRIMARY KEY,
    cuenta_id      INT NOT NULL REFERENCES cuentas_por_pagar(id) ON DELETE CASCADE,
    fecha          DATE NOT NULL,
    monto          DECIMAL(15,2) NOT NULL,
    moneda         VARCHAR(3) NOT NULL,
    metodo_pago    metodo_pago NOT NULL,
    tasa_id        INT REFERENCES tasas_diarias(id),
    nota           TEXT,
    registrado_por INT REFERENCES usuarios(id),
    creado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);
