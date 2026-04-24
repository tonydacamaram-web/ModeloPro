-- Migración 011: Configuración de tesorería
-- Mapeo método de pago → cuenta destino + comisión por canal

CREATE TABLE IF NOT EXISTS configuracion_tesoreria (
    id              SERIAL PRIMARY KEY,
    canal           VARCHAR(50) NOT NULL UNIQUE,   -- clave del método de pago
    etiqueta        VARCHAR(100) NOT NULL,           -- nombre visible
    cuenta_destino  VARCHAR(150) NOT NULL,           -- banco/cuenta donde cae el dinero
    comision_pct    DECIMAL(6,4) NOT NULL DEFAULT 0, -- % de comisión (ej: 1.5 = 1.5%)
    moneda          VARCHAR(3) NOT NULL DEFAULT 'VES',
    orden           SMALLINT DEFAULT 99,
    actualizado_en  TIMESTAMP DEFAULT NOW()
);

-- Valores por defecto (no reemplaza si ya existen)
INSERT INTO configuracion_tesoreria
    (canal, etiqueta, cuenta_destino, comision_pct, moneda, orden)
VALUES
    ('efectivo_bs',   'Efectivo Bs.',    'Efectivo VES',        0, 'VES', 1),
    ('efectivo_usd',  'Efectivo USD',    'Efectivo USD',        0, 'USD', 2),
    ('pago_movil',    'Pago Móvil',      'Banco de Venezuela',  0, 'VES', 3),
    ('biopago',       'BioPago',         'Banco de Venezuela',  0, 'VES', 4),
    ('transferencia', 'Transferencia',   'Banco de Venezuela',  0, 'VES', 5),
    ('zelle',         'Zelle',           'Chase',               0, 'USD', 6),
    ('binance',       'Binance',         'Binance',             0, 'USD', 7),
    ('pos',           'POS (todos)',     'Por banco',           0, 'VES', 8)
ON CONFLICT (canal) DO NOTHING;
