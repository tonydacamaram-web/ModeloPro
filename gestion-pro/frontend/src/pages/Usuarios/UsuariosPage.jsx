import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import authService from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { aFormatoUI } from '../../utils/formatFecha';

// ── Módulos del sistema ───────────────────────────────────────────────────────
const MODULOS = [
  { key: 'dashboard',  label: 'Dashboard',         icono: '📊' },
  { key: 'tasas',      label: 'Tasa del Día',       icono: '💱' },
  { key: 'ventas',     label: 'Ventas',             icono: '💰' },
  { key: 'gastos',     label: 'Gastos',             icono: '📋' },
  { key: 'pos',        label: 'Control POS',        icono: '🏦' },
  { key: 'fiscal',     label: 'Fiscal SENIAT',      icono: '🧾' },
  { key: 'caja_chica', label: 'Caja Chica',         icono: '💼' },
  { key: 'cxc',        label: 'Ctas x Cobrar',      icono: '📥' },
  { key: 'cxp',        label: 'Ctas x Pagar',       icono: '📤' },
  { key: 'nomina',     label: 'Nómina',             icono: '👥' },
  { key: 'usuarios',   label: 'Gestión Usuarios',   icono: '⚙️' },
];

const PERMISOS_DEFAULT = Object.fromEntries(MODULOS.map(m => [m.key, true]));

