import api from './api';

const ventasService = {
  async obtenerDia(fecha) {
    const { data } = await api.get(`/ventas/dia/${fecha}`);
    return data;
  },

  async listar(params = {}) {
    const { data } = await api.get('/ventas', { params });
    return data;
  },

  // ventas: [{ metodoPago, monto, moneda }]
  // detallesPorMetodo: { pago_movil: [{slot,referencia,monto}], pos_debito: [...], ... }
  async guardarDia(fecha, ventas, detallesPorMetodo = {}) {
    const { data } = await api.post('/ventas', { fecha, ventas, detallesPorMetodo });
    return data;
  },

  async eliminar(id) {
    const { data } = await api.delete(`/ventas/${id}`);
    return data;
  },
};

export default ventasService;
