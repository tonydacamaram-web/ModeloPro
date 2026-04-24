const db = require('../config/db');

const categoriasController = {
  // GET /api/categorias
  async listar(req, res, next) {
    try {
      const { tipo, soloActivas } = req.query;
      let condiciones = [];
      let params = [];
      let idx = 1;

      if (tipo) { condiciones.push(`tipo = $${idx++}`); params.push(tipo); }
      if (soloActivas !== 'false') { condiciones.push(`activa = true`); }

      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const resultado = await db.query(
        `SELECT * FROM categorias_gasto ${where} ORDER BY tipo, nombre`,
        params
      );
      res.json(resultado.rows);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/categorias (solo admin)
  async crear(req, res, next) {
    try {
      const { nombre, tipo } = req.body;
      const resultado = await db.query(
        'INSERT INTO categorias_gasto (nombre, tipo) VALUES ($1, $2) RETURNING *',
        [nombre, tipo]
      );
      res.status(201).json(resultado.rows[0]);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/categorias/:id (solo admin)
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nombre, activa } = req.body;
      const resultado = await db.query(
        'UPDATE categorias_gasto SET nombre = COALESCE($1, nombre), activa = COALESCE($2, activa) WHERE id = $3 RETURNING *',
        [nombre || null, activa !== undefined ? activa : null, id]
      );
      if (!resultado.rows[0]) return res.status(404).json({ error: 'Categoría no encontrada' });
      res.json(resultado.rows[0]);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = categoriasController;
