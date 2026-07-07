import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DateInput } from '../components/DateInput.jsx';
import { Trash } from 'react-bootstrap-icons';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
import { getUtenteDetails } from '../services/utentes.jsx';
import { createFichaTerapiaFala, getFichasTerapiaFala, deleteFichaTerapiaFala } from '../services/fichas.jsx';
import { getConsultaById } from '../services/consultas.jsx';
import { getAlunosDoProfessor } from '../services/terapeutas.jsx';

const emptyForm = {
  nome_completo: '',
  numero_processo: '',
  data_nascimento: '',
  sexo: '',
  avaliacao_subjetiva: '',
  avaliacao_objetiva: '',
  diagnostico_terapia_fala: '',
  objetivos_prognostico: '',
  plano_terapeutico: '',
  plano_progressao: '',
  estudante_id: '',
};

export function CriarFichaTerapiaFala() {
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
  const [isTerapiaFalaConsulta, setIsTerapiaFalaConsulta] = useState(false);
  const [terapeutaResponsavel, setTerapeutaResponsavel] = useState(null);
  const [confirmPending, setConfirmPending] = useState(null);
  const [estudanteTerapiaFala, setEstudanteTerapiaFala] = useState(null);
  const [alunos, setAlunos] = useState([]);

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
        setError('Este formulário só pode ser aberto a partir de uma consulta de terapia da fala');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const [utenteData, fichasData, consultaData, alunosData] = await Promise.all([
          getUtenteDetails(utenteId),
          getFichasTerapiaFala(utenteId).catch(() => []),
          getConsultaById(consultaId),
          getAlunosDoProfessor().catch(() => []),
        ]);

        const consultaAreaClinica = getValueByKey(consultaData, 'area_clinica_nome');
        const terapiaFalaConsulta = normalizeText(consultaAreaClinica).includes('fala');

        setIsTerapiaFalaConsulta(terapiaFalaConsulta);

        // Guardar terapeuta responsável
        const nomeTerapeuta = getValueByKey(consultaData, 'terapeuta_nome') || getValueByKey(consultaData, 'terapeutaNome') || 'N/A';
        setTerapeutaResponsavel(nomeTerapeuta);

        // Estudante da fala será atualizado quando selecionar no dropdown
        setEstudanteTerapiaFala(null);

        setUtente(utenteData);
        setFichas(Array.isArray(fichasData) ? fichasData : []);
        setAlunos(Array.isArray(alunosData) ? alunosData : []);

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
  const canAccessForm = canManageForms && isTerapiaFalaConsulta;

  const isFieldLocked = (fieldName) => Boolean(lockedFields[fieldName]);

  const formatFichaDate = (ficha) => {
    const raw = getFichaValue(ficha, 'created_at') || getFichaValue(ficha, 'createdAt');
    if (!raw) return '-';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('pt-PT');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (isFieldLocked(name)) {
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Atualizar nome do estudante em baixo quando seleciona
    if (name === 'estudante_id') {
      if (value) {
        const alunoSelecionado = alunos.find((a) => String(a.id) === String(value));
        setEstudanteTerapiaFala(alunoSelecionado?.nome || 'N/A');
      } else {
        setEstudanteTerapiaFala(null);
      }
    }
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
        nome_completo: form.nome_completo,
        numero_processo: form.numero_processo,
        data_nascimento: form.data_nascimento || undefined,
        sexo: form.sexo,
        avaliacao_subjetiva: form.avaliacao_subjetiva,
        avaliacao_objetiva: form.avaliacao_objetiva,
        diagnostico_terapia_fala: form.diagnostico_terapia_fala,
        objetivos_prognostico: form.objetivos_prognostico,
        plano_terapeutico: form.plano_terapeutico,
        plano_progressao: form.plano_progressao,
        estudante_id: form.estudante_id ? Number(form.estudante_id) : undefined,
      };

      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      await createFichaTerapiaFala(payload);
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

  const handleDeleteFicha = (fichaId, diagnostico) => {
    setConfirmPending({ fichaId, label: diagnostico || 'Sem diagnóstico' });
  };

  const doDeleteFicha = async () => {
    if (!confirmPending) return;
    try {
      await deleteFichaTerapiaFala(confirmPending.fichaId);
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
          <p>Este formulário só pode ser visto e criado por admin ou professor, em consultas de terapia da fala.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page criar-ficha-terapia-fala">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => (consultaId ? navigate(`/consultas/${consultaId}/editar`) : navigate('/consultas'))}>
            ← Voltar
          </button>
          <h1>Adicionar formulário - Terapia da Fala</h1>
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
            <h2>Formulários anteriores</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {fichas.map((ficha, index) => {
                const fichaId = getFichaValue(ficha, 'id') || `ficha-${index}`;
                return (
                <div key={fichaId} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
                  <strong>Avaliação de Terapia da Fala</strong>
                  <div>{getFichaValue(ficha, 'diagnostico_terapia_fala') || 'Sem diagnóstico registado'}</div>
                  <small>Criado em {formatFichaDate(ficha)}</small>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
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
                      onClick={() => handleDeleteFicha(getFichaValue(ficha, 'id'), getFichaValue(ficha, 'diagnostico_terapia_fala'))}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Apagar ficha"
                    >
                      <Trash size={16} /> Apagar
                    </button>
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {selectedFicha && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Detalhes do formulário anterior</h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div><strong>Avaliação Subjetiva:</strong> {getFichaValue(selectedFicha, 'avaliacao_subjetiva') || '-'}</div>
              <div><strong>Avaliação Objetiva:</strong> {getFichaValue(selectedFicha, 'diagnostico_terapia_fala') || '-'}</div>
              <div><strong>Diagnóstico em Terapia da Fala:</strong> {getFichaValue(selectedFicha, 'diagnostico_terapia_fala') || '-'}</div>
              <div><strong>Objetivos e Prognósticos:</strong> {getFichaValue(selectedFicha, 'objetivos_prognostico') || '-'}</div>
              <div><strong>Plano Terapêutico:</strong> {getFichaValue(selectedFicha, 'plano_terapeutico') || '-'}</div>
              <div><strong>Plano de Progressão:</strong> {getFichaValue(selectedFicha, 'plano_progressao') || '-'}</div>
              <div><strong>Criado em:</strong> {formatFichaDate(selectedFicha)}</div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedFicha(null)}>
                Fechar detalhes
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <h2>Novo formulário - Terapia da Fala</h2>

          {/* Identificação - dados do utente */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Identificação</legend>
            
            <div className="form-row">
              <div className="form-group">
                <label>Nome completo</label>
                <input name="nome_completo" value={form.nome_completo} onChange={handleChange} disabled={isFieldLocked('nome_completo')} title={isFieldLocked('nome_completo') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
              </div>
              <div className="form-group">
                <label>Nº processo</label>
                <input name="numero_processo" value={form.numero_processo} onChange={handleChange} disabled={isFieldLocked('numero_processo')} title={isFieldLocked('numero_processo') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Data de nascimento</label>
                <DateInput name="data_nascimento" value={form.data_nascimento} onChange={handleChange} disabled={isFieldLocked('data_nascimento')} title={isFieldLocked('data_nascimento') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
              </div>
              <div className="form-group">
                <label>Sexo</label>
                <select name="sexo" value={form.sexo} onChange={handleChange} disabled={isFieldLocked('sexo')} title={isFieldLocked('sexo') ? 'Campo bloqueado por dados da consulta/utente' : ''}>
                  <option value="">Selecionar...</option>
                  <option value="F">F</option>
                  <option value="M">M</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Campos específicos de terapia da fala */}
          <fieldset>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Avaliação de Terapia da Fala</legend>

            <div className="form-group">
              <label>Avaliação Subjetiva</label>
              <textarea name="avaliacao_subjetiva" value={form.avaliacao_subjetiva} onChange={handleChange} rows="4" placeholder="Descreva a avaliação subjetiva do utente..." />
            </div>

            <div className="form-group">
              <label>Avaliação Objetiva</label>
              <textarea name="avaliacao_objetiva" value={form.avaliacao_objetiva} onChange={handleChange} rows="4" placeholder="Descreva os achados da avaliação objetiva..." />
            </div>

            <div className="form-group">
              <label>Diagnóstico em Terapia da Fala</label>
              <textarea name="diagnostico_terapia_fala" value={form.diagnostico_terapia_fala} onChange={handleChange} rows="4" placeholder="Descreva o diagnóstico em terapia da fala..." />
            </div>

            <div className="form-group">
              <label>Objetivos e Prognósticos</label>
              <textarea name="objetivos_prognostico" value={form.objetivos_prognostico} onChange={handleChange} rows="4" placeholder="Descreva os objetivos e prognósticos..." />
            </div>

            <div className="form-group">
              <label>Plano Terapêutico</label>
              <textarea name="plano_terapeutico" value={form.plano_terapeutico} onChange={handleChange} rows="4" placeholder="Descreva o plano terapêutico..." />
            </div>

            <div className="form-group">
              <label>Plano de Progressão</label>
              <textarea name="plano_progressao" value={form.plano_progressao} onChange={handleChange} rows="4" placeholder="Descreva o plano de progressão..." />
            </div>

            <div className="form-group">
              <label>Estudante de Terapia da Fala</label>
              <select name="estudante_id" value={form.estudante_id} onChange={handleChange}>
                <option value="">Selecionar estudante...</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {/* Informações de responsáveis */}
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: '#f9fafb', 
            borderRadius: '0.5rem',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
              <div>
                <strong>Terapeuta da Fala Responsável:</strong> {terapeutaResponsavel}
              </div>
              <div>
                <strong>Estudante de Terapia da Fala:</strong> {estudanteTerapiaFala || 'N/A'}
              </div>
            </div>
          </div>

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
