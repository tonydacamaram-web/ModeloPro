import api from './api';

const cxpService = {
  // Proveedores
  async listarProveedores(soloActivos = true) {
    const { data } = await api.get('/cxp/proveedores', { params: { activos: soloActivos } });
    return data;
  },
  async crearProveedor(payload) {
    const { data } = await api.post('/cxp/proveedores', payload);
    return data;
  },
  async actualizarProveedor(id, payload) {
    const { data } = await api.put(`/cxp/proveedores/${id}`, payload);
    return data;
  },

  // CxP
  async listar(params = {}) {
    const { data } = await api.get('/cxp', { params });
    return data;
  },
  async obtener(id) {
    const { data } = await api.get(`/cxp/${id}`);
    return data;
  },
  async crear(payload) {
    const { data } = await api.post('/cxp', payload);
    return data;
  },
  async actualizar(id, payload) {
    const { data } = await api.put(`/cxp/${id}`, payload);
    return data;
  },
  async eliminar(id) {
    const { data } = await api.delete(`/cxp/${id}`);
    return data;
  },
  async resumen() {
    const { data } = await api.get('/cxp/resumen');
    return data;
  },

  // Abonos
  async listarAbonos(cuentaId) {
    const { data } = await api.get(`/cxp/${cuentaId}/abonos`);
    return data;
  },
  async crearAbono(cuentaId, payload) {
    const { data } = await api.post(`/cxp/${cuentaId}/abonos`, payload);
    return data;
  },
  async eliminarAbono(cuentaId, abonoId) {
    const { data } = await api.delete(`/cxp/${cuentaId}/abonos/${abonoId}`);
    return data;
  },
};

export default cxpService;
