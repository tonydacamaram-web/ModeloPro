import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inyectar token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gestionpro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirigir a login si el token expiró
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('gestionpro_token');
      localStorage.removeItem('gestionpro_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
