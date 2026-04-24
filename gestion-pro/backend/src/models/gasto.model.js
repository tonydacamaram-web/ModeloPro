const db = require('../config/db');

const gastoModel = {
  // Listar gastos con filtros
  async listar({ fechaDesde, fechaHasta, tipo, categoriaId, limite = 30, pagina = 1 } = {}) {
    let condiciones = [];
    let params = [];
    let idx = 1;

    if (fechaDesde)    { condiciones.push(`g.fecha >= $${idx++}`);         params.push(fechaDesde); }
    if (fechaHasta)    { condiciones.push(`g.fecha <= $${idx++}`);         params.push(fechaHasta); }
    if (tipo)          { condiciones.push(`g.tipo = $${idx++}`);           params.push(tipo); }
    if (categoriaId)   { condiciones.push(`g.categoria_id = $${idx++}`);   params.push(categoriaId); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resultado = await db.query(
      `SELECT g.*, c.nombre AS categoria_nombre, t.tasa_bcv, u.nombre AS registrado_por_nombre
       FROM gastos g
       LEFT JOIN categorias_gasto c ON g.categoria_id = c.id
       LEFT JOIN tasas_diarias t ON g.tasa_id = t.id
       LEFT JOIN usuarios u ON g.registrado_por = u.id
       ${where}
       ORDER BY g.fecha DESC, g.creado_en DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM gastos g ${where}`, params
    );

    return { gastos: resultado.rows, total: parseInt(total.rows[0].count) };
  },

  // Obtener gasto por ID
  async buscarPorId(id) {
    const resultado = await db.query(
      `SELECT g.*, c.nombre AS categoria_nombre, t.tasa_bcv
       FROM gastos g
       LEFT JOIN categorias_gasto c ON g.categoria_id = c.id
       LEFT JOIN tasas_diarias t ON g.tasa_id = t.id
       WHERE g.id = $1`,
      [id]
    );
    return resultado.rows[0] || null;
  },

  // Crear nuevo gasto
  async crear({
    fecha, tipo, categoriaId, descripcion, monto, moneda, montoConvertido,
    tasaId, proveedorRif, proveedorNombre, numeroFactura, registradoPor,
  }) {
    const resultado = await db.query(
      `INSERT INTO gastos
         (fecha, tipo, categoria_id, descripcion, monto, moneda, monto_convertido,
          tasa_id, proveedor_rif, proveedor_nombre, numero_factura, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        fecha, tipo, categoriaId || null, descripcion, monto, moneda, montoConvertido,
        tasaId, proveedorRif || null, proveedorNombre || null, numeroFactura || null, registradoPor,
      ]
    );
    return resultado.rows[0];
  },

  // Actualizar gasto (solo admin)
  async actualizar(id, datos) {
    const { descripcion, monto, moneda, montoConvertido, categoriaId,
            proveedorRif, proveedorNombre, numeroFactura } = datos;
    const resultado = await db.query(
      `UPDATE gastos SET
         descripcion = $1, monto = $2, moneda = $3, monto_convertido = $4,
         categoria_id = $5, proveedor_rif = $6, proveedor_nombre = $7, numero_factura = $8
       WHERE id = $9
       RETURNING *`,
      [descripcion, monto, moneda, montoConvertido, categoriaId || null,
       proveedorRif || null, proveedorNombre || null, numeroFactura || null, id]
    );
    return resultado.rows[0] || null;
  },

  // Eliminar gasto (solo admin)
  async eliminar(id) {
    const resultado = await db.query('DELETE FROM gastos WHERE id = $1 RETURNING *', [id]);
    return resultado.rows[0] || null;
  },

  // Totales del día (para dashboard)
  async totalesPorFecha(fecha) {
    const resultado = await db.query(
      `SELECT
         SUM(CASE WHEN moneda = 'VES' THEN monto ELSE monto_convertido END) AS total_ves,
         SUM(CASE WHEN moneda = 'USD' THEN monto ELSE monto_convertido END) AS total_usd,
         COUNT(*) AS cantidad
       FROM gastos
       WHERE fecha = $1`,
      [fecha]
    );
    return resultado.rows[0];
  },
};

module.exports = gastoModel;
