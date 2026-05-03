import api from './api';

const posService = {
  async listar(params = {}) {
    const { data } = await api.get('/pos', { params });
    return data;
  },

  async obtener(id) {
    const { data } = await api.get(`/pos/${id}`);
    return data;
  },

  async ventasDia(fecha) {
    const { data } = await api.get(`/pos/ventas-dia/${fecha}`);
    return data;
  },

  async detallesVentas(fecha) {
    const { data } = await api.get(`/pos/detalles-ventas/${fecha}`);
    return data;
  },

  async crear(cierre) {
    const { data } = await api.post('/pos', cierre);
    return data;
  },

  async actualizar(id, cierre) {
    const { data } = await api.put(`/pos/${id}`, cierre);
    return data;
  },

  async eliminar(id) {
    const { data } = await api.delete(`/pos/${id}`);
    return data;
  },
};

export default posService;
