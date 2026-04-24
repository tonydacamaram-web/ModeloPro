import { useState, useCallback } from 'react';

/**
 * Hook para manejar llamadas a la API con estados de carga y error.
 */
const useFetch = (servicio) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const ejecutar = useCallback(async (...args) => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await servicio(...args);
      setDatos(resultado);
      return resultado;
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al realizar la operación';
      setError(mensaje);
      throw err;
    } finally {
      setCargando(false);
    }
  }, [servicio]);

  return { datos, cargando, error, ejecutar };
};

export default useFetch;
