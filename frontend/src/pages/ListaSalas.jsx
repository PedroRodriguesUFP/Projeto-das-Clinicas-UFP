import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSalas, getConsultas, exportSalas, createSala, deleteSala, getAreasClinicas } from '../services/consultas.jsx';
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
    const isAdmin = user?.role === 'admin';
    
    const [salas, setSalas] = useState([]);
    const [consultas, setConsultas] = useState([]);
    const [areasClinicas, setAreasClinicas] = useState([]);
    
    // Estados para o formulário de Admin
    const [novaSalaNome, setNovaSalaNome] = useState('');
    const [novaSalaArea, setNovaSalaArea] = useState('');
    
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
            
            // Se for admin, carregamos as áreas clínicas para o formulário de criação
            const [salasList, consultasList, areasList] = await Promise.all([
                getSalas(), 
                getConsultas(),
                isAdmin ? getAreasClinicas() : Promise.resolve([])
            ]);

            let salasFiltradas = salasList;
            if (user?.role === 'terapeuta') {
                const isFisio = user?.area_clinica_id === 3;
                salasFiltradas = salasList.filter(sala => {
                    const isSalaFisio = sala.descricao?.includes('fisioterapia') || sala.nome?.includes('Fisio');
                    return isFisio ? isSalaFisio : !isSalaFisio;
                });
            } else if (!isAdmin && user?.role !== 'administrativo') {
                setError('Sem permissão para ver salas');
                setLoading(false);
                return;
            }

            setSalas(salasFiltradas);
            setConsultas(consultasList || []);
            setAreasClinicas(areasList || []);
        } catch (err) {
            setError('Erro ao carregar salas');
        } finally {
            setLoading(false);
        }
    };

    // --- FUNÇÕES DE ADMINISTRAÇÃO DE SALAS ---
    const handleCriarSala = async (e) => {
        e.preventDefault();
        if (!novaSalaNome || !novaSalaArea) return;
        
        try {
            await createSala({ 
                nome: novaSalaNome, 
                area_clinica_id: parseInt(novaSalaArea) 
            });
            setNovaSalaNome('');
            setNovaSalaArea('');
            carregarDados(); // Recarrega a tabela e o calendário com a sala nova
        } catch (err) {
            alert('Erro ao criar sala: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleEliminarSala = async (id) => {
        if (window.confirm("Tem a certeza que deseja eliminar esta sala permanentemente?")) {
            try {
                await deleteSala(id);
                carregarDados();
            } catch (err) {
                alert('Erro ao eliminar sala: ' + (err.response?.data?.error || err.message));
            }
        }
    };
    // -----------------------------------------

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

            {/* Tabela do Calendário */}
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
            <div className="salas-legenda" style={{ marginBottom: '3rem' }}>
                <span className="salas-legenda-item" style={{ background: '#dbeafe', borderColor: '#93c5fd', color: '#1e40af' }}>Agendada</span>
                <span className="salas-legenda-item" style={{ background: '#dcfce7', borderColor: '#86efac', color: '#166534' }}>Realizada</span>
                <span className="salas-legenda-item" style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>Cancelada</span>
                <span className="salas-legenda-item" style={{ background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' }}>Faltou</span>
            </div>

            {/* GESTÃO DE SALAS - APENAS ADMIN */}
            {isAdmin && (
                <div className="admin-gestao-salas" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '2rem', marginTop: '2rem' }}>
                    <h2>Gestão de Salas (Administrador)</h2>
                    
                    <form onSubmit={handleCriarSala} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            placeholder="Nome da Nova Sala (ex: Gabinete 1)" 
                            value={novaSalaNome}
                            onChange={(e) => setNovaSalaNome(e.target.value)}
                            required
                            className="form-input"
                            style={{ flex: 1, minWidth: '250px', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                        />
                        <select 
                            value={novaSalaArea} 
                            onChange={(e) => setNovaSalaArea(e.target.value)} 
                            required
                            className="form-input"
                            style={{ flex: 1, minWidth: '250px', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                        >
                            <option value="">Selecione a Área Clínica</option>
                            {areasClinicas.map(area => (
                                <option key={area.id} value={area.id}>{area.nome}</option>
                            ))}
                        </select>
                        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                            Adicionar Sala
                        </button>
                    </form>

                    <div className="salas-table-wrapper" style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Nome da Sala</th>
                                    <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#374151', width: '150px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salas.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>Não existem salas registadas.</td>
                                    </tr>
                                ) : (
                                    salas.map((sala) => (
                                        <tr key={sala.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '1rem', color: '#111827' }}>{sala.nome}</td>
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <button 
                                                    onClick={() => handleEliminarSala(sala.id)}
                                                    style={{ 
                                                        backgroundColor: '#ef4444', 
                                                        color: 'white', 
                                                        padding: '0.5rem 1rem', 
                                                        borderRadius: '0.375rem', 
                                                        border: 'none', 
                                                        cursor: 'pointer',
                                                        fontWeight: '500',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                                                    onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}