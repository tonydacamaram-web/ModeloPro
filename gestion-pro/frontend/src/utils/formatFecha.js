/**
 * Convierte fecha de DB (YYYY-MM-DD) a formato UI (dd/mm/aaaa)
 */
export const aFormatoUI = (fechaDB) => {
  if (!fechaDB) return '—';
  const [anio, mes, dia] = fechaDB.split('T')[0].split('-');
  return `${dia}/${mes}/${anio}`;
};

/**
 * Convierte fecha de UI o Date a formato DB (YYYY-MM-DD)
 */
export const aFormatoDB = (fecha) => {
  if (!fecha) return '';
  if (fecha instanceof Date) {
    return fecha.toISOString().split('T')[0];
  }
  // Si viene como dd/mm/aaaa
  if (fecha.includes('/')) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }
  return fecha;
};

/**
 * Retorna la fecha de hoy en formato DB
 */
export const hoyDB = () => new Date().toISOString().split('T')[0];
