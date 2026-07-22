import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { CalendarDate, Person, PlusLg } from 'react-bootstrap-icons';
import { getUtenteConsultas } from '../services/utentes.jsx';
import '../styles/dashboard.css';

export function DashboardUtente() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('consultas');

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (user?.id) {
                    const consultasData = await getUtenteConsultas(user.id);
                    setConsultas(consultasData || []);
                }
            } catch (err) {
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    if (loading) {
        return <div className="page centered">{t('home.loading') || 'A carregar...'}</div>;
    }

    return (
        <div className="page dashboard-utente">
            <div className="dashboard-header">
                <h1>{t('dashboardUser.title')}</h1>
                <p>{t('dashboardUser.welcome', { name: user?.name })}</p>
            </div>

            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('consultas')}
                >
                    <CalendarDate size={16} /> {t('dashboardUser.myConsultations')}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'perfil' ? 'active' : ''}`}
                    onClick={() => setActiveTab('perfil')}
                >
                    <Person size={16} /> {t('dashboardUser.myProfile')}
                </button>
            </div>

            <div className="dashboard-content">
                {activeTab === 'consultas' && (
                    <div className="consultas-section">
                        <h2>{t('dashboardUser.myConsultations')}</h2>
                        {consultas.length === 0 ? (
                            <p className="empty-state">{t('dashboardUser.noAppointments') || 'Ainda não tem consultas agendadas'}</p>
                        ) : (
                            <div className="consultas-list">
                                {consultas.map((consulta) => (
                                    <div key={consulta.id} className="consulta-card">
                                        <div className="consulta-info">
                                            <h4>{consulta.tipo || t('consultationsPage.defaultType')}</h4>
                                            <p>{t('home.phone') /* placeholder label for date */}: {(() => { const s = String(consulta.data_inicio || '').replace(' ','T'); return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z').toLocaleDateString('pt-PT', { timeZone: 'UTC' }); })()}</p>
                                            <p>{t('dashboardUser.myConsultations') /* placeholder label for status */}: {consulta.estado}</p>
                                            {consulta.estado_validacao === 'pendente' && (
                                                <span style={{ display: 'inline-block', marginTop: 4, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
                                                    Pendente de aprovação
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="btn-detalhes"
                                            onClick={() => navigate(`/consultas/${consulta.id}/detalhes`)}
                                        >
                                            {t('dashboardUser.viewDetails')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(user?.role === 'utente' || user?.role === 'administrativo') && (
                            <button className="btn-primary" onClick={() => navigate('/consultas/nova')}>
                                <PlusLg size={14} /> {t('dashboardUser.scheduleAppointment')}
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'perfil' && (
                    <div className="perfil-section">
                        <h2>{t('dashboardUser.myProfile')}</h2>
                        <div className="perfil-info">
                            <p><strong>{t('completeProfile.name')}:</strong> {user?.name}</p>
                            <p><strong>{t('completeProfile.email')}:</strong> {user?.email}</p>
                            <p><strong>{t('completeProfile.therapistType')}:</strong> {user?.role}</p>
                        </div>
                        <button
                            className="btn-secondary"
                            onClick={() => navigate('/user')}
                        >
                            {t('dashboardUser.seeFullProfile')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
