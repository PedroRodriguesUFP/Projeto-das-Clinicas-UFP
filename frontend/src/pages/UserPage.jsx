import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DateInput } from '../components/DateInput.jsx';
import {
  Person as User,
  Envelope as Mail,
  Telephone as Phone,
  GeoAlt as MapPin,
  CalendarDate as Calendar,
  Clock,
  FileText,
  Clipboard2Pulse as Stethoscope,
  PencilSquare as Edit2,
  Check,
  X,
  Camera,
  FilePdf,
  ArrowRepeat,
  Download,
} from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtenteDetails, getUtenteConsultas, getUtenteRegistos, updateUtente, uploadAvatar, updateTerapeutaUtente } from '../services/utentes.jsx';
import { getTerapeutas, getAreasClinicas, getConsultas } from '../services/consultas.jsx';
import { getFichasAvaliacao, getFichasPsicologia, getFichasTerapiaFala, getFichasNutricao } from '../services/fichas.jsx';
import '../styles/user-profile.css';

// Função para mapear role para nome em português
function getRoleDisplayName(role) {
  const roleMap = {
    'admin': 'Admin',
    'administrativo': 'Administrativo',
    'terapeuta': 'Terapeuta',
    'utente': 'Paciente',
  };
  return roleMap[role] || role || 'Paciente';
}

