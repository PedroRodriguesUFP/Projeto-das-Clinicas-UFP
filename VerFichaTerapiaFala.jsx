import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'react-bootstrap-icons';
import { getFichaTerapiaFalaById } from '../services/fichas.jsx';

const Field = ({ label, value }) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="detail-value" style={{ minHeight: 36, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>
      {value || '-'}
    </div>
  </div>
);

export function VerFichaTerapiaFala() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFichaTerapiaFalaById(id)
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
        <h1>Ficha de Terapia da Fala</h1>
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
            <Field label="Sexo" value={ficha.sexo} />
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Avaliação</h2>
          <Field label="Avaliação Subjetiva" value={ficha.avaliacao_subjetiva} />
          <Field label="Avaliação Objetiva" value={ficha.avaliacao_objetiva} />
          <Field label="Diagnóstico de Terapia da Fala" value={ficha.diagnostico_terapia_fala} />
          <Field label="Objetivos / Prognóstico" value={ficha.objetivos_prognostico} />
          <Field label="Plano Terapêutico" value={ficha.plano_terapeutico} />
          <Field label="Plano de Progressão" value={ficha.plano_progressao} />

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
