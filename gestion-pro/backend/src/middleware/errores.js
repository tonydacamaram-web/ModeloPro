// Manejador global de errores
const manejarErrores = (err, req, res, next) => {
  console.error('Error del servidor:', err);

  // Error de constraint de base de datos (duplicado)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con estos datos' });
  }

  // Error de clave foránea
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida: el registro relacionado no existe' });
  }

  // Error genérico
  const estado = err.status || 500;
  const mensaje = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';

  res.status(estado).json({ error: mensaje });
};

module.exports = manejarErrores;
