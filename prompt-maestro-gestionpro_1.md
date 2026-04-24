# PROMPT MAESTRO — Sistema de Gestión Empresarial "GestiónPro"

> **Instrucción para Claude Code:** Este documento contiene la especificación completa de un sistema de gestión empresarial. Léelo completo antes de generar código. Sigue la arquitectura, módulos, reglas de negocio y fases descritas. Pregunta si algo es ambiguo antes de asumir.

---

## 1. CONTEXTO DEL PROYECTO

Estoy construyendo un **sistema web de gestión empresarial** para reemplazar hojas de Excel. El sistema es para una empresa en **Venezuela**, opera en **bimoneda (VES y USD)** y debe cumplir con los requerimientos fiscales del **SENIAT**.

### Usuarios
- **2-3 usuarios** con roles: Administrador (acceso total) y Operador (registro diario, sin configuración).
- Autenticación simple con usuario y contraseña.

### Plataforma
- **App web responsive** (funcional en navegador de PC y móvil).
- No se requiere app nativa.

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express (API REST) |
| Base de datos | PostgreSQL |
| Autenticación | JWT (JSON Web Tokens) |
| Moneda/Conversión | Lógica interna con tasa diaria configurable |

### Principios de desarrollo
- Código limpio, modular y comentado en español.
- Nombres de variables, funciones y componentes en español (camelCase).
- Mensajes de UI en español.
- API RESTful con rutas en español (`/api/ventas`, `/api/gastos`, etc.).
- Validación de datos tanto en frontend como en backend.
- Manejo de errores con mensajes claros al usuario.

---

## 3. BASE DE DATOS — MODELO RELACIONAL

### 3.1 Tabla: `usuarios`
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(100) NOT NULL
email           VARCHAR(150) UNIQUE NOT NULL
username        VARCHAR(50) UNIQUE NOT NULL   -- Login alternativo al email
password_hash   VARCHAR(255) NOT NULL
rol             ENUM('admin', 'operador') DEFAULT 'operador'
activo          BOOLEAN DEFAULT true
permisos        JSONB NOT NULL DEFAULT '{}'   -- { modulo: true/false } por cada sección
creado_en       TIMESTAMP DEFAULT NOW()
```

**Regla de negocio — Permisos:**
- Los **admin** tienen acceso total a todos los módulos automáticamente (el objeto permisos es ignorado).
- Los **operadores** solo acceden a los módulos donde `permisos[modulo] === true`.
- El sidebar filtra dinámicamente los ítems de navegación según estos permisos.
- Solo admin puede acceder a `/usuarios` para crear, editar y eliminar usuarios.

### 3.2 Tabla: `tasas_diarias`
```
id              SERIAL PRIMARY KEY
fecha           DATE UNIQUE NOT NULL
tasa_bcv        DECIMAL(12,4) NOT NULL  -- Bs por 1 USD
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.3 Tabla: `ventas_diarias`
Registra el **total de ventas del día por método de pago**, NO ventas individuales.
```
id              SERIAL PRIMARY KEY
fecha           DATE NOT NULL
metodo_pago     ENUM('efectivo_bs','efectivo_usd','pos_debito','pos_credito',
                     'transferencia','pago_movil','zelle','binance','biopago') NOT NULL
monto           DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
monto_convertido DECIMAL(15,2)  -- Monto equivalente en la otra moneda (auto-calculado)
tasa_id         INT REFERENCES tasas_diarias(id)
nota            TEXT
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()

UNIQUE(fecha, metodo_pago)  -- Un solo registro por método por día
```

**Regla de negocio:** Al guardar, el sistema calcula automáticamente `monto_convertido` usando la tasa del día:
- Si `moneda = VES` → `monto_convertido = monto / tasa_bcv` (resultado en USD)
- Si `moneda = USD` → `monto_convertido = monto * tasa_bcv` (resultado en VES)

