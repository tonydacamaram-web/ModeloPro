# TAREA: Migración Antare → GestiónPro — Script de importación

## Contexto

Tenemos un sistema de facturación externo llamado **Antare** que corría en una PC separada sobre SQL Server. La migración se diseñó en dos fases:

1. ✅ `exportar-antare.js` — **YA EJECUTADO**. Generó el archivo `antare-data.json` con todos los datos de Antare (clientes, cuentas por cobrar y cuentas por pagar). El archivo ya está disponible en la carpeta `antare-tools/` del proyecto.
2. ⬅️ `importar-gestionpro.js` — **ESTA ES LA TAREA**. Crear este script que lea `antare-data.json` y escriba los datos en PostgreSQL de GestiónPro.

La carpeta `antare-tools/` vive en la raíz del proyecto al mismo nivel que `backend/` y `frontend/`. Es un utilitario de uso único, no forma parte del backend de GestiónPro.

> **No generar `exportar-antare.js` ni modificar ningún archivo existente del proyecto. Solo crear `importar-gestionpro.js` y actualizar `package.json` en `antare-tools/`.**

---

## SCRIPT 1 — `exportar-antare.js` ✅ YA COMPLETADO — NO TOCAR

### Referencia (solo para entender la estructura del JSON)
Se conectaba a SQL Server en la PC de Antare y exportó los datos a `antare-data.json`.

### Conexión SQL Server
```javascript
// Driver nativo de Windows — requerido para Windows Authentication
const sql = require('mssql/msnodesqlv8');

const config = {
  server: 'localhost',
  port: 1433,
  options: {
    instanceName: 'ANTARESYSTEMS',
    trustedConnection: true,
    trustServerCertificate: true,
    encrypt: false,
    integratedSecurity: true,
  },
  driver: 'msnodesqlv8',
};
```

### Base de datos: `AntareSystemsSQL`

### Datos a exportar

#### 1. Clientes — tabla `Clientes`
```sql
SELECT
  idCliente,
  Descripcion,
  RIF,
  Telefonos,
  Direccion,
  email,
  Activo
FROM Clientes
WHERE idCliente != 'DEF'
  AND EsInterno = 0
```

#### 2. Cuentas por Cobrar — tabla `MovimientoCuenta`
```sql
SELECT
  idMovimientoCuenta,
  idCliente,
  Fecha,
  Vencimiento,
  Concepto,
  Monto,
  Cancelado,
  Anulado,
  MonedaTransaccion,
  MonedaTasaDeCambio
FROM MovimientoCuenta
WHERE idCuenta = 'CXCOBRAR'
  AND Anulado = 0
  AND idCliente IS NOT NULL
```

#### 3. Cuentas por Pagar — tabla `MovimientoCuenta`
```sql
SELECT
  idMovimientoCuenta,
  idProveedor,
  Fecha,
  Vencimiento,
  Concepto,
  Monto,
  Cancelado,
  Anulado,
  MonedaTransaccion,
  MonedaTasaDeCambio
FROM MovimientoCuenta
WHERE idCuenta = 'CXPAGAR'
  AND Anulado = 0
  AND idProveedor IS NOT NULL
```

### Estructura del JSON de salida
```json
{
  "exportadoEn": "2026-04-05T12:00:00.000Z",
  "resumen": {
    "clientes": 81,
    "cuentasPorCobrar": 0,
    "cuentasPorPagar": 0
  },
  "clientes": [...],
  "cuentasPorCobrar": [...],
  "cuentasPorPagar": [...]
}
```

---

## SCRIPT 2 — `importar-gestionpro.js`

### Propósito
Leer `antare-data.json` e insertar los datos en PostgreSQL de GestiónPro respetando el modelo relacional existente.

### Conexión PostgreSQL
Leer credenciales desde `../backend/.env` usando `dotenv` con path relativo. Las variables de entorno del proyecto para PostgreSQL ya están definidas en ese archivo.

### Tablas destino en GestiónPro

