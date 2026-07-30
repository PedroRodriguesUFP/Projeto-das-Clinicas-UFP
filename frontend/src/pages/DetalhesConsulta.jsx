import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // O teu hook de autenticação
import { getNotasDaConsulta, saveNotasDaConsulta } from '../services/notas';
import '../styles/consultas.css';

export function DetalhesConsulta() {
  const { id } = useParams();
  const { user } = useAuth(); // Assume { role: 'medico' | 'staff' | 'utente' }
  const [activeTab, setActiveTab] = useState('detalhes');
  
  // Estado das Notas
  const [notas, setNotas] = useState({
    medicamento: '',
    dosagem: '',
    frequencia: '',
    duracao: '',
    observacoes_gerais: ''
  });
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);

  useEffect(() => {
    if (activeTab === 'notas') {
      carregarNotas();
    }
  }, [activeTab]);

  const carregarNotas = async () => {
    try {
      const data = await getNotasDaConsulta(id);
      if (data) setNotas(data);
    } catch (error) {
      console.log("Ainda não existem notas para esta consulta.");
    }
  };

  const handleChange = (e) => {
    setNotas({ ...notas, [e.target.name]: e.target.value });
  };

  const handleSaveNotas = async (e) => {
    e.preventDefault();
    setIsLoadingNotas(true);
    try {
      await saveNotasDaConsulta(id, notas);
      alert("Notas guardadas com sucesso!");
    } catch (error) {
      alert("Erro ao guardar as notas.");
    } finally {
      setIsLoadingNotas(false);
    }
  };

  // Verifica se o user tem permissão para editar
  const canEdit = user?.role === 'medico' || user?.role === 'staff' || user?.role === 'admin';

  return (
    <div className="detalhes-consulta-container">
      {/* NAVEGAÇÃO DE ABAS */}
      <div className="tabs-header">
        <button 
          className={activeTab === 'detalhes' ? 'active' : ''} 
          onClick={() => setActiveTab('detalhes')}
        >
          Detalhes da Consulta
        </button>
        <button 
          className={activeTab === 'notas' ? 'active' : ''} 
          onClick={() => setActiveTab('notas')}
        >
          Notas e Prescrição
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="tab-content">
        {activeTab === 'detalhes' && (
           <div>{/* O TEU CÓDIGO ATUAL DE DETALHES FICA AQUI */}</div>
        )}

        {activeTab === 'notas' && (
          <div className="notas-section">
            <h3 className="section-title">Prescrição Estruturada</h3>
            
            {canEdit ? (
              /* MODO EDIÇÃO (MÉDICO/STAFF) */
              <form onSubmit={handleSaveNotas} className="notas-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Medicamento</label>
                    <input type="text" name="medicamento" value={notas.medicamento} onChange={handleChange} required placeholder="Ex: Ibuprofeno 600mg" />
                  </div>
                  <div className="form-group">
                    <label>Dosagem</label>
                    <input type="text" name="dosagem" value={notas.dosagem} onChange={handleChange} required placeholder="Ex: 1 Comprimido" />
                  </div>
                  <div className="form-group">
                    <label>Frequência</label>
                    <input type="text" name="frequencia" value={notas.frequencia} onChange={handleChange} required placeholder="Ex: De 8 em 8 horas" />
                  </div>
                  <div className="form-group">
                    <label>Duração</label>
                    <input type="text" name="duracao" value={notas.duracao} onChange={handleChange} required placeholder="Ex: Durante 5 dias" />
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Observações Gerais / Plano de Tratamento</label>
                  <textarea name="observacoes_gerais" value={notas.observacoes_gerais} onChange={handleChange} rows="4" placeholder="Notas adicionais, exercícios recomendados..."></textarea>
                </div>
                <button type="submit" disabled={isLoadingNotas} className="btn-primary">
                  {isLoadingNotas ? 'A guardar...' : 'Guardar Prescrição'}
                </button>
              </form>

            ) : (
              /* MODO READ-ONLY (UTENTE/PACIENTE) */
              <div className="notas-readonly">
                <table className="prescricao-table">
                  <thead>
                    <tr>
                      <th>Medicamento</th>
                      <th>Dosagem</th>
                      <th>Frequência</th>
                      <th>Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{notas.medicamento || "N/A"}</td>
                      <td>{notas.dosagem || "N/A"}</td>
                      <td>{notas.frequencia || "N/A"}</td>
                      <td>{notas.duracao || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>
                
                {notas.observacoes_gerais && (
                  <div className="observacoes-card">
                    <h4>Observações do Médico</h4>
                    <p>{notas.observacoes_gerais}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}