### 3.4 Tabla: `categorias_gasto`
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(100) NOT NULL
tipo            ENUM('factura','eventual','divisas') NOT NULL
activa          BOOLEAN DEFAULT true
```

### 3.5 Tabla: `gastos`
```
id              SERIAL PRIMARY KEY
fecha           DATE NOT NULL
tipo            ENUM('factura','eventual','divisas') NOT NULL
categoria_id    INT REFERENCES categorias_gasto(id)
descripcion     TEXT NOT NULL
monto           DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
monto_convertido DECIMAL(15,2)
tasa_id         INT REFERENCES tasas_diarias(id)
-- Campos solo para facturas de proveedor:
proveedor_rif   VARCHAR(20)
proveedor_nombre VARCHAR(150)
numero_factura  VARCHAR(50)
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.6 Tabla: `cierres_pos`
```
id              SERIAL PRIMARY KEY
fecha           DATE NOT NULL
banco           VARCHAR(100) NOT NULL
numero_lote     VARCHAR(50) NOT NULL
monto_cierre    DECIMAL(15,2) NOT NULL
moneda          VARCHAR(3) DEFAULT 'VES'
diferencia      DECIMAL(15,2)  -- Diferencia vs ventas POS del día (auto-calculado)
nota            TEXT
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

**Regla de negocio:** Al guardar un cierre POS, el sistema:
1. Suma todas las `ventas_diarias` del mismo día donde `metodo_pago IN ('pos_debito','pos_credito')`.
2. Calcula `diferencia = monto_cierre - total_ventas_pos`.
3. Si `diferencia != 0`, muestra alerta visual.

> **Nota:** El módulo Control de POS y el registro de ventas POS **no son redundantes**. Las ventas POS registran lo cobrado desde la perspectiva del negocio; el cierre POS registra lo que reporta el banco. La diferencia entre ambos es el dato clave de conciliación.

### 3.7 Tabla: `empleados`
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(150) NOT NULL
cedula          VARCHAR(20) UNIQUE
cargo           VARCHAR(100)
activo          BOOLEAN DEFAULT true
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.8 Tabla: `movimientos_nomina`
```
id              SERIAL PRIMARY KEY
empleado_id     INT REFERENCES empleados(id)
fecha           DATE NOT NULL
tipo            ENUM('adelanto','venta_credito','abono') NOT NULL
descripcion     TEXT
monto           DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
monto_convertido DECIMAL(15,2)
tasa_id         INT REFERENCES tasas_diarias(id)
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

**Regla de negocio:** El saldo pendiente de un empleado se calcula en tiempo real:
`saldo = SUM(adelantos + ventas_credito) - SUM(abonos)`, todo convertido a USD usando la tasa del día de cada movimiento.

### 3.9 Tabla: `clientes`
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(150) NOT NULL
rif_cedula      VARCHAR(20)
telefono        VARCHAR(20)
activo          BOOLEAN DEFAULT true
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.10 Tabla: `cuentas_por_cobrar`
```
id              SERIAL PRIMARY KEY
cliente_id      INT REFERENCES clientes(id)
fecha           DATE NOT NULL
descripcion     TEXT NOT NULL  -- Producto/servicio detallado
monto_total     DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
monto_convertido DECIMAL(15,2)
tasa_id         INT REFERENCES tasas_diarias(id)
fecha_vencimiento DATE
estado          ENUM('pendiente','parcial','pagada','vencida') DEFAULT 'pendiente'
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.11 Tabla: `abonos_cxc`
```
id              SERIAL PRIMARY KEY
cuenta_id       INT REFERENCES cuentas_por_cobrar(id)
fecha           DATE NOT NULL
monto           DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
metodo_pago     ENUM('efectivo_bs','efectivo_usd','pos_debito','pos_credito',
                     'transferencia','pago_movil','zelle','binance','biopago') NOT NULL
tasa_id         INT REFERENCES tasas_diarias(id)
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

**Regla de negocio:** Cada abono actualiza automáticamente el `estado` de la CxC:
- Si `SUM(abonos) >= monto_total` → `estado = 'pagada'`
- Si `SUM(abonos) > 0 AND < monto_total` → `estado = 'parcial'`
- Si `fecha_vencimiento < hoy AND estado != 'pagada'` → `estado = 'vencida'`

