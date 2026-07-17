import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'react-bootstrap-icons';
import { getFichaPsicologiaByID } from '../services/fichas.jsx';

const Field = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="detail-value" style={{ minHeight: 36, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <>
    <h2 style={{ marginTop: '1.5rem' }}>{title}</h2>
    {children}
  </>
);

export function VerFichaPsicologia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFichaPsicologiaByID(id)
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
        <h1>Ficha de Psicologia</h1>
        {ficha.nome_completo && <p>{ficha.nome_completo}</p>}
      </div>

      <div className="form-container">
        <div className="card">
          <h2>I. Identificação</h2>
          <div className="form-row">
            <Field label="Nome Completo" value={ficha.nome_completo} />
            <Field label="Nº Processo" value={ficha.numero_processo} />
          </div>
          <div className="form-row">
            <Field label="Data de Nascimento" value={ficha.data_nascimento?.split('T')[0]} />
            <Field label="Data de Contacto" value={ficha.data_contacto?.split('T')[0]} />
          </div>
          <div className="form-row">
            <Field label="Local de Contacto" value={ficha.local_contacto} />
            <Field label="Modalidade" value={ficha.modalidade} />
          </div>
          <div className="form-row">
            <Field label="Contacto" value={ficha.contacto} />
            <Field label="Profissional Responsável" value={ficha.profissional_responsavel} />
          </div>
          <div className="form-row">
            <Field label="Origem do Contacto" value={ficha.origem_contacto} />
            <Field label="Entidade de Referência" value={ficha.entidade_referencia} />
            <Field label="Enquadramento" value={ficha.enquadramento} />
          </div>

          <Section title="II. Motivo do Pedido de Ajuda">
            <Field label="Descrição" value={ficha.motivo_descricao} />
            <Field label="Início do Problema" value={ficha.inicio_problema} />
            <Field label="Duração / Evolução" value={ficha.duracao_evolucao} />
            <Field label="Eventos Precipitantes" value={ficha.eventos_precipitantes} />
            <Field label="Impacto no Funcionamento" value={ficha.impacto_funcionamento} />
          </Section>

          <Section title="III. Contexto e Estado Mental">
            <Field label="Contexto (elementos)" value={ficha.contexto_elementos} />
            <Field label="Contexto (descrição)" value={ficha.contexto_descricao} />
            <Field label="Indicadores Clínicos" value={ficha.indicadores_clinicos} />
            <Field label="Indicadores (descrição)" value={ficha.indicadores_descricao} />
            <div className="form-row">
              <Field label="Aparência" value={ficha.estado_mental_aparencia} />
              <Field label="Discurso" value={ficha.estado_mental_discurso} />
            </div>
            <div className="form-row">
              <Field label="Humor" value={ficha.estado_mental_humor} />
              <Field label="Pensamento" value={ficha.estado_mental_pensamento} />
            </div>
            <div className="form-row">
              <Field label="Orientação" value={ficha.estado_mental_orientacao} />
              <Field label="Insight" value={ficha.estado_mental_insight} />
            </div>
            <div className="form-row">
              <Field label="Funcionamento Pessoal" value={ficha.funcionamento_pessoal} />
              <Field label="Funcionamento Social" value={ficha.funcionamento_social} />
              <Field label="Funcionamento Profissional" value={ficha.funcionamento_profissional} />
            </div>
            <Field label="Rede de Suporte" value={ficha.rede_suporte} />
          </Section>

          <Section title="IV. Expectativas">
            <Field label="Expectativas do Serviço" value={ficha.expectativas_servico} />
            <Field label="Representações do Psicólogo" value={ficha.representacoes_psicologo} />
          </Section>

          <Section title="V. Risco e Vulnerabilidade">
            <Field label="Indicadores de Risco" value={ficha.risco_indicadores} />
            <Field label="Descrição do Risco" value={ficha.risco_descricao} />
            <Field label="Ação Adotada" value={ficha.risco_acao_adotada} />
            <Field label="Fundamentação" value={ficha.risco_fundamentacao} />
          </Section>

          <Section title="VI–IX. Decisão e Impressão">
            <Field label="Informação Esclarecida" value={ficha.info_esclarecida} />
            <Field label="Observações" value={ficha.info_observacoes} />
            <Field label="Decisão Técnica" value={ficha.decisao_tecnica} />
            <Field label="Justificação" value={ficha.decisao_justificacao} />
            <Field label="Articulação Interinstitucional" value={ficha.articulacao_entidades} />
            <Field label="Impressão Descritiva" value={ficha.impressao_descritiva} />
            <Field label="Dimensões a Aprofundar" value={ficha.dimensoes_aprofundar} />
          </Section>

          {ficha.supervisao_sintese && (
            <Section title="X. Supervisão">
              <Field label="Síntese de Supervisão" value={ficha.supervisao_sintese} />
              <Field label="Data de Supervisão" value={ficha.supervisao_data?.split('T')[0]} />
            </Section>
          )}

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