export function UserPage() {
  const { user } = useAuth();
  const { id: routeUtenteId } = useParams();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [registos, setRegistos] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);
  const [terapeutasEditados, setTerapeutasEditados] = useState({}); // { area_clinica_id: terapeuta_id }
  const [loading, setLoading] = useState(true);
  const [loadingTerapeutas, setLoadingTerapeutas] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const profileUtenteId = routeUtenteId ? parseInt(routeUtenteId, 10) : user?.id;
  const isOwnProfile = !routeUtenteId || Number(routeUtenteId) === Number(user?.id);

  const getFichaValue = (data, key) => {
    if (!data || !key) return undefined;
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1);
    return data[key] ?? data[camelKey] ?? data[pascalKey];
  };

  // Normalizar dados de consultas para formato consistente
  const normalizeConsultas = (consultas) => {
    if (!Array.isArray(consultas)) return [];
    
    return consultas.map((c) => {
      // Se é ConsultaDTO (com objetos), converter para UtenteConsultaResponse
      if (c.terapeuta && typeof c.terapeuta === 'object') {
        return {
          id: c.id,
          terapeuta_nome: c.terapeuta?.nome || '-',
          sala_nome: c.sala?.nome || '-',
          area_clinica: c.area_clinica?.nome || '-',
          estado: c.estado || '-',
          data_inicio: c.data_inicio instanceof Date 
            ? c.data_inicio.toLocaleString('pt-PT')
            : typeof c.data_inicio === 'string'
            ? c.data_inicio
            : new Date(c.data_inicio).toLocaleString('pt-PT'),
          data_fim: c.data_fim instanceof Date
            ? c.data_fim.toLocaleString('pt-PT')
            : typeof c.data_fim === 'string'
            ? c.data_fim
            : new Date(c.data_fim).toLocaleString('pt-PT'),
        };
      }
      // Se já é UtenteConsultaResponse, manter como está
      return c;
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setError('');

        // Se não tem user autenticado
        if (!profileUtenteId) {
          setError('Utilizador não autenticado');
          setLoading(false);
          return;
        }

        // Se é utente e a aba ativa é registos, resetar para details
        if (user?.role === 'utente' && activeTab === 'registos') {
          setActiveTab('details');
        }

        // Tenta buscar detalhes do utente
        let details = null;
        try {
          details = await getUtenteDetails(profileUtenteId);
          setUserDetails(details);
          setEditData(details);
        } catch (err) {
          if (isOwnProfile) {
            // Se não encontrar utente, usa dados do auth context como fallback
            const fallbackData = {
              id: user.id,
              nome: user.name || user.email || 'Utilizador',
              email: user.email || '',
              telefone: '',
              morada: '',
              data_nascimento: '',
              numero_processo: '',
            };
            setUserDetails(fallbackData);
            setEditData(fallbackData);
          } else {
            setError('Não foi possível carregar os dados do utente');
            setUserDetails(null);
            setEditData(null);
          }
        }

        // Tenta buscar consultas, registos e fichas
        try {
          let consultasData = [];
          
          // Se for terapeuta/professor (próprio perfil), buscar suas consultas
          if (isOwnProfile && user?.role === 'terapeuta') {
            consultasData = await getConsultas().catch(() => []);
          } else {
            // Se for utente ou visualizando perfil de outro, buscar consultas do utente
            consultasData = await getUtenteConsultas(profileUtenteId).catch(() => []);
          }

          const [registosData, fichasAval, fichasPsic, fichasFala, fichasNutri] = await Promise.all([
            getUtenteRegistos(profileUtenteId).catch(() => []),
            getFichasAvaliacao(profileUtenteId).catch(() => []),
            getFichasPsicologia(profileUtenteId).catch(() => []),
            getFichasTerapiaFala(profileUtenteId).catch(() => []),
            getFichasNutricao(profileUtenteId).catch(() => []),
          ]);

          setConsultas(Array.isArray(consultasData) ? normalizeConsultas(consultasData) : []);
          setRegistos(Array.isArray(registosData) ? registosData : []);
          setFichas([
            ...(fichasAval || []).map(f => ({ ...f, _formTipo: 'Fisioterapia' })),
            ...(fichasPsic || []).map(f => ({ ...f, _formTipo: 'Psicologia' })),
            ...(fichasFala || []).map(f => ({ ...f, _formTipo: 'Terapia da Fala' })),
            ...(fichasNutri || []).map(f => ({ ...f, _formTipo: 'Nutrição' })),
          ]);
        } catch (err) {
          setConsultas([]);
          setRegistos([]);
          setFichas([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [profileUtenteId, isOwnProfile, user?.id, user?.name, user?.email, user?.role]);

  const handleEditClick = async () => {
    setIsEditMode(true);
    setActiveTab('details');
    
    // Inicializar terapeutasEditados com as atribuições actuais
    const atribuicoes = {};
    (userDetails?.terapeutas || []).forEach((t) => {
      atribuicoes[t.area_clinica_id] = t.terapeuta_id;
    });
    setTerapeutasEditados(atribuicoes);

    // Carregar lista de terapeutas e áreas se for staff
    if (user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'terapeuta') {
      try {
        setLoadingTerapeutas(true);
        const [ts, areas] = await Promise.all([getTerapeutas(), getAreasClinicas()]);
        setTerapeutas(ts || []);
        setAreasClinicas(areas || []);
      } catch (err) {
        setError('Erro ao carregar lista de terapeutas');
      } finally {
        setLoadingTerapeutas(false);
      }
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditData(userDetails);
    setSuccessMessage('');
  };

  const handleInputChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: value,
    });
  };

  const handleSave = async () => {
    if (!editData?.id) {
      setError('Erro: ID do utente não encontrado');
      return;
    }

    // Validação básica
    if (!editData.nome?.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!editData.email?.trim()) {
      setError('Email é obrigatório');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Atualizar dados do utente
      await updateUtente(editData.id, {
        nome: editData.nome,
        email: editData.email,
        telefone: editData.telefone,
        morada: editData.morada,
        data_nascimento: editData.data_nascimento,
        numero_processo: editData.numero_processo,
      });

      // Guardar atribuições de terapeutas por área (se staff)
      if (user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'terapeuta') {
        const original = {};
        (userDetails?.terapeutas || []).forEach((t) => { original[t.area_clinica_id] = t.terapeuta_id; });
        for (const [areaId, terapeutaId] of Object.entries(terapeutasEditados)) {
          if (String(original[areaId]) !== String(terapeutaId)) {
            await updateTerapeutaUtente(editData.id, Number(terapeutaId), Number(areaId));
          }
        }
      }

      setUserDetails(editData);
      setIsEditMode(false);
      setSuccessMessage('✓ Dados atualizados com sucesso!');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Erro ao atualizar dados. Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleConsultaClick = (consultaId) => {
    // Utentes veem apenas detalhes (read-only)
    if (user?.role === 'utente') {
      navigate(`/consultas/${consultaId}/detalhes`);
    } else {
      // Terapeutas, admin e outros podem editar
      navigate(`/consultas/${consultaId}/editar`);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de ficheiro
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem demasiado grande (máximo 5MB)');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result);
    };
    reader.readAsDataURL(file);

    // Fazer upload
    setIsUploadingAvatar(true);
    setError('');

    try {
      const response = await uploadAvatar(userDetails.id, file);

      // Atualizar userDetails com o novo foto_url
      const newUserDetails = {
        ...userDetails,
        foto_url: response.foto_url,
      };
      setUserDetails(newUserDetails);

      // MANTER O PREVIEW INDEFINIDAMENTE - ele é o fallback
      // Se foto_url falhar, o preview continua visível

      setSuccessMessage('✓ Avatar atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Erro ao fazer upload do avatar';
      setError(errorMsg);
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">A carregar dados do perfil...</p>
        </div>
      </div>
    );
  }

  if (error && !userDetails) {
    return (
      <div className="user-profile-container">
        <div className="error-container">
          <div className="error-message">
            <strong>Erro:</strong> {error}
            <p style={{ marginTop: '8px', fontSize: '12px' }}>
              Tente fazer login novamente ou contacte o suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    return (name || '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('agendada') || statusLower.includes('upcoming')) {
      return 'agendada';
    } else if (statusLower.includes('concluída') || statusLower.includes('completed')) {
      return 'concluida';
    } else if (statusLower.includes('cancelada') || statusLower.includes('cancelled')) {
      return 'cancelada';
    }
    return 'agendada';
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <div className="user-profile-container">
      <div className="profile-wrapper">
        {/* Header Card */}
        <motion.div
          className="profile-header-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="profile-header-content">
            <div className="profile-avatar-container" onClick={handleAvatarClick} title="Clique para mudar a foto">
              <div
                className={`profile-avatar ${(avatarPreview || (userDetails && userDetails.foto_url)) ? 'has-avatar' : ''}`}
              >
                {(avatarPreview || (userDetails && userDetails.foto_url)) ? (
                  <img
                    key={`avatar-${avatarPreview || (userDetails && userDetails.foto_url)}`}
                    src={avatarPreview || (userDetails?.foto_url ? `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${userDetails.foto_url}` : null)}
                    className="avatar-img"
                  />
                ) : (
                  <span className="avatar-initials">{getInitials(userDetails?.nome || user?.name)}</span>
                )}
              </div>
              <div className="avatar-upload-badge">
                <Camera size={16} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                disabled={isUploadingAvatar || !isOwnProfile}
              />
            </div>

            <div className="profile-info">
              <div className="profile-name-section">
                <h1>{userDetails?.nome || user?.name || 'Utilizador'}</h1>
                {(user?.role === 'utente' || routeUtenteId) && (
                  <p>Nº Processo: {userDetails?.numero_processo || '-'}</p>
                )}
              </div>

              <div className="profile-badges">
                <span className="badge badge-primary">
                  <User size={16} />
                  {routeUtenteId ? 'Perfil de Utente' : getRoleDisplayName(user?.role)}
                </span>
                {!userDetails?.id && !consultas?.length && !registos?.length && (
                  <span
                    className="badge"
                    title="Dados carregados do contexto de autenticação"
                    style={{
                      background: 'rgba(249, 115, 22, 0.1)',
                      borderColor: 'rgba(249, 115, 22, 0.3)',
                      color: '#92400e',
                      fontSize: '12px'
                    }}
                  >
                    ⓘ Dados limitados
                  </span>
                )}
              </div>

              <div className="profile-contact-grid">
                <div className="contact-item">
                  <Mail size={18} />
                  <span className="contact-item-text">{userDetails?.email}</span>
                </div>
                <div className="contact-item">
                  <Phone size={18} />
                  <span className="contact-item-text">{userDetails?.telefone || '-'}</span>
                </div>
                <div className="contact-item">
                  <Calendar size={18} />
                  <span className="contact-item-text">
                    {userDetails?.data_nascimento || '-'}
                  </span>
                </div>
                <div className="contact-item">
                  <MapPin size={18} />
                  <span className="contact-item-text">{userDetails?.morada || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="tabs-container">
          <ul className="tabs-list">
            <li>
              <button
                className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Detalhes
              </button>
            </li>
            <li>
              <button
                className={`tab-button ${activeTab === 'consultas' ? 'active' : ''}`}
                onClick={() => setActiveTab('consultas')}
              >
                Consultas ({consultas.length})
              </button>
            </li>
            {user?.role !== 'utente' && (
              <li>
                <button
                  className={`tab-button ${activeTab === 'registos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('registos')}
                >
                  Registos ({registos.length + fichas.length})
                </button>
              </li>
            )}
          </ul>

          {/* Details Tab */}
          <motion.div
            className={`tabs-content ${activeTab === 'details' ? 'active' : ''}`}
            variants={tabVariants}
            initial="hidden"
            animate={activeTab === 'details' ? 'visible' : 'hidden'}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <User size={20} />
                  Informações Pessoais
                </h2>
                {!isEditMode && isOwnProfile && (
                  <button
                    className="btn-edit"
                    onClick={handleEditClick}
                    title="Editar perfil"
                  >
                    <Edit2 size={18} />
                    Editar
                  </button>
                )}
              </div>

              {error && (
                <div className="error-banner">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="success-banner">
                  {successMessage}
                </div>
              )}

              <div className="card-content">
                {isEditMode ? (
                  // Modo edição
                  <div className="edit-form">
                    <div className="profile-section">
                      <p className="profile-section-title"><User size={12} /> Dados Pessoais</p>
                      <div className="edit-grid-2col">
                        <div className="form-group">
                          <label htmlFor="nome">Nome Completo *</label>
                          <input id="nome" type="text" value={editData?.nome || ''} onChange={(e) => handleInputChange('nome', e.target.value)} placeholder="Nome completo" className="form-input" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="email">Email *</label>
                          <input id="email" type="email" value={editData?.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Email" className="form-input" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="telefone">Telefone</label>
                          <input id="telefone" type="tel" value={editData?.telefone || ''} onChange={(e) => handleInputChange('telefone', e.target.value)} placeholder="Telefone" className="form-input" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="data_nascimento">Data de Nascimento</label>
                          <DateInput id="data_nascimento" name="data_nascimento" value={editData?.data_nascimento || ''} onChange={(e) => handleInputChange('data_nascimento', e.target.value)} className="form-input" />
                        </div>
                        <div className="form-group edit-grid-full">
                          <label htmlFor="morada">Morada</label>
                          <input id="morada" type="text" value={editData?.morada || ''} onChange={(e) => handleInputChange('morada', e.target.value)} placeholder="Morada completa" className="form-input" />
                        </div>
                      </div>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'terapeuta') && !isOwnProfile && (
                      <div className="profile-section">
                        <p className="profile-section-title"><FileText size={12} /> Informação Clínica</p>
                        {(user?.role === 'admin' || user?.role === 'administrativo') && (
                          <div className="form-group">
                            <label htmlFor="numero_processo">Número de Processo</label>
                            <input
                              id="numero_processo"
                              type="text"
                              value={editData?.numero_processo || ''}
                              onChange={(e) => handleInputChange('numero_processo', e.target.value)}
                              className="form-input"
                              placeholder="Ex: 2024/001"
                            />
                          </div>
                        )}
                        {areasClinicas.length > 0 && (
                          <div className="form-group">
                            <label>Terapeutas por Área</label>
                            {areasClinicas.map((area) => {
                              const terapeutasArea = terapeutas.filter(
                                (t) => t.area_clinica_id === area.id
                              );
                              return (
                                <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <span style={{ minWidth: 130, fontSize: '0.85rem', color: '#6b7280' }}>{area.nome}</span>
                                  <select
                                    value={terapeutasEditados[area.id] || ''}
                                    onChange={(e) => setTerapeutasEditados((prev) => ({ ...prev, [area.id]: e.target.value ? parseInt(e.target.value) : 0 }))}
                                    className="form-input"
                                    disabled={loadingTerapeutas}
                                    style={{ flex: 1 }}
                                  >
                                    <option value="">Sem terapeuta</option>
                                    {terapeutasArea.map((t) => (
                                      <option key={t.user_id} value={t.user_id}>{t.nome}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><ArrowRepeat size={16} className="icon-spin" /> A guardar...</> : <><Check size={16} /> Guardar</>}
                      </button>
                      <button className="btn btn-secondary" onClick={handleCancel} disabled={isSaving}>
                        <X size={16} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo visualização
                  <>
                    <div className="profile-section">
                      <p className="profile-section-title"><User size={12} /> Dados Pessoais</p>
                      <div className="details-grid-2col">
                        <div className="detail-item">
                          <span className="detail-label">Nome Completo</span>
                          <span className="detail-value">{userDetails?.nome || '-'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Email</span>
                          <span className="detail-value">{userDetails?.email || '-'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Telefone</span>
                          <span className="detail-value">{userDetails?.telefone || '-'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Data de Nascimento</span>
                          <span className="detail-value">{userDetails?.data_nascimento || '-'}</span>
                        </div>
                        <div className="detail-item details-grid-full">
                          <span className="detail-label">Morada</span>
                          <span className="detail-value">{userDetails?.morada || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="profile-section">
                      <p className="profile-section-title"><FileText size={12} /> Informação Clínica</p>
                      <div className="details-grid-2col">
                        <div className="detail-item">
                          <span className="detail-label">Número de Processo</span>
                          <span className="detail-value">{userDetails?.numero_processo || '-'}</span>
                        </div>
                        <div className="detail-item details-grid-full">
                          <span className="detail-label">Terapeutas Atribuídos</span>
                          {userDetails?.terapeutas?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {userDetails.terapeutas.map((t) => (
                                <span key={t.area_clinica_id} className="detail-value">
                                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{t.area_nome}: </span>
                                  {t.terapeuta_nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="detail-value">-</span>
                          )}
                        </div>
                        <div className="detail-item details-grid-full">
                          <span className="detail-label">Terapeuta Responsável</span>
                          <span className="detail-value">{userDetails?.terapeuta_responsavel_nome || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Consultas Tab */}
          <motion.div
            className={`tabs-content ${activeTab === 'consultas' ? 'active' : ''}`}
            variants={tabVariants}
            initial="hidden"
            animate={activeTab === 'consultas' ? 'visible' : 'hidden'}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <Clock size={20} />
                  Histórico de Consultas
                </h2>
              </div>

              <div className="card-content">
                {consultas.length === 0 ? (
                  <div className="empty-state">
                    <p>Nenhuma consulta registrada</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop grid */}
                    <div className="consultas-grid desktop-only">
                      {consultas.map((consulta, index) => (
                        <motion.div 
                          key={consulta.id} 
                          custom={index} 
                          variants={itemVariants} 
                          initial="hidden" 
                          animate="visible" 
                          className="consulta-item"
                          onClick={() => handleConsultaClick(consulta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="consulta-header">
                            <div>
                              <p className="consulta-title">{consulta.area_clinica}</p>
                              <p className="consulta-subtitle">Terapeuta: {consulta.terapeuta_nome}</p>
                            </div>
                            <span className={`status-badge ${getStatusBadgeClass(consulta.estado)}`}>{consulta.estado}</span>
                          </div>
                          <div className="consulta-separator"></div>
                          <div className="consulta-details">
                            <div className="consulta-detail">
                              <span className="consulta-detail-label">Sala</span>
                              <span className="consulta-detail-value">{consulta.sala_nome || '-'}</span>
                            </div>
                            <div className="consulta-detail">
                              <span className="consulta-detail-label">Data Início</span>
                              <span className="consulta-detail-value">{consulta.data_inicio}</span>
                            </div>
                            <div className="consulta-detail">
                              <span className="consulta-detail-label">Data Término</span>
                              <span className="consulta-detail-value">{consulta.data_fim || '-'}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Mobile cards */}
                    <div className="mobile-only">
                      {consultas.map((consulta) => (
                        <div 
                          key={consulta.id} 
                          className="consulta-profile-card"
                          onClick={() => handleConsultaClick(consulta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="card-row">
                            <span className="card-area">{consulta.area_clinica}</span>
                            <span className={`status-badge ${getStatusBadgeClass(consulta.estado)}`}>{consulta.estado}</span>
                          </div>
                          <p className="card-sub">{consulta.terapeuta_nome} · {consulta.sala_nome || '-'}</p>
                          <p className="card-sub" style={{ margin: 0 }}>{consulta.data_inicio}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Registos Tab */}
          <motion.div
            className={`tabs-content ${activeTab === 'registos' ? 'active' : ''}`}
            variants={tabVariants}
            initial="hidden"
            animate={activeTab === 'registos' ? 'visible' : 'hidden'}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <FileText size={20} />
                  Registos Clínicos e Formulários
                </h2>
              </div>

              <div className="card-content">
                {registos.length === 0 && fichas.length === 0 ? (
                  <div className="empty-state">
                    <p>Nenhum registo clínico ou formulário</p>
                  </div>
                ) : (
                  <div>
                    {/* Documentos */}
                    {registos.length > 0 && (
                      <>
                        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#444' }}>Documentos</h3>
                        {registos.map((item, index) => (
                          <motion.div
                            key={item.id}
                            custom={index}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="registo-item"
                          >
                            {item.tipo === 'documento' ? (
                              <>
                                <div className="registo-header">
                                  <div className="registo-icon">
                                    <FilePdf size={18} />
                                  </div>
                                  <div className="registo-info">
                                    <p className="registo-title">📄 {item.nome_arquivo}</p>
                                    <div className="registo-meta">
                                      <span className="registo-author">{item.criado_por}</span>
                                      <span className="registo-date">{item.data_criacao}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="registo-separator"></div>
                                <a 
                                  href={item.arquivo_url} 
                                  download 
                                  className="registo-link"
                                  style={{
                                    display: 'inline-block',
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '4px',
                                    color: '#1f2937',
                                    textDecoration: 'none',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                                >
                                  <Download size={14} style={{ marginRight: '0.35rem' }} /> Descarregar
                                </a>
                              </>
                            ) : (
                              <>
                                <div className="registo-header">
                                  <div className="registo-icon">
                                    <Stethoscope size={18} />
                                  </div>
                                  <div className="registo-info">
                                    <p className="registo-title">{item.area_clinica}</p>
                                    <div className="registo-meta">
                                      <span className="registo-author">{item.criado_por}</span>
                                      <span className="registo-date">{item.data_criacao}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="registo-separator"></div>

                                <p className="registo-content">{item.conteudo}</p>
                              </>
                            )}
                          </motion.div>
                        ))}
                      </>
                    )}

                    {/* Registos */}
                    {fichas.length > 0 && (
                      <>
                        {registos.length > 0 && <div style={{ margin: '24px 0', borderTop: '1px solid #e5e7eb' }} />}
                        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#444' }}>Registos</h3>
                        {fichas.map((ficha, index) => (
                          <motion.div
                            key={getFichaValue(ficha, 'id') || `ficha-${index}`}
                            custom={index + registos.length}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="registo-item"
                          >
                            <div className="registo-header">
                              <div className="registo-icon">
                                <FileText size={18} />
                              </div>
                              <div className="registo-info">
                                <p className="registo-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {ficha._formTipo || getFichaValue(ficha, 'tipo_registo') || 'Formulário'}
                                  {(ficha.estado || getFichaValue(ficha, 'estado')) === 'pendente' && (
                                    <span style={{ background: '#f59e0b', color: 'white', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                      ⏳ Pendente
                                    </span>
                                  )}
                                </p>
                                <div className="registo-meta">
                                  <span className="registo-author">Criado por: {getFichaValue(ficha, 'created_by') || '-'}</span>
                                  <span className="registo-date">{getFichaValue(ficha, 'created_at') || '-'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="registo-separator"></div>

                            <p className="registo-content">
                              <strong>Diagnóstico:</strong> {getFichaValue(ficha, 'diagnostico_queixa_principal') || '-'}
                            </p>
                            <p className="registo-content">
                              <strong>Objetivos/Prognóstico:</strong> {getFichaValue(ficha, 'objetivos_prognostico') || '-'}
                            </p>
                            <p className="registo-content">
                              <strong>Plano terapêutico:</strong> {getFichaValue(ficha, 'plano_terapeutico') || '-'}
                            </p>
                            {getFichaValue(ficha, 'id') && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                                  onClick={() => {
                                    const tipo = ficha._formTipo === 'Psicologia' ? 'psicologia' : ficha._formTipo === 'Terapia da Fala' ? 'terapia-fala' : ficha._formTipo === 'Nutrição' ? 'nutricao' : 'avaliacao';
                                    navigate(`/fichas-${tipo}/${getFichaValue(ficha, 'id')}`);
                                  }}
                                >
                                  Ver Ficha Completa
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
