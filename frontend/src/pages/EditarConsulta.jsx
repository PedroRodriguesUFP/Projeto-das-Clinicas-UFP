import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DateInput } from '../components/DateInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { HourglassSplit, FileText as FileTextIcon, LockFill } from 'react-bootstrap-icons';
import {
  getConsultaById,
  updateConsulta,
  remarcarConsulta,
  getTerapeutas,
  getSalas,
  getAreasClinicas,
  uploadPdfConsulta,
} from '../services/consultas.jsx';
import { getUtenteDetails } from '../services/utentes.jsx';
import {
  getFichasAvaliacao,
  getFichasPsicologia,
  getFichasTerapiaFala,
  getFichasNutricao,
} from '../services/fichas.jsx';
import '../styles/consultas.css';

export function EditarConsulta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [consulta, setConsulta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [utenteInfo, setUtenteInfo] = useState(null);
  const [fichasConsulta, setFichasConsulta] = useState([]);
  const [fichaRoute, setFichaRoute] = useState('');
  const fileInputRef = useRef(null);

  const [terapeutas, setTerapeutas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);

  const dedupeSalasByNome = (listaSalas) => {
    const seen = new Set();
    return (listaSalas || []).filter((sala) => {
      const nome = (sala?.nome || '').trim().toLowerCase();
      if (!nome) return true;
      if (seen.has(nome)) return false;
      seen.add(nome);
      return true;
    });
  };

  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const getConsultaValue = (consulta, key) => consulta?.[key] ?? consulta?.[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())];

  const parseDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  const [form, setForm] = useState({
    terapeuta_id: '',
    sala_id: '',
    area_clinica_id: '',
    tipo_consulta: 'individual',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
  });

  // Carregar consulta e dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [consulta, t, s, a] = await Promise.all([
          getConsultaById(id),
          getTerapeutas(),
          getSalas(),
          getAreasClinicas(),
        ]);

        // Formatar datas
        const dataInicio = parseDateValue(getConsultaValue(consulta, 'data_inicio'));
        const dataFim = parseDateValue(getConsultaValue(consulta, 'data_fim'));

        if (!dataInicio || !dataFim) {
          throw new Error('Consulta sem datas válidas');
        }

        setConsulta(consulta);

        // Fetch utente contact info for display (staff only)
        const utenteId = getConsultaValue(consulta, 'utente_id');
        if (utenteId && ['admin', 'administrativo', 'terapeuta'].includes(user?.role)) {
          getUtenteDetails(utenteId)
            .then((u) => setUtenteInfo({ nome: u.nome, email: u.email, telefone: u.telefone, morada: u.morada }))
            .catch(() => {});
        }

        setForm({
          terapeuta_id: getConsultaValue(consulta, 'terapeuta_id') || '',
          sala_id: getConsultaValue(consulta, 'sala_id') || '',
          area_clinica_id: getConsultaValue(consulta, 'area_clinica_id') || '',
          tipo_consulta: getConsultaValue(consulta, 'tipo_consulta') || 'individual',
          data_inicio: dataInicio.toISOString().split('T')[0],
          hora_inicio: dataInicio.toTimeString().slice(0, 5),
          data_fim: dataFim.toISOString().split('T')[0],
          hora_fim: dataFim.toTimeString().slice(0, 5),
        });

        setTerapeutas(t || []);
        setSalas(dedupeSalasByNome(s || []));
        setAreasClinicas(a || []);

        // Carregar fichas desta consulta
        const areaNome = (a || []).find(x => x.id === Number(getConsultaValue(consulta, 'area_clinica_id')))?.nome
          || getConsultaValue(consulta, 'area_clinica_nome') || '';
        const normArea = areaNome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const uId = getConsultaValue(consulta, 'utente_id');
        const cId = Number(getConsultaValue(consulta, 'id'));
        const canLoad = ['admin', 'administrativo', 'terapeuta'].includes(user?.role);

        if (uId && canLoad) {
          let fetchFichas = null;
          let route = '';
          if (normArea.includes('fisio'))  { fetchFichas = getFichasAvaliacao;   route = 'fichas-avaliacao'; }
          if (normArea.includes('psicol')) { fetchFichas = getFichasPsicologia;  route = 'fichas-psicologia'; }
          if (normArea.includes('fala'))   { fetchFichas = getFichasTerapiaFala; route = 'fichas-terapia-fala'; }
          if (normArea.includes('nutri'))  { fetchFichas = getFichasNutricao;    route = 'fichas-nutricao'; }

          if (fetchFichas) {
            const todas = await fetchFichas(uId).catch(() => []);
            setFichasConsulta((todas || []).filter(f => Number(f.consulta_id) === cId));
            setFichaRoute(route);
          }
        }
      } catch (err) {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError('Erro ao carregar consulta');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Construir payload baseado nas permissões do utilizador
      const payload = {};

      // Apenas adicionar campos que o utilizador tem permissão para editar
      if (canEditTerapeuta && form.terapeuta_id) {
        payload.terapeuta_id = parseInt(form.terapeuta_id);
      }

      if (canEditSala && form.sala_id) {
        payload.sala_id = parseInt(form.sala_id);
      }

      if (canEditAreaClinica && form.area_clinica_id) {
        payload.area_clinica_id = parseInt(form.area_clinica_id);
      }

      if (form.tipo_consulta) {
        payload.tipo_consulta = form.tipo_consulta;
      }

      // Se é terapeuta, não permitir mudanças de data/hora
      if (!canEditDataHora) {
        // Terapeuta não pode alterar datas
        setSaving(false);
        // Se só está mudando data/hora, mostrar erro
        if (Object.keys(payload).length === 0) {
          setError('Terapeutas só podem alterar a sala. Nenhuma alteração foi feita.');
          return;
        }
      } else {
        // Admin pode alterar tudo, incluindo datas
        // Construir datas completas
        const dataInicio = new Date(`${form.data_inicio}T${form.hora_inicio}`);
        const dataFim = new Date(`${form.data_fim}T${form.hora_fim}`);

        if (dataFim <= dataInicio) {
          setError('A data de fim deve ser posterior à data de início');
          setSaving(false);
          return;
        }

        if (form.data_inicio || form.hora_inicio || form.data_fim || form.hora_fim) {
          payload.data_inicio = formatLocalDateTime(dataInicio);
          payload.data_fim = formatLocalDateTime(dataFim);
        }
      }

      if (Object.keys(payload).length === 0) {
        setError('Nenhuma alteração foi feita');
        setSaving(false);
        return;
      }

      // Se as datas foram alteradas e temos permissão, usar remarcarConsulta
      if (payload.data_inicio && payload.data_fim) {
        await remarcarConsulta(id, {
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim,
        });
        delete payload.data_inicio;
        delete payload.data_fim;
      }

      // Atualizar outros campos
      if (Object.keys(payload).length > 0) {
        await updateConsulta(id, payload);
      }

      navigate('/consultas');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao atualizar consulta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page">A carregar...</div>;
  }

  if (accessDenied) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 460, padding: '2.5rem 2rem' }}>
          <LockFill size={48} style={{ color: '#059669', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '0.75rem' }}>Acesso temporário expirado</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Só podes aceder a esta consulta durante o intervalo de{' '}
            <strong>2 horas antes</strong> e <strong>2 horas depois</strong> do horário marcado.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/consultas')}>
            ← Voltar às Consultas
          </button>
        </div>
      </div>
    );
  }

  const isAluno = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('aluno');
  const isProfessor = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('professor');
  const canManageForms = user?.role === 'admin' || isProfessor || isAluno;
  const selectedAreaClinica = areasClinicas.find((area) => area.id === Number(form.area_clinica_id));
  const areaClinicaNome = selectedAreaClinica?.nome || getConsultaValue(consulta, 'area_clinica_nome') || '';
  const isFisioterapiaConsulta = normalizeText(areaClinicaNome).includes('fisioterapia');
  const isPsicologiaConsulta = normalizeText(areaClinicaNome).includes('psicologia');
  const isTerapiaFalaConsulta = normalizeText(areaClinicaNome).includes('fala');
  const isNutricaoConsulta = normalizeText(areaClinicaNome).includes('nutri');
  const canAddFisioterapiaForm = canManageForms && isFisioterapiaConsulta;
  const canAddPsicologiaForm = canManageForms && isPsicologiaConsulta;
  const canAddTerapiaFalaForm = canManageForms && isTerapiaFalaConsulta;
  const canAddNutricaoForm = canManageForms && isNutricaoConsulta;

  // Verificar permissões para editar campos específicos
  const isTerapeuta = user?.role === 'terapeuta';
  const isAdmin = user?.role === 'admin';
  const canEditTerapeuta = isAdmin;
  const canEditAreaClinica = isAdmin;
  const canEditDataHora = isAdmin;
  const canEditSala = true; // Terapeuta pode alterar sala

  const handleAddForm = () => {
    if (!isFisioterapiaConsulta) {
      setError('O formulário de avaliação atual só está disponível para consultas de fisioterapia');
      return;
    }

    const utenteId = getConsultaValue(consulta, 'utente_id');

    if (!utenteId) {
      setError('Não foi possível identificar o utente desta consulta');
      return;
    }

    navigate(
      `/fichas-avaliacao/nova?utente_id=${utenteId}&consulta_id=${getConsultaValue(consulta, 'id')}`,
      {
        state: {
          utenteId,
          consultaId: getConsultaValue(consulta, 'id'),
        },
      }
    );
  };

  const handleAddPsicologiaForm = () => {
    if (!isPsicologiaConsulta) {
      setError('O formulário de psicologia só está disponível para consultas de psicologia');
      return;
    }

    const utenteId = getConsultaValue(consulta, 'utente_id');

    if (!utenteId) {
      setError('Não foi possível identificar o utente desta consulta');
      return;
    }

    navigate(
      `/fichas-psicologia/nova?utente_id=${utenteId}&consulta_id=${getConsultaValue(consulta, 'id')}`,
      {
        state: {
          utenteId,
          consultaId: getConsultaValue(consulta, 'id'),
        },
      }
    );
  };

  const handleAddTerapiaFalaForm = () => {
    if (!isTerapiaFalaConsulta) {
      setError('O formulário de terapia da fala só está disponível para consultas de terapia da fala');
      return;
    }

    const utenteId = getConsultaValue(consulta, 'utente_id');

    if (!utenteId) {
      setError('Não foi possível identificar o utente desta consulta');
      return;
    }

    navigate(
      `/fichas-terapia-fala/nova?utente_id=${utenteId}&consulta_id=${getConsultaValue(consulta, 'id')}`,
      {
        state: {
          utenteId,
          consultaId: getConsultaValue(consulta, 'id'),
        },
      }
    );
  };

  const handleAddNutricaoForm = () => {
    if (!isNutricaoConsulta) {
      setError('O formulário de nutrição só está disponível para consultas de nutrição');
      return;
    }

    const utenteId = getConsultaValue(consulta, 'utente_id');

    if (!utenteId) {
      setError('Não foi possível identificar o utente desta consulta');
      return;
    }

    navigate(
      `/fichas-nutricao/nova?utente_id=${utenteId}&consulta_id=${getConsultaValue(consulta, 'id')}`,
      {
        state: {
          utenteId,
          consultaId: getConsultaValue(consulta, 'id'),
        },
      }
    );
  };

  const handleUploadPdf = async (event) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validar tipo de ficheiro
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setError('Por favor, selecione um ficheiro PDF válido');
      return;
    }

    // Validar tamanho (máximo 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('O ficheiro é demasiado grande (máximo 50MB)');
      return;
    }

    try {
      setError('');
      setUploading(true);
      
      const consultaId = getConsultaValue(consulta, 'id');
      if (!consultaId) {
        setError('Não foi possível identificar a consulta');
        return;
      }

      await uploadPdfConsulta(consultaId, file);
      
      // Recarregar os dados da consulta
      const consultaAtualizada = await getConsultaById(consultaId);
      setConsulta(consultaAtualizada);
      
      setError('');
      toast.success('Ficheiro carregado com sucesso!');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao carregar ficheiro');
    } finally {
      setUploading(false);
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePdfButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="page editar-consulta">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/consultas')}>
            ← Voltar
          </button>
          <h1>Editar Consulta</h1>
          {getConsultaValue(consulta, 'utente_nome') && <p>Utente: {getConsultaValue(consulta, 'utente_nome')}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {getConsultaValue(consulta, 'utente_id') && (
            <button
              className="btn btn-info"
              onClick={() => navigate(`/utentes/${getConsultaValue(consulta, 'utente_id')}/perfil`)}
            >
              Ver Utente
            </button>
          )}
          {canAddFisioterapiaForm && (
            <button className="btn btn-primary" onClick={handleAddForm}>
              + Ficha Fisioterapia
            </button>
          )}
          {canAddPsicologiaForm && (
            <button className="btn btn-primary" onClick={handleAddPsicologiaForm}>
              + Ficha Psicologia
            </button>
          )}
          {canAddTerapiaFalaForm && (
            <button className="btn btn-primary" onClick={handleAddTerapiaFalaForm}>
              + Ficha Terapia da Fala
            </button>
          )}
          {canAddNutricaoForm && (
            <button className="btn btn-primary" onClick={handleAddNutricaoForm}>
              + Ficha Nutrição
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handlePdfButtonClick}
            disabled={uploading}
            title="Carregar ficheiro PDF para esta consulta"
          >
            {uploading ? <><HourglassSplit size={16} /> A carregar...</> : <><FileTextIcon size={16} /> + Carregar PDF</>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleUploadPdf}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {utenteInfo && (
        <div className="form-container" style={{ marginBottom: '12px' }}>
          <div className="utente-info-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="utente-info-row">
              <span className="utente-info-label">Nome</span>
              <span className="utente-info-value">{utenteInfo.nome || '—'}</span>
            </div>
            <div className="utente-info-row">
              <span className="utente-info-label">Email</span>
              <span className="utente-info-value">{utenteInfo.email || '—'}</span>
            </div>
            <div className="utente-info-row">
              <span className="utente-info-label">Telefone</span>
              <span className="utente-info-value">{utenteInfo.telefone || '—'}</span>
            </div>
            <div className="utente-info-row">
              <span className="utente-info-label">Morada</span>
              <span className="utente-info-value">{utenteInfo.morada || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {fichasConsulta.length > 0 && (
        <div className="form-container" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 600 }}>
            Fichas desta consulta ({fichasConsulta.length})
          </h3>
          {fichasConsulta.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, background: 'white' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Ficha de {new Date(f.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {f.motivo_descricao && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280', maxWidth: 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.motivo_descricao}
                  </p>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/${fichaRoute}/${f.id}`)}>
                Ver detalhes
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="form-container">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <h2>Informações da Consulta</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Terapeuta</label>
              <select
                name="terapeuta_id"
                value={form.terapeuta_id}
                onChange={handleChange}
                disabled={!canEditTerapeuta}
                title={!canEditTerapeuta ? 'Terapeutas não podem alterar o terapeuta da consulta' : ''}
              >
                <option value="">Selecionar terapeuta...</option>
                {terapeutas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sala</label>
              <select
                name="sala_id"
                value={form.sala_id}
                onChange={handleChange}
                disabled={!canEditSala}
              >
                <option value="">Selecionar sala...</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Área Clínica</label>
            <select
              name="area_clinica_id"
              value={form.area_clinica_id}
              onChange={handleChange}
              disabled={!canEditAreaClinica}
              title={!canEditAreaClinica ? 'Terapeutas não podem alterar a área clínica da consulta' : ''}
            >
              <option value="">Selecionar área...</option>
              {areasClinicas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tipo de Consulta</label>
            <select
              name="tipo_consulta"
              value={form.tipo_consulta || 'individual'}
              onChange={handleChange}
            >
              <option value="individual">Individual</option>
              <option value="grupo">Grupo</option>
            </select>
          </div>

          <h2>Data e Hora</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Data Início</label>
              <DateInput
                name="data_inicio"
                value={form.data_inicio}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de início' : ''}
              />
            </div>

            <div className="form-group">
              <label>Hora Início</label>
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de início' : ''}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data Fim</label>
              <DateInput
                name="data_fim"
                value={form.data_fim}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de fim' : ''}
              />
            </div>

            <div className="form-group">
              <label>Hora Fim</label>
              <input
                type="time"
                name="hora_fim"
                value={form.hora_fim}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de fim' : ''}
              />
            </div>
          </div>

          {consulta?.documentos && consulta.documentos.length > 0 && (
            <div className="form-group">
              <h3>Documentos Carregados</h3>
              <div className="documentos-list" style={{ marginBottom: '1rem' }}>
                {consulta.documentos.map((doc) => (
                  <div key={doc.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}>
                    <FileTextIcon size={20} />
                    <a
                      href={doc.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, color: '#0066cc', textDecoration: 'none' }}
                    >
                      {doc.nome_arquivo}
                    </a>
                    {doc.estado === 'pendente' && (
                      <span style={{ background: '#f59e0b', color: 'white', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ⏳ Pendente
                      </span>
                    )}
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
              onClick={() => navigate('/consultas')}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
