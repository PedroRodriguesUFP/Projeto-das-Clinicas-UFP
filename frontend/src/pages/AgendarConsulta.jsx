import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateInput } from '../components/DateInput.jsx';
import { MiniCalendar } from '../components/MiniCalendar.jsx'
import { useAuth } from '../context/AuthContext.jsx';
import {
  createConsulta,
  getHorariosDisponiveis,
  getUtentes,
  getTerapeutas,
  getSalas,
  getAreasClinicas,
  checkDisponibilidade,
} from '../services/consultas.jsx';
import { getUtenteDetails } from '../services/utentes.jsx';
import '../styles/consultas.css';

export function AgendarConsulta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUtente = user?.role === 'utente';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [utentes, setUtentes] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [terapeutasFiltrados, setTerapeutasFiltrados] = useState([]);
  const [salas, setSalas] = useState([]);
  const [salasFiltradas, setSalasFiltradas] = useState([]);
  const [salasParaSlot, setSalasParaSlot] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);

  const [form, setForm] = useState({
    utente_id: isUtente && user?.id ? String(user.id) : '',
    terapeuta_id: '',
    sala_id: '',
    area_clinica_id: '',
    data_inicio: '',
    hora_inicio: '',
    duracao: '60',
    atribuir_terapeuta: false,
  });
  const [utenteDetails, setUtenteDetails] = useState(null);

  const dedupeSalasByNome = (listaSalas) => {
    const seen = new Set();
    return (listaSalas || []).filter((sala) => {
      const nome = (sala?.nome || '').trim().toLowerCase();
      if (!nome) return true;
      if (seen.has(nome)) return false;
      seen.add(nome);
      return true;
    });
  };

  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  useEffect(() => {
    if (user && user.role === 'terapeuta') {
      navigate('/calendario', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [t, s, a, u] = await Promise.all([
          getTerapeutas(),
          getSalas(),
          getAreasClinicas(),
          isUtente ? Promise.resolve([]) : getUtentes(),
        ]);

        if (isUtente) {
          setUtentes(user?.id ? [{ id: user.id, nome: user?.name || user?.email || 'Eu' }] : []);
        } else {
          setUtentes(u || []);
        }

        setTerapeutas(t || []);
        setSalas(s || []);
        setAreasClinicas(a || []);
      } catch {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isUtente, user?.email, user?.id, user?.name]);

  // Filter terapeutas and salas when area changes
  useEffect(() => {
    if (form.area_clinica_id) {
      const terapeutasArea = terapeutas.filter((t) =>
        t.area_clinica_id === parseInt(form.area_clinica_id)
      );
      setTerapeutasFiltrados(terapeutasArea);

      const salasArea = salas.filter((sala) => {
        if (sala.areas_clinicas && sala.areas_clinicas.length > 0) {
          return sala.areas_clinicas.some(
            (area) => area.id === parseInt(form.area_clinica_id)
          );
        }
        return false;
      });
      setSalasFiltradas(dedupeSalasByNome(salasArea));

      setForm((prev) => {
        const terapeutaValido = terapeutasArea.some((t) => t.user_id === Number(prev.terapeuta_id));
        return {
          ...prev,
          terapeuta_id: terapeutaValido ? prev.terapeuta_id : '',
          sala_id: '',
          hora_inicio: '',
        };
      });
      setSalasParaSlot([]);
    } else {
      setTerapeutasFiltrados([]);
      setSalasFiltradas([]);
      setHorariosDisponiveis([]);
      setSalasParaSlot([]);
    }
  }, [form.area_clinica_id, salas, terapeutas]);

  // Load available slots when terapeuta + date + area are set (no sala required)
  useEffect(() => {
    const fetchHorarios = async () => {
      if (!form.terapeuta_id || !form.data_inicio || !form.area_clinica_id) {
        setHorariosDisponiveis([]);
        return;
      }

      try {
        setLoadingHorarios(true);
        const result = await getHorariosDisponiveis(
          form.terapeuta_id,
          form.data_inicio,
          form.duracao,
          { areaClinicaId: form.area_clinica_id }
        );
        const horarios = result?.horarios_disponiveis || [];
        setHorariosDisponiveis(horarios);

        if (!horarios.includes(form.hora_inicio)) {
          setForm((prev) => ({ ...prev, hora_inicio: '' }));
        }
      } catch {
        setHorariosDisponiveis([]);
      } finally {
        setLoadingHorarios(false);
      }
    };

    fetchHorarios();
  }, [form.terapeuta_id, form.data_inicio, form.duracao, form.area_clinica_id]);

  // When slot is selected, load available salas for that slot (non-utente only)
  useEffect(() => {
    if (!form.hora_inicio || !form.data_inicio || isUtente) {
      if (!isUtente) setSalasParaSlot([]);
      return;
    }

    const [year, month, day] = form.data_inicio.split('-');
    const [hour, minute] = form.hora_inicio.split(':');
    const dataInicio = new Date(year, month - 1, day, parseInt(hour), parseInt(minute));
    const dataFim = new Date(dataInicio.getTime() + parseInt(form.duracao) * 60000);

    setForm((prev) => ({ ...prev, sala_id: '' }));

    checkDisponibilidade(formatLocalDateTime(dataInicio), formatLocalDateTime(dataFim))
      .then((resultado) => {
        const indisponiveis = resultado.salas_indisponiveis || [];
        const available = salasFiltradas.filter(
          (sala) => !indisponiveis.some((id) => parseInt(id) === sala.id)
        );
        setSalasParaSlot(available);
      })
      .catch(() => {
        setSalasParaSlot(salasFiltradas);
      });
  }, [form.hora_inicio, form.data_inicio, form.duracao, isUtente]);

  // Carregar detalhes do utente para saber se já tem terapeuta atribuído nesta área
  useEffect(() => {
    const uId = isUtente ? user?.id : form.utente_id;
    if (!uId) { setUtenteDetails(null); return; }
    getUtenteDetails(uId).then(setUtenteDetails).catch(() => setUtenteDetails(null));
  }, [form.utente_id, isUtente, user?.id]);

  const isFisioterapia =
    areasClinicas.find((a) => String(a.id) === form.area_clinica_id)?.nome?.toLowerCase().includes('fisio') ?? false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'data_inicio' || name === 'terapeuta_id' || name === 'duracao') {
        return { ...prev, [name]: value, hora_inicio: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleAreaSelect = (areaId) => {
    setForm((prev) => ({
      ...prev,
      area_clinica_id: String(areaId),
      terapeuta_id: '',
      sala_id: '',
      data_inicio: '',
      hora_inicio: '',
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if ((!isUtente && !form.utente_id) || !form.terapeuta_id || (!isUtente && !isFisioterapia && !form.sala_id) || !form.area_clinica_id || !form.data_inicio || !form.hora_inicio) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const [year, month, day] = form.data_inicio.split('-');
      const [hour, minute] = form.hora_inicio.split(':');

      const dataInicio = new Date(year, month - 1, day, hour, minute);
      const dataFim = new Date(dataInicio.getTime() + parseInt(form.duracao) * 60000);

      const utenteId = isUtente ? Number(user?.id) : parseInt(form.utente_id);

      if (!Number.isFinite(utenteId) || utenteId <= 0) {
        setError('Utente inválido');
        setSaving(false);
        return;
      }

      const payload = {
        utente_id: utenteId,
        terapeuta_id: parseInt(form.terapeuta_id),
        ...(isUtente ? {} : (form.sala_id ? { sala_id: parseInt(form.sala_id) } : {})),
        area_clinica_id: parseInt(form.area_clinica_id),
        data_inicio: formatLocalDateTime(dataInicio),
        data_fim: formatLocalDateTime(dataFim),
        atribuir_terapeuta: form.atribuir_terapeuta,
      };

      await createConsulta(payload);
      navigate('/consultas');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao agendar consulta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page">A carregar...</div>;
  }

  return (
    <div className="page agendar-consulta">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/consultas')}>
          ← Voltar
        </button>
        <h1>Agendar Nova Consulta</h1>
      </div>

      <div>
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="agendar-step-card">
          <h2>1. Escolher Área Clínica</h2>

          <div className="area-cards-grid">
            {areasClinicas.map((area) => {
              const isSelected = String(area.id) === form.area_clinica_id;
              return (
                <button
                  key={area.id}
                  type="button"
                  className={`area-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleAreaSelect(area.id)}
                >
                  <span className="area-card-title">{area.nome}</span>
                </button>
              );
            })}
          </div>

          {!form.area_clinica_id && (
            <p className="helper-text">Seleciona uma área clínica para desbloquear os restantes campos.</p>
          )}

          {form.area_clinica_id && (
            <>
              <h2>2. Definir Consulta</h2>

              <div className="agendar-definir-cols">
                <div className="agendar-definir-left">
                  {!isUtente && (
                    <div className="form-group">
                      <label>Utente *</label>
                      <select
                        name="utente_id"
                        value={form.utente_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Selecionar utente...</option>
                        {utentes.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Terapeuta *</label>
                    <select
                      name="terapeuta_id"
                      value={form.terapeuta_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecionar terapeuta...</option>
                      {terapeutasFiltrados.map((t) => (
                        <option key={t.user_id} value={t.user_id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Duração (minutos) *</label>
                    <select
                      name="duracao"
                      value={form.duracao}
                      onChange={handleChange}
                      required
                    >
                      <option value="30">30 minutos</option>
                      <option value="60">1 hora</option>
                      <option value="90">1 hora 30 min</option>
                      <option value="120">2 horas</option>
                    </select>
                  </div>
                </div>

                <div className="agendar-definir-right">
                  <p className="utente-info-label" style={{ margin: 0 }}>Dados do Utente</p>
                  {utenteDetails ? (
                    <div className="utente-info-panel">
                      <div className="utente-info-row">
                        <span className="utente-info-label">Nome</span>
                        <span className="utente-info-value">{utenteDetails.nome || '—'}</span>
                      </div>
                      <div className="utente-info-row">
                        <span className="utente-info-label">Email</span>
                        <span className="utente-info-value">{utenteDetails.email || '—'}</span>
                      </div>
                      <div className="utente-info-row">
                        <span className="utente-info-label">Telefone</span>
                        <span className="utente-info-value">{utenteDetails.telefone || '—'}</span>
                      </div>
                      <div className="utente-info-row">
                        <span className="utente-info-label">Morada</span>
                        <span className="utente-info-value">{utenteDetails.morada || '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="utente-info-panel">
                      <p className="utente-info-empty">
                        {isUtente
                          ? 'Informações de contacto não disponíveis.'
                          : 'Seleciona um utente para ver os dados de contacto.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <h2>3. Data e Horário</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Data *</label>
                  <MiniCalendar
                    value={form.data_inicio}
                    onChange={(novaData)=>{
                      handleChange({
                        target:{name:'data_inicio',value:novaData}
                      });
                    }}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Horários disponíveis do terapeuta *</label>
                {!form.terapeuta_id || !form.data_inicio ? (
                  <p className="helper-text">
                    Seleciona terapeuta e data para veres os horários disponíveis.
                  </p>
                ) : loadingHorarios ? (
                  <p className="helper-text">A carregar horários...</p>
                ) : horariosDisponiveis.length === 0 ? (
                  <p className="helper-text">Sem horários disponíveis para esta data e duração.</p>
                ) : (
                  <div className="slots-grid">
                    {horariosDisponiveis.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-btn ${form.hora_inicio === slot ? 'selected' : ''}`}
                        onClick={() => setForm((prev) => ({ ...prev, hora_inicio: slot }))}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isUtente && form.hora_inicio && form.terapeuta_id && form.area_clinica_id && (() => {
                const jaTemTerapeuta = utenteDetails?.terapeutas?.some(
                  (t) => String(t.area_clinica_id) === String(form.area_clinica_id)
                );
                if (jaTemTerapeuta) return null;
                const terapeutaNome = terapeutasFiltrados.find(
                  (t) => String(t.user_id) === String(form.terapeuta_id)
                )?.nome || 'terapeuta selecionado';
                const areaNome = areasClinicas.find(
                  (a) => String(a.id) === String(form.area_clinica_id)
                )?.nome || 'esta área';
                return (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: '0.5rem 0 1rem' }}>
                    <input
                      type="checkbox"
                      checked={form.atribuir_terapeuta}
                      onChange={(e) => setForm((prev) => ({ ...prev, atribuir_terapeuta: e.target.checked }))}
                    />
                    Atribuir <strong>{terapeutaNome}</strong> como terapeuta responsável de <strong>{areaNome}</strong>
                  </label>
                );
              })()}

              {form.hora_inicio && !isUtente && (
                <>
                  <h2>4. Sala</h2>
                  {isFisioterapia ? (
                    <p className="helper-text">A sala será atribuída no momento da consulta.</p>
                  ) : salasParaSlot.length === 0 ? (
                    <p className="helper-text">Sem salas disponíveis para este horário.</p>
                  ) : (
                    <div className="form-group">
                      <label>Sala *</label>
                      <select
                        name="sala_id"
                        value={form.sala_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Selecionar sala...</option>
                        {salasParaSlot.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {form.hora_inicio && isUtente && (
                <div className="form-group">
                  <label>Sala</label>
                  <input value="Atribuída automaticamente conforme disponibilidade" disabled />
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/consultas')}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !form.hora_inicio || (!isUtente && !isFisioterapia && !form.sala_id)}
                >
                  {saving ? 'A agendar...' : 'Agendar Consulta'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
