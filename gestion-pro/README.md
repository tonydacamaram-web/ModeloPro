# GestiónPro — Sistema de Gestión Empresarial

Sistema web bimoneda (VES/USD) para gestión empresarial en Venezuela, orientado al control financiero diario con cumplimiento fiscal SENIAT.

## Requisitos

- Node.js 18+
- Docker + Docker Compose (para la base de datos PostgreSQL)

## Arranque rápido

### 1. Base de datos

```bash
docker-compose up -d
```

Levanta **PostgreSQL 15** en `localhost:5432` y **pgAdmin 4** en `http://localhost:5050`.

### 2. Backend

```bash
cd backend
npm install
npm run migrate     # Crea/actualiza todas las tablas (001–020)
npm run seed        # Inserta admin + categorías base
npm run dev         # Servidor en http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev         # UI en http://localhost:5173
```

### 4. Acceder

- URL: `http://localhost:5173`
- Login: `admin` (username) **o** `admin@gestionpro.com` (email)
- Contraseña: `admin123`

---

## Estructura del proyecto

```
gestion-pro/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/         # JWT auth, permisos, validación, errores
│   │   ├── routes/             # Un archivo por módulo
│   │   ├── controllers/        # Lógica de negocio
│   │   ├── models/             # Queries SQL
│   │   └── utils/moneda.js
│   └── scripts/
│       ├── migrar.js           # Ejecuta migraciones 001–020 en orden
│       └── semillas.js
├── frontend/
│   └── src/
│       ├── context/            # AuthContext (con tienePermiso), TasaContext
│       ├── pages/              # Un directorio por módulo
│       │   ├── Login/
│       │   ├── Dashboard/
│       │   ├── Tasas/
│       │   ├── Ventas/
│       │   ├── Gastos/
│       │   ├── POS/
│       │   ├── Fiscal/
│       │   ├── CajaChica/
│       │   ├── CxC/CxCPage.jsx
│       │   ├── CxP/CxPPage.jsx
│       │   ├── Nomina/NominaPage.jsx
│       │   └── Usuarios/UsuariosPage.jsx
│       ├── components/         # Layout (Sidebar filtra por permisos), TasaAlerta
│       ├── services/           # Llamadas API (axios)
│       └── utils/              # formatMoneda, formatFecha
└── database/
    └── migrations/             # 001–020 scripts SQL
```

---

## Estado actual por módulo

### Fase 1 — Completada ✅

| Módulo | Ruta | Estado |
|--------|------|--------|
| Autenticación JWT (admin / operador) | `/login` | ✅ |
| Tasa del día BCV | `/tasas` | ✅ |
| Registro de ventas diarias | `/ventas` | ✅ |
| Gastos y egresos | `/gastos` | ✅ |
| Dashboard básico | `/dashboard` | ✅ |

### Fase 2 — Completada ✅

| Módulo | Ruta | Estado |
|--------|------|--------|
| Control de POS | `/pos` | ✅ |
| Módulo Fiscal SENIAT | `/fiscal` | ✅ |
| Tesorería | `/caja-chica` | ✅ |

### Fase 3 — Completada ✅

| Módulo | Ruta | Estado |
|--------|------|--------|
| Cuentas por Cobrar (CxC) | `/cxc` | ✅ |
| Cuentas por Pagar (CxP) | `/cxp` | ✅ |
| Nómina Simplificada | `/nomina` | ✅ |
| Dashboard completo con gráficos y alertas | `/dashboard` | ✅ |

### Fase 4 — Completada ✅

| Funcionalidad | Estado |
|---------------|--------|
| Login por username o email | ✅ |
| Permisos granulares por módulo (JSONB) | ✅ |
| Gestión de usuarios con CRUD completo | `/usuarios` ✅ |
| Logo La Modelo en login y sidebar | ✅ |

---

## Comportamientos clave implementados

### Autenticación y usuarios
- El campo de login acepta tanto el **email** como el **username** (ej. `admin` o `admin@gestionpro.com`)
- Cada usuario tiene un objeto `permisos` JSONB con acceso habilitado/deshabilitado por módulo
- Los administradores tienen acceso total automático independientemente del objeto permisos
- El sidebar filtra dinámicamente los ítems según los permisos del usuario autenticado
- Solo los admins pueden acceder a `/usuarios` para gestionar usuarios y permisos

