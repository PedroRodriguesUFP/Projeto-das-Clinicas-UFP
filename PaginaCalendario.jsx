import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getConsultas, createConsulta } from '../services/consultas.jsx';
import { CalendarioVisualizacao } from '../components/CalendarioVisualizacao.jsx';
import { ModalAgendarConsultaV2 } from '../components/ModalAgendarConsultaV2.jsx';
import { useNavigate } from 'react-router-dom';
import { CalendarDate } from 'react-bootstrap-icons';
import '../styles/calendario.css';

export function PaginaCalendario() {
    const navigate = useNavigate();
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [dataSelecionada, setDataSelecionada] = useState(null);

    // Carregar consultas
    useEffect(() => {
        const fetchConsultas = async () => {
            try {
                setError('');
                const data = await getConsultas();
                setConsultas(data || []);
            } catch (err) {
                setError('Erro ao carregar consultas');
            } finally {
                setLoading(false);
            }
        };

        fetchConsultas();
    }, []);

    const handleDateClick = (dateStr) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (new Date(dateStr) < hoje) return;
        setDataSelecionada(dateStr);
        setModalOpen(true);
    };

    const handleModalSubmit = async (formData) => {
        try {
            // Converter string IDs para números
            const consultaData = {
                utente_id: parseInt(formData.utente_id),
                terapeuta_id: parseInt(formData.terapeuta_id),
                sala_id: parseInt(formData.sala_id),
                area_clinica_id: parseInt(formData.area_clinica_id),
                data_inicio: formData.data_inicio,
                data_fim: formData.data_fim,
            };


            await createConsulta(consultaData);
            setModalOpen(false);
            // Recarregar as consultas
            const data = await getConsultas();
            setConsultas(data || []);
        } catch (err) {
            toast.error('Erro ao agendar consulta: ' + (err?.response?.data?.error || err.message));
        }
    };

    const handleEventClick = (consultaId, consultaData) => {
        navigate(`/consultas/${consultaId}/editar`);
    };

    if (loading) {
        return <div className="page centered">A carregar calendário...</div>;
    }

    return (
        <div className="page calendario-page">
            <div className="page-header">
                <div>
                    <h1><CalendarDate size={22} /> Calendário de Consultas</h1>
                    <p>Clica numa consulta para ver detalhes</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}

            <div className="calendario-full">
                <CalendarioVisualizacao
                    consultas={consultas}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                    mode="month"
                />
            </div>

            <ModalAgendarConsultaV2
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setDataSelecionada(null);
                }}
                onSubmit={handleModalSubmit}
                dataSelecionada={dataSelecionada}
            />
        </div>
    );
}
