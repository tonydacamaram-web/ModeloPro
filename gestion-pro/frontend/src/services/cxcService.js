import api from './api';

const cxcService = {
  // Clientes
  async listarClientes(soloActivos = true) {
    const { data } = await api.get('/cxc/clientes', { params: { activos: soloActivos } });
    return data;
  },
  async crearCliente(payload) {
    const { data } = await api.post('/cxc/clientes', payload);
    return data;
  },
  async actualizarCliente(id, payload) {
    const { data } = await api.put(`/cxc/clientes/${id}`, payload);
    return data;
  },

  // CxC
  async listar(params = {}) {
    const { data } = await api.get('/cxc', { params });
    return data;
  },
  async obtener(id) {
    const { data } = await api.get(`/cxc/${id}`);
    return data;
  },
  async crear(payload) {
    const { data } = await api.post('/cxc', payload);
    return data;
  },
  async actualizar(id, payload) {
    const { data } = await api.put(`/cxc/${id}`, payload);
    return data;
  },
  async eliminar(id) {
    const { data } = await api.delete(`/cxc/${id}`);
    return data;
  },
  async resumen() {
    const { data } = await api.get('/cxc/resumen');
    return data;
  },

  // Abonos
  async listarAbonos(cuentaId) {
    const { data } = await api.get(`/cxc/${cuentaId}/abonos`);
    return data;
  },
  async crearAbono(cuentaId, payload) {
    const { data } = await api.post(`/cxc/${cuentaId}/abonos`, payload);
    return data;
  },
  async eliminarAbono(cuentaId, abonoId) {
    const { data } = await api.delete(`/cxc/${cuentaId}/abonos/${abonoId}`);
    return data;
  },
};

export default cxcService;
