import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ITEMS_NAV = [
  { to: '/dashboard',  label: 'Dashboard',     icono: '📊', modulo: 'dashboard'  },
  { to: '/tasas',      label: 'Tasa del Día',  icono: '💱', modulo: 'tasas'      },
  { to: '/ventas',     label: 'Ventas',        icono: '💰', modulo: 'ventas'     },
  { to: '/gastos',     label: 'Gastos',        icono: '📋', modulo: 'gastos'     },
  { to: '/pos',        label: 'Control POS',   icono: '🏦', modulo: 'pos'        },
  { to: '/fiscal',     label: 'Fiscal SENIAT', icono: '🧾', modulo: 'fiscal'     },
  { to: '/caja-chica', label: 'Caja Chica',    icono: '💼', modulo: 'caja_chica' },
  { to: '/cxc',        label: 'Ctas x Cobrar', icono: '📥', modulo: 'cxc'        },
  { to: '/nomina',     label: 'Nómina',        icono: '👥', modulo: 'nomina'     },
  { to: '/usuarios',   label: 'Usuarios',      icono: '⚙️', modulo: 'usuarios'   },
];

const Sidebar = () => {
  const { usuario, cerrarSesion, tienePermiso } = useAuth();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gp-card border border-gp-border2 rounded-lg shadow-lg"
        onClick={() => setAbierto(!abierto)}
        aria-label="Abrir menú"
      >
        <span className="text-xl text-gp-text">{abierto ? '✕' : '☰'}</span>
      </button>

      {/* Overlay móvil */}
      {abierto && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gp-card border-r border-gp-border z-40
        flex flex-col transition-transform duration-300
        ${abierto ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gp-border">
          <div className="flex items-center gap-3">
            <img
              src="/logo-la-modelo.png"
              alt="La Modelo"
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div>
              <h1 className="text-base font-bold text-gp-text">GestiónPro</h1>
              <p className="text-xs text-gp-text3">La Modelo</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {ITEMS_NAV.filter(item => tienePermiso(item.modulo)).map(({ to, label, icono }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gp-fucsia-dim text-gp-fucsia-t border border-gp-fucsia/30'
                    : 'text-gp-text2 hover:bg-gp-hover hover:text-gp-text'
                }`
              }
            >
              <span className="text-base">{icono}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + Cerrar sesión */}
        <div className="p-4 border-t border-gp-border">
          <div className="mb-3 px-2">
            <p className="text-sm font-semibold text-gp-text">{usuario?.nombre}</p>
            <p className="text-xs text-gp-text3 capitalize">{usuario?.rol}</p>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full text-left text-sm text-gp-error hover:text-red-300 px-3 py-2 rounded-lg
                       hover:bg-red-900/20 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
