import api from './api';

const nominaService = {
  // Empleados
  async listarEmpleados(soloActivos = false) {
    const { data } = await api.get('/nomina/empleados', { params: { activos: soloActivos } });
    return data;
  },
  async crearEmpleado(payload) {
    const { data } = await api.post('/nomina/empleados', payload);
    return data;
  },
  async actualizarEmpleado(id, payload) {
    const { data } = await api.put(`/nomina/empleados/${id}`, payload);
    return data;
  },

  // Nómina
  async listarConSaldo() {
    const { data } = await api.get('/nomina');
    return data;
  },
  async detalleEmpleado(id) {
    const { data } = await api.get(`/nomina/${id}`);
    return data;
  },
  async resumen() {
    const { data } = await api.get('/nomina/resumen');
    return data;
  },

  // Movimientos
  async crearMovimiento(empleadoId, payload) {
    const { data } = await api.post(`/nomina/${empleadoId}/movimientos`, payload);
    return data;
  },
  async eliminarMovimiento(empleadoId, movId) {
    const { data } = await api.delete(`/nomina/${empleadoId}/movimientos/${movId}`);
    return data;
  },
};

export default nominaService;
