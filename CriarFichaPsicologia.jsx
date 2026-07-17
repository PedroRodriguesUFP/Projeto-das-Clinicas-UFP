import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DateInput } from '../components/DateInput.jsx';
import { Trash } from 'react-bootstrap-icons';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
import { getUtenteDetails } from '../services/utentes.jsx';
import { createFichaPsicologia, getFichasPsicologia, deleteFichaPsicologia } from '../services/fichas.jsx';
import { getConsultaById } from '../services/consultas.jsx';

const emptyForm = {
  // Auto-filled fields
  nome_completo: '',
  numero_processo: '',
  data_nascimento: '',

  // Section I: Identification
  data_contacto: '',
  local_contacto: '',
  modalidade: '',
  contacto: '',
  profissional_responsavel: '',
  origem_contacto: '',
  entidade_referencia: '',
  enquadramento: '',

  // Section II: Reason for seeking help
  motivo_descricao: '',
  inicio_problema: '',
  duracao_evolucao: '',
  eventos_precipitantes: '',
  impacto_funcionamento: '',

  // Section III: Community and relational context
  contexto_elementos: '',
  contexto_descricao: '',
  indicadores_clinicos: '',
  indicadores_descricao: '',
  estado_mental_aparencia: '',
  estado_mental_discurso: '',
  estado_mental_humor: '',
  estado_mental_pensamento: '',
  estado_mental_orientacao: '',
  estado_mental_insight: '',
  funcionamento_pessoal: '',
  funcionamento_social: '',
  funcionamento_profissional: '',
  rede_suporte: '',

  // Section IV: Expectations
  expectativas_servico: '',
  representacoes_psicologo: '',

  // Section V: Risk
  risco_indicadores: '',
  risco_descricao: '',
  risco_acao_adotada: '',
  risco_fundamentacao: '',

  // Section VI: Information
  info_esclarecida: '',
  info_observacoes: '',

  // Section VII: Decision
  decisao_tecnica: '',
  decisao_justificacao: '',

  // Section VIII: Inter-institutional
  articulacao_entidades: '',
  articulacao_consentimento: '',
  articulacao_notas: '',

  // Section IX: Impression
  impressao_descritiva: '',
  dimensoes_aprofundar: '',

  // Section X: Supervision
  supervisao_discutido: false,
  supervisao_data: '',
  supervisao_sintese: '',
};


