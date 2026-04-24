import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import tasaService from '../services/tasaService';
import { useAuth } from './AuthContext';

const TasaContext = createContext(null);

export const TasaProvider = ({ children }) => {
  const { usuario } = useAuth();
  const [tasaHoy, setTasaHoy] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargarTasaHoy = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const tasa = await tasaService.obtenerHoy();
      setTasaHoy(tasa);
    } catch {
      setTasaHoy(null);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargarTasaHoy();
  }, [cargarTasaHoy]);

  return (
    <TasaContext.Provider value={{ tasaHoy, cargando, cargarTasaHoy }}>
      {children}
    </TasaContext.Provider>
  );
};

export const useTasa = () => {
  const ctx = useContext(TasaContext);
  if (!ctx) throw new Error('useTasa debe usarse dentro de TasaProvider');
  return ctx;
};
