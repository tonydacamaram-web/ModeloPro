import { createContext, useContext, useState, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('gestionpro_usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState(null);

  // "login" puede ser email o username
  const iniciarSesion = useCallback(async (login, password) => {
    setCargando(true);
    setError(null);
    try {
      const { token, usuario: datos } = await authService.login(login, password);
      localStorage.setItem('gestionpro_token', token);
      localStorage.setItem('gestionpro_usuario', JSON.stringify(datos));
      setUsuario(datos);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
      return false;
    } finally {
      setCargando(false);
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem('gestionpro_token');
    localStorage.removeItem('gestionpro_usuario');
    setUsuario(null);
  }, []);

  const esAdmin = usuario?.rol === 'admin';

  // Devuelve true si el usuario tiene permiso para el módulo dado
  // Los admins siempre tienen acceso; los operadores verifican permisos{}
  const tienePermiso = useCallback((modulo) => {
    if (!usuario) return false;
    if (usuario.rol === 'admin') return true;
    return usuario.permisos?.[modulo] === true;
  }, [usuario]);

  return (
    <AuthContext.Provider value={{
      usuario, cargando, error,
      iniciarSesion, cerrarSesion,
      esAdmin, tienePermiso,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
