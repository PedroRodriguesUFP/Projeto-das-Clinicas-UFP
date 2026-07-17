import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSalas, getConsultas } from '../services/consultas.jsx';
import { Hospital, CalendarDate, PersonFill, Tag } from 'react-bootstrap-icons';
import '../styles/dashboard.css';

export function VerConsultasSala() {
    const { salaId } = useParams();
    const navigate = useNavigate();
    const [sala, setSala] = useState(null);
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        carregarDados();
    }, [salaId]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            setError('');

            // Carregar salas para encontrar a detalhes
            const salas = await getSalas();
            const salaAtual = salas.find(s => s.id === parseInt(salaId));
            if (!salaAtual) {
                setError('Sala não encontrada');
                return;
            }
            setSala(salaAtual);

            // Carregar todas as consultas e filtrar pela sala
            const todasConsultas = await getConsultas();
            const consultasDaSala = todasConsultas.filter(c => c.sala_id === parseInt(salaId) || c.sala?.id === parseInt(salaId));
            
            // Ordenar por data
            consultasDaSala.sort((a, b) => {
                const dataA = new Date(a.data_inicio);
                const dataB = new Date(b.data_inicio);
                return dataA - dataB;
            });

            setConsultas(consultasDaSala);
        } catch (err) {
            setError('Erro ao carregar consultas da sala');
        } finally {
            setLoading(false);
        }
    };

    const toUTC = (s) => {
        if (!s) return new Date(NaN);
        const str = String(s).replace(' ', 'T');
        return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(str) ? str : str + 'Z');
    };

    const formatarData = (dataStr) => {
        const data = toUTC(dataStr);
        return data.toLocaleDateString('pt-PT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
        });
    };

    const obterCor = (estado) => {
        switch (estado) {
            case 'agendada':
                return '#3498db';
            case 'realizada':
                return '#2ecc71';
            case 'cancelada':
                return '#e74c3c';
            case 'faltou':
                return '#95a5a6';
            default:
                return '#34495e';
        }
    };

    const obterLabel = (estado) => {
        switch (estado) {
            case 'agendada':
                return 'Agendada';
            case 'realizada':
                return 'Realizada';
            case 'cancelada':
                return 'Cancelada';
            case 'faltou':
                return 'Faltou';
            default:
                return estado;
        }
    };

    if (loading) {
        return <div className="page centered">A carregar...</div>;
    }

    if (!sala) {
        return (
            <div className="page centered">
                <div className="error-state">
                    <p>{error || 'Sala não encontrada'}</p>
                    <button onClick={() => navigate('/salas')} className="btn-primary">
                        Voltar às Salas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="sala-consultas-page">
            <div className="page-header">
                <button 
                    className="btn-back"
                    onClick={() => navigate('/salas')}
                >
                    ← Voltar
                </button>
                <div>
                    <h1><Hospital size={20} /> {sala.nome}</h1>
                    <p>{sala.descricao}</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}

            <div className="sala-consultas-container">
                <h2><CalendarDate size={18} /> Consultas Agendadas ({consultas.length})</h2>

                {consultas.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhuma consulta agendada nesta sala</p>
                    </div>
                ) : (
                    <div className="consultas-lista">
                        {consultas.map(consulta => (
                            <div
                                key={consulta.id}
                                className="consulta-item"
                                onClick={() => navigate(`/consultas/${consulta.id}/editar`)}
                            >
                                <div className="consulta-status" style={{ backgroundColor: obterCor(consulta.estado) }}>
                                </div>
                                <div className="consulta-info">
                                    <div className="consulta-header">
                                        <h4>{consulta.utente?.nome || 'Paciente'}</h4>
                                        <span className="consulta-estado" style={{ backgroundColor: obterCor(consulta.estado) }}>
                                            {obterLabel(consulta.estado)}
                                        </span>
                                    </div>
                                    <div className="consulta-detalhes">
                                        <p><CalendarDate size={14} /> <strong>{formatarData(consulta.data_inicio)}</strong></p>
                                        <p><PersonFill size={14} /> {consulta.terapeuta?.user?.nome || 'Não atribuído'}</p>
                                        <p><Hospital size={14} /> {consulta.sala?.nome || 'Sala não atribuída'}</p>
                                        {consulta.area_clinica?.nome && (
                                            <p><Tag size={14} /> {consulta.area_clinica.nome}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="consulta-arrow">→</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
