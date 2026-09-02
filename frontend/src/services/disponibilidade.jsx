import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export const getMinhaDisponibilidade = (token, ano, mes) =>
  api.get('/terapeutas/minha-disponibilidade', {
    headers: { Authorization: `Bearer ${token}` },
    params: { ano, mes },
  }).then((r) => r.data);

export const setMinhaDisponibilidade = (data, blocos, token) =>
  api.put('/terapeutas/minha-disponibilidade', { data, blocos }, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.data);