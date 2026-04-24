-- Seed 002: Categorías de gasto básicas
INSERT INTO categorias_gasto (nombre, tipo) VALUES
    ('Servicios Públicos',      'factura'),
    ('Insumos y Materiales',    'factura'),
    ('Alquiler',                'factura'),
    ('Mantenimiento',           'factura'),
    ('Publicidad',              'factura'),
    ('Gastos de Oficina',       'eventual'),
    ('Alimentación Personal',   'eventual'),
    ('Transporte',              'eventual'),
    ('Gastos Varios',           'eventual'),
    ('Compra de Divisas',       'divisas'),
    ('Pago en Divisas',         'divisas')
ON CONFLICT DO NOTHING;