### Ventas
- Grilla diaria por método de pago con conversión automática VES/USD
- Métodos con sub-operaciones detalladas (referencias, banco, monto individual):
  - **Pago Móvil**: N operaciones con últimos 4 dígitos de referencia + monto
  - **Transferencia**: N operaciones con N° de transacción + monto
  - **POS Débito / POS Crédito**: N cierres por banco con N° de cierre + monto
  - **BioPago**: 2 terminales fijos (Slot 1 y Slot 2) con referencia y monto independientes
- Los métodos con sub-operaciones auto-suman el total (no hay campo de monto manual)
- Sub-operaciones guardadas en tabla `venta_detalles`

### Control de POS
- Registro del cierre de lote bancario (fecha, banco, N° lote, monto)
- Cálculo automático de diferencia vs ventas POS registradas en el mismo día
- Indicador visual: cuadrado ✓ / sobrante (amarillo) / faltante (rojo)

### Módulo Fiscal SENIAT
- Cierre Z diario con desglose: Base imponible + IVA 16% + Exento = Total
- IVA se calcula automáticamente al ingresar la base (editable)
- Resumen mensual: total, promedio diario, desglose por tipo, barra de composición
- Gráfico comparativo mensual por año

### Tesorería
- Saldo calculado automáticamente desde `ventas_diarias` y `cierres_pos`
- Agrupado por cuenta destino configurable por canal de cobro:
  - Pago Móvil y BioPago → Banco de Venezuela (editable)
  - Zelle → Chase
  - Binance → Binance
  - POS → nombre del banco del cierre
- Comisión bancaria configurable por canal (se descuenta del bruto)
- Filtro por rango de fechas para ver saldo de un período
- Ajustes manuales (gastos, asignaciones, reposiciones) independientes
- Solo admin puede modificar la configuración de canales

### Gastos
- Tipos: factura, eventual, divisas
- Autocompletado de proveedor (RIF/nombre) desde historial de registros anteriores
- Categorías configurables por admin

### CxC / CxP
- Estados automáticos: `pendiente → parcial → pagada`, y `vencida` cuando la fecha de vencimiento supera la fecha actual
- Abonos parciales en cualquier moneda con recálculo transaccional de estado
- Alertas en dashboard: CxC vencidas y CxP próximas a vencer (7 días)

### Nómina
- Saldo del empleado calculado en USD usando la tasa histórica de cada movimiento
- Tipos de movimiento: adelanto, venta a crédito, abono
- Agrupación visual: empleados con saldo vs. empleados al día

---

## API endpoints

### Autenticación y Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Iniciar sesión (email o username) |
| GET | /api/auth/perfil | Perfil del usuario autenticado |
| GET | /api/auth/usuarios | Listar usuarios (admin) |
| POST | /api/auth/usuarios | Crear usuario (admin) |
| PUT | /api/auth/usuarios/:id | Actualizar usuario y permisos (admin) |
| DELETE | /api/auth/usuarios/:id | Eliminar usuario (admin) |

### Tasas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/tasas/hoy | Tasa BCV de hoy |
| GET | /api/tasas | Historial |
| POST | /api/tasas | Registrar tasa |
| PUT | /api/tasas/:id | Actualizar (admin) |

### Ventas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/ventas/dia/:fecha | Ventas + detalles de un día |
| GET | /api/ventas | Historial |
| POST | /api/ventas | Guardar día completo con detalles |
| DELETE | /api/ventas/:id | Eliminar (admin) |

### Gastos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/gastos/proveedores | Lista de proveedores registrados |
| GET | /api/gastos | Historial con filtros |
| POST | /api/gastos | Registrar gasto |
| PUT | /api/gastos/:id | Actualizar (admin) |
| DELETE | /api/gastos/:id | Eliminar (admin) |

### Control de POS
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/pos | Historial de cierres |
| GET | /api/pos/ventas-dia/:fecha | Total ventas POS de un día |
| GET | /api/pos/:id | Obtener cierre |
| POST | /api/pos | Registrar cierre |
| PUT | /api/pos/:id | Actualizar (admin) |
| DELETE | /api/pos/:id | Eliminar (admin) |

### Módulo Fiscal
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/fiscal | Historial de cierres Z |
| GET | /api/fiscal/resumen/:anio/:mes | Resumen mensual |
| GET | /api/fiscal/resumen-anual/:anio | Todos los meses del año |
| POST | /api/fiscal | Registrar cierre Z |
| PUT | /api/fiscal/:id | Actualizar (admin) |
| DELETE | /api/fiscal/:id | Eliminar (admin) |

