import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUtenteDetails, updateUtente } from '../services/utentes.jsx';
import { DateInput } from '../components/DateInput.jsx';

export function EditarUtente() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    numero_processo: '',
    telefone: '',
    morada: '',
    data_nascimento: '',
  });

  // Carregar dados do utente
  useEffect(() => {
    const fetchUtente = async () => {
      try {
        setError('');
        const data = await getUtenteDetails(id);
        setForm({
          nome: data.nome || '',
          email: data.email || '',
          numero_processo: data.numero_processo || '',
          telefone: data.telefone || '',
          morada: data.morada || '',
          data_nascimento: data.data_nascimento || '',
        });
      } catch (err) {
        setError('Erro ao carregar dados do utente');
      } finally {
        setLoading(false);
      }
    };

    fetchUtente();
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
      await updateUtente(id, form);
      navigate('/utentes');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao atualizar utente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page">A carregar...</div>;
  }

  return (
    <div className="page editar-utente">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/utentes')}>
          ← Voltar
        </button>
        <h1>Editar Utente</h1>
      </div>

      <div className="form-container">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <h2>Informações Pessoais</h2>

          <div className="form-group">
            <label>Nome Completo</label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Data de Nascimento</label>
              <DateInput
                name="data_nascimento"
                value={form.data_nascimento}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telefone</label>
              <input
                type="tel"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Número de Processo</label>
              <input
                type="text"
                name="numero_processo"
                value={form.numero_processo}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Morada</label>
            <textarea
              name="morada"
              value={form.morada}
              onChange={handleChange}
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/utentes')}
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
