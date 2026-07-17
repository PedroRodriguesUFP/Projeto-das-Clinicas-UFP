import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DateInput } from '../components/DateInput.jsx';
import { Trash } from 'react-bootstrap-icons';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
import { getUtenteDetails } from '../services/utentes.jsx';
import { createFichaNutricao, getFichasNutricao, deleteFichaNutricao } from '../services/fichas.jsx';
import { getConsultaById } from '../services/consultas.jsx';

const emptyForm = {
  nome_completo: '',
  numero_processo: '',
  data_nascimento: '',
  motivo_consulta: '',
  antecedentes_pessoais: '',
  antecedentes_familiares: '',
  medicacao_habitual: '',
  alergias_intolerancias: '',
  atividade_fisica: '',
  habitos_tabagicos: '',
  habitos_alcoolicos: '',
  dados_laboratoriais: '',
  estado_apetite: '',
  estado_mastigacao: '',
  estado_digestao: '',
  estado_funcao_gi: '',
  exame_fisico_nutricao: '',
  ingestao_alimentar_habitual: '',
  ingestao_hidrica: '',
  peso_kg: '',
  altura_m: '',
  imc: '',
  massa_gorda_pct: '',
  massa_muscular_kg: '',
  perimetro_cintura: '',
  perimetro_gluteal: '',
  pregas_cutaneas: '',
  evolucao_peso_min: '',
  evolucao_peso_max: '',
  intervencao_nutricional: '',
  plano_alimentar: '',
};