> **Importante:** Antes de escribir el script, leer los archivos en `database/migrations/` para confirmar los nombres exactos de columnas y tablas. No asumir — verificar.

#### Tabla `clientes`
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(150) NOT NULL
rif_cedula      VARCHAR(20)
telefono        VARCHAR(20)
activo          BOOLEAN DEFAULT true
creado_en       TIMESTAMP DEFAULT NOW()
```

#### Tabla `cuentas_por_cobrar`
```
id                  SERIAL PRIMARY KEY
cliente_id          INT REFERENCES clientes(id)
fecha               DATE NOT NULL
descripcion         TEXT NOT NULL
monto_total         DECIMAL(15,2) NOT NULL
moneda              VARCHAR(3)        -- 'VES' o 'USD'
monto_convertido    DECIMAL(15,2)
tasa_id             INT REFERENCES tasas_diarias(id)
fecha_vencimiento   DATE
estado              VARCHAR(20)       -- pendiente/parcial/pagada/vencida
registrado_por      INT REFERENCES usuarios(id)
creado_en           TIMESTAMP DEFAULT NOW()
```

#### Tabla `proveedores` (verificar nombre exacto en migraciones)
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(150) NOT NULL
rif             VARCHAR(20)
telefono        VARCHAR(20)
activo          BOOLEAN DEFAULT true
creado_en       TIMESTAMP DEFAULT NOW()
```

#### Tabla `cuentas_por_pagar` (verificar nombre exacto en migraciones)
```
id                  SERIAL PRIMARY KEY
proveedor_id        INT REFERENCES proveedores(id)
fecha               DATE NOT NULL
numero_factura      VARCHAR(50)
descripcion         TEXT NOT NULL
monto_total         DECIMAL(15,2) NOT NULL
moneda              VARCHAR(3)
monto_convertido    DECIMAL(15,2)
tasa_id             INT REFERENCES tasas_diarias(id)
fecha_vencimiento   DATE
estado              VARCHAR(20)
registrado_por      INT REFERENCES usuarios(id)
creado_en           TIMESTAMP DEFAULT NOW()
```

### Pasos de importación en orden

**Paso 1 — Clientes**
- Por cada cliente en el JSON:
  - Mapear: `Descripcion` → `nombre`, `RIF` → `rif_cedula`, primer teléfono (split por coma, índice 0, trim) → `telefono`, `Activo == 1` → `activo`
  - Verificar si ya existe un cliente con el mismo `rif_cedula` antes de insertar
  - Si ya existe: omitir e incluir en conteo de omitidos
  - Si no existe: insertar y guardar el id generado
  - Construir mapa en memoria: `{ idCliente_Antare → id_PostgreSQL }`

**Paso 2 — Proveedores**
- Extraer lista única de `idProveedor` desde `cuentasPorPagar` del JSON
- El `idProveedor` en Antare es el RIF sin guión (ej: `J294570917`)
- Formatear como RIF con guión: separar el último dígito con `-` (ej: `J29457091-7`)
- Usar el RIF formateado como `nombre` provisional (no hay otro dato disponible)
- Verificar duplicados por `rif` antes de insertar
- Construir mapa en memoria: `{ idProveedor_Antare → proveedor_id_PostgreSQL }`

**Paso 3 — Cuentas por Cobrar**
- Obtener `tasa_id` más reciente de `tasas_diarias` en PostgreSQL
- Obtener `registrado_por` del primer usuario con `rol = 'admin'` en `usuarios`
- Por cada CxC en el JSON:
  - `monto_total` = `Math.abs(Monto)`
  - `moneda` = `MonedaTransaccion` (ya viene como `'USD'` o `'VES'`)
  - `monto_convertido`:
    - Si `moneda = 'USD'` → `monto_total * MonedaTasaDeCambio`
    - Si `moneda = 'VES'` → `monto_total / MonedaTasaDeCambio`
    - Si `MonedaTasaDeCambio` es null o 0 → usar 1 como factor
  - `estado`:
    - `Math.abs(Monto) - Cancelado <= 0.01` → `'pagada'`
    - `Vencimiento < fecha actual` y aún pendiente → `'vencida'`
    - `Cancelado > 0` y aún pendiente → `'parcial'`
    - Otherwise → `'pendiente'`
  - `cliente_id` desde el mapa del Paso 1
  - Si el cliente no está en el mapa: omitir con advertencia

