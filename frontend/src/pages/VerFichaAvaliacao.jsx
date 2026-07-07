import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'react-bootstrap-icons';
import { getFichaAvaliacaoById } from '../services/fichas.jsx';

const Field = ({ label, value }) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="detail-value" style={{ minHeight: 36, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>
      {value || '-'}
    </div>
  </div>
);

export function VerFichaAvaliacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFichaAvaliacaoById(id)
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
        <h1>Ficha de Avaliação — Fisioterapia</h1>
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
            <Field label="Idade" value={ficha.idade} />
            <Field label="Sexo" value={ficha.sexo} />
          </div>
          <div className="form-row">
            <Field label="Peso (kg)" value={ficha.peso_kg} />
            <Field label="Altura (m)" value={ficha.altura_m} />
            <Field label="IMC" value={ficha.imc} />
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Avaliação Clínica</h2>
          <Field label="Diagnóstico / Queixa Principal" value={ficha.diagnostico_queixa_principal} />
          <Field label="Avaliação Subjetiva" value={ficha.avaliacao_subjetiva} />
          <Field label="Diagnóstico de Fisioterapia" value={ficha.diagnostico_fisioterapia} />
          <Field label="Objetivos / Prognóstico" value={ficha.objetivos_prognostico} />
          <Field label="Plano Terapêutico" value={ficha.plano_terapeutico} />
          <Field label="Plano de Progressão" value={ficha.plano_progressao} />

          <h2 style={{ marginTop: '1.5rem' }}>História Clínica</h2>
          <Field label="História Pessoal" value={ficha.historia_pessoal} />
          <Field label="História da Condição" value={ficha.historia_condicao} />
          <Field label="Medicação" value={ficha.medicacao} />
          <Field label="Hist. Médica Atual" value={ficha.hist_med_atual} />
          <Field label="Hist. Médica Anterior" value={ficha.hist_med_anterior} />
          <Field label="Hist. Médica Familiar" value={ficha.hist_med_familiar} />
          <Field label="Perspetivas" value={ficha.perspetivas} />
          <Field label="Limitações" value={ficha.limitacoes} />
          <Field label="MCD" value={ficha.mcd} />
          <Field label="SINSS" value={ficha.sinss} />

          {ficha.avaliacoes_objetivas?.length > 0 && (
            <>
              <h2 style={{ marginTop: '1.5rem' }}>Avaliações Objetivas</h2>
              {ficha.avaliacoes_objetivas.map((av, i) => (
                <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                  <strong>{av.tipo_teste}</strong>
                  <div style={{ display: 'flex', gap: '2rem', marginTop: 4, fontSize: '0.9rem', color: '#444' }}>
                    <span>Valor inicial: {av.valor || '-'} {av.data ? `(${av.data?.split('T')[0]})` : ''}</span>
                    {av.reavaliacao_valor && <span>Reavaliação: {av.reavaliacao_valor} {av.reavaliacao_data ? `(${av.reavaliacao_data?.split('T')[0]})` : ''}</span>}
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