### 3.12 Tabla: `proveedores`
```
id              SERIAL PRIMARY KEY
nombre          VARCHAR(150) NOT NULL
rif             VARCHAR(20)
telefono        VARCHAR(20)
activo          BOOLEAN DEFAULT true
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.13 Tabla: `cuentas_por_pagar`
```
id              SERIAL PRIMARY KEY
proveedor_id    INT REFERENCES proveedores(id)
fecha           DATE NOT NULL
descripcion     TEXT NOT NULL  -- Producto/servicio detallado
monto_total     DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
monto_convertido DECIMAL(15,2)
tasa_id         INT REFERENCES tasas_diarias(id)
numero_factura  VARCHAR(50)
fecha_vencimiento DATE
estado          ENUM('pendiente','parcial','pagada','vencida') DEFAULT 'pendiente'
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.14 Tabla: `abonos_cxp`
```
id              SERIAL PRIMARY KEY
cuenta_id       INT REFERENCES cuentas_por_pagar(id)
fecha           DATE NOT NULL
monto           DECIMAL(15,2) NOT NULL
moneda          ENUM('VES','USD') NOT NULL
metodo_pago     ENUM('efectivo_bs','efectivo_usd','transferencia','pago_movil',
                     'zelle','binance') NOT NULL
tasa_id         INT REFERENCES tasas_diarias(id)
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.15 Tabla: `caja_chica` (ajustes manuales de tesorería)
```
id              SERIAL PRIMARY KEY
tipo            VARCHAR(20) NOT NULL  -- 'asignacion', 'gasto', 'reposicion'
fecha           DATE NOT NULL
descripcion     TEXT
monto           DECIMAL(15,2) NOT NULL
moneda          VARCHAR(3) NOT NULL
monto_convertido DECIMAL(15,2)
tasa_id         INT REFERENCES tasas_diarias(id)
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

### 3.16 Tabla: `configuracion_tesoreria` (nueva)
```
id              SERIAL PRIMARY KEY
canal           VARCHAR(50) UNIQUE NOT NULL   -- clave del método de pago
etiqueta        VARCHAR(100) NOT NULL
cuenta_destino  VARCHAR(150) NOT NULL          -- banco/cuenta donde cae el dinero
comision_pct    DECIMAL(6,4) DEFAULT 0         -- % de comisión bancaria
moneda          VARCHAR(3) DEFAULT 'VES'
orden           SMALLINT DEFAULT 99
actualizado_en  TIMESTAMP DEFAULT NOW()
```

**Regla de negocio — Módulo Tesorería:**
- El saldo de cada cuenta se calcula en tiempo real desde `ventas_diarias` y `cierres_pos`.
- Cada canal de cobro mapea a una cuenta destino configurable:
  - Pago Móvil → Banco de Venezuela (editable)
  - BioPago → Banco de Venezuela (editable)
  - Zelle → Chase
  - Binance → Binance
  - POS → nombre del banco del cierre de lote
  - Transferencia → configurable
  - Efectivo VES / USD → cuentas separadas
- La comisión bancaria se descuenta del bruto para obtener el neto disponible.
- Los ajustes manuales (`caja_chica`) son correcciones que se aplican sobre el saldo calculado.
- Solo admin puede modificar la configuración de canales y comisiones.

### 3.17 Tabla: `cierres_fiscales`
```
id              SERIAL PRIMARY KEY
fecha           DATE UNIQUE NOT NULL
base_imponible  DECIMAL(15,2) DEFAULT 0   -- Monto gravado antes de IVA
iva             DECIMAL(15,2) DEFAULT 0   -- IVA 16%
exento          DECIMAL(15,2) DEFAULT 0   -- Ventas no gravadas
monto_cierre    DECIMAL(15,2) NOT NULL    -- Total Z = base + iva + exento (auto-calculado)
moneda          VARCHAR(3) DEFAULT 'VES'  -- Siempre en bolívares
nota            TEXT
registrado_por  INT REFERENCES usuarios(id)
creado_en       TIMESTAMP DEFAULT NOW()
```

