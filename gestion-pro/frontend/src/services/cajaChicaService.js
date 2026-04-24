import api from './api';

const cajaChicaService = {
  async listar(params = {}) {
    const { data } = await api.get('/caja-chica', { params });
    return data;
  },

  async saldo() {
    const { data } = await api.get('/caja-chica/saldo');
    return data;
  },

  async crear(movimiento) {
    const { data } = await api.post('/caja-chica', movimiento);
    return data;
  },

  async eliminar(id) {
    const { data } = await api.delete(`/caja-chica/${id}`);
    return data;
  },
};

export default cajaChicaService;