**Paso 4 — Cuentas por Pagar**
- Misma lógica de montos y estado que CxC
- `proveedor_id` desde el mapa del Paso 2
- Intentar extraer `numero_factura` del campo `Concepto` con regex:
  ```javascript
  const match = concepto.match(/[Ff]actura\s+(\S+)/);
  const numeroFactura = match ? match[1] : null;
  ```
- Si el proveedor no está en el mapa: omitir con advertencia

### Flags de ejecución
```bash
node importar-gestionpro.js                  # Migración completa (4 pasos)
node importar-gestionpro.js --dry-run        # Simula sin escribir nada
node importar-gestionpro.js --solo-clientes
node importar-gestionpro.js --solo-proveedores
node importar-gestionpro.js --solo-cxc
node importar-gestionpro.js --solo-cxp
```

### Resumen final obligatorio
Al terminar imprimir:
```
════════════════════════════════════
  RESUMEN DE MIGRACIÓN
════════════════════════════════════
  Clientes:
    ✅ Insertados:  XX
    ⏭️  Omitidos:   XX (ya existían)
    ❌ Errores:     XX

  Proveedores:
    ✅ Insertados:  XX
    ⏭️  Omitidos:   XX
    ❌ Errores:     XX

  Cuentas por Cobrar:
    ✅ Insertadas:  XX
       pendiente:  XX
       parcial:    XX
       pagada:     XX
       vencida:    XX
    ❌ Errores:     XX

  Cuentas por Pagar:
    ✅ Insertadas:  XX
       pendiente:  XX
       parcial:    XX
       pagada:     XX
       vencida:    XX
    ❌ Errores:     XX

  ⏱️  Tiempo total: X.XXs
════════════════════════════════════
```

### Notas importantes para el script 2
- Incluir al inicio del archivo las instrucciones de uso como comentario:
  ```
  INSTRUCCIONES (PC de desarrollo):
  1. Colocar antare-data.json en esta misma carpeta antare-tools/
  2. Asegurarse de que Docker esté corriendo (docker-compose up -d)
  3. cd antare-tools && npm install
  4. node importar-gestionpro.js --dry-run   ← revisar primero
  5. node importar-gestionpro.js             ← migración real
  ```
- Errores individuales NO deben detener la migración — capturar con try/catch por registro
- No usar `console.log` para errores — usar `console.error`

---

## `antare-tools/package.json`

Actualizar con estas dependencias (solo las necesarias para la PC de desarrollo):

```json
{
  "name": "antare-tools",
  "version": "1.0.0",
  "description": "Scripts de migración Antare → GestiónPro",
  "scripts": {
    "importar": "node importar-gestionpro.js",
    "dry-run": "node importar-gestionpro.js --dry-run"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "pg": "^8.0.0"
  }
}
```

> **Nota:** Solo se necesitan `dotenv` y `pg` en la PC de desarrollo para `importar-gestionpro.js`.

---

## Convenciones del proyecto a respetar

- Comentarios en español
- Variables y funciones en camelCase en español (ej: `importarClientes`, `parsearFecha`, `calcularEstado`)
- Mensajes de consola con emojis: ✅ éxito, ❌ error, ⚠️ advertencia, ⏭️ omitido, 🔌 conexión, ⏱️ tiempo
- Errores individuales no deben detener la migración — capturar con try/catch por registro

---

## Archivos a crear

```
antare-tools/
├── package.json              ← actualizar con dependencias dotenv y pg
└── importar-gestionpro.js    ← ÚNICO archivo a crear
```

**No tocar:**
- `antare-tools/exportar-antare.js` — ya existe y ya cumplió su función
- `antare-tools/antare-data.json` — contiene los datos a importar
- Ningún archivo existente del proyecto GestiónPro