**Regla de negocio:**
- `monto_cierre` = `base_imponible` + `iva` + `exento` (calculado al guardar, no editable directo).
- Al ingresar la base, el sistema calcula el IVA al 16% automáticamente (editable si difiere).
- Un solo cierre Z por fecha (unicidad).
- El módulo fiscal calcula: total del mes, promedio diario, desglose imponible/IVA/exento, gráfico comparativo por mes/año.

---

## 4. MÓDULOS DEL SISTEMA

### MÓDULO 1: Tasa del Día
**Pantalla:** Formulario simple en la parte superior del sistema o como modal al iniciar sesión.
- Campo: fecha (default hoy), tasa BCV (Bs por 1 USD).
- Si ya existe tasa para hoy, mostrar la actual con opción de editar.
- Historial de tasas en tabla con filtro por rango de fechas.
- **Sin tasa cargada, el sistema NO permite registrar ventas ni gastos del día.**

### MÓDULO 2: Registro de Ventas
**Pantalla:** Formulario tipo grilla donde se ven todos los métodos de pago.
- Una fila por cada método de pago.
- Columnas: Método | Monto | Moneda (VES/USD) | Equivalente (auto).
- El usuario llena solo los métodos que aplican ese día.
- Botón "Guardar día" que registra todo de una vez.
- Vista de historial con filtros: por día, semana, mes, rango personalizado.
- Totales automáticos en ambas monedas.
- **Ventas mixtas:** Un mismo día puede tener métodos en Bs y otros en USD.

**Métodos con sub-operaciones detalladas** (el total se auto-suma):
- **Pago Móvil:** N operaciones, cada una con últimos 4 dígitos de referencia + monto.
- **Transferencia:** N operaciones, cada una con N° de transacción + monto.
- **POS Débito / POS Crédito:** N cierres por banco, cada uno con N° de cierre + monto.
- **BioPago:** 2 terminales fijos (Slot 1 y Slot 2) con referencia y monto independientes.

Las sub-operaciones se guardan en `venta_detalles` y el monto del método en `ventas_diarias` es la suma automática de todas las sub-operaciones.

### MÓDULO 3: Gastos y Egresos
**Pantalla:** Formulario con selector de tipo (factura / eventual / divisas).
- Si es factura: campos adicionales de RIF proveedor, nombre, número de factura.
- Selector de categoría (configurable por admin).
- Lista de gastos del día con opción de editar/eliminar.
- Historial con filtros por tipo, categoría, rango de fechas.

### MÓDULO 4: Control de POS
**Pantalla:** Formulario de cierre diario.
- Campos: fecha, banco, número de lote, monto del cierre.
- Al guardar, muestra comparación automática:
  - Total ventas POS (débito + crédito) del día.
  - Monto del cierre.
  - Diferencia (resaltada en rojo si ≠ 0).
- Historial de cierres con indicador visual de diferencias.

### MÓDULO 5: Nómina Simplificada
**Pantalla:** Lista de empleados con saldo pendiente.
- Click en empleado → detalle de movimientos (adelantos, ventas a crédito, abonos).
- Formulario para registrar nuevo movimiento.
- Saldo pendiente calculado en tiempo real en USD (convertido con tasa de cada operación).
- Alerta si un empleado supera un monto configurable de deuda.

### MÓDULO 6: Cuentas por Cobrar
**Pantalla:** Lista de cuentas pendientes agrupadas por cliente.
- Crear nueva CxC: cliente, descripción detallada (producto/servicio), monto, moneda, vencimiento.
- Registrar abonos parciales con método de pago.
- Estados con colores: pendiente (amarillo), parcial (naranja), pagada (verde), vencida (rojo).
- Dashboard de CxC: total pendiente, próximas a vencer, vencidas.

### MÓDULO 7: Cuentas por Pagar
**Pantalla:** Igual que CxC pero para proveedores.
- Crear nueva CxP: proveedor, descripción detallada, monto, moneda, factura, vencimiento.
- Registrar abonos parciales.
- Mismos estados y colores que CxC.
- Dashboard de CxP: total adeudado, próximos vencimientos.

