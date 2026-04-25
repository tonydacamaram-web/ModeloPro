import { useState } from 'react';
import { useTasa } from '../../context/TasaContext';
import { formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI } from '../../utils/formatFecha';
import tasaService from '../../services/tasaService';

const Header = ({ titulo }) => {
  const { tasaHoy, cargando, cargarTasaHoy } = useTasa();
  const [obteniendo, setObteniendo] = useState(false);
  const [errorTasa, setErrorTasa] = useState(null);

  const handleObtenerTasa = async () => {
    setObteniendo(true);
    setErrorTasa(null);
    try {
      await tasaService.obtenerBCVAuto();
      await cargarTasaHoy();
    } catch (err) {
      setErrorTasa(err.response?.data?.error || 'Error al obtener tasa BCV');
    } finally {
      setObteniendo(false);
    }
  };

  const botonDeshabilitado = !!tasaHoy || obteniendo || cargando;

  return (
    <header className="bg-gp-card border-b border-gp-border px-6 py-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-gp-text">{titulo}</h2>

      <div className="flex items-center gap-3">
        {errorTasa && (
          <span className="text-xs text-red-400">{errorTasa}</span>
        )}

        <button
          onClick={handleObtenerTasa}
          disabled={botonDeshabilitado}
          title={tasaHoy ? 'Tasa ya cargada para hoy' : 'Obtener tasa BCV automáticamente'}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors
            ${botonDeshabilitado
              ? 'bg-gp-border text-gp-text3 cursor-not-allowed opacity-50'
              : 'bg-gp-dorado-t text-gp-bg hover:bg-yellow-400 cursor-pointer'
            }`}
        >
          {obteniendo ? '⟳ Obteniendo...' : '↻ Obtener Tasa BCV'}
        </button>

        {cargando ? (
          <span className="text-sm text-gp-text3">Cargando tasa...</span>
        ) : tasaHoy ? (
          <div className="text-sm text-right">
            <span className="text-gp-text3">Tasa BCV: </span>
            <span className="font-bold text-gp-dorado-t">
              {formatearVES(tasaHoy.tasa_bcv)} / $1
            </span>
            <span className="text-gp-text3 ml-1 text-xs">
              ({aFormatoUI(tasaHoy.fecha)})
            </span>
          </div>
        ) : (
          <div className="text-sm">
            <span className="inline-flex items-center gap-1 bg-yellow-900/30 text-yellow-300
                             border border-yellow-700/40 rounded-md px-3 py-1">
              ⚠️ Sin tasa del día
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
