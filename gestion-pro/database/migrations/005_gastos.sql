-- Migración 005: Tabla de gastos y egresos
CREATE TABLE IF NOT EXISTS gastos (
    id               SERIAL PRIMARY KEY,
    fecha            DATE NOT NULL,
    tipo             tipo_gasto NOT NULL,
    categoria_id     INT REFERENCES categorias_gasto(id),
    descripcion      TEXT NOT NULL,
    monto            DECIMAL(15,2) NOT NULL,
    moneda           moneda NOT NULL,
    monto_convertido DECIMAL(15,2),           -- Equivalente en la otra moneda (auto-calculado)
    tasa_id          INT REFERENCES tasas_diarias(id),

    -- Campos solo para facturas de proveedor
    proveedor_rif    VARCHAR(20),
    proveedor_nombre VARCHAR(150),
    numero_factura   VARCHAR(50),

    registrado_por   INT REFERENCES usuarios(id),
    creado_en        TIMESTAMP DEFAULT NOW()
);

-- Índices para filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo ON gastos(tipo);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria_id);
