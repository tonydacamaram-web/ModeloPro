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

  async crearConfiguracion(datos) {
    const { data } = await api.post('/tesoreria/configuracion', datos);
    return data;
  },

  async eliminarConfiguracion(id) {
    const { data } = await api.delete(`/tesoreria/configuracion/${id}`);
    return data;
  },
};

export default tesoreriaService;
