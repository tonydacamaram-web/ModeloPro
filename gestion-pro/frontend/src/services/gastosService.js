import api from './api';

const gastosService = {
  async listar(params = {}) {
    const { data } = await api.get('/gastos', { params });
    return data;
  },

  async obtener(id) {
    const { data } = await api.get(`/gastos/${id}`);
    return data;
  },

  async crear(gasto) {
    const { data } = await api.post('/gastos', gasto);
    return data;
  },

  async actualizar(id, gasto) {
    const { data } = await api.put(`/gastos/${id}`, gasto);
    return data;
  },

  async eliminar(id) {
    const { data } = await api.delete(`/gastos/${id}`);
    return data;
  },

  async listarCategorias(params = {}) {
    const { data } = await api.get('/categorias', { params });
    return data;
  },

  async listarProveedores() {
    const { data } = await api.get('/gastos/proveedores');
    return data.proveedores;
  },
};

export default gastosService;
