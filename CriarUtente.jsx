import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUtente } from '../services/utentes.jsx';
import { DateInput } from '../components/DateInput.jsx';

export function CriarUtente() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    passwordConfirm: '',
    numero_processo: '',
    telefone: '',
    morada: '',
    data_nascimento: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validar passwords
    if (form.password !== form.passwordConfirm) {
      setError('As passwords não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { passwordConfirm, ...dataToSend } = form;
      await createUtente(dataToSend);
      navigate('/utentes');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao criar utente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page criar-utente">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/utentes')}>
          ← Voltar
        </button>
        <h1>Novo Utente</h1>
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
            <label>Nome Completo *</label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
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
                placeholder="91234567"
              />
            </div>

            <div className="form-group">
              <label>Número de Processo</label>
              <input
                type="text"
                name="numero_processo"
                value={form.numero_processo}
                onChange={handleChange}
                placeholder="PROC001"
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
              placeholder="Rua..."
            />
          </div>

          <h2>Credenciais de Acesso</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength="8"
              />
            </div>

            <div className="form-group">
              <label>Confirmar Password *</label>
              <input
                type="password"
                name="passwordConfirm"
                value={form.passwordConfirm}
                onChange={handleChange}
                required
                minLength="8"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/utentes')}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'A criar...' : 'Criar Utente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
