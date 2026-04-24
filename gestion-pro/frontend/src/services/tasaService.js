import api from './api';

const tasaService = {
  async obtenerHoy() {
    const { data } = await api.get('/tasas/hoy');
    return data;
  },

  async listar(params = {}) {
    const { data } = await api.get('/tasas', { params });
    return data;
  },

  async crear(tasaBcv, fecha) {
    const { data } = await api.post('/tasas', { tasaBcv, fecha });
    return data;
  },

  async actualizar(id, tasaBcv) {
    const { data } = await api.put(`/tasas/${id}`, { tasaBcv });
    return data;
  },

  async obtenerBCVAuto() {
    const { data } = await api.get('/tasas/bcv-auto');
    return data;
  },
};

export default tasaService;
