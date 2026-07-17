import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion } from 'framer-motion';
import { ExclamationCircle, CheckCircle, ArrowRepeat } from 'react-bootstrap-icons';
import axios from 'axios';
import '../styles/completar-perfil.css';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export function CompletarPerfilPage() {
    const { user, token, updateUser } = useAuth();
    const navigate = useNavigate();

    const [areaClinicas, setAreaClinicas] = useState([]);
    const [areaClinicaSelecionada, setAreaClinicaSelecionada] = useState('');
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState(false);

    // Se não for terapeuta, redireciona
    useEffect(() => {

        // Se não tem token, volta ao login
        if (!token) {
            navigate('/login');
            return;
        }

        if (user?.role !== 'terapeuta') {
            navigate('/dashboard');
            return;
        }

        // Buscar áreas clínicas
        const fetchAreas = async () => {
            try {
                const response = await api.get('/areas-clinicas', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const areasArray = Array.isArray(response.data) ? response.data : [];
                setAreaClinicas(areasArray);
                setLoading(false);
            } catch (err) {
                setErro('Erro ao carregar as áreas clínicas: ' + (err.response?.data?.error || err.message));
                setLoading(false);
            }
        };

        fetchAreas();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!areaClinicaSelecionada) {
            setErro('Por favor, selecione uma área clínica');
            return;
        }

        setSalvando(true);
        setErro('');

        try {
            const response = await api.put('/terapeutas/area-clinica',
                {
                    area_clinica_id: parseInt(areaClinicaSelecionada),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );


            // Atualizar o contexto com a nova área clínica
            updateUser({ area_clinica_id: parseInt(areaClinicaSelecionada) });

            setSucesso(true);

            // Redirecionar após sucesso
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            setErro('Erro: ' + (err.response?.data?.error || err.message));
        } finally {
            setSalvando(false);
        }
    };

    if (loading) {
        return (
            <div className="completar-perfil-container loading">
                <div className="spinner">
                    <ArrowRepeat size={48} className="icon-spin" />
                </div>
                <p>Carregando áreas clínicas...</p>
            </div>
        );
    }

    return (
        <motion.div
            className="completar-perfil-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {loading ? (
                <div className="completar-perfil-loading">
                    <ArrowRepeat size={48} className="icon-spin" />
                    <p>Carregando áreas clínicas...</p>
                </div>
            ) : (
                <div className="completar-perfil-card">
                    <div className="card-header">
                        <h1>Completar Perfil</h1>
                        <p>Bem-vindo! Para começar, por favor preencha os dados obrigatórios.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="completar-perfil-form">
                        {/* Exibir dados do utilizador */}
                        <div className="user-info-section">
                            <div className="info-item">
                                <label>Nome</label>
                                <input
                                    type="text"
                                    value={user?.name || user?.email || ''}
                                    disabled
                                />
                            </div>
                            <div className="info-item">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                />
                            </div>
                            <div className="info-item">
                                <label>Tipo de Terapeuta</label>
                                <input
                                    type="text"
                                    value={user?.tipo === 'professor' ? 'Professor' : 'Aluno'}
                                    disabled
                                />
                            </div>
                        </div>

                        {/* Campo obrigatório: Área Clínica */}
                        <div className="form-section">
                            <label htmlFor="area-clinica" className="required">
                                Área Clínica
                            </label>
                            {areaClinicas.length === 0 ? (
                                <div className="alert alert-error">
                                    <ExclamationCircle size={20} />
                                    <span>Nenhuma área clínica disponível</span>
                                </div>
                            ) : (
                                <select
                                    id="area-clinica"
                                    value={areaClinicaSelecionada}
                                    onChange={(e) => setAreaClinicaSelecionada(e.target.value)}
                                    className="form-select"
                                    disabled={salvando}
                                >
                                    <option value="">-- Selecione a sua área clínica --</option>
                                    {areaClinicas.map((area) => (
                                        <option key={area.id} value={area.id}>
                                            {area.nome}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Mensagens de erro e sucesso */}
                        {erro && (
                            <motion.div
                                className="alert alert-error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <ExclamationCircle size={20} />
                                <span>{erro}</span>
                            </motion.div>
                        )}

                        {sucesso && (
                            <motion.div
                                className="alert alert-success"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <CheckCircle size={20} className="text-success" />
                                <span>Perfil atualizado com sucesso! Redirecionando...</span>
                            </motion.div>
                        )}

                        {/* Botão de submissão */}
                        {!erro && (
                            <motion.button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={salvando || !areaClinicaSelecionada || areaClinicas.length === 0}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {salvando ? (
                                    <>
                                        <ArrowRepeat size={18} className="icon-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar e Continuar'
                                )}
                            </motion.button>
                        )}

                        {/* Nota informativa */}
                        {user?.tipo === 'professor' && (
                            <div className="info-note">
                                <strong>Nota:</strong> Como professor, poderá alterar a sua área clínica depois se necessário.
                            </div>
                        )}

                        {user?.tipo === 'aluno' && (
                            <div className="info-note warning">
                                <strong>Nota:</strong> Como aluno, a área clínica pode ser definida apenas uma vez. Escolha com cuidado!
                            </div>
                        )}
                    </form>
                </div>
            )}
        </motion.div>
    );
}
