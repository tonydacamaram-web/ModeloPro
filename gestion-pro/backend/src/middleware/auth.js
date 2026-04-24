const jwt = require('jsonwebtoken');

// Verifica que el token JWT sea válido
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: token no proporcionado' });
  }

  try {
    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = usuario;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Solo permite acceso a administradores
const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
};

// Verifica que el usuario tenga permiso para un módulo específico
// Los admins siempre tienen acceso. Los operadores requieren permisos[modulo] === true
const verificarPermiso = (modulo) => (req, res, next) => {
  if (req.usuario.rol === 'admin') return next();
  const permisos = req.usuario.permisos || {};
  if (permisos[modulo] === true) return next();
  return res.status(403).json({ error: `Acceso denegado al módulo: ${modulo}` });
};

module.exports = { verificarToken, soloAdmin, verificarPermiso };