### MÓDULO 8: Tesorería (evolución de Caja Chica)
**Pantalla:** Vista de saldos por cuenta, alimentada automáticamente desde Ventas y Control POS.

**Tab "Cuentas":**
- Tarjetas de saldo por cuenta (Banco de Venezuela, Chase, Binance, Efectivo VES, Efectivo USD, etc.).
- Saldo = bruto de ventas/cierres − comisión bancaria configurada.
- Filtro por rango de fechas para analizar cualquier período.
- Totales globales en VES y USD.

**Tab "Configuración"** (solo admin):
- Tabla editable: canal de cobro → cuenta destino + % de comisión bancaria.
- Canales: Pago Móvil, BioPago, Transferencia, Zelle, Binance, POS, Efectivo VES, Efectivo USD.

**Tab "Ajustes manuales":**
- Registro de gastos, asignaciones o reposiciones que no provienen de ventas.
- Historial de ajustes con tipo, monto y descripción.

### MÓDULO 9: Módulo Fiscal (SENIAT)
**Pantalla:** Registro de cierres Z fiscales con desglose IVA.

**Tab "Registrar cierre Z":**
- Campos: fecha + Base imponible + IVA 16% (auto-calculado, editable) + Exento.
- Total = Base + IVA + Exento (calculado en tiempo real, solo lectura).
- Un solo cierre por fecha.

**Tab "Resumen mensual":**
- Selector de año y mes.
- Tarjetas: total del mes, promedio diario, días registrados.
- Tabla de desglose con porcentaje: base imponible / IVA / exento.
- Barra visual de composición de ventas (imponible vs exento).
- Gráfico de barras horizontal comparativo mes a mes del año.

**Tab "Historial":**
- Lista de cierres Z con desglose Base / IVA / Exento visible en cada fila.
- Eliminación disponible solo para admin.

### MÓDULO 10: Dashboard Principal ✅
**Pantalla:** Vista general al iniciar sesión.
- **Tarjetas resumen:**
  - Ingresos del día / semana / mes (en VES y USD).
  - Egresos del período.
  - Ganancia o pérdida neta (ingresos - egresos).
  - Saldo de caja chica.
  - Total CxC pendiente.
  - Total CxP pendiente.
- **Gráficos:**
  - Barras: ingresos vs egresos por día/semana/mes.
  - Dona: desglose de ventas por método de pago.
  - Línea: tendencia de ventas mensual.
- **Alertas:**
  - Diferencias en cierres POS.
  - CxC vencidas.
  - CxP próximas a vencer.
  - Caja chica baja.
  - Tasa del día no configurada.

---

## 5. REGLAS GLOBALES DEL SISTEMA

### Bimoneda
- Toda operación monetaria tiene: `monto`, `moneda` y `monto_convertido`.
- La conversión usa la tasa del día (`tasas_diarias`) de la fecha de la operación.
- El dashboard muestra siempre ambas monedas.

### Integridad
- No se puede registrar operación en una fecha sin tasa configurada.
- Solo admin puede editar/eliminar registros pasados.
- Operador solo puede registrar y ver.

### Control de accesos
- El campo de login acepta **email o username** indistintamente.
- Cada operador tiene un objeto `permisos` JSONB con acceso por módulo (`true/false`).
- Los administradores tienen acceso total automático; los operadores ven solo los módulos habilitados en su perfil.
- Solo los administradores acceden a `/usuarios` para gestionar cuentas y permisos del sistema.

### Auditoría
- Toda tabla tiene `registrado_por` y `creado_en`.
- Considerar agregar `actualizado_en` y `actualizado_por` en futuras fases.

---

## 6. FASES DE DESARROLLO

### FASE 1 — MVP ✅ Completada
1. Autenticación (login, JWT, roles).
2. Módulo Tasa del Día.
3. Módulo Registro de Ventas (con sub-operaciones por método y auto-suma).
4. Módulo Gastos y Egresos (con autocompletado de proveedores).
5. Dashboard básico (ganancia/pérdida, totales por método de pago).

