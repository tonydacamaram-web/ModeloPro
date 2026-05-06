-- Migración 025: Corregir tasa_id de abonos por descuento de vales
--
-- Bug: al marcar un vale como descontado, el movimiento de abono quedaba
-- registrado con el tasa_id del DÍA DEL DESCUENTO en lugar del tasa_id
-- del vale original. Como saldoEmpleado recalcula el valor USD con
-- "monto / td.tasa_bcv", usar una tasa distinta producía un residual
-- en el saldo que nunca llegaba a cero.
--
-- Fix: igualamos el tasa_id del abono al tasa_id del vale fuente,
-- de forma que ambos lados del cálculo usen la misma tasa y el saldo
-- cierre exactamente en $0.
--
-- La condición "mn.monto_convertido = v.monto_convertido" discrimina
-- correctamente entre vales del mismo empleado con el mismo monto pero
-- en fechas distintas (tasas distintas → distintos monto_convertido).
--
-- Idempotente: en corridas posteriores no encuentra filas con
-- tasa_id diferente y no hace ningún cambio.

WITH vale_match AS (
  SELECT DISTINCT ON (mn.id)
    mn.id            AS abono_id,
    v.tasa_id        AS tasa_correcta
  FROM movimientos_nomina mn
  JOIN vales v
    ON  v.empleado_id      = mn.empleado_id
    AND v.monto            = mn.monto
    AND v.moneda           = mn.moneda
    AND v.monto_convertido = mn.monto_convertido
  WHERE mn.tipo        = 'abono'
    AND mn.descripcion LIKE 'Descuento vale %'
    AND v.estado       = 'descontado'
    AND v.tasa_id      IS NOT NULL
    AND mn.tasa_id     IS DISTINCT FROM v.tasa_id
  ORDER BY mn.id, v.id
)
UPDATE movimientos_nomina mn
SET    tasa_id = vm.tasa_correcta
FROM   vale_match vm
WHERE  mn.id = vm.abono_id;
