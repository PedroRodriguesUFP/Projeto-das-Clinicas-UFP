import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDate, ClipboardData, Search, ArrowRepeat, Eye, Pencil, X, Check, ExclamationTriangle } from 'react-bootstrap-icons';
import { getConsultas, cancelConsulta, createConsulta, updateEstadoConsulta } from '../services/consultas.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CalendarioVisualizacao } from '../components/CalendarioVisualizacao.jsx';
import { ModalAgendarConsultaV2 } from '../components/ModalAgendarConsultaV2.jsx';
import '../styles/consultas.css';

export function ListaConsultas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [filteredConsultas, setFilteredConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todas');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('tabela'); // 'tabela' | 'calendario'
  const [modalOpen, setModalOpen] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [estadoModal, setEstadoModal] = useState(null);
  const [consultaSelecionada, setConsultaSelecionada] = useState(null);

  // Carregar consultas
  useEffect(() => {
    fetchConsultas();
  }, []);

  const fetchConsultas = async () => {
    try {
      setError('');
      const data = await getConsultas();
      setConsultas(data || []);
      setFilteredConsultas(data || []);
    } catch (err) {
      setError('Erro ao carregar consultas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar consultas
  useEffect(() => {
    let filtered = consultas;

    // Filtro por estado
    if (filterEstado !== 'todas') {
      filtered = filtered.filter((c) => c.estado === filterEstado);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.utente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.terapeuta?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.sala?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por data (próximas primeiro)
    filtered.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));

    setFilteredConsultas(filtered);
  }, [searchTerm, filterEstado, consultas]);

  const handleCancel = async (id) => {
    try {
      await cancelConsulta(id);
      setConsultas(consultas.map((c) => (c.id === id ? { ...c, estado: 'cancelada' } : c)));
      setCancelConfirm(null);
    } catch (err) {
      setError('Erro ao cancelar consulta');
    }
  };

  const handleMudarEstado = async (novoEstado) => {
    try {
      await updateEstadoConsulta(consultaSelecionada.id, novoEstado);
      setConsultas(consultas.map((c) => (c.id === consultaSelecionada.id ? { ...c, estado: novoEstado } : c)));
      setEstadoModal(null);
      setConsultaSelecionada(null);
      setError('');
    } catch (err) {
      setError(`Erro ao atualizar estado da consulta: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDateClick = (dateStr) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (new Date(dateStr) < hoje) return;
    setDataSelecionada(dateStr);
    setModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    try {
      await createConsulta({
        utente_id: parseInt(formData.utente_id),
        terapeuta_id: parseInt(formData.terapeuta_id),
        sala_id: parseInt(formData.sala_id),
        area_clinica_id: parseInt(formData.area_clinica_id),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
      });
      setModalOpen(false);
      setDataSelecionada(null);
      await fetchConsultas();
    } catch (err) {
      toast.error('Erro ao agendar consulta: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleEventClick = (consultaId) => {
    navigate(`/consultas/${consultaId}/editar`);
  };

  const toUTC = (s) => {
    if (!s) return new Date(NaN);
    const str = String(s).replace(' ', 'T');
    return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(str) ? str : str + 'Z');
  };

  const formatDateTime = (dateString) => {
    const date = toUTC(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const canManageConsultas = ['admin', 'administrativo', 'terapeuta'].includes(user?.role);
  const canCreateConsulta = ['admin', 'administrativo', 'terapeuta', 'utente'].includes(user?.role);

  // Verificar se o utilizador pode alterar o estado de uma consulta específica
  const canAlterEstado = (consulta) => {
    if (!user) return false;
    if (['admin', 'administrativo'].includes(user.role)) return true;
    if (user.role === 'terapeuta' && consulta.terapeuta?.id === user.id) return true;
    return false;
  };

  if (loading) {
    return <div className="page">A carregar consultas...</div>;
  }

  const counts = {
    todas: consultas.length,
    agendada: consultas.filter(c => c.estado === 'agendada').length,
    realizada: consultas.filter(c => c.estado === 'realizada').length,
    cancelada: consultas.filter(c => c.estado === 'cancelada').length,
  };

  return (
    <div className="page gestao-consultas">
      <div className="page-header">
        <div>
          <h1>Gestão de Consultas</h1>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'tabela' ? 'active' : ''}`}
              onClick={() => setViewMode('tabela')}
              title="Visualizar como tabela"
            >
              <ClipboardData size={14} /> Tabela
            </button>
            <button
              className={`view-btn ${viewMode === 'calendario' ? 'active' : ''}`}
              onClick={() => setViewMode('calendario')}
              title="Visualizar como calendário"
            >
              <CalendarDate size={14} /> Calendário
            </button>
          </div>
          {canCreateConsulta && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/consultas/nova')}
            >
              + Nova Consulta
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="consultas-stats-bar">
        <div className={`stat-card ${filterEstado === 'todas' ? 'active' : ''}`} onClick={() => setFilterEstado('todas')}>
          <span className="stat-num">{counts.todas}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className={`stat-card ${filterEstado === 'agendada' ? 'active' : ''}`} onClick={() => setFilterEstado('agendada')}>
          <span className="stat-num">{counts.agendada}</span>
          <span className="stat-label">Agendadas</span>
        </div>
        <div className={`stat-card ${filterEstado === 'realizada' ? 'active' : ''}`} onClick={() => setFilterEstado('realizada')}>
          <span className="stat-num">{counts.realizada}</span>
          <span className="stat-label">Realizadas</span>
        </div>
        <div className={`stat-card ${filterEstado === 'cancelada' ? 'active' : ''}`} onClick={() => setFilterEstado('cancelada')}>
          <span className="stat-num">{counts.cancelada}</span>
          <span className="stat-label">Canceladas</span>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Pesquisar por utente, terapeuta ou sala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon"><Search size={16} /></span>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterEstado === 'todas' ? 'active' : ''}`}
            onClick={() => setFilterEstado('todas')}
          >
            Todas
          </button>
          <button
            className={`filter-btn ${filterEstado === 'agendada' ? 'active' : ''}`}
            onClick={() => setFilterEstado('agendada')}
          >
            Agendadas
          </button>
          <button
            className={`filter-btn ${filterEstado === 'realizada' ? 'active' : ''}`}
            onClick={() => setFilterEstado('realizada')}
          >
            Realizadas
          </button>
          <button
            className={`filter-btn ${filterEstado === 'cancelada' ? 'active' : ''}`}
            onClick={() => setFilterEstado('cancelada')}
          >
            Canceladas
          </button>
        </div>
      </div>

      {filteredConsultas.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma consulta encontrada</p>
        </div>
      ) : (
        <>
          {/* Tabela — desktop */}
          <div className="table-container desktop-only">
            <table className="consultas-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Terapeuta</th>
                  <th className="col-area">Área Clínica</th>
                  <th className="col-sala">Sala</th>
                  <th>Data Início</th>
                  <th>Estado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsultas.map((consulta) => (
                  <tr key={consulta.id}>
                    <td>{consulta.utente?.nome || '-'}</td>
                    <td>{consulta.terapeuta?.nome || '-'}</td>
                    <td className="col-area">{consulta.area_clinica?.nome || '-'}</td>
                    <td className="col-sala">{consulta.sala?.nome || '-'}</td>
                    <td>{formatDateTime(consulta.data_inicio)}</td>
                    <td>
                      <span className={`status ${consulta.estado || 'agendada'}`}>
                        {(consulta.estado || 'agendada').charAt(0).toUpperCase() + (consulta.estado || 'agendada').slice(1)}
                      </span>
                      {consulta.estado_validacao === 'pendente' && (
                        <span style={{ display: 'block', marginTop: 4, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 8px', fontSize: 11, whiteSpace: 'nowrap' }}>
                          Pendente de aprovação
                        </span>
                      )}
                    </td>
                    <td className="actions">
                      <button className="btn-icon btn-view" onClick={() => navigate(`/consultas/${consulta.id}/detalhes`)} title="Ver">
                        <Eye size={16} />
                      </button>
                      {canManageConsultas && consulta.estado !== 'cancelada' && (
                        <>
                          {canAlterEstado(consulta) && (
                            <button className="btn-icon btn-edit" onClick={() => { setConsultaSelecionada(consulta); setEstadoModal(true); }} title="Alterar Estado">
                              <ArrowRepeat size={16} />
                            </button>
                          )}
                          <button className="btn-icon btn-edit" onClick={() => navigate(`/consultas/${consulta.id}/editar`)} title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-icon btn-delete" onClick={() => setCancelConfirm(consulta.id)} title="Cancelar">
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="consultas-mobile-cards mobile-only">
            {filteredConsultas.map((consulta) => (
              <div key={consulta.id} className="consulta-mobile-card">
                <div className="card-top">
                  <span className="card-nome">{consulta.utente?.nome || '-'}</span>
                  <span className={`status ${consulta.estado || 'agendada'}`}>
                    {(consulta.estado || 'agendada').charAt(0).toUpperCase() + (consulta.estado || 'agendada').slice(1)}
                  </span>
                </div>
                {consulta.estado_validacao === 'pendente' && (
                  <span style={{ display: 'inline-block', marginTop: 4, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                    Pendente de aprovação
                  </span>
                )}
                <div className="card-meta">
                  <span>{consulta.terapeuta?.nome || '-'} · {consulta.area_clinica?.nome || '-'}</span>
                  <span>{formatDateTime(consulta.data_inicio)}</span>
                </div>
                <div className="card-actions">
                  <button className="btn-icon btn-view" onClick={() => navigate(`/consultas/${consulta.id}/detalhes`)} title="Ver">
                    <Eye size={18} />
                  </button>
                  {canManageConsultas && consulta.estado !== 'cancelada' && (
                    <>
                      {canAlterEstado(consulta) && (
                        <button className="btn-icon btn-edit" onClick={() => { setConsultaSelecionada(consulta); setEstadoModal(true); }} title="Alterar Estado">
                          <ArrowRepeat size={18} />
                        </button>
                      )}
                      <button className="btn-icon btn-edit" onClick={() => navigate(`/consultas/${consulta.id}/editar`)} title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => setCancelConfirm(consulta.id)} title="Cancelar">
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de Confirmação de Cancelar */}
      {cancelConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar Cancelamento</h2>
            <p>Tem a certeza que deseja cancelar esta consulta?</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setCancelConfirm(null)}
              >
                Não, Voltar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleCancel(cancelConfirm)}
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Alterar Estado */}
      {estadoModal && consultaSelecionada && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Alterar Estado da Consulta</h2>
            <p>Selecione o novo estado para a consulta:</p>
            <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
              {consultaSelecionada.estado !== 'realizada' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleMudarEstado('realizada')}
                  style={{ width: '100%' }}
                >
                  <Check size={16} /> Marcar como Realizada
                </button>
              )}
              {consultaSelecionada.estado !== 'faltou_injustificada' && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleMudarEstado('faltou_injustificada')}
                  style={{ width: '100%' }}
                >
                  <X size={16} /> Falta Injustificada
                </button>
              )}
              {consultaSelecionada.estado !== 'faltou_justificada' && (
                <button
                  className="btn btn-info"
                  onClick={() => handleMudarEstado('faltou_justificada')}
                  style={{ width: '100%' }}
                >
                  <ExclamationTriangle size={16} /> Falta Justificada
                </button>
              )}
              {consultaSelecionada.estado !== 'cancelada' && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleMudarEstado('cancelada')}
                  style={{ width: '100%' }}
                >
                  <X size={16} /> Cancelar
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEstadoModal(null);
                  setConsultaSelecionada(null);
                }}
                style={{ width: '100%' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendário */}
      {viewMode === 'calendario' && (
        <div className="calendario-section">
          <CalendarioVisualizacao
            consultas={filteredConsultas}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            mode="month"
          />
        </div>
      )}

      {/* Modal para Agendar */}
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