export function CriarFichaNutricao() {
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
  const [isNutricaoConsulta, setIsNutricaoConsulta] = useState(false);
  const [confirmPending, setConfirmPending] = useState(null);

  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();

  const getValueByKey = (data, key) => {
    if (!data || !key) return undefined;
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1);
    return data[key] ?? data[camelKey] ?? data[pascalKey];
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!utenteId || !consultaId) {
        setError('Este formulário só pode ser aberto a partir de uma consulta de nutrição');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const [utenteData, fichasData, consultaData] = await Promise.all([
          getUtenteDetails(utenteId),
          getFichasNutricao(utenteId).catch(() => []),
          getConsultaById(consultaId),
        ]);

        const areaClinicaNome = getValueByKey(consultaData, 'area_clinica_nome');
        setIsNutricaoConsulta(normalizeText(areaClinicaNome).includes('nutri'));

        setUtente(utenteData);
        setFichas(Array.isArray(fichasData) ? fichasData : []);

        const prefilledData = {
          ...emptyForm,
          nome_completo: getValueByKey(utenteData, 'nome') || '',
          numero_processo: getValueByKey(utenteData, 'numero_processo') || '',
          data_nascimento: getValueByKey(utenteData, 'data_nascimento')
            ? String(getValueByKey(utenteData, 'data_nascimento')).slice(0, 10)
            : '',
        };

        const locked = Object.fromEntries(
          Object.entries(prefilledData).map(([field, value]) => [field, value !== '' && value !== null && value !== undefined])
        );

        setForm(prefilledData);
        setLockedFields(locked);
      } catch (err) {
        setError(err?.response?.data?.error || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [consultaId, utenteId]);

  const isAluno = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('aluno');
  const isProfessor = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('professor');
  const canManageForms = user?.role === 'admin' || isProfessor || isAluno;
  const canAccessForm = canManageForms && isNutricaoConsulta;

  const isFieldLocked = (fieldName) => Boolean(lockedFields[fieldName]);

  const formatFichaDate = (ficha) => {
    const raw = getValueByKey(ficha, 'created_at') || getValueByKey(ficha, 'createdAt');
    if (!raw) return '-';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('pt-PT');
  };

  const calcIMC = (peso, altura) => {
    const p = parseFloat(peso);
    const a = parseFloat(altura);
    if (!p || !a || a <= 0) return '';
    return (p / (a * a)).toFixed(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (isFieldLocked(name)) return;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'peso_kg' || name === 'altura_m') {
        updated.imc = calcIMC(
          name === 'peso_kg' ? value : prev.peso_kg,
          name === 'altura_m' ? value : prev.altura_m
        );
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!canAccessForm) {
      setError('Não tens permissões para criar formulários de nutrição');
      return;
    }

    setSaving(true);

    try {
      const normalizedUtenteId = Number(utenteId);
      if (!Number.isFinite(normalizedUtenteId) || normalizedUtenteId <= 0) {
        setError('Utente inválido');
        return;
      }

      const toNum = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const payload = {
        utente_id: normalizedUtenteId,
        consulta_id: consultaId ? Number(consultaId) : undefined,
        nome_completo: form.nome_completo,
        numero_processo: form.numero_processo,
        data_nascimento: form.data_nascimento || undefined,
        motivo_consulta: form.motivo_consulta,
        antecedentes_pessoais: form.antecedentes_pessoais,
        antecedentes_familiares: form.antecedentes_familiares,
        medicacao_habitual: form.medicacao_habitual,
        alergias_intolerancias: form.alergias_intolerancias,
        atividade_fisica: form.atividade_fisica,
        habitos_tabagicos: form.habitos_tabagicos,
        habitos_alcoolicos: form.habitos_alcoolicos,
        dados_laboratoriais: form.dados_laboratoriais,
        estado_apetite: form.estado_apetite,
        estado_mastigacao: form.estado_mastigacao,
        estado_digestao: form.estado_digestao,
        estado_funcao_gi: form.estado_funcao_gi,
        exame_fisico_nutricao: form.exame_fisico_nutricao,
        ingestao_alimentar_habitual: form.ingestao_alimentar_habitual,
        ingestao_hidrica: form.ingestao_hidrica,
        peso_kg: toNum(form.peso_kg),
        altura_m: toNum(form.altura_m),
        massa_gorda_pct: toNum(form.massa_gorda_pct),
        massa_muscular_kg: toNum(form.massa_muscular_kg),
        perimetro_cintura: toNum(form.perimetro_cintura),
        perimetro_gluteal: toNum(form.perimetro_gluteal),
        pregas_cutaneas: form.pregas_cutaneas,
        evolucao_peso_min: toNum(form.evolucao_peso_min),
        evolucao_peso_max: toNum(form.evolucao_peso_max),
        intervencao_nutricional: form.intervencao_nutricional,
        plano_alimentar: form.plano_alimentar,
      };

      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      await createFichaNutricao(payload);
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

  const handleDeleteFicha = (fichaId) => {
    setConfirmPending({ fichaId });
  };

  const doDeleteFicha = async () => {
    if (!confirmPending) return;
    try {
      await deleteFichaNutricao(confirmPending.fichaId);
      setFichas(fichas.filter((f) => getValueByKey(f, 'id') !== confirmPending.fichaId));
      setSelectedFicha(null);
      setSuccess('Ficha eliminada com sucesso');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao eliminar ficha');
    } finally {
      setConfirmPending(null);
    }
  };

  if (loading) return <div className="page">A carregar formulário...</div>;

  if (!canAccessForm) {
    return (
      <div className="page centered">
        <div className="card">
          <h1>Acesso restrito</h1>
          <p>Este formulário só pode ser visto e criado por admin ou professor, em consultas de nutrição.</p>
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
          <h1>Adicionar formulário - Nutrição</h1>
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
        {success && <div className="alert alert-success">{success}</div>}

        {fichas.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Formulários anteriores</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {fichas.map((ficha, index) => {
                const fichaId = getValueByKey(ficha, 'id') || `ficha-${index}`;
                return (
                  <div key={fichaId} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
                    <strong>Avaliação de Nutrição</strong>
                    <div>{getValueByKey(ficha, 'motivo_consulta') || 'Sem motivo registado'}</div>
                    <small>Criado em {formatFichaDate(ficha)}</small>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedFicha(ficha)}>
                        Ver detalhes
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDeleteFicha(getValueByKey(ficha, 'id'))}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Trash size={16} /> Apagar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedFicha && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Detalhes do formulário anterior</h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div><strong>Motivo da consulta:</strong> {getValueByKey(selectedFicha, 'motivo_consulta') || '-'}</div>
              <div><strong>Plano alimentar:</strong> {getValueByKey(selectedFicha, 'plano_alimentar') || '-'}</div>
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
          <h2>Novo formulário - Nutrição</h2>

          {/* Identificação */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Identificação</legend>
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
          </fieldset>

          {/* Anamnese */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Anamnese</legend>
            <div className="form-group">
              <label>Motivo da consulta</label>
              <textarea name="motivo_consulta" value={form.motivo_consulta} onChange={handleChange} rows="3" placeholder="Descreva o motivo da consulta..." />
            </div>
            <div className="form-group">
              <label>Antecedentes pessoais</label>
              <textarea name="antecedentes_pessoais" value={form.antecedentes_pessoais} onChange={handleChange} rows="3" placeholder="Historial clínico pessoal relevante..." />
            </div>
            <div className="form-group">
              <label>Antecedentes familiares</label>
              <textarea name="antecedentes_familiares" value={form.antecedentes_familiares} onChange={handleChange} rows="3" placeholder="Historial clínico familiar relevante..." />
            </div>
            <div className="form-group">
              <label>Medicação habitual</label>
              <textarea name="medicacao_habitual" value={form.medicacao_habitual} onChange={handleChange} rows="2" placeholder="Lista de medicamentos em uso regular..." />
            </div>
            <div className="form-group">
              <label>Alergias / Intolerâncias</label>
              <textarea name="alergias_intolerancias" value={form.alergias_intolerancias} onChange={handleChange} rows="2" placeholder="Alergias ou intolerâncias alimentares e medicamentosas..." />
            </div>
          </fieldset>

          {/* Estilo de vida */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Estilo de vida</legend>
            <div className="form-group">
              <label>Atividade física</label>
              <textarea name="atividade_fisica" value={form.atividade_fisica} onChange={handleChange} rows="2" placeholder="Tipo, frequência e duração da atividade física..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hábitos tabágicos</label>
                <textarea name="habitos_tabagicos" value={form.habitos_tabagicos} onChange={handleChange} rows="2" placeholder="Fumador, ex-fumador, quantidade..." />
              </div>
              <div className="form-group">
                <label>Hábitos alcoólicos</label>
                <textarea name="habitos_alcoolicos" value={form.habitos_alcoolicos} onChange={handleChange} rows="2" placeholder="Tipo, frequência e quantidade..." />
              </div>
            </div>
          </fieldset>

          {/* Avaliação clínica */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Avaliação clínica</legend>
            <div className="form-group">
              <label>Dados laboratoriais</label>
              <textarea name="dados_laboratoriais" value={form.dados_laboratoriais} onChange={handleChange} rows="3" placeholder="Resultados de análises relevantes (glicemia, colesterol, etc.)..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Estado do apetite</label>
                <textarea name="estado_apetite" value={form.estado_apetite} onChange={handleChange} rows="2" />
              </div>
              <div className="form-group">
                <label>Estado da mastigação</label>
                <textarea name="estado_mastigacao" value={form.estado_mastigacao} onChange={handleChange} rows="2" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Estado da digestão</label>
                <textarea name="estado_digestao" value={form.estado_digestao} onChange={handleChange} rows="2" />
              </div>
              <div className="form-group">
                <label>Função gastrointestinal</label>
                <textarea name="estado_funcao_gi" value={form.estado_funcao_gi} onChange={handleChange} rows="2" />
              </div>
            </div>
            <div className="form-group">
              <label>Exame físico centrado na nutrição</label>
              <textarea name="exame_fisico_nutricao" value={form.exame_fisico_nutricao} onChange={handleChange} rows="3" placeholder="Observações do exame físico relevantes para a nutrição..." />
            </div>
          </fieldset>

          {/* Ingestão */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Ingestão</legend>
            <div className="form-group">
              <label>Ingestão alimentar habitual</label>
              <textarea name="ingestao_alimentar_habitual" value={form.ingestao_alimentar_habitual} onChange={handleChange} rows="4" placeholder="Descrição detalhada dos hábitos alimentares..." />
            </div>
            <div className="form-group">
              <label>Ingestão hídrica</label>
              <textarea name="ingestao_hidrica" value={form.ingestao_hidrica} onChange={handleChange} rows="2" placeholder="Quantidade e tipo de líquidos ingeridos diariamente..." />
            </div>
          </fieldset>

          {/* Dados antropométricos */}
          <fieldset style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Dados antropométricos e composição corporal</legend>
            <div className="form-row">
              <div className="form-group">
                <label>Peso (kg)</label>
                <input type="number" step="0.1" name="peso_kg" value={form.peso_kg} onChange={handleChange} placeholder="Ex: 72.5" />
              </div>
              <div className="form-group">
                <label>Estatura (m)</label>
                <input type="number" step="0.01" name="altura_m" value={form.altura_m} onChange={handleChange} placeholder="Ex: 1.70" />
              </div>
              <div className="form-group">
                <label>IMC (calculado)</label>
                <input type="text" name="imc" value={form.imc} readOnly style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>% Massa Gorda</label>
                <input type="number" step="0.1" name="massa_gorda_pct" value={form.massa_gorda_pct} onChange={handleChange} placeholder="Ex: 22.3" />
              </div>
              <div className="form-group">
                <label>Massa Muscular (kg)</label>
                <input type="number" step="0.1" name="massa_muscular_kg" value={form.massa_muscular_kg} onChange={handleChange} placeholder="Ex: 30.1" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Perímetro da cintura (cm)</label>
                <input type="number" step="0.1" name="perimetro_cintura" value={form.perimetro_cintura} onChange={handleChange} placeholder="Ex: 85.0" />
              </div>
              <div className="form-group">
                <label>Perímetro gluteal (cm)</label>
                <input type="number" step="0.1" name="perimetro_gluteal" value={form.perimetro_gluteal} onChange={handleChange} placeholder="Ex: 100.0" />
              </div>
            </div>
            <div className="form-group">
              <label>Pregas cutâneas</label>
              <textarea name="pregas_cutaneas" value={form.pregas_cutaneas} onChange={handleChange} rows="2" placeholder="Valores das pregas medidas (tricipital, bicipital, subescapular, etc.)..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Evolução do peso — mínimo (kg)</label>
                <input type="number" step="0.1" name="evolucao_peso_min" value={form.evolucao_peso_min} onChange={handleChange} placeholder="Peso mínimo registado" />
              </div>
              <div className="form-group">
                <label>Evolução do peso — máximo (kg)</label>
                <input type="number" step="0.1" name="evolucao_peso_max" value={form.evolucao_peso_max} onChange={handleChange} placeholder="Peso máximo registado" />
              </div>
            </div>
          </fieldset>

          {/* Intervenção */}
          <fieldset>
            <legend style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Intervenção nutricional</legend>
            <div className="form-group">
              <label>Intervenção nutricional (cálculos)</label>
              <textarea name="intervencao_nutricional" value={form.intervencao_nutricional} onChange={handleChange} rows="4" placeholder="Cálculo das necessidades energéticas, macronutrientes, etc...." />
            </div>
            <div className="form-group">
              <label>Plano alimentar / Recomendações</label>
              <textarea name="plano_alimentar" value={form.plano_alimentar} onChange={handleChange} rows="5" placeholder="Plano alimentar detalhado e recomendações para o utente..." />
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
        message="Tem a certeza que deseja apagar esta ficha? Esta ação não pode ser revertida."
        danger
        onConfirm={doDeleteFicha}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
