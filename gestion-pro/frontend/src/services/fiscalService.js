import api from './api';

const fiscalService = {
  async listar(params = {}) {
    const { data } = await api.get('/fiscal', { params });
    return data;
  },

  async obtener(id) {
    const { data } = await api.get(`/fiscal/${id}`);
    return data;
  },

  async resumenMensual(anio, mes) {
    const { data } = await api.get(`/fiscal/resumen/${anio}/${mes}`);
    return data;
  },

  async resumenAnual(anio) {
    const { data } = await api.get(`/fiscal/resumen-anual/${anio}`);
    return data;
  },

  async crear(cierre) {
    const { data } = await api.post('/fiscal', cierre);
    return data;
  },

  async actualizar(id, cierre) {
    const { data } = await api.put(`/fiscal/${id}`, cierre);
    return data;
  },

  async eliminar(id) {
    const { data } = await api.delete(`/fiscal/${id}`);
    return data;
  },
};

export default fiscalService;
