import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api-clinicas-ufp.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

export async function getStaffUsers() {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function toggleUserActive(userId) {
  const { data } = await api.patch(`/admin/users/${userId}/toggle-active`);
  return data;
}

export async function createStaffUser(payload) {
  const { data } = await api.post('/admin/users', payload);
  return data;
}

export async function getDocumentos() {
  const { data } = await api.get('/documentos');
  return data;
}

export async function downloadDocumento(arquivoUrl) {
  const res = await api.get(arquivoUrl, { responseType: 'blob' });
  return res.data;
}

export async function getAssiduidade(params = {}) {
  const { data } = await api.get('/assiduidade', { params });
  return data;
}

export async function createAssiduidade(payload) {
  const { data } = await api.post('/assiduidade', payload);
  return data;
}
