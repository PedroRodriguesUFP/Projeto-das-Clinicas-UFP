import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtentes, deleteUtente } from '../services/utentes.jsx';
import { Search, Eye, Pencil, Trash } from 'react-bootstrap-icons';
import '../styles/utentes.css';

export function ListaUtentes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [utentes, setUtentes] = useState([]);
  const [filteredUtentes, setFilteredUtentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Carregar utentes
  useEffect(() => {
    fetchUtentes();
  }, []);

  const fetchUtentes = async () => {
    try {
      setError('');
      const data = await getUtentes();
      setUtentes(data || []);
      setFilteredUtentes(data || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao carregar utentes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar utentes por pesquisa
  useEffect(() => {
    const filtered = utentes.filter((utente) =>
      utente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      utente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (utente.numero_processo && utente.numero_processo.includes(searchTerm))
    );
    setFilteredUtentes(filtered);
  }, [searchTerm, utentes]);

  const handleDelete = async (id) => {
    try {
      await deleteUtente(id);
      setUtentes(utentes.filter((u) => u.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setDeleteConfirm(null);
      setError(err?.response?.data?.error || 'Erro ao eliminar utente');
    }
  };

  const canManagedUtentes = ['admin', 'administrativo'].includes(user?.role);

  if (loading) {
    return <div className="page">A carregar utentes...</div>;
  }

  return (
    <div className="page utentes-list">
      <div className="page-header">
        <div>
          <h1>Gestão de Utentes</h1>
          <p>Total: {filteredUtentes.length} utentes</p>
        </div>
        {canManagedUtentes && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/utentes/novo')}
          >
            + Novo Utente
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="search-box">
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou nº processo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <span className="search-icon"><Search size={16} /></span>
      </div>

      {filteredUtentes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum utente encontrado</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="utentes-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Nº Processo</th>
                <th>Telefone</th>
                <th>Morada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUtentes.map((utente) => (
                <tr key={utente.id}>
                  <td className="nome">{utente.nome}</td>
                  <td>{utente.email}</td>
                  <td>{utente.numero_processo || '-'}</td>
                  <td>{utente.telefone || '-'}</td>
                  <td className="morada">{utente.morada || '-'}</td>
                  <td className="actions">
                    <button
                      className="btn-icon btn-view"
                      onClick={() => navigate(`/utentes/${utente.id}/perfil`)}
                      title="Ver"
                    >
                      <Eye size={16} />
                    </button>
                    {canManagedUtentes && (
                      <>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => navigate(`/utentes/${utente.id}/editar`)}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => setDeleteConfirm(utente.id)}
                          title="Eliminar"
                        >
                          <Trash size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmação de Eliminar */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar Eliminação</h2>
            <p>Tem a certeza que deseja eliminar este utente?</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
