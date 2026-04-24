import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TasaProvider } from '../../context/TasaContext';
import Sidebar from './Sidebar';
import Header from './Header';

const titulos = {
  '/dashboard':  'Dashboard',
  '/tasas':      'Tasa del Día',
  '/ventas':     'Registro de Ventas',
  '/gastos':     'Gastos y Egresos',
  '/pos':        'Control de POS',
  '/fiscal':     'Módulo Fiscal — SENIAT',
  '/caja-chica': 'Caja Chica',
  '/cxc':        'Cuentas por Cobrar',
  '/cxp':        'Cuentas por Pagar',
  '/nomina':     'Nómina Simplificada',
  '/usuarios':   'Gestión de Usuarios',
};

const AppLayout = () => {
  const { usuario } = useAuth();
  const { pathname } = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const titulo = titulos[pathname] || 'GestiónPro';

  return (
    <TasaProvider>
      <div className="flex h-screen bg-gp-base overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header titulo={titulo} />

          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TasaProvider>
  );
};

export default AppLayout;
