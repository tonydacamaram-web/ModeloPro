import api from './api';

const authService = {
  // login acepta email o username en el campo "login"
  async login(login, password) {
    const { data } = await api.post('/auth/login', { login, password });
    return data;
  },

  async perfil() {
    const { data } = await api.get('/auth/perfil');
    return data;
  },

  // ── Gestión de usuarios (solo admin) ─────────────────────────────────────
  async listarUsuarios() {
    const { data } = await api.get('/auth/usuarios');
    return data;
  },

  async crearUsuario(datos) {
    const { data } = await api.post('/auth/usuarios', datos);
    return data;
  },

  async actualizarUsuario(id, datos) {
    const { data } = await api.put(`/auth/usuarios/${id}`, datos);
    return data;
  },

  async eliminarUsuario(id) {
    const { data } = await api.delete(`/auth/usuarios/${id}`);
    return data;
  },
};

export default authService;