### Tesorería
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/tesoreria/saldo | Saldo por cuenta (con filtro de fechas) |
| GET | /api/tesoreria/configuracion | Configuración de canales |
| PUT | /api/tesoreria/configuracion/:id | Actualizar canal (admin) |

### Caja Chica (ajustes manuales)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/caja-chica | Historial de movimientos manuales |
| POST | /api/caja-chica | Registrar ajuste |
| DELETE | /api/caja-chica/:id | Eliminar (admin) |

### CxC — Cuentas por Cobrar
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/cxc | Listar cuentas + resumen |
| POST | /api/cxc | Crear cuenta por cobrar |
| GET | /api/cxc/:id | Detalle con abonos |
| PUT | /api/cxc/:id | Actualizar (admin) |
| DELETE | /api/cxc/:id | Eliminar (admin) |
| POST | /api/cxc/:id/abonos | Registrar abono |
| DELETE | /api/cxc/:id/abonos/:abonoId | Eliminar abono (admin) |
| GET | /api/cxc/clientes | Listar clientes |
| POST | /api/cxc/clientes | Crear cliente |
| PUT | /api/cxc/clientes/:id | Actualizar cliente |
| DELETE | /api/cxc/clientes/:id | Eliminar cliente |

### CxP — Cuentas por Pagar
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/cxp | Listar cuentas + resumen |
| POST | /api/cxp | Crear cuenta por pagar |
| GET | /api/cxp/:id | Detalle con abonos |
| PUT | /api/cxp/:id | Actualizar (admin) |
| DELETE | /api/cxp/:id | Eliminar (admin) |
| POST | /api/cxp/:id/abonos | Registrar abono |
| DELETE | /api/cxp/:id/abonos/:abonoId | Eliminar abono (admin) |
| GET | /api/cxp/proveedores | Listar proveedores |
| POST | /api/cxp/proveedores | Crear proveedor |
| PUT | /api/cxp/proveedores/:id | Actualizar proveedor |
| DELETE | /api/cxp/proveedores/:id | Eliminar proveedor |

### Nómina
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/nomina/empleados | Listar empleados con saldo |
| POST | /api/nomina/empleados | Crear empleado |
| PUT | /api/nomina/empleados/:id | Actualizar empleado |
| DELETE | /api/nomina/empleados/:id | Eliminar empleado |
| GET | /api/nomina/empleados/:id/movimientos | Movimientos de un empleado |
| POST | /api/nomina/empleados/:id/movimientos | Registrar movimiento |
| DELETE | /api/nomina/movimientos/:id | Eliminar movimiento (admin) |

### Dashboard / Categorías
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/dashboard | Resumen por período (dia/semana/mes) |
| GET | /api/categorias | Listar categorías |
| POST | /api/categorias | Crear categoría (admin) |

---

## Migraciones aplicadas

| Archivo | Contenido |
|---------|-----------|
| 001_usuarios.sql | Tabla usuarios + enum rol |
| 002_tasas_diarias.sql | Tasas BCV diarias |
| 003_ventas_diarias.sql | Ventas por método de pago |
| 004_categorias_gasto.sql | Categorías de gastos |
| 005_gastos.sql | Gastos y egresos |
| 006_venta_detalles.sql | Sub-operaciones por venta |
| 007_cierres_pos.sql | Cierres de lote POS |
| 008_cierres_fiscales.sql | Cierres Z fiscales |
| 009_caja_chica.sql | Ajustes manuales de tesorería |
| 010_alter_cierres_fiscales.sql | Desglose base/IVA/exento |
| 011_configuracion_tesoreria.sql | Mapeo canales → cuentas + comisiones |
| 012_clientes.sql | Clientes para CxC |
| 013_cuentas_por_cobrar.sql | CxC + enum estado |
| 014_abonos_cxc.sql | Abonos parciales a CxC |
| 015_proveedores.sql | Proveedores para CxP |
| 016_cuentas_por_pagar.sql | CxP + número de factura |
| 017_abonos_cxp.sql | Abonos parciales a CxP |
| 018_empleados.sql | Empleados para nómina |
| 019_movimientos_nomina.sql | Adelantos, ventas a crédito, abonos de nómina |
| 020_username_permisos.sql | Username único + permisos JSONB por módulo |
