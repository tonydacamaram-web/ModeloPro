import api from './api';

const dashboardService = {
  async resumen(periodo = 'dia') {
    const { data } = await api.get('/dashboard', { params: { periodo } });
    return data;
  },
};

export default dashboardService;
