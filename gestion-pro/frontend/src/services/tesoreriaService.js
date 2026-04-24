import api from './api';

const tesoreriaService = {
  async saldo(params = {}) {
    const { data } = await api.get('/tesoreria/saldo', { params });
    return data;
  },

  async obtenerConfiguracion() {
    const { data } = await api.get('/tesoreria/configuracion');
    return data;
  },

  async actualizarConfiguracion(id, cambios) {
    const { data } = await api.put(`/tesoreria/configuracion/${id}`, cambios);
    return data;
  },
};

export default tesoreriaService;
