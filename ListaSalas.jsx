import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSalas, getConsultas, exportSalas } from '../services/consultas.jsx';
import { DateInput } from '../components/DateInput.jsx';
import '../styles/dashboard.css';

const HORA_INICIO = 9;
const HORA_FIM = 19;
const HORAS = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i);

function toISODate(date) {
    return date.toISOString().slice(0, 10);
}

function inicioSemana() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return toISODate(d);
}

function inicioMes() {
    const d = new Date();
    d.setDate(1);
    return toISODate(d);
}

function fimMes() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    return toISODate(d);
}

function formatarData(date) {
    return date.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function mesmoDia(date, refDate) {
    return (
        date.getUTCFullYear() === refDate.getUTCFullYear() &&
        date.getUTCMonth() === refDate.getUTCMonth() &&
        date.getUTCDate() === refDate.getUTCDate()
    );
}

export function ListaSalas() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [salas, setSalas] = useState([]);
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [diaAtual, setDiaAtual] = useState(() => {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d;
    });
    const [exportFrom, setExportFrom] = useState(inicioSemana);
    const [exportTo, setExportTo] = useState(() => toISODate(new Date()));
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            setError('');
            const [salasList, consultasList] = await Promise.all([getSalas(), getConsultas()]);

            let salasFiltradas = salasList;
            if (user?.role === 'terapeuta') {
                const isFisio = user?.area_clinica_id === 3;
                salasFiltradas = salasList.filter(sala => {
                    const isSalaFisio = sala.descricao?.includes('fisioterapia') || sala.nome?.includes('Fisio');
                    return isFisio ? isSalaFisio : !isSalaFisio;
                });
            } else if (user?.role !== 'admin' && user?.role !== 'administrativo') {
                setError('Sem permissão para ver salas');
                setLoading(false);
                return;
            }

            setSalas(salasFiltradas);
            setConsultas(consultasList || []);
        } catch (err) {
            setError('Erro ao carregar salas');
        } finally {
            setLoading(false);
        }
    };

    const consultasDoDia = consultas.filter(c => {
        const inicio = new Date(c.data_inicio);
        return mesmoDia(inicio, diaAtual);
    });

    const getConsultaNaHora = (salaId, hora) => {
        return consultasDoDia.find(c => {
            const inicio = new Date(c.data_inicio);
            const fim = new Date(c.data_fim);
            const slotInicio = new Date(Date.UTC(
                diaAtual.getUTCFullYear(), diaAtual.getUTCMonth(), diaAtual.getUTCDate(), hora, 0, 0
            ));
            const slotFim = new Date(Date.UTC(
                diaAtual.getUTCFullYear(), diaAtual.getUTCMonth(), diaAtual.getUTCDate(), hora + 1, 0, 0
            ));
            return c.sala_id === salaId && inicio < slotFim && fim > slotInicio;
        });
    };

    const corEstado = (estado) => {
        switch (estado) {
            case 'agendada':   return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
            case 'realizada':  return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
            case 'cancelada':  return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
            case 'faltou':     return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
            default:           return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
        }
    };

    const diaAnterior = () => {
        const d = new Date(diaAtual);
        d.setUTCDate(d.getUTCDate() - 1);
        setDiaAtual(d);
    };

    const diaSeguinte = () => {
        const d = new Date(diaAtual);
        d.setUTCDate(d.getUTCDate() + 1);
        setDiaAtual(d);
    };

    const hoje = () => {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        setDiaAtual(d);
    };

    const handleExport = async () => {
        setExportError('');
        setExporting(true);
        try {
            await exportSalas(exportFrom, exportTo);
        } catch {
            setExportError('Erro ao exportar. Verifique as datas e tente novamente.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="page centered">A carregar salas...</div>;

    if (error) return (
        <div className="page centered">
            <div className="error-state">
                <p>{error}</p>
                <button onClick={() => navigate('/dashboard')} className="btn-primary">Voltar ao Dashboard</button>
            </div>
        </div>
    );

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Ocupação das Salas</h1>
                    <p>Vista diária das consultas por sala</p>
                </div>
                {['admin', 'administrativo', 'terapeuta'].includes(user?.role) && (
                    <div className="export-panel">
                        <div className="export-dates">
                            <label>
                                De
                                <DateInput value={exportFrom} onChange={e => setExportFrom(e.target.value)} max={exportTo} className="export-date-input" />
                            </label>
                            <label>
                                Até
                                <DateInput value={exportTo} onChange={e => setExportTo(e.target.value)} min={exportFrom} className="export-date-input" />
                            </label>
                        </div>
                        <div className="export-shortcuts">
                            <button className="btn-shortcut" onClick={() => { setExportFrom(inicioSemana()); setExportTo(toISODate(new Date())); }}>Esta semana</button>
                            <button className="btn-shortcut" onClick={() => { setExportFrom(inicioMes()); setExportTo(fimMes()); }}>Este mês</button>
                        </div>
                        <button className="btn-primary" onClick={handleExport} disabled={exporting}>
                            {exporting ? 'A exportar...' : 'Exportar Excel'}
                        </button>
                        {exportError && <p className="export-error">{exportError}</p>}
                    </div>
                )}
            </div>

            {/* Navegação de dia */}
            <div className="salas-nav">
                <button className="btn-nav" onClick={diaAnterior}>&#8592;</button>
                <div className="salas-nav-center">
                    <span className="salas-nav-data">{formatarData(diaAtual)}</span>
                    <button className="btn-hoje" onClick={hoje}>Hoje</button>
                </div>
                <button className="btn-nav" onClick={diaSeguinte}>&#8594;</button>
            </div>

            {/* Tabela */}
            <div className="salas-table-wrapper">
                <table className="salas-table">
                    <thead>
                        <tr>
                            <th className="salas-th-sala">Sala</th>
                            {HORAS.map(h => (
                                <th key={h} className="salas-th-hora">
                                    {String(h).padStart(2, '0')}:00
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {salas.length === 0 ? (
                            <tr>
                                <td colSpan={HORAS.length + 1} className="salas-empty">
                                    Nenhuma sala disponível
                                </td>
                            </tr>
                        ) : (
                            salas.map(sala => (
                                <tr key={sala.id}>
                                    <td className="salas-td-sala">{sala.nome}</td>
                                    {HORAS.map(hora => {
                                        const consulta = getConsultaNaHora(sala.id, hora);
                                        const cor = consulta ? corEstado(consulta.estado) : null;
                                        return (
                                            <td
                                                key={hora}
                                                className={`salas-td-slot ${consulta ? 'ocupado' : 'livre'}`}
                                                style={consulta ? {
                                                    backgroundColor: cor.bg,
                                                    borderColor: cor.border,
                                                    color: cor.text,
                                                    cursor: 'pointer',
                                                } : {}}
                                                onClick={() => consulta && navigate(`/consultas/${consulta.id}/editar`)}
                                                title={consulta ? `${consulta.utente_nome || 'Utente'} — ${consulta.terapeuta_nome || 'Terapeuta'}` : ''}
                                            >
                                                {consulta && (
                                                    <span className="salas-slot-label">
                                                        {consulta.utente_nome || 'Consulta'}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legenda */}
            <div className="salas-legenda">
                <span className="salas-legenda-item" style={{ background: '#dbeafe', borderColor: '#93c5fd', color: '#1e40af' }}>Agendada</span>
                <span className="salas-legenda-item" style={{ background: '#dcfce7', borderColor: '#86efac', color: '#166534' }}>Realizada</span>
                <span className="salas-legenda-item" style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>Cancelada</span>
                <span className="salas-legenda-item" style={{ background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' }}>Faltou</span>
            </div>
        </div>
    );
}
