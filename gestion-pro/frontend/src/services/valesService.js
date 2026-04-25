import api from './api';

const valesService = {
  async listar(params = {}) {
    const { data } = await api.get('/vales', { params });
    return data;
  },
  async listarPorEmpleado(empleadoId, estado) {
    const { data } = await api.get(`/vales/empleado/${empleadoId}`, {
      params: estado ? { estado } : {},
    });
    return data;
  },
  async resumenEmpleados() {
    const { data } = await api.get('/vales/resumen');
    return data;
  },
  async crear(vale) {
    const { data } = await api.post('/vales', vale);
    return data;
  },
  async marcarDescontado(id) {
    const { data } = await api.put(`/vales/${id}/descontar`);
    return data;
  },
  async eliminar(id) {
    const { data } = await api.delete(`/vales/${id}`);
    return data;
  },
};

export default valesService;
