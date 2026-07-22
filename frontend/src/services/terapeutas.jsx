import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://api-clinicas-ufp.onrender.com',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export async function getAlunosDisponiveis(search = '') {
    const { data } = await api.get('/alunos-disponiveis', {
        params: { search }
    });
    return data;
}

export async function getAlunosDoProfessor() {
    const { data } = await api.get('/meus-alunos');
    return data;
}

export async function adicionarAluno(alunoId) {
    const { data } = await api.post('/adicionar-aluno', {
        aluno_id: alunoId
    });
    return data;
}

export async function removerAluno(alunoId) {
    const { data } = await api.delete(`/remover-aluno/${alunoId}`);
    return data;
}

export async function updateTerapeutaAreaAdmin(userId, areaClinicaId) {
    const { data } = await api.put(`/terapeutas/${userId}/area-clinica`, {
        area_clinica_id: Number(areaClinicaId),
    });
    return data;
}
