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

export async function getConsultas() {
  const { data } = await api.get('/consultas');
  return data;
}

export async function getConsultaById(id) {
  const { data } = await api.get(`/consultas/${id}`);
  return data;
}

export async function createConsulta(consulta) {
  const { data } = await api.post('/consultas', consulta);
  return data;
}

export async function updateConsulta(id, consulta) {
  const { data } = await api.patch(`/consultas/${id}`, consulta);
  return data;
}

export async function cancelConsulta(id) {
  const { data } = await api.put(`/consultas/${id}/cancelar`, {});
  return data;
}

export async function updateEstadoConsulta(id, estado) {
  const { data } = await api.patch(`/consultas/${id}/estado`, { estado });
  return data;
}

export async function remarcarConsulta(id, { data_inicio, data_fim }) {
  const { data } = await api.put(`/consultas/${id}/remarcar`, {
    data_inicio,
    data_fim,
  });
  return data;
}

export async function getSalas() {
  const { data } = await api.get('/salas');
  return data;
}

export async function getAreasClinicas() {
  const { data } = await api.get('/areas-clinicas');
  return data;
}

export async function getTerapeutas() {
  const { data } = await api.get('/terapeutas');
  return data;
}

export async function getHorariosDisponiveis(terapeutaId, data, duracao, options = {}) {
  const { areaClinicaId, salaId } = options;

  const { data: response } = await api.get(`/terapeutas/${terapeutaId}/horarios-disponiveis`, {
    params: {
      data,
      duracao,
      area_clinica_id: areaClinicaId,
      sala_id: salaId,
    },
  });
  return response;
}

export async function getTerapeutasByArea(areaId) {
  const { data } = await api.get(`/terapeutas/area/${areaId}`);
  return data;
}

export async function getUtentes() {
  const { data } = await api.get('/utentes');
  return data;
}

export async function checkDisponibilidade(dataInicio, dataFim) {
  const { data } = await api.get('/consultas/disponibilidade/check', {
    params: { data_inicio: dataInicio, data_fim: dataFim }
  });
  return data;
}

export async function uploadPdfConsulta(consultaId, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const { data } = await api.post(`/consultas/${consultaId}/upload-pdf`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function validarDocumento(id, acao) {
  const { data } = await api.patch(`/documentos/${id}/validar`, { acao });
  return data;
}

export async function getConsultasPendentes() {
  const { data } = await api.get('/consultas/pendentes');
  return data;
}

export async function validarConsulta(id, acao) {
  const { data } = await api.patch(`/consultas/${id}/validar`, { acao });
  return data;
}

export async function getAlunos() {
  const { data } = await api.get('/alunos');
  return data;
}

export async function getTerapeutasStaff() {
  const { data } = await api.get('/terapeutas/lista-staff');
  return data;
}

export async function exportSalas(from, to) {
  const response = await api.get('/exports/sala', {
    params: { from, to },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salas-${from}-${to}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
