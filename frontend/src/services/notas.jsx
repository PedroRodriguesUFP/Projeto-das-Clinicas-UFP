import axios from 'axios';

export const getNotasDaConsulta = async (consultaId) => {
  const response = await api.get(`/consultas/${consultaId}/notas`);
  return response.data;
};

export const saveNotasDaConsulta = async (consultaId, notasData) => {
  const response = await api.post(`/consultas/${consultaId}/notas`, notasData);
  return response.data;
};