export function CriarFichaPsicologia() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const utenteId = location.state?.utenteId || params.get('utente_id') || '';
  const consultaId = location.state?.consultaId || params.get('consulta_id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [utente, setUtente] = useState(null);
  const [fichas, setFichas] = useState([]);
  const [selectedFicha, setSelectedFicha] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [lockedFields, setLockedFields] = useState({});
  const [isPsicologiaConsulta, setIsPsicologiaConsulta] = useState(false);
  const [confirmPending, setConfirmPending] = useState(null);

  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const getValueByKey = (data, key) => {
    if (!data || !key) return undefined;
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1);
    // Para chaves como 'id', também tenta 'ID'
    const upperKey = key.toUpperCase();
    return data[key] ?? data[camelKey] ?? data[pascalKey] ?? data[upperKey];
  };

  const getUtenteValue = (data, key) => getValueByKey(data, key);
  const getFichaValue = (data, key) => getValueByKey(data, key);

  useEffect(() => {
    const fetchData = async () => {
      if (!utenteId || !consultaId) {
        setError('Este formulário só pode ser aberto a partir de uma consulta de psicologia');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const [utenteData, fichasData, consultaData] = await Promise.all([
          getUtenteDetails(utenteId),
          getFichasPsicologia(utenteId).catch(() => []),
          getConsultaById(consultaId),
        ]);

        const consultaAreaClinica = getValueByKey(consultaData, 'area_clinica_nome');
        const psicologiaConsulta = normalizeText(consultaAreaClinica).includes('psicologia');

        setIsPsicologiaConsulta(psicologiaConsulta);
        setUtente(utenteData);
        setFichas(Array.isArray(fichasData) ? fichasData : []);

        const prefilledData = {
          ...emptyForm,
          nome_completo: getUtenteValue(utenteData, 'nome') || '',
          numero_processo: getUtenteValue(utenteData, 'numero_processo') || '',
          data_nascimento: getUtenteValue(utenteData, 'data_nascimento') ? String(getUtenteValue(utenteData, 'data_nascimento')).slice(0, 10) : '',
        };

        const locked = Object.fromEntries(
          Object.entries(prefilledData).map(([field, value]) => [field, value !== '' && value !== null && value !== undefined])
        );

        setForm(prefilledData);
        setLockedFields(locked);
      } catch (err) {
        setError(err?.response?.data?.error || 'Erro ao carregar utente');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [consultaId, utenteId]);

  const isAluno = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('aluno');
  const isProfessor = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('professor');
  const canManageForms = user?.role === 'admin' || isProfessor || isAluno;
  const canAccessForm = canManageForms && isPsicologiaConsulta;

  const isFieldLocked = (fieldName) => Boolean(lockedFields[fieldName]);

  const formatFichaDate = (ficha) => {
    const raw = getFichaValue(ficha, 'created_at') || getFichaValue(ficha, 'createdAt');
    if (!raw) return '-';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('pt-PT');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (isFieldLocked(name)) return;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!canAccessForm) {
      setError('Não tens permissões para criar formulários');
      return;
    }

    setSaving(true);

    try {
      const normalizedUtenteId = Number(utenteId);
      if (!Number.isFinite(normalizedUtenteId) || normalizedUtenteId <= 0) {
        setError('Utente inválido');
        return;
      }

      const payload = {
        utente_id: normalizedUtenteId,
        consulta_id: consultaId ? Number(consultaId) : undefined,
        ...form,
      };

      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      await createFichaPsicologia(payload);
      setSuccess(isAluno
        ? 'Formulário submetido. Aguarda aprovação do supervisor.'
        : 'Formulário criado com sucesso');

      setTimeout(() => {
        if (consultaId) {
          navigate(`/consultas/${consultaId}/editar`);
        } else {
          navigate('/user');
        }
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao criar formulário');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFicha = (fichaId, motivo) => {
    setConfirmPending({ fichaId, label: motivo || 'Sem motivo registado' });
  };

  const doDeleteFicha = async () => {
    if (!confirmPending) return;
    try {
      await deleteFichaPsicologia(confirmPending.fichaId);
      setFichas(fichas.filter(f => getFichaValue(f, 'id') !== confirmPending.fichaId));
      setSelectedFicha(null);
      setSuccess('Ficha eliminada com sucesso');
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Erro ao eliminar ficha';
      setError(errorMsg);
    } finally {
      setConfirmPending(null);
    }
  };

  if (loading) {
    return <div className="page">A carregar formulário...</div>;
  }

  if (!canAccessForm) {
    return (
      <div className="page centered">
        <div className="card">
          <h1>Acesso restrito</h1>
          <p>Este formulário só pode ser visto e criado por admin ou professor, em consultas de psicologia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page criar-ficha-avaliacao">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => (consultaId ? navigate(`/consultas/${consultaId}/editar`) : navigate('/consultas'))}>
            ← Voltar
          </button>
          <h1>Ficha de Avaliação - Psicologia</h1>
          {utente?.nome && <p>Utente: {utente.nome}</p>}
        </div>
      </div>

      <div className="form-container">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {fichas.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Fichas anteriores</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {fichas.map((ficha, index) => (
                <div key={index} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
                  <strong>Ficha de {formatFichaDate(ficha)}</strong>
                  <p>{getFichaValue(ficha, 'motivo_descricao') ? getFichaValue(ficha, 'motivo_descricao').substring(0, 100) + '...' : 'Sem descrição'}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedFicha(ficha)}
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeleteFicha(getFichaValue(ficha, 'id'), getFichaValue(ficha, 'motivo_descricao'))}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Apagar ficha"
                    >
                      <Trash size={16} /> Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFicha && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Detalhes do formulário anterior</h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div><strong>Motivo:</strong> {getFichaValue(selectedFicha, 'motivo_descricao') || '-'}</div>
              <div><strong>Início do problema:</strong> {getFichaValue(selectedFicha, 'inicio_problema') || '-'}</div>
              <div><strong>Duração/Evolução:</strong> {getFichaValue(selectedFicha, 'duracao_evolucao') || '-'}</div>
              <div><strong>Impacto no funcionamento:</strong> {getFichaValue(selectedFicha, 'impacto_funcionamento') || '-'}</div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedFicha(null)}>
                Fechar detalhes
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <h2>Novo formulário - Ficha de Avaliação Psicologia</h2>

          {/* Header Fields */}
          <div className="form-row">
            <div className="form-group">
              <label>Nome completo</label>
              <input name="nome_completo" value={form.nome_completo} onChange={handleChange} disabled={isFieldLocked('nome_completo')} />
            </div>
            <div className="form-group">
              <label>Nº processo</label>
              <input name="numero_processo" value={form.numero_processo} onChange={handleChange} disabled={isFieldLocked('numero_processo')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de nascimento</label>
              <DateInput name="data_nascimento" value={form.data_nascimento} onChange={handleChange} disabled={isFieldLocked('data_nascimento')} />
            </div>
          </div>

          {/* Section I: Identification */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>I. Identificação</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data de contacto</label>
                    <DateInput name="data_contacto" value={form.data_contacto} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Local do contacto</label>
                    <input name="local_contacto" value={form.local_contacto} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Modalidade</label>
                    <select name="modalidade" value={form.modalidade} onChange={handleChange}>
                      <option value="">Selecionar...</option>
                      <option value="presencial">Presencial</option>
                      <option value="telefonico">Telefónico</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contacto</label>
                    <input name="contacto" value={form.contacto} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Profissional responsável</label>
                    <input name="profissional_responsavel" value={form.profissional_responsavel} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Origem do contacto</label>
                    <select name="origem_contacto" value={form.origem_contacto} onChange={handleChange}>
                      <option value="">Selecionar...</option>
                      <option value="autoencaminhamento">Autoencaminhamento</option>
                      <option value="institucional">Encaminhamento institucional</option>
                      <option value="informal">Referência informal</option>
                      <option value="proativo">Contacto proativo</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Entidade de referência</label>
                  <input name="entidade_referencia" value={form.entidade_referencia} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Enquadramento da consulta</label>
                  <select name="enquadramento" value={form.enquadramento} onChange={handleChange}>
                    <option value="">Selecionar...</option>
                    <option value="clinica">Psicologia Clínica</option>
                    <option value="justica">Psicologia da Justiça</option>
                    <option value="comunitaria">Psicologia Comunitária</option>
                    <option value="misto">Misto</option>
                  </select>
                </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>II. Motivo da Procura</legend>
                <div className="form-group">
                  <label>Descrição da situação conforme relatada pela pessoa</label>
                  <textarea name="motivo_descricao" value={form.motivo_descricao} onChange={handleChange} rows="4" placeholder="Evitar interpretação clínica" />
                </div>
                <div className="form-group">
                  <label>Início do problema</label>
                  <textarea name="inicio_problema" value={form.inicio_problema} onChange={handleChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Duração / Evolução</label>
                  <textarea name="duracao_evolucao" value={form.duracao_evolucao} onChange={handleChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Eventos precipitantes</label>
                  <textarea name="eventos_precipitantes" value={form.eventos_precipitantes} onChange={handleChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Impacto no funcionamento (social, laboral, familiar)</label>
                  <textarea name="impacto_funcionamento" value={form.impacto_funcionamento} onChange={handleChange} rows="4" />
                </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>III. Contexto Comunitário e Relacional</legend>
                <div className="form-group">
                  <label>Elementos relevantes identificados no momento</label>
                  <textarea name="contexto_elementos" value={form.contexto_elementos} onChange={handleChange} rows="4" placeholder="Ex: Situação familiar complexa, Conflito relacional, Violência..." />
                </div>
                <div className="form-group">
                  <label>Descrição da situação conforme relatada pela pessoa</label>
                  <textarea name="contexto_descricao" value={form.contexto_descricao} onChange={handleChange} rows="4" />
                </div>
                <div className="form-group">
                  <label>Indicadores Clínicos Gerais</label>
                  <textarea name="indicadores_clinicos" value={form.indicadores_clinicos} onChange={handleChange} rows="4" placeholder="Ex: Humor deprimido, Ansiedade, Alterações do sono..." />
                </div>
                <div className="form-group">
                  <label>Descrição breve dos indicadores</label>
                  <textarea name="indicadores_descricao" value={form.indicadores_descricao} onChange={handleChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Exploração do estado mental - Aparência e comportamento</label>
                  <textarea name="estado_mental_aparencia" value={form.estado_mental_aparencia} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Discurso (fluência, coerência)</label>
                  <textarea name="estado_mental_discurso" value={form.estado_mental_discurso} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Humor / Afeto (observado)</label>
                  <textarea name="estado_mental_humor" value={form.estado_mental_humor} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Pensamento (conteúdo relevante)</label>
                  <textarea name="estado_mental_pensamento" value={form.estado_mental_pensamento} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Orientação (tempo, espaço, pessoa)</label>
                  <textarea name="estado_mental_orientacao" value={form.estado_mental_orientacao} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Insight / Julgamento</label>
                  <textarea name="estado_mental_insight" value={form.estado_mental_insight} onChange={handleChange} rows="2" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Funcionamento Pessoal</label>
                    <textarea name="funcionamento_pessoal" value={form.funcionamento_pessoal} onChange={handleChange} rows="2" />
                  </div>
                  <div className="form-group">
                    <label>Funcionamento Social</label>
                    <textarea name="funcionamento_social" value={form.funcionamento_social} onChange={handleChange} rows="2" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Funcionamento Profissional/Académico</label>
                    <textarea name="funcionamento_profissional" value={form.funcionamento_profissional} onChange={handleChange} rows="2" />
                  </div>
                  <div className="form-group">
                    <label>Rede de suporte</label>
                    <textarea name="rede_suporte" value={form.rede_suporte} onChange={handleChange} rows="2" />
                  </div>
                </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>IV. Expectativas e Pedido de Apoio</legend>
            <div className="form-group">
              <label>O que a pessoa espera do serviço</label>
              <textarea name="expectativas_servico" value={form.expectativas_servico} onChange={handleChange} rows="4" />
            </div>
            <div className="form-group">
              <label>Representações sobre o papel do psicólogo</label>
              <textarea name="representacoes_psicologo" value={form.representacoes_psicologo} onChange={handleChange} rows="4" />
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>V. Avaliação Proporcional de Risco e Vulnerabilidade</legend>
            <div className="form-group">
              <label>Indicadores de risco identificados</label>
              <textarea name="risco_indicadores" value={form.risco_indicadores} onChange={handleChange} rows="4" placeholder="Ex: Risco para a própria pessoa, Risco para terceiros, Violência..." />
            </div>
            <div className="form-group">
              <label>Descrição factual</label>
              <textarea name="risco_descricao" value={form.risco_descricao} onChange={handleChange} rows="4" placeholder="Evitar juízos interpretativos" />
            </div>
            <div className="form-group">
              <label>Se aplicável, ação imediata adotada</label>
              <textarea name="risco_acao_adotada" value={form.risco_acao_adotada} onChange={handleChange} rows="3" />
            </div>
            <div className="form-group">
              <label>Fundamentação técnica da decisão</label>
              <textarea name="risco_fundamentacao" value={form.risco_fundamentacao} onChange={handleChange} rows="3" />
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>VI. Informação Prestada ao Cliente</legend>
            <div className="form-group">
              <label>Foi esclarecido</label>
              <textarea name="info_esclarecida" value={form.info_esclarecida} onChange={handleChange} rows="4" placeholder="Ex: Natureza do contacto, Limites da confidencialidade, Funcionamento do serviço..." />
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea name="info_observacoes" value={form.info_observacoes} onChange={handleChange} rows="4" />
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>VII. Decisão Técnica e Percurso Proposto</legend>
            <div className="form-group">
              <label>Decisão técnica</label>
              <textarea name="decisao_tecnica" value={form.decisao_tecnica} onChange={handleChange} rows="4" placeholder="Ex: Agendamento de Consulta, Encaminhamento, Articulação com rede local..." />
            </div>
            <div className="form-group">
              <label>Justificação da decisão</label>
              <textarea name="decisao_justificacao" value={form.decisao_justificacao} onChange={handleChange} rows="4" />
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>VIII. Articulação Interinstitucional</legend>
            <div className="form-group">
              <label>Entidades envolvidas</label>
              <textarea name="articulacao_entidades" value={form.articulacao_entidades} onChange={handleChange} rows="3" />
            </div>
            <div className="form-group">
              <label>Consentimento para partilha de informação</label>
              <select name="articulacao_consentimento" value={form.articulacao_consentimento} onChange={handleChange}>
                <option value="">Selecionar...</option>
                <option value="obtido">Obtido</option>
                <option value="nao_aplicavel">Não aplicável</option>
                <option value="nao_obtido">Não obtido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notas relativas a dever legal de comunicação</label>
              <textarea name="articulacao_notas" value={form.articulacao_notas} onChange={handleChange} rows="4" />
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>IX. Impressão Técnica Preliminar (Uso Interno)</legend>
            <div className="form-group">
              <label>Registo descritivo, não diagnóstico</label>
              <textarea name="impressao_descritiva" value={form.impressao_descritiva} onChange={handleChange} rows="4" />
            </div>
            <div className="form-group">
              <label>Dimensões a aprofundar em consulta posterior</label>
              <textarea name="dimensoes_aprofundar" value={form.dimensoes_aprofundar} onChange={handleChange} rows="4" />
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>X. Supervisão</legend>
            <div className="form-group">
              <label>
                <input type="checkbox" name="supervisao_discutido" checked={form.supervisao_discutido} onChange={handleChange} />
                {' '}Caso discutido em supervisão
              </label>
            </div>
            <div className="form-group">
              <label>Data de supervisão</label>
              <DateInput name="supervisao_data" value={form.supervisao_data} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Síntese da orientação recebida</label>
              <textarea name="supervisao_sintese" value={form.supervisao_sintese} onChange={handleChange} rows="4" />
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => (consultaId ? navigate(`/consultas/${consultaId}/editar`) : navigate('/consultas'))} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar formulário'}
            </button>
          </div>
        </form>
      </div>
      <ConfirmModal
        open={!!confirmPending}
        title="Apagar ficha"
        message={`Tem a certeza que deseja apagar esta ficha? (${confirmPending?.label}) Esta ação não pode ser revertida.`}
        danger
        onConfirm={doDeleteFicha}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