### FASE 2 — Control financiero ✅ Completada
6. Módulo Control de POS.
7. Módulo Fiscal (SENIAT) con desglose Base/IVA/Exento.
8. Módulo Tesorería (saldos por cuenta desde ventas, con comisiones bancarias configurables).

### FASE 3 — Gestión de terceros ✅ Completada
9. Módulo Cuentas por Cobrar (`/cxc`).
10. Módulo Cuentas por Pagar (`/cxp`).
11. Módulo Nómina Simplificada (`/nomina`).
12. Dashboard completo con alertas, gráficos de barras, dona y tendencia mensual.

### FASE 4 — Usuarios y accesos ✅ Completada
13. Login por username o email (campo único de entrada detecta automáticamente el tipo).
14. Sistema de permisos granulares por módulo (JSONB en tabla `usuarios`).
15. Módulo Gestión de Usuarios (`/usuarios`) con CRUD completo, toggles de permisos por módulo.
16. Sidebar filtra ítems de navegación según permisos del usuario autenticado.
17. Logo La Modelo integrado en pantalla de login y esquina del sidebar.

---

## 7. ESTRUCTURA DEL PROYECTO

```
gestion-pro/
├── backend/
│   ├── src/
│   │   ├── config/         # Conexión DB, variables de entorno
│   │   ├── middleware/      # Auth JWT, validación, manejo de errores
│   │   ├── routes/          # Rutas por módulo
│   │   │   ├── auth.routes.js
│   │   │   ├── tasas.routes.js
│   │   │   ├── ventas.routes.js
│   │   │   ├── gastos.routes.js
│   │   │   ├── pos.routes.js
│   │   │   ├── nomina.routes.js
│   │   │   ├── cxc.routes.js
│   │   │   ├── cxp.routes.js
│   │   │   ├── cajaChica.routes.js
│   │   │   ├── fiscal.routes.js
│   │   │   └── dashboard.routes.js
│   │   ├── controllers/     # Lógica de negocio por módulo
│   │   ├── models/          # Queries SQL o ORM
│   │   ├── utils/           # Conversión de moneda, helpers
│   │   └── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   │   ├── Layout/      # Sidebar, Header, Footer
│   │   │   ├── Forms/       # Inputs, Selects, DatePickers
│   │   │   └── Charts/      # Gráficos reutilizables
│   │   ├── pages/           # Una carpeta por módulo
│   │   │   ├── Login/
│   │   │   ├── Dashboard/
│   │   │   ├── Tasas/
│   │   │   ├── Ventas/
│   │   │   ├── Gastos/
│   │   │   ├── POS/
│   │   │   ├── Nomina/
│   │   │   ├── CxC/
│   │   │   ├── CxP/
│   │   │   ├── CajaChica/
│   │   │   ├── Fiscal/
│   │   │   ├── CxC/
│   │   │   ├── CxP/
│   │   │   ├── Nomina/
│   │   │   └── Usuarios/
│   │   ├── context/         # AuthContext, TasaContext
│   │   ├── hooks/           # useAuth, useTasa, useFetch
│   │   ├── services/        # Llamadas API (axios)
│   │   ├── utils/           # Formateo de moneda, fechas
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
└── database/
    ├── migrations/          # Scripts SQL de creación
    └── seeds/               # Datos iniciales (categorías, admin)
```

---

## 8. INSTRUCCIONES PARA CLAUDE CODE

1. **Empieza por la Fase 1.** No construyas módulos de fases posteriores hasta que la Fase 1 esté completa y funcional.
2. **Base de datos primero.** Crea las migraciones SQL antes de escribir código backend.
3. **Backend antes que frontend.** Cada endpoint debe estar probado antes de construir la UI.
4. **Un módulo a la vez.** Completa: migración → rutas → controlador → página → prueba.
5. **Seed inicial:** Crea un usuario admin por defecto (`admin@gestionpro.com` / `admin123`) y categorías de gasto básicas.
6. **Variables de entorno:** `DATABASE_URL`, `JWT_SECRET`, `PORT`.
7. **Validaciones:** Usa `express-validator` en backend y validación de formularios en React.
8. **Formato de moneda:** Siempre mostrar con separador de miles y 2 decimales. VES con "Bs." prefijo, USD con "$" prefijo.
9. **Fechas:** Formato `dd/mm/aaaa` en la UI, `YYYY-MM-DD` en la DB.
10. **Responsive:** Mobile-first con Tailwind. Sidebar colapsable en móvil.

