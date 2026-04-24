import { useTasa } from '../../context/TasaContext';
import { formatearVES } from '../../utils/formatMoneda';
import { aFormatoUI } from '../../utils/formatFecha';

const Header = ({ titulo }) => {
  const { tasaHoy, cargando } = useTasa();

  return (
    <header className="bg-gp-card border-b border-gp-border px-6 py-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-gp-text">{titulo}</h2>

      <div className="flex items-center gap-3">
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
