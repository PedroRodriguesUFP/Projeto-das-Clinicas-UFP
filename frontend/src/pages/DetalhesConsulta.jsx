import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { FileText as FileTextIcon, ArrowLeft, LockFill } from 'react-bootstrap-icons';
import axios from 'axios';
import {
  getConsultaById,
  getTerapeutas,
  getSalas,
  getAreasClinicas,
  downloadDocumento
} from '../services/consultas.jsx';

export function DetalhesConsulta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [consulta, setConsulta] = useState(null);

  // Sistema de Abas
  const [activeTab, setActiveTab] = useState('detalhes');

  // Estados para as Notas e Prescrição
  const [notas, setNotas] = useState('');
  const [prescricao, setPrescricao] = useState([
    { medicamento: '', dosagem: '', frequencia: '', duracao: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const { t } = useTranslation();

  const [terapeutas, setTerapeutas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);

  const getConsultaValue = (consulta, key) => consulta?.[key] ?? consulta?.[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())];

  // Carregar consulta e dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [consultaData, t, s, a] = await Promise.all([
          getConsultaById(id),
          getTerapeutas(),
          getSalas(),
          getAreasClinicas(),
        ]);

        setConsulta(consultaData);
        setTerapeutas(t || []);
        setSalas(s || []);
        setAreasClinicas(a || []);

        // Carregar notas e prescrição se existirem na resposta
        try {
          const token = localStorage.getItem('token');
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
          const resNotas = await axios.get(`${baseUrl}/consultas/${id}/notas`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resNotas.data) {
            setNotas(resNotas.data.notas || '');
            if (resNotas.data.prescricao && resNotas.data.prescricao.length > 0) {
              setPrescricao(resNotas.data.prescricao);
            }
          }
        } catch (err) {
          // Ignorar se der 404 (significa que a consulta ainda não tem notas registadas)
          console.log("A consulta ainda não tem notas.");
        }
      } catch (err) {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError('Erro ao carregar detalhes da consulta');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getTerapeutaNome = () => {
    const terapeutaId = getConsultaValue(consulta, 'terapeuta_id');
    const terapeuta = terapeutas.find((t) => t.id === terapeutaId);
    return terapeuta?.nome || getConsultaValue(consulta, 'terapeuta_nome') || '-';
  };

  const getSalaNome = () => {
    const salaId = getConsultaValue(consulta, 'sala_id');
    const sala = salas.find((s) => s.id === salaId);
    return sala?.nome || getConsultaValue(consulta, 'sala_nome') || 'Não atribuída';
  };

  const getAreaClinicaNome = () => {
    const areaId = getConsultaValue(consulta, 'area_clinica_id');
    const area = areasClinicas.find((a) => a.id === areaId);
    return area?.nome || getConsultaValue(consulta, 'area_clinica_nome') || '-';
  };

  const toUTC = (s) => {
    if (!s) return new Date(NaN);
    const str = String(s).replace(' ', 'T');
    return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(str) ? str : str + 'Z');
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const data = toUTC(dataStr);
    return data.toLocaleDateString('pt-PT', { timeZone: 'UTC' });
  };

  const formatarHora = (dataStr) => {
    if (!dataStr) return '-';
    const data = toUTC(dataStr);
    return data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  const handleAbrirDocumento = async (arquivoUrl) => {
    try {
      const blob = await downloadDocumento(arquivoUrl);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      console.error("Erro ao abrir documento:", err);
    }
  };

  // Funções para a Prescrição Dinâmica
  const handlePrescricaoChange = (index, field, value) => {
    const novaPrescricao = [...prescricao];
    novaPrescricao[index][field] = value;
    setPrescricao(novaPrescricao);
  };

  const addPrescricaoRow = () => {
    setPrescricao([...prescricao, { medicamento: '', dosagem: '', frequencia: '', duracao: '' }]);
  };

  const removePrescricaoRow = (index) => {
    const novaPrescricao = prescricao.filter((_, i) => i !== index);
    setPrescricao(novaPrescricao);
  };

  const guardarNotas = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const prescricaoLimpa = prescricao.filter(p => p && p.medicamento && p.medicamento.trim() !== '');

      await axios.put(`${baseUrl}/consultas/${id}/notas`, {
        notas: notas || '',
        prescricao: prescricaoLimpa
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Notas e Prescrição guardadas com sucesso!');
    } catch (error) {
      console.error('Erro ao guardar notas:', error);
      alert('Erro ao guardar. Verifica a consola.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="page">{t('common.loading') || 'A carregar...'}</div>;
  }

  if (accessDenied) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 460, padding: '2.5rem 2rem' }}>
          <LockFill size={48} style={{ color: '#059669', display: 'block', margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '0.75rem' }}>{t('consultationDetails.accessExpiredTitle') || 'Acesso temporário expirado'}</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            {t('consultationDetails.accessExpiredIntro') || 'Só podes aceder a esta consulta durante o intervalo de '}
            <strong>{t('consultationDetails.twoHoursBefore') || '2 horas antes'}</strong> {t('consultationDetails.and') || 'e'} <strong>{t('consultationDetails.twoHoursAfter') || '2 horas depois'}</strong> {t('consultationDetails.ofScheduledTime') || 'do horário marcado.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/consultas')}>
            {t('common.backToConsultations') || '← Voltar às Consultas'}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page editar-consulta">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> {t('common.back') || 'Voltar'}
          </button>
          <h1>{t('consultationDetails.title') || 'Detalhes da Consulta'}</h1>
        </div>

        <div className="form-container">
          <div className="alert alert-error">
            {error}
            <button onClick={() => navigate(-1)}>×</button>
          </div>
        </div>
      </div>
    );
  }

  const isTerapeuta = user?.role === 'terapeuta' || user?.role === 'medico' || user?.role === 'staff' || user?.role === 'admin';

  return (
    <div className="page editar-consulta">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1>Detalhes da Consulta</h1>
          {getConsultaValue(consulta, 'utente_nome') && (
            <p>Utente: {getConsultaValue(consulta, 'utente_nome')}</p>
          )}
        </div>
      </div>

      {/* SISTEMA DE ABAS ORIGINAL INTEGRADO */}
      <div className="form-container">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('detalhes')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              fontWeight: activeTab === 'detalhes' ? 'bold' : 'normal',
              color: activeTab === 'detalhes' ? '#059669' : '#6b7280',
              cursor: 'pointer',
              paddingBottom: '0.5rem',
              borderBottom: activeTab === 'detalhes' ? '2px solid #059669' : 'none'
            }}
          >
            Detalhes da Consulta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notas')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              fontWeight: activeTab === 'notas' ? 'bold' : 'normal',
              color: activeTab === 'notas' ? '#059669' : '#6b7280',
              cursor: 'pointer',
              paddingBottom: '0.5rem',
              borderBottom: activeTab === 'notas' ? '2px solid #059669' : 'none'
            }}
          >
            Notas e Prescrição
          </button>
        </div>

        {/* ABA 1: DETALHES (O design original mantido a 100%) */}
        {activeTab === 'detalhes' && (
          <div className="card">
            <h2>{t('consultationDetails.information') || 'Informações da Consulta'}</h2>

            <div className="form-row">
              <div className="form-group">
                <label>{t('consultationDetails.therapist') || 'Terapeuta'}</label>
                <div className="detail-value">{getTerapeutaNome()}</div>
              </div>

              <div className="form-group">
                <label>{t('consultationDetails.room') || 'Sala'}</label>
                <div className="detail-value">{getSalaNome()}</div>
              </div>
            </div>

            <div className="form-group">
              <label>{t('consultationDetails.clinicArea') || 'Área Clínica'}</label>
              <div className="detail-value">{getAreaClinicaNome()}</div>
            </div>

            <div className="form-group">
              <label>{t('consultationDetails.type') || 'Tipo de Consulta'}</label>
              <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {getConsultaValue(consulta, 'tipo_consulta') === 'grupo' ? (
                  <>
                    {t('consultationDetails.group') || 'Grupo'}
                    <span style={{ background: '#6ba8d4', color: 'white', borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                      {t('consultationDetails.group') || 'Grupo'}
                    </span>
                  </>
                ) : (t('consultationDetails.individual') || 'Individual')}
              </div>
            </div>

            <h2 style={{ marginTop: '2rem' }}>{t('consultationDetails.dateTime') || 'Data e Hora'}</h2>

            <div className="form-row">
              <div className="form-group">
                <label>{t('consultationDetails.startDate') || 'Data Início'}</label>
                <div className="detail-value">
                  {formatarData(getConsultaValue(consulta, 'data_inicio'))}
                </div>
              </div>

              <div className="form-group">
                <label>{t('consultationDetails.startTime') || 'Hora Início'}</label>
                <div className="detail-value">
                  {formatarHora(getConsultaValue(consulta, 'data_inicio'))}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('consultationDetails.endDate') || 'Data Fim'}</label>
                <div className="detail-value">
                  {formatarData(getConsultaValue(consulta, 'data_fim'))}
                </div>
              </div>

              <div className="form-group">
                <label>{t('consultationDetails.endTime') || 'Hora Fim'}</label>
                <div className="detail-value">
                  {formatarHora(getConsultaValue(consulta, 'data_fim'))}
                </div>
              </div>
            </div>

            {consulta?.documentos && consulta.documentos.length > 0 && (
              <div className="form-group" style={{ marginTop: '2rem' }}>
                <h3>{t('consultationDetails.uploadedDocuments') || 'Documentos Carregados'}</h3>
                <div className="documentos-list" style={{ marginBottom: '1rem' }}>
                  {consulta.documentos.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <FileTextIcon size={20} />
                      <button
                        type="button"
                        onClick={() => handleAbrirDocumento(doc.arquivo_url)}
                        style={{ 
                          flex: 1, color: '#0066cc', background: 'none', border: 'none', 
                          textAlign: 'left', cursor: 'pointer', display: 'flex', 
                          alignItems: 'center', gap: '8px', padding: 0, fontSize: '1rem', textDecoration: 'underline'
                        }}
                      >
                        {doc.tipo_documento && (
                          <span style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'none' }}>
                            {doc.tipo_documento}
                          </span>
                        )}
                        {doc.nome_arquivo}
                      </button>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {new Date(doc.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* ABA 2: NOTAS E PRESCRIÇÃO (Estrutura funcional adaptada ao design da app) */}
        {activeTab === 'notas' && (
          <div className="card">
            <h2>Notas Clínicas</h2>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              {isTerapeuta ? (
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Escreva as observações gerais da consulta aqui..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
              ) : (
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '4px', border: '1px solid #e5e7eb', minHeight: '80px' }}>
                  {notas ? notas : <span style={{ color: '#9ca3af' }}>Sem notas registadas.</span>}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Prescrição Estruturada</h2>
              {isTerapeuta && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addPrescricaoRow}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  + Adicionar Linha
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Medicamento / Terapia</th>
                    <th style={{ padding: '0.75rem' }}>Dosagem</th>
                    <th style={{ padding: '0.75rem' }}>Frequência</th>
                    <th style={{ padding: '0.75rem' }}>Duração</th>
                    {isTerapeuta && <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ação</th>}
                  </tr>
                </thead>
                <tbody>
                  {!prescricao || prescricao.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                        Nenhuma prescrição registada.
                      </td>
                    </tr>
                  ) : (
                    prescricao.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {isTerapeuta ? (
                            <input
                              type="text"
                              value={item?.medicamento || ''}
                              onChange={(e) => handlePrescricaoChange(index, 'medicamento', e.target.value)}
                              placeholder="Ex: Paracetamol"
                              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                          ) : (
                            item?.medicamento || 'N/A'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {isTerapeuta ? (
                            <input
                              type="text"
                              value={item?.dosagem || ''}
                              onChange={(e) => handlePrescricaoChange(index, 'dosagem', e.target.value)}
                              placeholder="Ex: 500mg"
                              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                          ) : (
                            item?.dosagem || 'N/A'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {isTerapeuta ? (
                            <input
                              type="text"
                              value={item?.frequencia || ''}
                              onChange={(e) => handlePrescricaoChange(index, 'frequencia', e.target.value)}
                              placeholder="Ex: 8/8h"
                              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                          ) : (
                            item?.frequencia || 'N/A'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {isTerapeuta ? (
                            <input
                              type="text"
                              value={item?.duracao || ''}
                              onChange={(e) => handlePrescricaoChange(index, 'duracao', e.target.value)}
                              placeholder="Ex: 5 dias"
                              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                          ) : (
                            item?.duracao || 'N/A'
                          )}
                        </td>
                        {isTerapeuta && (
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removePrescricaoRow(index)}
                              style={{ color: '#dc2626', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isTerapeuta && (
              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={guardarNotas}
                  disabled={isSaving}
                >
                  {isSaving ? 'A guardar...' : 'Guardar Notas e Prescrição'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}