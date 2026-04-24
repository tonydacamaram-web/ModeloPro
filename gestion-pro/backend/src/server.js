require('dotenv').config();
const express = require('express');
const cors = require('cors');
const manejarErrores = require('./middleware/errores');

// Rutas
const authRoutes       = require('./routes/auth.routes');
const tasasRoutes      = require('./routes/tasas.routes');
const ventasRoutes     = require('./routes/ventas.routes');
const gastosRoutes     = require('./routes/gastos.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const dashboardRoutes  = require('./routes/dashboard.routes');
const posRoutes        = require('./routes/pos.routes');
const fiscalRoutes     = require('./routes/fiscal.routes');
const cajaChicaRoutes  = require('./routes/cajaChica.routes');
const tesoreraRoutes   = require('./routes/tesoreria.routes');
const cxcRoutes        = require('./routes/cxc.routes');
const nominaRoutes     = require('./routes/nomina.routes');

const app = express();
const PUERTO = process.env.PORT || 3001;

// Middlewares globales
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Ruta de salud
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', mensaje: 'GestiónPro API funcionando', version: '1.0.0' });
});

// Rutas de la API
app.use('/api/auth',        authRoutes);
app.use('/api/tasas',       tasasRoutes);
app.use('/api/ventas',      ventasRoutes);
app.use('/api/gastos',      gastosRoutes);
app.use('/api/categorias',  categoriasRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/pos',         posRoutes);
app.use('/api/fiscal',      fiscalRoutes);
app.use('/api/caja-chica',  cajaChicaRoutes);
app.use('/api/tesoreria',   tesoreraRoutes);
app.use('/api/cxc',         cxcRoutes);
app.use('/api/nomina',      nominaRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador global de errores (debe ir al final)
app.use(manejarErrores);

app.listen(PUERTO, () => {
  console.log(`🚀 Servidor GestiónPro corriendo en http://localhost:${PUERTO}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
});
