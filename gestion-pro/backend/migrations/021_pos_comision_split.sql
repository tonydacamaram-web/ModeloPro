-- 021: Dividir comisión POS en débito y crédito por separado

-- Si existe 'pos' y no existe 'pos_debito': renombrar
UPDATE configuracion_tesoreria
SET canal = 'pos_debito', etiqueta = 'POS Débito', actualizado_en = NOW()
WHERE canal = 'pos'
  AND NOT EXISTS (SELECT 1 FROM configuracion_tesoreria WHERE canal = 'pos_debito');

-- Si coexisten 'pos' y 'pos_debito' (re-ejecución): eliminar el sobrante
DELETE FROM configuracion_tesoreria
WHERE canal = 'pos'
  AND EXISTS (SELECT 1 FROM configuracion_tesoreria WHERE canal = 'pos_debito');

-- Garantizar 'pos_debito' si ninguno existe aún (instalación limpia)
INSERT INTO configuracion_tesoreria (canal, etiqueta, cuenta_destino, comision_pct, moneda, orden)
VALUES ('pos_debito', 'POS Débito', 'Por banco', 0, 'VES', 8)
ON CONFLICT (canal) DO NOTHING;

-- Insertar 'pos_credito' copiando la cuenta destino y moneda de 'pos_debito'
INSERT INTO configuracion_tesoreria (canal, etiqueta, cuenta_destino, comision_pct, moneda, orden)
SELECT 'pos_credito', 'POS Crédito', cuenta_destino, comision_pct, moneda, 9
FROM configuracion_tesoreria
WHERE canal = 'pos_debito'
ON CONFLICT (canal) DO NOTHING;