---

## 9. NOTAS ADICIONALES

- **Métodos de pago:** Son fijos en el sistema (no configurables por el usuario). Si se necesita agregar uno nuevo, se hace por código.
- **Tasa BCV:** Se ingresa manualmente. En una futura mejora se podría integrar con API del BCV.
- **Exportación:** En fases futuras, permitir exportar reportes a PDF y Excel.
- **Backup:** Considerar script de respaldo automático de PostgreSQL.

---

---

## 10. DECISIONES DE DISEÑO TOMADAS EN DESARROLLO

Estas decisiones surgieron durante la implementación y deben respetarse en fases futuras:

### Ventas vs. Control POS — no son redundantes
El registro de ventas POS en el módulo Ventas y el módulo Control de POS tienen propósitos distintos. Eliminar uno rompería la lógica de conciliación. El flujo es: registrar lo cobrado (Ventas) → registrar lo que reporta el banco (Control POS) → ver la diferencia.

### Tesorería es calculada, no manual
El saldo de cada cuenta se deriva automáticamente de `ventas_diarias` y `cierres_pos`. No se ingresa manualmente. Los ajustes manuales (`caja_chica`) son solo correcciones excepcionales, no el flujo principal.

### Comisiones bancarias en configuración_tesoreria
Cada canal de cobro tiene un `comision_pct` configurable. El neto = bruto − comisión. Esto aplica a POS (todos los bancos con el mismo %), y por separado a cada canal no-POS. Solo admin puede editar.

### Métodos de pago con sub-operaciones
Pago Móvil, Transferencia, POS Débito, POS Crédito y BioPago usan la tabla `venta_detalles` para guardar operaciones individuales. El `monto` en `ventas_diarias` es siempre la suma de los detalles, nunca un valor manual. Los métodos sin sub-operaciones (Efectivo, Zelle, Binance) sí tienen campo de monto manual.

### Cierre Fiscal con desglose IVA
El monto Z no se ingresa como un solo número. Se desglosa en Base imponible + IVA 16% + Exento. El total es calculado. Esto permite el control de ventas imponibles vs. exentas que exige el SENIAT.

### Tema oscuro — inputs con !important
Los campos `<input>` y `<select>` usan clases CSS `.input-inline` y `.select-inline` con `background-color` y `color` con `!important` para garantizar visibilidad en el tema oscuro, ya que los valores de Tailwind son sobrescritos por los estilos por defecto del navegador.

### Migraciones idempotentes
Todos los `CREATE TYPE` están protegidos con bloques `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` para que `npm run migrate` pueda ejecutarse múltiples veces sin errores.

### Permisos JSONB en usuarios
Los permisos se almacenan como un objeto JSONB en la tabla `usuarios`. El middleware `verificarPermiso(modulo)` en el backend comprueba `req.usuario.permisos[modulo] === true` antes de permitir el acceso a rutas protegidas. Los admins siempre pasan sin verificación del objeto.

### Login por email o username
El campo de login en `POST /api/auth/login` usa la clave `login` (no `email`). El backend detecta si contiene `@` para hacer la búsqueda por email o por username. Ambas rutas están indexadas en la base de datos.

### Dashboard con consultaSegura()
El dashboard usa una función `consultaSegura()` que envuelve cada query en try/catch y retorna `{ rows: [{}] }` en caso de error. Esto permite que el dashboard muestre datos de Fases 1–2 incluso si las migraciones de Fases 3–4 aún no se han aplicado.

---

*Este prompt fue diseñado para ser usado con Claude Code integrado en Antigravity. Pega este documento completo como contexto inicial del proyecto.*
