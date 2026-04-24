/**
 * Formatea un número como bolívares: Bs. 1.234,56
 */
export const formatearVES = (monto) => {
  if (monto === null || monto === undefined) return '—';
  return `Bs. ${Number(monto).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formatea un número como dólares: $ 1,234.56
 */
export const formatearUSD = (monto) => {
  if (monto === null || monto === undefined) return '—';
  return `$ ${Number(monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formatea según la moneda indicada
 */
export const formatearMonto = (monto, moneda) => {
  if (moneda === 'VES') return formatearVES(monto);
  return formatearUSD(monto);
};
