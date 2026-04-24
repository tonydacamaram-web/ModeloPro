-- Migración 006: Detalles de operaciones por método de pago
-- Permite registrar referencias individuales dentro de un método de pago diario:
--   pago_movil   → N° operación (últimos 4 dígitos), monto por operación
--   pos_debito   → N° cierre, banco emisor
--   pos_credito  → N° cierre, banco emisor
--   transferencia → N° transacción
--   biopago      → slot 1 y slot 2, con monto individual

CREATE TABLE IF NOT EXISTS venta_detalles (
    id          SERIAL PRIMARY KEY,
    venta_id    INT NOT NULL REFERENCES ventas_diarias(id) ON DELETE CASCADE,
    slot        SMALLINT NOT NULL DEFAULT 1,  -- orden / slot (biopago: 1 o 2)
    referencia  VARCHAR(100),                  -- últimos 4 dígitos, N° cierre, N° transacción
    banco       VARCHAR(100),                  -- banco emisor (solo para POS)
    monto       DECIMAL(15,2),                 -- monto individual (biopago, pago_móvil)
    creado_en   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venta_detalles_venta ON venta_detalles(venta_id);