// ── Componente Modal ──────────────────────────────────────────────────────────
const Modal = ({ titulo, onClose, children }) => (
  <div
    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="bg-gp-card border border-gp-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-gp-border">
        <h3 className="font-semibold text-gp-text">{titulo}</h3>
        <button onClick={onClose} className="text-gp-text3 hover:text-gp-text text-xl leading-none">✕</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ── Formulario de usuario ─────────────────────────────────────────────────────
const FormUsuario = ({ inicial, onGuardar, onCancelar, cargando }) => {
  const esNuevo = !inicial;
  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre:   inicial?.nombre   || '',
      email:    inicial?.email    || '',
      username: inicial?.username || '',
      rol:      inicial?.rol      || 'operador',
      activo:   inicial?.activo   ?? true,
      password: '',
      permisos: inicial?.permisos || { ...PERMISOS_DEFAULT },
    },
  });

  const rol = watch('rol');
  const permisos = watch('permisos');

  // Cuando cambia el rol, aplica permisos por defecto
  const cambiarRol = (nuevoRol) => {
    setValue('rol', nuevoRol);
    if (nuevoRol === 'admin') {
      setValue('permisos', Object.fromEntries(MODULOS.map(m => [m.key, true])));
    }
  };

  const togglePermiso = (key) => {
    setValue('permisos', { ...permisos, [key]: !permisos[key] });
  };

  return (
    <form onSubmit={handleSubmit(onGuardar)} className="space-y-4">
      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gp-text2 mb-1">Nombre completo</label>
          <input
            className={`input-inline w-full ${errors.nombre ? 'border-gp-error' : ''}`}
            placeholder="Ej. María García"
            {...register('nombre', { required: 'Requerido' })}
          />
          {errors.nombre && <p className="text-xs text-gp-error mt-0.5">{errors.nombre.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gp-text2 mb-1">Nombre de usuario</label>
          <input
            className={`input-inline w-full ${errors.username ? 'border-gp-error' : ''}`}
            placeholder="maria_garcia"
            {...register('username', {
              required: 'Requerido',
              pattern: {
                value: /^[a-zA-Z0-9_]{3,30}$/,
                message: '3-30 chars, solo letras, números y _',
              },
            })}
          />
          {errors.username && <p className="text-xs text-gp-error mt-0.5">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gp-text2 mb-1">Correo electrónico</label>
          <input
            type="email"
            className={`input-inline w-full ${errors.email ? 'border-gp-error' : ''}`}
            placeholder="maria@ejemplo.com"
            {...register('email', {
              required: 'Requerido',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
            })}
          />
          {errors.email && <p className="text-xs text-gp-error mt-0.5">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gp-text2 mb-1">
            {esNuevo ? 'Contraseña' : 'Nueva contraseña (vacío = sin cambiar)'}
          </label>
          <input
            type="password"
            className={`input-inline w-full ${errors.password ? 'border-gp-error' : ''}`}
            placeholder={esNuevo ? 'Mínimo 6 caracteres' : '••••••••'}
            {...register('password', {
              ...(esNuevo
                ? { required: 'Requerida', minLength: { value: 6, message: 'Mínimo 6 caracteres' } }
                : { minLength: { value: 6, message: 'Mínimo 6 caracteres' } }),
            })}
          />
          {errors.password && <p className="text-xs text-gp-error mt-0.5">{errors.password.message}</p>}
        </div>
      </div>

      {/* Rol y estado */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gp-text2 mb-1">Rol</label>
          <select
            className="select-inline w-full"
            value={rol}
            onChange={e => cambiarRol(e.target.value)}
          >
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {!esNuevo && (
          <div>
            <label className="block text-xs font-medium text-gp-text2 mb-1">Estado</label>
            <select className="select-inline w-full" {...register('activo')}>
              <option value={true}>Activo</option>
              <option value={false}>Inactivo</option>
            </select>
          </div>
        )}
      </div>

      {/* Permisos por módulo */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gp-text uppercase tracking-wide">
            Accesos al sistema
          </p>
          {rol === 'admin' && (
            <span className="text-xs text-gp-dorado-t">Admin: acceso total automático</span>
          )}
        </div>
        <div className={`rounded-xl border border-gp-border p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 ${rol === 'admin' ? 'opacity-50 pointer-events-none' : ''}`}>
          {MODULOS.map(m => (
            <label
              key={m.key}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div
                onClick={() => togglePermiso(m.key)}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  permisos[m.key] ? 'bg-gp-fucsia' : 'bg-gp-border2'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  permisos[m.key] ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-gp-text2 group-hover:text-gp-text">
                {m.icono} {m.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={cargando} className="btn-primario flex-1">
          {cargando ? 'Guardando...' : (esNuevo ? 'Crear usuario' : 'Guardar cambios')}
        </button>
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg border border-gp-border text-sm text-gp-text2 hover:bg-gp-hover">
          Cancelar
        </button>
      </div>
    </form>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const UsuariosPage = () => {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const [modal, setModal]         = useState(null); // null | 'nuevo' | {usuario}
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await authService.listarUsuarios();
      setUsuarios(data);
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardar = async (datos) => {
    setGuardando(true);
    setError('');
    try {
      const payload = {
        nombre:   datos.nombre,
        email:    datos.email,
        username: datos.username,
        rol:      datos.rol,
        permisos: datos.rol === 'admin'
          ? Object.fromEntries(MODULOS.map(m => [m.key, true]))
          : datos.permisos,
        ...(datos.password ? { password: datos.password } : {}),
        ...(modal !== 'nuevo' ? { activo: datos.activo === 'true' || datos.activo === true } : {}),
      };

      if (modal === 'nuevo') {
        await authService.crearUsuario(payload);
      } else {
        await authService.actualizarUsuario(modal.id, payload);
      }
      setModal(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await authService.eliminarUsuario(id);
      setConfirmEliminar(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const RolBadge = ({ rol }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      rol === 'admin'
        ? 'bg-gp-fucsia-dim text-gp-fucsia-t border border-gp-fucsia/30'
        : 'bg-gp-dorado-dim text-gp-dorado-t border border-gp-dorado/30'
    }`}>
      {rol === 'admin' ? '👑 Admin' : '👤 Operador'}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gp-text">Gestión de Usuarios</h2>
          <p className="text-xs text-gp-text3 mt-0.5">{usuarios.length} usuario(s) registrado(s)</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primario">
          + Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <p className="text-center py-10 text-gp-text3">Cargando usuarios...</p>
      ) : (
        <div className="tarjeta overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gp-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gp-text3 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gp-text3 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gp-text3 uppercase tracking-wide">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gp-text3 uppercase tracking-wide hidden md:table-cell">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gp-text3 uppercase tracking-wide hidden lg:table-cell">Accesos</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const esSelf = u.id === usuarioActual?.id;
                  const accesos = u.permisos
                    ? MODULOS.filter(m => u.permisos[m.key]).length
                    : 0;
                  return (
                    <tr key={u.id} className="border-b border-gp-border last:border-0 hover:bg-gp-hover">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                               style={{ background: 'linear-gradient(135deg, #e91e8c, #d4a017)' }}>
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gp-text">
                              {u.nombre}
                              {esSelf && <span className="ml-1 text-xs text-gp-text3">(tú)</span>}
                            </p>
                            <p className="text-xs text-gp-text3">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gp-text2 hidden sm:table-cell">{u.email}</td>
                      <td className="px-4 py-3"><RolBadge rol={u.rol} /></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs font-medium ${u.activo ? 'text-gp-ok' : 'text-gp-error'}`}>
                          {u.activo ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gp-text3">
                          {u.rol === 'admin' ? 'Todos' : `${accesos}/${MODULOS.length}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setModal(u)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-gp-border text-gp-text2 hover:bg-gp-hover"
                          >
                            Editar
                          </button>
                          {!esSelf && (
                            <button
                              onClick={() => setConfirmEliminar(u)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-red-700/40 text-gp-error hover:bg-red-900/20"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nuevo / editar */}
      {modal && (
        <Modal
          titulo={modal === 'nuevo' ? 'Nuevo usuario' : `Editar: ${modal.nombre}`}
          onClose={() => setModal(null)}
        >
          {error && (
            <div className="mb-3 bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <FormUsuario
            inicial={modal === 'nuevo' ? null : modal}
            onGuardar={handleGuardar}
            onCancelar={() => { setModal(null); setError(''); }}
            cargando={guardando}
          />
        </Modal>
      )}

      {/* Confirmación eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gp-card border border-gp-border rounded-2xl p-6 w-full max-w-sm text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="font-semibold text-gp-text mb-1">¿Eliminar usuario?</p>
            <p className="text-sm text-gp-text3 mb-5">
              Esta acción eliminará permanentemente a <strong>{confirmEliminar.nombre}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleEliminar(confirmEliminar.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium"
              >
                Eliminar
              </button>
              <button
                onClick={() => setConfirmEliminar(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gp-border text-sm text-gp-text2 hover:bg-gp-hover"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;
