import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTerapeutas } from '../services/consultas.jsx';
import { getUtentesDeTerapeuta, updateTerapeutaUtente } from '../services/utentes.jsx';
import { ArrowLeftRight, CheckLg } from 'react-bootstrap-icons';
import '../styles/consultas.css';

export function TransferirUtentes() {
  const navigate = useNavigate();
  const [terapeutas, setTerapeutas] = useState([]);
  const [terapeutaOrigem, setTerapeutaOrigem] = useState('');
  const [utentes, setUtentes] = useState([]);
  const [novosT, setNovosT] = useState({});
  const [salvando, setSalvando] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [loadingUtentes, setLoadingUtentes] = useState(false);
  const [bulkT, setBulkT] = useState({});
  const [bulkSalvando, setBulkSalvando] = useState({});

  useEffect(() => {
    getTerapeutas()
      .then((data) => setTerapeutas(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!terapeutaOrigem) {
      setUtentes([]);
      setNovosT({});
      setFeedbacks({});
      return;
    }
    setLoadingUtentes(true);
    setUtentes([]);
    setNovosT({});
    setFeedbacks({});
    getUtentesDeTerapeuta(terapeutaOrigem)
      .then((data) => setUtentes(data || []))
      .catch(() => setUtentes([]))
      .finally(() => setLoadingUtentes(false));
  }, [terapeutaOrigem]);

  const rowKey = (u) => `${u.utente_id}-${u.area_clinica_id}`;

  const terapeutasPorArea = (areaId) =>
    terapeutas.filter(
      (t) =>
        String(t.user_id) !== String(terapeutaOrigem) &&
        t.area_clinica_id === areaId
    );

  const handleSalvar = async (u) => {
    const key = rowKey(u);
    const novoTerapeutaId = novosT[key];
    if (!novoTerapeutaId) return;

    setSalvando((s) => ({ ...s, [key]: true }));
    setFeedbacks((f) => ({ ...f, [key]: null }));
    try {
      await updateTerapeutaUtente(u.utente_id, novoTerapeutaId, u.area_clinica_id);
      setUtentes((prev) => prev.filter((x) => rowKey(x) !== key));
      setFeedbacks((f) => ({ ...f, [key]: 'ok' }));
    } catch {
      setFeedbacks((f) => ({ ...f, [key]: 'erro' }));
    } finally {
      setSalvando((s) => ({ ...s, [key]: false }));
    }
  };

  const areasDistintas = [...new Map(utentes.map((u) => [u.area_clinica_id, u.area_nome])).entries()];

  const handleTransferirTodos = async (areaId, areaNome) => {
    const areaKey = String(areaId);
    const novoTId = bulkT[areaKey];
    if (!novoTId) return;

    const linhasArea = utentes.filter((u) => u.area_clinica_id === areaId);
    setBulkSalvando((s) => ({ ...s, [areaKey]: true }));

    const results = await Promise.allSettled(
      linhasArea.map((u) => updateTerapeutaUtente(u.utente_id, novoTId, u.area_clinica_id))
    );

    const transferidos = linhasArea.filter((_, i) => results[i].status === 'fulfilled');
    const transferidosKeys = new Set(transferidos.map(rowKey));
    setUtentes((prev) => prev.filter((u) => !transferidosKeys.has(rowKey(u))));
    setBulkSalvando((s) => ({ ...s, [areaKey]: false }));
  };

  return (
    <div className="page transferir-utentes">
      <div className="page-header">
        <div>
          <h1><ArrowLeftRight size={22} /> Transferir Utentes</h1>
          <p className="text-secondary">Reatribuir utentes a outro terapeuta</p>
        </div>
      </div>

      <div className="agendar-step-card">
        <label className="form-label">Terapeuta de origem</label>
        <select
          className="form-select"
          value={terapeutaOrigem}
          onChange={(e) => setTerapeutaOrigem(e.target.value)}
        >
          <option value="">Selecionar terapeuta...</option>
          {terapeutas.map((t) => (
            <option key={t.user_id} value={t.user_id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      {!terapeutaOrigem && (
        <p className="text-secondary">Seleciona um terapeuta para ver os utentes atribuídos.</p>
      )}

      {terapeutaOrigem && loadingUtentes && (
        <p className="text-secondary">A carregar utentes...</p>
      )}

      {terapeutaOrigem && !loadingUtentes && utentes.length === 0 && (
        <p className="text-secondary">Este terapeuta não tem utentes atribuídos.</p>
      )}

      {terapeutaOrigem && !loadingUtentes && utentes.length > 0 && (
        <>
          {areasDistintas.map(([areaId, areaNome]) => {
            const linhas = utentes.filter((u) => u.area_clinica_id === areaId);
            const disponiveis = terapeutasPorArea(areaId);
            const areaKey = String(areaId);

            return (
              <div key={areaId} className="agendar-step-card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <strong>{areaNome}</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Transferir todos para:</span>
                    <select
                      className="form-select"
                      style={{ width: 220 }}
                      value={bulkT[areaKey] || ''}
                      onChange={(e) => setBulkT((b) => ({ ...b, [areaKey]: e.target.value }))}
                      disabled={disponiveis.length === 0}
                    >
                      <option value="">Selecionar terapeuta...</option>
                      {disponiveis.map((t) => (
                        <option key={t.user_id} value={t.user_id}>{t.nome}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!bulkT[areaKey] || bulkSalvando[areaKey]}
                      onClick={() => handleTransferirTodos(areaId, areaNome)}
                    >
                      {bulkSalvando[areaKey] ? 'A transferir...' : 'Transferir todos'}
                    </button>
                  </div>
                </div>

                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Utente</th>
                      <th>Novo terapeuta</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((u) => {
                      const key = rowKey(u);
                      return (
                        <tr key={key}>
                          <td>{u.utente_nome}</td>
                          <td>
                            <select
                              className="form-select"
                              style={{ width: '100%', maxWidth: 260 }}
                              value={novosT[key] || ''}
                              onChange={(e) => setNovosT((n) => ({ ...n, [key]: e.target.value }))}
                              disabled={disponiveis.length === 0}
                            >
                              <option value="">Selecionar terapeuta...</option>
                              {disponiveis.map((t) => (
                                <option key={t.user_id} value={t.user_id}>{t.nome}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!novosT[key] || salvando[key]}
                              onClick={() => handleSalvar(u)}
                            >
                              {salvando[key] ? 'A guardar...' : <><CheckLg size={14} /> Guardar</>}
                            </button>
                            {feedbacks[key] === 'erro' && (
                              <span style={{ color: 'red', marginLeft: '0.5rem', fontSize: '0.8rem' }}>Erro</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
