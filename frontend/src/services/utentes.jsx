import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// Adiciona o token no header de cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getUtentes() {
  const { data } = await api.get('/utentes');
  return data;
}

export async function getUtenteDetails(utenteId) {
  const { data } = await api.get(`/utentes/${utenteId}`);
  return data;
}

export async function getUtenteConsultas(utenteId) {
  const { data } = await api.get(`/utentes/${utenteId}/consultas`);
  return data;
}

export async function getUtenteRegistos(utenteId) {
  const { data } = await api.get(`/utentes/${utenteId}/registos-clinicos`);
  return data;
}

export async function createUtente(utente) {
  const { data } = await api.post('/utentes', utente);
  return data;
}

export async function updateUtente(utenteId, utente) {
  const { data } = await api.patch(`/utentes/${utenteId}`, utente);
  return data;
}

export async function updateTerapeutaUtente(utenteId, terapeutaId, areaClinicaId) {
  const { data } = await api.patch(`/utentes/${utenteId}/terapeuta`, {
    terapeuta_id: Number(terapeutaId),
    area_clinica_id: areaClinicaId,
  });
  return data;
}

export async function deleteUtente(utenteId) {
  await api.delete(`/utentes/${utenteId}`);
}

export async function uploadAvatar(utenteId, file) {
  const formData = new FormData();
  formData.append('avatar', file);

  // NÃO especificar Content-Type - deixar que o axios determine automaticamente
  const { data } = await api.post(`/utentes/${utenteId}/avatar`, formData);

  return data;
}

export async function getUtentesDeTerapeuta(terapeutaId) {
  const { data } = await api.get(`/terapeutas/${terapeutaId}/utentes`);
  return data;
}
