import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getNotasDaConsulta = async (consultaId) => {
  const response = await api.get(`/consultas/${consultaId}/notas`);
  return response.data;
};

export const saveNotasDaConsulta = async (consultaId, notasData) => {
  const response = await api.post(`/consultas/${consultaId}/notas`, notasData);
  return response.data;
};