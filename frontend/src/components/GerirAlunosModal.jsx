import { useState, useEffect } from 'react';
import { Search, Plus, X, Trash } from 'react-bootstrap-icons';
import { getAlunosDisponiveis, getAlunosDoProfessor, adicionarAluno, removerAluno } from '../services/terapeutas.jsx';
import { ConfirmModal } from './ConfirmModal.jsx';
import '../styles/gerir-alunos.css';

export function GerirAlunosModal({ isOpen, onClose, onSuccess }) {
  const [alunos, setAlunos] = useState([]);
  const [meuAlunos, setMeuAlunos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aba, setAba] = useState('disponiveis'); // 'disponiveis' ou 'meus'
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      carregarAlunos();
    }
  }, [isOpen, search]);

  const carregarAlunos = async () => {
    try {
      setLoading(true);
      setError('');
      const [disponiveis, meus] = await Promise.all([
        getAlunosDisponiveis(search),
        getAlunosDoProfessor()
      ]);
      setAlunos(disponiveis);
      setMeuAlunos(meus);
    } catch (err) {
      setError('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarAluno = async (alunoId) => {
    try {
      setError('');
      setSuccess('');
      await adicionarAluno(alunoId);
      setSuccess('Aluno adicionado com sucesso!');
      carregarAlunos();
      onSuccess?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao adicionar aluno');
    }
  };

  const handleRemoverAluno = (alunoId) => {
    setConfirmRemoveId(alunoId);
  };

  const doRemoverAluno = async () => {
    if (!confirmRemoveId) return;
    try {
      setError('');
      setSuccess('');
      await removerAluno(confirmRemoveId);
      setSuccess('Aluno removido com sucesso!');
      carregarAlunos();
      onSuccess?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao remover aluno');
    } finally {
      setConfirmRemoveId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gerir Alunos</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${aba === 'disponiveis' ? 'active' : ''}`}
            onClick={() => setAba('disponiveis')}
          >
            ➕ Alunos Disponíveis ({alunos.length})
          </button>
          <button
            className={`modal-tab ${aba === 'meus' ? 'active' : ''}`}
            onClick={() => setAba('meus')}
          >
            ✓ Meus Alunos ({meuAlunos.length})
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {aba === 'disponiveis' && (
            <>
              <div className="search-container">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Procurar aluno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="alunos-list">
                {loading ? (
                  <p className="loading">Carregando...</p>
                ) : alunos.length === 0 ? (
                  <p className="empty">Nenhum aluno disponível</p>
                ) : (
                  alunos.map(aluno => (
                    <div key={aluno.user_id} className="aluno-item">
                      <div className="aluno-info">
                        <p className="aluno-nome">{aluno.nome}</p>
                        <p className="aluno-email">{aluno.email}</p>
                      </div>
                      <button
                        className="btn-adicionar"
                        onClick={() => handleAdicionarAluno(aluno.user_id)}
                      >
                        <Plus size={18} />
                        Adicionar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {aba === 'meus' && (
            <div className="alunos-list">
              {loading ? (
                <p className="loading">Carregando...</p>
              ) : meuAlunos.length === 0 ? (
                <p className="empty">Ainda não adicionaste nenhum aluno</p>
              ) : (
                meuAlunos.map(aluno => (
                  <div key={aluno.user_id} className="aluno-item">
                    <div className="aluno-info">
                      <p className="aluno-nome">{aluno.nome}</p>
                      <p className="aluno-email">{aluno.email}</p>
                      <p className="aluno-email" style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                        Último acesso: {aluno.last_login_at
                          ? new Date(aluno.last_login_at).toLocaleString('pt-PT')
                          : 'Nunca'}
                      </p>
                    </div>
                    <button
                      className="btn-remover"
                      onClick={() => handleRemoverAluno(aluno.user_id)}
                    >
                      <Trash size={18} />
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        open={!!confirmRemoveId}
        title="Remover aluno"
        message="Tem a certeza que deseja remover este aluno?"
        danger
        onConfirm={doRemoverAluno}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
}
