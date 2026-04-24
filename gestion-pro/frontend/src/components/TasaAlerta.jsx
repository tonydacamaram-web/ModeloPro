import { Link } from 'react-router-dom';
import { useTasa } from '../context/TasaContext';

const TasaAlerta = () => {
  const { tasaHoy, cargando } = useTasa();

  if (cargando || tasaHoy) return null;

  return (
    <div className="mb-4 bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-4
                    flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-yellow-400 text-lg">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-yellow-300">Tasa BCV no registrada para hoy</p>
          <p className="text-xs text-yellow-500/80">No podrás registrar ventas ni gastos hasta que la ingreses.</p>
        </div>
      </div>
      <Link
        to="/tasas"
        className="text-xs font-semibold text-gp-dorado-t hover:text-gp-dorado whitespace-nowrap ml-4 underline"
      >
        Registrar tasa →
      </Link>
    </div>
  );
};

export default TasaAlerta;
