import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'react-bootstrap-icons';
import { getFichaNutricaoById } from '../services/fichas.jsx';

const Field = ({ label, value }) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="detail-value" style={{ minHeight: 36, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>
      {value != null && value !== '' ? String(value) : '-'}
    </div>
  </div>
);

export function VerFichaNutricao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFichaNutricaoById(id)
      .then(setFicha)
      .catch(() => setError('Ficha não encontrada ou sem permissão'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page">A carregar...</div>;
  if (error) return <div className="page"><p>{error}</p><button className="btn btn-secondary" onClick={() => navigate(-1)}>← Voltar</button></div>;

  return (
    <div className="page editar-consulta">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Voltar</button>
        <h1>Ficha de Nutrição</h1>
        {ficha.nome_completo && <p>{ficha.nome_completo}</p>}
      </div>

      <div className="form-container">
        <div className="card">
          <h2>Identificação</h2>
          <div className="form-row">
            <Field label="Nome Completo" value={ficha.nome_completo} />
            <Field label="Nº Processo" value={ficha.numero_processo} />
          </div>
          <div className="form-row">
            <Field label="Data de Nascimento" value={ficha.data_nascimento?.split('T')[0]} />
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Anamnese</h2>
          <Field label="Motivo da consulta" value={ficha.motivo_consulta} />
          <Field label="Antecedentes pessoais" value={ficha.antecedentes_pessoais} />
          <Field label="Antecedentes familiares" value={ficha.antecedentes_familiares} />
          <Field label="Medicação habitual" value={ficha.medicacao_habitual} />
          <Field label="Alergias / Intolerâncias" value={ficha.alergias_intolerancias} />

          <h2 style={{ marginTop: '1.5rem' }}>Estilo de vida</h2>
          <Field label="Atividade física" value={ficha.atividade_fisica} />
          <div className="form-row">
            <Field label="Hábitos tabágicos" value={ficha.habitos_tabagicos} />
            <Field label="Hábitos alcoólicos" value={ficha.habitos_alcoolicos} />
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Avaliação clínica</h2>
          <Field label="Dados laboratoriais" value={ficha.dados_laboratoriais} />
          <div className="form-row">
            <Field label="Estado do apetite" value={ficha.estado_apetite} />
            <Field label="Estado da mastigação" value={ficha.estado_mastigacao} />
          </div>
          <div className="form-row">
            <Field label="Estado da digestão" value={ficha.estado_digestao} />
            <Field label="Função gastrointestinal" value={ficha.estado_funcao_gi} />
          </div>
          <Field label="Exame físico centrado na nutrição" value={ficha.exame_fisico_nutricao} />

          <h2 style={{ marginTop: '1.5rem' }}>Ingestão</h2>
          <Field label="Ingestão alimentar habitual" value={ficha.ingestao_alimentar_habitual} />
          <Field label="Ingestão hídrica" value={ficha.ingestao_hidrica} />

          <h2 style={{ marginTop: '1.5rem' }}>Dados antropométricos e composição corporal</h2>
          <div className="form-row">
            <Field label="Peso (kg)" value={ficha.peso_kg} />
            <Field label="Estatura (m)" value={ficha.altura_m} />
            <Field label="IMC" value={ficha.imc} />
          </div>
          <div className="form-row">
            <Field label="% Massa Gorda" value={ficha.massa_gorda_pct} />
            <Field label="Massa Muscular (kg)" value={ficha.massa_muscular_kg} />
          </div>
          <div className="form-row">
            <Field label="Perímetro da cintura (cm)" value={ficha.perimetro_cintura} />
            <Field label="Perímetro gluteal (cm)" value={ficha.perimetro_gluteal} />
          </div>
          <Field label="Pregas cutâneas" value={ficha.pregas_cutaneas} />
          <div className="form-row">
            <Field label="Evolução do peso — mínimo (kg)" value={ficha.evolucao_peso_min} />
            <Field label="Evolução do peso — máximo (kg)" value={ficha.evolucao_peso_max} />
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Intervenção nutricional</h2>
          <Field label="Intervenção nutricional (cálculos)" value={ficha.intervencao_nutricional} />
          <Field label="Plano alimentar / Recomendações" value={ficha.plano_alimentar} />

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
