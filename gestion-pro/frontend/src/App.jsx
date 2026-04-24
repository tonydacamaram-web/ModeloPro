import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/Layout/AppLayout';
import LoginPage     from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TasasPage     from './pages/Tasas/TasasPage';
import VentasPage    from './pages/Ventas/VentasPage';
import GastosPage    from './pages/Gastos/GastosPage';
import POSPage       from './pages/POS/POSPage';
import FiscalPage    from './pages/Fiscal/FiscalPage';
import CajaChicaPage from './pages/CajaChica/CajaChicaPage';
import CxCPage       from './pages/CxC/CxCPage';
import NominaPage    from './pages/Nomina/NominaPage';
import UsuariosPage  from './pages/Usuarios/UsuariosPage';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas (dentro del layout) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/tasas"      element={<TasasPage />} />
          <Route path="/ventas"     element={<VentasPage />} />
          <Route path="/gastos"     element={<GastosPage />} />
          <Route path="/pos"        element={<POSPage />} />
          <Route path="/fiscal"     element={<FiscalPage />} />
          <Route path="/caja-chica" element={<CajaChicaPage />} />
          <Route path="/cxc"        element={<CxCPage />} />
          <Route path="/nomina"     element={<NominaPage />} />
          <Route path="/usuarios"   element={<UsuariosPage />} />
        </Route>

        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
