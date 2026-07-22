import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api-clinicas-ufp.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getFichasAvaliacao(utenteId) {
  const { data } = await api.get('/fichas-avaliacao', {
    params: utenteId ? { utente_id: utenteId } : undefined,
  });
  return data;
}

export async function getFichaAvaliacaoById(id) {
  const { data } = await api.get(`/fichas-avaliacao/${id}`);
  return data;
}

export async function createFichaAvaliacao(ficha) {
  const { data } = await api.post('/fichas-avaliacao', ficha);
  return data;
}

export async function updateFichaAvaliacao(fichaId, ficha) {
  const { data } = await api.patch(`/fichas-avaliacao/${fichaId}`, ficha);
  return data;
}

export async function deleteFichaAvaliacao(fichaId) {
  const { data } = await api.delete(`/fichas-avaliacao/${fichaId}`);
  return data;
}

export async function getFichasPsicologia(utenteId) {
  const { data } = await api.get('/fichas-psicologia', {
    params: utenteId ? { utente_id: utenteId } : undefined,
  });
  return data;
}

export async function getFichaPsicologiaByID(fichaId) {
  const { data } = await api.get(`/fichas-psicologia/${fichaId}`);
  return data;
}

export async function createFichaPsicologia(ficha) {
  const { data } = await api.post('/fichas-psicologia', ficha);
  return data;
}

export async function updateFichaPsicologia(fichaId, ficha) {
  const { data } = await api.patch(`/fichas-psicologia/${fichaId}`, ficha);
  return data;
}

export async function deleteFichaPsicologia(fichaId) {
  const { data } = await api.delete(`/fichas-psicologia/${fichaId}`);
  return data;
}

export async function getFichasTerapiaFala(utenteId) {
  const { data } = await api.get('/fichas-terapia-fala', {
    params: utenteId ? { utente_id: utenteId } : undefined,
  });
  return data;
}

export async function getFichaTerapiaFalaById(id) {
  const { data } = await api.get(`/fichas-terapia-fala/${id}`);
  return data;
}

export async function createFichaTerapiaFala(ficha) {
  const { data } = await api.post('/fichas-terapia-fala', ficha);
  return data;
}

export async function updateFichaTerapiaFala(fichaId, ficha) {
  const { data } = await api.patch(`/fichas-terapia-fala/${fichaId}`, ficha);
  return data;
}

export async function deleteFichaTerapiaFala(fichaId) {
  const { data } = await api.delete(`/fichas-terapia-fala/${fichaId}`);
  return data;
}
export async function getFichasNutricao(utenteId) {
  const { data } = await api.get('/fichas-nutricao', {
    params: utenteId ? { utente_id: utenteId } : undefined,
  });
  return data;
}

export async function getFichaNutricaoById(id) {
  const { data } = await api.get(`/fichas-nutricao/${id}`);
  return data;
}

export async function createFichaNutricao(ficha) {
  const { data } = await api.post('/fichas-nutricao', ficha);
  return data;
}

export async function updateFichaNutricao(fichaId, ficha) {
  const { data } = await api.patch(`/fichas-nutricao/${fichaId}`, ficha);
  return data;
}

export async function deleteFichaNutricao(fichaId) {
  const { data } = await api.delete(`/fichas-nutricao/${fichaId}`);
  return data;
}

export async function validarFicha(tipo, id, acao) {
  const { data } = await api.patch(`/fichas-${tipo}/${id}/validar`, { acao });
  return data;
}

export async function getPendentes() {
  const { data } = await api.get("/pendentes");
  return data;
}
