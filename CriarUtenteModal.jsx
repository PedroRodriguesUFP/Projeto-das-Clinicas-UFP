import { useState } from 'react';
import { X, PlusLg } from 'react-bootstrap-icons';
import { DateInput } from './DateInput.jsx';
import { createUtente } from '../services/utentes.jsx';
import '../styles/gerir-alunos.css';

export function CriarUtenteModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    numero_utente_saude: '',
    telefone: '',
    numero_processo: '',
    data_nascimento: '',
    morada: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validações básicas
    if (!form.nome || !form.numero_utente_saude || !form.telefone || !form.numero_processo || !form.data_nascimento) {
      setError('Nome, Número de Utente de Saúde, Telefone, Número de Processo e Data de Nascimento são obrigatórios');
      return;
    }

    // Validar telemóvel (9 dígitos)
    const telefoneLimpo = form.telefone.replace(/\D/g, '');
    if (telefoneLimpo.length !== 9) {
      setError('Telefone deve ter 9 dígitos');
      return;
    }
    if (!telefoneLimpo.match(/^9[1236]\d{7}$/)) {
      setError('Telefone português inválido');
      return;
    }

    // Validar número de utente de saúde (10 dígitos)
    const numeroUtenteLimpo = form.numero_utente_saude.replace(/\D/g, '');
    if (numeroUtenteLimpo.length !== 10) {
      setError('Número de Utente de Saúde deve ter 10 dígitos');
      return;
    }

    setLoading(true);

    try {
      const payload = { ...form };
      if (!payload.email) delete payload.email; // não enviar string vazia ao backend
      await createUtente(payload);
      setSuccess('Utente criado com sucesso!');
      setForm({
        nome: '',
        email: '',
        numero_utente_saude: '',
        telefone: '',
        numero_processo: '',
        data_nascimento: '',
        morada: '',
      });
      onSuccess?.();
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao criar utente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content criar-utente-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Novo Utente</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="criar-utente-form">
            <div className="form-section">
              <h3>Informações Pessoais</h3>

              <div className="form-group">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Nome Completo"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '12px' }}>(opcional — o familiar pode ativar depois)</span></label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email (opcional)"
                  />
                </div>

                <div className="form-group">
                  <label>Número de Utente de Saúde *</label>
                  <input
                    type="text"
                    name="numero_utente_saude"
                    value={form.numero_utente_saude}
                    onChange={handleChange}
                    placeholder="Número de Utente de Saúde"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data de Nascimento *</label>
                  <DateInput
                    name="data_nascimento"
                    value={form.data_nascimento}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Telefone *</label>
                  <input
                    type="tel"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    placeholder="Telefone"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Número de Processo *</label>
                  <input
                    type="text"
                    name="numero_processo"
                    value={form.numero_processo}
                    onChange={handleChange}
                    placeholder="Número de Processo"
                    required
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Morada</label>
                <textarea
                  name="morada"
                  value={form.morada}
                  onChange={handleChange}
                  placeholder="Morada"
                  rows="2"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 20, borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{ flex: '1 1 0', minWidth: 0, padding: '10px 16px', borderRadius: 6, border: 'none', background: '#e5e7eb', color: '#111827', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: '1 1 0', minWidth: 0, padding: '10px 16px', borderRadius: 6, border: 'none', background: '#059669', color: 'white', fontWeight: 500, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <PlusLg size={14} />
                {loading ? 'A criar...' : 'Criar Utente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
