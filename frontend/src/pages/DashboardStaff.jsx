import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { DateInput } from '../components/DateInput.jsx';
import {
    CalendarDate, People, Hospital, Mortarboard, Gear, PlusLg, Book,
    BarChart, Person, PersonFill, ClipboardData, ExclamationCircle,
    CheckCircle, XCircle, ClockHistory, FileText, Eye, ToggleOn, ToggleOff,
    Download, Trash, Pencil, CheckLg, XLg,
} from 'react-bootstrap-icons';
import { ListaUtentes } from './ListaUtentes.jsx';
import { ListaConsultas } from './ListaConsultas.jsx';
import { ListaSalas } from './ListaSalas.jsx';
import { GerirAlunosModal } from '../components/GerirAlunosModal.jsx';
import { CriarUtenteModal } from '../components/CriarUtenteModal.jsx';
import { getAlunosDoProfessor, updateTerapeutaAreaAdmin } from '../services/terapeutas.jsx';
import { getUtentes } from '../services/utentes.jsx';
import {
    getAdminStats, getStaffUsers, toggleUserActive, createStaffUser,
    getDocumentos, downloadDocumento,
} from '../services/admin.jsx';
import { getFichasAvaliacao, getFichasPsicologia, getFichasTerapiaFala, getFichasNutricao, deleteFichaAvaliacao, deleteFichaPsicologia, deleteFichaTerapiaFala, deleteFichaNutricao, getPendentes, validarFicha } from '../services/fichas.jsx';
import { validarDocumento, getAlunos, getTerapeutas, getAreasClinicas, getTerapeutasStaff, getConsultasPendentes, validarConsulta, getConsultas, updateEstadoConsulta } from '../services/consultas.jsx';
import '../styles/dashboard.css';

const ESTADO_LABEL = { P: 'Presente', A: 'Ausente', FJ: 'Falta Justificada', FI: 'Falta Injustificada' };
const ESTADO_COLOR = { P: '#10b981', A: '#ef4444', FJ: '#f59e0b', FI: '#f97316' };

function StatCard({ icon, label, value }) {
    return (
        <div className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-num">{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

export function DashboardStaff() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('consultas');

    // — Alunos —
    const [isAlunosModalOpen, setIsAlunosModalOpen] = useState(false);
    const [meuAlunos, setMeuAlunos] = useState([]);
    const [loadingAlunos, setLoadingAlunos] = useState(false);

    // — Utente modal —
    const [isUtenteModalOpen, setIsUtenteModalOpen] = useState(false);

    // — Admin: stats —
    const [stats, setStats] = useState(null);

    // — Alunos (admin/administrativo) —
    const [todosAlunos, setTodosAlunos] = useState([]);
    const [loadingTodosAlunos, setLoadingTodosAlunos] = useState(false);
    const [areasClinicas, setAreasClinicas] = useState([]);
    const [areaEditId, setAreaEditId] = useState(null);
    const [areaEditValue, setAreaEditValue] = useState('');
    const [areaEditSaving, setAreaEditSaving] = useState(false);

    // — Admin: staff users —
    const [staffUsers, setStaffUsers] = useState([]);
    const [showCreateStaff, setShowCreateStaff] = useState(false);
    const [staffForm, setStaffForm] = useState({ nome: '', email: '', password: '', role: 'administrativo' });
    const [staffError, setStaffError] = useState('');
    const [staffLoading, setStaffLoading] = useState(false);

    // — Presenças —
    const [consultasPresenca, setConsultasPresenca] = useState([]);
    const [presencaData, setPresencaData] = useState(new Date().toISOString().split('T')[0]);
    const [loadingPresencas, setLoadingPresencas] = useState(false);
    const [marcandoPresenca, setMarcandoPresenca] = useState({});

    // — Pendentes —
    const [pendentes, setPendentes] = useState({ fichas_avaliacao: [], fichas_psicologia: [], fichas_terapia_fala: [], fichas_nutricao: [], documentos: [] });
    const [loadingPendentes, setLoadingPendentes] = useState(false);

    // — Consultas Pendentes (marcações de utentes a aguardar validação da rececão) —
    const [consultasPendentes, setConsultasPendentes] = useState([]);
    const [loadingConsultasPendentes, setLoadingConsultasPendentes] = useState(false);

    // — Fichas —
    const [fichasTab, setFichasTab] = useState('avaliacao');
    const [fichasAvaliacao, setFichasAvaliacao] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [fichasSearch, setFichasSearch] = useState('');

    // — Confirm modal —
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (activeTab === 'alunos' && user?.tipo === 'professor') carregarAlunos();
        if (activeTab === 'alunos-lista' && (user?.role === 'admin' || user?.role === 'administrativo')) carregarTodosAlunos();
        if (activeTab === 'admin' && user?.role === 'admin') carregarAdmin();
        if (activeTab === 'assiduidade') carregarPresencas(presencaData);
        if (activeTab === 'fichas') carregarFichas();
        if (activeTab === 'pendentes') carregarPendentes();
        if (activeTab === 'consultas-pendentes') carregarConsultasPendentes();
    }, [activeTab]);

    const carregarAlunos = async () => {
        setLoadingAlunos(true);
        try { setMeuAlunos((await getAlunosDoProfessor()) || []); } catch { setMeuAlunos([]); } finally { setLoadingAlunos(false); }
    };

    const carregarTodosAlunos = async () => {
        setLoadingTodosAlunos(true);
        try {
            const [terapeutas, areas] = await Promise.all([getTerapeutasStaff(), getAreasClinicas()]);
            setTodosAlunos(terapeutas || []);
            setAreasClinicas(areas || []);
        } catch { setTodosAlunos([]); } finally { setLoadingTodosAlunos(false); }
    };

    const handleSaveArea = async (userId) => {
        if (!areaEditValue) return;
        setAreaEditSaving(true);
        try {
            await updateTerapeutaAreaAdmin(userId, areaEditValue);
            const areaNome = areasClinicas.find(a => a.id === Number(areaEditValue))?.nome || '';
            setTodosAlunos(prev => prev.map(t =>
                t.user_id === userId
                    ? { ...t, area_clinica_id: Number(areaEditValue), area_clinica_nome: areaNome }
                    : t
            ));
            setAreaEditId(null);
        } catch { } finally { setAreaEditSaving(false); }
    };

    const carregarAdmin = async () => {
        try {
            const [s, u] = await Promise.all([getAdminStats(), getStaffUsers()]);
            setStats(s);
            setStaffUsers(u || []);
        } catch { setStats(null); }
    };

    const carregarPresencas = async (data) => {
        setLoadingPresencas(true);
        try {
            const todas = await getConsultas();
            const filtradas = (todas || []).filter(c => {
                const d = new Date(c.data_inicio).toISOString().split('T')[0];
                return d === data;
            });
            setConsultasPresenca(filtradas);
        } catch { setConsultasPresenca([]); }
        finally { setLoadingPresencas(false); }
    };

    const handleMarcarEstado = async (consultaId, estado) => {
        setMarcandoPresenca(prev => ({ ...prev, [consultaId]: true }));
        try {
            await updateEstadoConsulta(consultaId, estado);
            setConsultasPresenca(prev => prev.map(c =>
                c.id === consultaId ? { ...c, estado } : c
            ));
            toast.success('Estado atualizado');
        } catch { toast.error('Erro ao atualizar estado'); }
        finally { setMarcandoPresenca(prev => ({ ...prev, [consultaId]: false })); }
    };

    const carregarPendentes = async () => {
        setLoadingPendentes(true);
        try {
            const data = await getPendentes();
            setPendentes(data || { fichas_avaliacao: [], fichas_psicologia: [], fichas_terapia_fala: [], documentos: [] });
        } catch { setPendentes({ fichas_avaliacao: [], fichas_psicologia: [], fichas_terapia_fala: [], documentos: [] }); }
        finally { setLoadingPendentes(false); }
    };

    const handleValidarFicha = (tipo, id, acao) => {
        if (acao === 'rejeitar') {
            setConfirmModal({
                open: true,
                title: 'Rejeitar submissão',
                message: 'Tens a certeza que queres rejeitar e eliminar esta submissão?',
                danger: true,
                onConfirm: async () => {
                    setConfirmModal(m => ({ ...m, open: false }));
                    try { await validarFicha(tipo, id, acao); carregarPendentes(); }
                    catch { toast.error('Erro ao processar validação.'); }
                },
            });
            return;
        }
        validarFicha(tipo, id, acao).then(carregarPendentes).catch(() => toast.error('Erro ao processar validação.'));
    };

    const handleValidarDocumento = (id, acao) => {
        if (acao === 'rejeitar') {
            setConfirmModal({
                open: true,
                title: 'Rejeitar documento',
                message: 'Tens a certeza que queres rejeitar e eliminar este documento?',
                danger: true,
                onConfirm: async () => {
                    setConfirmModal(m => ({ ...m, open: false }));
                    try { await validarDocumento(id, acao); carregarPendentes(); }
                    catch { toast.error('Erro ao processar validação.'); }
                },
            });
            return;
        }
        validarDocumento(id, acao).then(carregarPendentes).catch(() => toast.error('Erro ao processar validação.'));
    };

    const carregarConsultasPendentes = async () => {
        setLoadingConsultasPendentes(true);
        try {
            const data = await getConsultasPendentes();
            setConsultasPendentes(data || []);
        } catch { setConsultasPendentes([]); }
        finally { setLoadingConsultasPendentes(false); }
    };

    const handleValidarConsulta = (id, acao) => {
        if (acao === 'rejeitar') {
            setConfirmModal({
                open: true,
                title: 'Rejeitar marcação',
                message: 'Tens a certeza que queres rejeitar esta marcação? A consulta ficará cancelada.',
                danger: true,
                onConfirm: async () => {
                    setConfirmModal(m => ({ ...m, open: false }));
                    try { await validarConsulta(id, acao); carregarConsultasPendentes(); }
                    catch { toast.error('Erro ao processar validação.'); }
                },
            });
            return;
        }
        validarConsulta(id, acao).then(carregarConsultasPendentes).catch(() => toast.error('Erro ao processar validação.'));
    };

    const carregarFichas = async () => {
        try {
            const [av, psic, fala, nutri, docs] = await Promise.all([
                getFichasAvaliacao(),
                getFichasPsicologia(),
                getFichasTerapiaFala(),
                getFichasNutricao(),
                getDocumentos(),
            ]);
            const todas = [
                ...(av    || []).map(f => ({ ...f, _formTipo: 'Fisioterapia' })),
                ...(psic  || []).map(f => ({ ...f, _formTipo: 'Psicologia' })),
                ...(fala  || []).map(f => ({ ...f, _formTipo: 'Terapia da Fala' })),
                ...(nutri || []).map(f => ({ ...f, _formTipo: 'Nutrição' })),
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setFichasAvaliacao(todas);
            setDocumentos(docs || []);
        } catch { setFichasAvaliacao([]); setDocumentos([]); }
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggleActive = async (userId) => {
        try {
            const { active } = await toggleUserActive(userId);
            setStaffUsers(prev => prev.map(u => u.id === userId ? { ...u, active } : u));
        } catch { }
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setStaffError('');
        setStaffLoading(true);
        try {
            const novo = await createStaffUser(staffForm);
            setStaffUsers(prev => [novo, ...prev]);
            setShowCreateStaff(false);
            setStaffForm({ nome: '', email: '', password: '', role: 'administrativo' });
        } catch (err) {
            setStaffError(err?.response?.data?.error || 'Erro ao criar utilizador');
        } finally {
            setStaffLoading(false);
        }
    };


    const handleDeleteFicha = (id, nome, formTipo) => {
        setConfirmModal({
            open: true,
            title: 'Apagar ficha',
            message: `Tem a certeza que deseja apagar a ficha de ${nome}? Esta ação não pode ser revertida.`,
            danger: true,
            onConfirm: async () => {
                setConfirmModal(m => ({ ...m, open: false }));
                try {
                    if (formTipo === 'Psicologia') await deleteFichaPsicologia(id);
                    else if (formTipo === 'Terapia da Fala') await deleteFichaTerapiaFala(id);
                    else if (formTipo === 'Nutrição') await deleteFichaNutricao(id);
                    else await deleteFichaAvaliacao(id);
                    setFichasAvaliacao(prev => prev.filter(f => f.id !== id));
                } catch (err) {
                    toast.error(err?.response?.data?.error || 'Erro ao eliminar ficha');
                }
            },
        });
    };

    const handleDownload = async (doc) => {
        try {
            const blob = await downloadDocumento(doc.arquivo_url);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.nome_arquivo;
            a.click();
            URL.revokeObjectURL(url);
        } catch { }
    };

    if (!user) return <div className="page centered">{t('common.loading') || 'A carregar...'}</div>;

    return (
        <div className="page dashboard-staff">
            <div className="dashboard-header">
                <h1>{t('dashboardStaff.title', { role: user.role })}</h1>
                <p>{t('dashboardStaff.welcome', { name: user.name })}</p>
            </div>

            <div className="dashboard-tabs">
                <button className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`} onClick={() => setActiveTab('consultas')}>
                    <CalendarDate size={16} /> {t('dashboardStaff.agenda')}
                </button>
                <button className={`tab-btn ${activeTab === 'utentes' ? 'active' : ''}`} onClick={() => setActiveTab('utentes')}>
                    <People size={16} /> {t('dashboardStaff.patients')}
                </button>
                <button className={`tab-btn ${activeTab === 'salas' ? 'active' : ''}`} onClick={() => setActiveTab('salas')}>
                    <Hospital size={16} /> {t('dashboardStaff.rooms')}
                </button>
                <button className={`tab-btn`} onClick={() => setIsUtenteModalOpen(true)}>
                    <PlusLg size={16} /> {t('dashboardStaff.addPatient')}
                </button>
                {(user.role === 'admin' || user.role === 'administrativo') && (
                    <button className={`tab-btn ${activeTab === 'assiduidade' ? 'active' : ''}`} onClick={() => setActiveTab('assiduidade')}>
                        <ClockHistory size={16} /> {t('dashboardStaff.attendance')}
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'terapeuta') && (
                    <button className={`tab-btn ${activeTab === 'fichas' ? 'active' : ''}`} onClick={() => setActiveTab('fichas')}>
                        <FileText size={16} /> {t('dashboardStaff.records')}
                    </button>
                )}
                {user.tipo === 'professor' && (
                    <button className={`tab-btn ${activeTab === 'alunos' ? 'active' : ''}`} onClick={() => setActiveTab('alunos')}>
                        <Mortarboard size={16} /> {t('dashboardStaff.manageStudents')}
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'administrativo') && (
                    <button className={`tab-btn ${activeTab === 'alunos-lista' ? 'active' : ''}`} onClick={() => setActiveTab('alunos-lista')}>
                        <Mortarboard size={16} /> {t('dashboardStaff.therapists')}
                    </button>
                )}
                {(user.tipo === 'professor' || user.role === 'admin') && (
                    <button className={`tab-btn ${activeTab === 'pendentes' ? 'active' : ''}`} onClick={() => setActiveTab('pendentes')}
                        style={{ position: 'relative' }}>
                        <ExclamationCircle size={16} /> {t('dashboardStaff.pending')}
                        {((pendentes.fichas_avaliacao?.length || 0) + (pendentes.fichas_psicologia?.length || 0) +
                          (pendentes.fichas_terapia_fala?.length || 0) + (pendentes.fichas_nutricao?.length || 0) + (pendentes.documentos?.length || 0)) > 0 && (
                            <span style={{
                                background: '#ef4444', color: 'white', borderRadius: '50%',
                                width: 18, height: 18, fontSize: 11, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                marginLeft: 4,
                            }}>
                                {(pendentes.fichas_avaliacao?.length || 0) + (pendentes.fichas_psicologia?.length || 0) +
                                 (pendentes.fichas_terapia_fala?.length || 0) + (pendentes.fichas_nutricao?.length || 0) + (pendentes.documentos?.length || 0)}
                            </span>
                        )}
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'administrativo') && (
                    <button className={`tab-btn ${activeTab === 'consultas-pendentes' ? 'active' : ''}`} onClick={() => setActiveTab('consultas-pendentes')}
                        style={{ position: 'relative' }}>
                        <ClockHistory size={16} /> {t('dashboardStaff.pendingConsultations')}
                        {consultasPendentes.length > 0 && (
                            <span style={{
                                background: '#ef4444', color: 'white', borderRadius: '50%',
                                width: 18, height: 18, fontSize: 11, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                marginLeft: 4,
                            }}>
                                {consultasPendentes.length}
                            </span>
                        )}
                    </button>
                )}
                {user.role === 'admin' && (
                    <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                        <Gear size={16} /> {t('dashboardStaff.administration')}
                    </button>
                )}
            </div>

            <div className="dashboard-content">
                {activeTab === 'consultas' && <ListaConsultas />}
                {activeTab === 'utentes' && <ListaUtentes />}
                {activeTab === 'salas' && <ListaSalas />}

                {/* ── Presenças ── */}
                {activeTab === 'assiduidade' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><ClockHistory size={20} /> Presenças</h2>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <DateInput
                                    name="presenca_data"
                                    value={presencaData}
                                    onChange={e => {
                                        setPresencaData(e.target.value);
                                        carregarPresencas(e.target.value);
                                    }}
                                />
                            </div>
                        </div>

                        {loadingPresencas ? (
                            <p style={{ color: '#6b7280' }}>A carregar consultas...</p>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Utente</th>
                                            <th>Terapeuta</th>
                                            <th>Área Clínica</th>
                                            <th>Estado</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consultasPresenca.length === 0 ? (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>Sem consultas para este dia</td></tr>
                                        ) : consultasPresenca
                                            .slice().sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
                                            .map(c => {
                                                const hora = new Date(c.data_inicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                                                const loading = marcandoPresenca[c.id];
                                                const estadoColors = {
                                                    agendada: { bg: '#e0f2fe', color: '#0369a1' },
                                                    realizada: { bg: '#dcfce7', color: '#15803d' },
                                                    faltou_justificada: { bg: '#fef9c3', color: '#a16207' },
                                                    faltou_injustificada: { bg: '#fee2e2', color: '#b91c1c' },
                                                    cancelada: { bg: '#f3f4f6', color: '#6b7280' },
                                                };
                                                const estadoLabels = {
                                                    agendada: t('attendance.status.scheduled') || 'Agendada',
                                                    realizada: t('attendance.status.completed') || 'Realizada',
                                                    faltou_justificada: t('attendance.status.absenceJustified') || 'Faltou (justif.)',
                                                    faltou_injustificada: t('attendance.status.absenceUnjustified') || 'Faltou (injustif.)',
                                                    cancelada: t('attendance.status.cancelled') || 'Cancelada',
                                                };
                                                const sc = estadoColors[c.estado] || { bg: '#f3f4f6', color: '#374151' };
                                                return (
                                                    <tr key={c.id}>
                                                        <td style={{ fontWeight: 600 }}>{hora}</td>
                                                        <td>{c.utente_nome || c.utente?.nome || '—'}</td>
                                                        <td>{c.terapeuta_nome || c.terapeuta?.nome || '—'}</td>
                                                        <td>{c.area_clinica?.nome || '—'}</td>
                                                        <td>
                                                            <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 600 }}>
                                                                {estadoLabels[c.estado] || c.estado}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {c.estado === 'agendada' ? (
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <button
                                                                        className="btn btn-primary btn-sm"
                                                                        disabled={loading}
                                                                        onClick={() => handleMarcarEstado(c.id, 'realizada')}
                                                                    >
                                                                        <CheckLg size={13} /> {t('attendance.present')}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-secondary btn-sm"
                                                                        disabled={loading}
                                                                        onClick={() => handleMarcarEstado(c.id, 'faltou_justificada')}
                                                                        title={t('attendance.justifiedAbsence')}
                                                                    >
                                                                        {t('attendance.short.justified') || 'FJ'}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-secondary btn-sm"
                                                                        disabled={loading}
                                                                        onClick={() => handleMarcarEstado(c.id, 'faltou_injustificada')}
                                                                        title={t('attendance.unjustifiedAbsence')}
                                                                    >
                                                                        {t('attendance.short.unjustified') || 'FI'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Fichas ── */}
                {activeTab === 'fichas' && (() => {
                    const fichasAvaliacaoFiltradas = fichasAvaliacao.filter(f =>
                        (f.nome_completo || '').toLowerCase().includes(fichasSearch.toLowerCase())
                    );
                    const documentosFiltrados = documentos.filter(d =>
                        (d.utente_nome || '').toLowerCase().includes(fichasSearch.toLowerCase())
                    );
                    return (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><FileText size={20} /> {t('records.title')}</h2>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder={t('records.searchPlaceholder')}
                                    value={fichasSearch}
                                    onChange={e => setFichasSearch(e.target.value)}
                                    style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, width: 220 }}
                                />
                                <button className={`btn-secondary ${fichasTab === 'avaliacao' ? 'active' : ''}`} onClick={() => { setFichasTab('avaliacao'); setFichasSearch(''); }} style={{ fontWeight: fichasTab === 'avaliacao' ? 700 : 400 }}>
                                    {t('records.tabs.evaluation', { count: fichasAvaliacaoFiltradas.length })}
                                </button>
                                <button className={`btn-secondary ${fichasTab === 'ficheiros' ? 'active' : ''}`} onClick={() => { setFichasTab('ficheiros'); setFichasSearch(''); }} style={{ fontWeight: fichasTab === 'ficheiros' ? 700 : 400 }}>
                                    {t('records.tabs.files', { count: documentosFiltrados.length })}
                                </button>
                            </div>
                        </div>

                        {fichasTab === 'avaliacao' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Utente</th><th>Nº Processo</th><th>Queixa Principal</th><th>Tipo</th><th>Data</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {fichasAvaliacaoFiltradas.length === 0 ? (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>
                                                    {fichasSearch ? t('records.noResultsFor', { query: fichasSearch }) : t('records.noEvaluations')}
                                                </td></tr>
                                        ) : fichasAvaliacaoFiltradas.map(f => (
                                            <tr key={`${f._formTipo}-${f.id}`}>
                                                <td>{f.nome_completo || '—'}</td>
                                                <td>{f.numero_processo || '—'}</td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.diagnostico_queixa_principal || f.motivo_descricao || f.avaliacao_subjetiva || f.motivo_consulta || '—'}</td>
                                                <td>{f._formTipo || '—'}</td>
                                                <td>{f.created_at ? new Date(f.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                                                <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon" title={t('records.viewRecord') || 'Ver ficha'} onClick={() => {
                                                        const tipo = f._formTipo === 'Psicologia' ? 'psicologia' : f._formTipo === 'Terapia da Fala' ? 'terapia-fala' : f._formTipo === 'Nutrição' ? 'nutricao' : 'avaliacao';
                                                        navigate(`/fichas-${tipo}/${f.id}`);
                                                    }}><Eye size={16} /></button>
                                                    <button className="btn-icon" onClick={() => handleDeleteFicha(f.id, f.nome_completo, f._formTipo)} style={{ color: '#ef4444' }} title={t('records.deleteRecord') || 'Apagar ficha'}><Trash size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {fichasTab === 'ficheiros' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Nome do ficheiro</th><th>Utente</th><th>Data consulta</th><th>Carregado em</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {documentosFiltrados.length === 0 ? (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                                                            {fichasSearch ? t('records.noResultsFor', { query: fichasSearch }) : t('records.noFiles')}
                                                        </td></tr>
                                        ) : documentosFiltrados.map(d => (
                                            <tr key={d.id}>
                                                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome_arquivo}</td>
                                                <td>{d.utente_nome || '—'}</td>
                                                <td>{d.data_consulta || '—'}</td>
                                                <td>{d.created_at || '—'}</td>
                                                <td><button className="btn-icon" title={t('records.download') || 'Descarregar'} onClick={() => handleDownload(d)}><Download size={16} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    );
                })()}

                {/* ── Alunos ── */}
                {activeTab === 'alunos' && user.tipo === 'professor' && (
                    <div className="alunos-section">
                        <div className="section-header">
                            <h2><Mortarboard size={20} /> Gerir Alunos</h2>
                            <button className="btn-primary" onClick={() => setIsAlunosModalOpen(true)}>
                                <PlusLg size={14} /> Gerir Alunos
                            </button>
                        </div>
                        <div className="alunos-container">
                            <div className="alunos-card">
                                <h3><Book size={18} /> {t('students.my') + ' (' + meuAlunos.length + ')'}</h3>
                                {loadingAlunos ? (
                                    <p className="loading">{t('common.loading') || 'A carregar alunos...'}</p>
                                ) : meuAlunos.length === 0 ? (
                                    <p className="empty-state">{t('students.noneYet') || 'Ainda não tens alunos associados.'}</p>
                                ) : (
                                    <div className="alunos-grid">
                                        {meuAlunos.map(aluno => (
                                            <div key={aluno.user_id} className="aluno-card">
                                                <div className="aluno-avatar"><Mortarboard size={28} /></div>
                                                <h4>{aluno.nome}</h4>
                                                <p>{aluno.email}</p>
                                                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 4 }}>
                                                    Último acesso: {aluno.last_login_at
                                                        ? new Date(aluno.last_login_at).toLocaleString('pt-PT')
                                                        : 'Nunca'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Terapeutas (admin/administrativo) ── */}
                {activeTab === 'alunos-lista' && (user.role === 'admin' || user.role === 'administrativo') && (
                    <div className="admin-section">
                        <h2 style={{ marginBottom: 16 }}><Mortarboard size={20} /> Terapeutas</h2>
                        {loadingTodosAlunos ? (
                            <p style={{ color: '#6b7280' }}>A carregar...</p>
                        ) : todosAlunos.length === 0 ? (
                            <p style={{ color: '#6b7280' }}>Nenhum terapeuta encontrado.</p>
                        ) : (
                            <div className="admin-card">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Tipo</th>
                                            <th>Área Clínica</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todosAlunos.map(t => (
                                            <tr key={t.user_id}>
                                                <td>
                                                    <div>{t.nome}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{t.email}</div>
                                                </td>
                                                <td style={{ textTransform: 'capitalize' }}>{t.tipo || '—'}</td>
                                                <td>
                                                    {areaEditId === t.user_id ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <select
                                                                className="form-select"
                                                                style={{ maxWidth: 200 }}
                                                                value={areaEditValue}
                                                                onChange={e => setAreaEditValue(e.target.value)}
                                                            >
                                                                <option value="">Selecionar...</option>
                                                                {areasClinicas.map(a => (
                                                                    <option key={a.id} value={a.id}>{a.nome}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                disabled={!areaEditValue || areaEditSaving}
                                                                onClick={() => handleSaveArea(t.user_id)}
                                                            >
                                                                <CheckLg size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setAreaEditId(null)}
                                                            >
                                                                <XLg size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <span>{t.area_clinica_nome || '—'}</span>
                                                            <button
                                                                className="btn-icon btn-edit"
                                                                title="Alterar área"
                                                                onClick={() => { setAreaEditId(t.user_id); setAreaEditValue(t.area_clinica_id ? String(t.area_clinica_id) : ''); }}
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Administração ── */}
                {activeTab === 'admin' && user.role === 'admin' && (
                    <div className="admin-section">
                        {/* Stats */}
                        <h2 style={{ marginBottom: 16 }}><BarChart size={20} /> {t('admin.stats.title') || 'Estatísticas'}</h2>
                        {stats ? (
                            <div className="consultas-stats-bar" style={{ marginBottom: 32 }}>
                                <StatCard icon={<People size={20} />} label={t('admin.stats.activePatients') || 'Utentes ativos'} value={stats.total_utentes} />
                                <StatCard icon={<PersonFill size={20} />} label={t('admin.stats.therapists') || 'Terapeutas'} value={stats.total_terapeutas} />
                                <StatCard icon={<CalendarDate size={20} />} label={t('admin.stats.today') || 'Consultas hoje'} value={stats.consultas_hoje} />
                                <StatCard icon={<CalendarDate size={20} />} label={t('admin.stats.thisWeek') || 'Esta semana'} value={stats.consultas_semana} />
                                <StatCard icon={<ClipboardData size={20} />} label={t('admin.stats.scheduled') || 'Agendadas'} value={stats.consultas_agendadas} />
                                <StatCard icon={<ExclamationCircle size={20} />} label={t('admin.stats.absenceRate') || 'Taxa de faltas'} value={`${(stats.taxa_faltas || 0).toFixed(1)}%`} />
                            </div>
                        ) : (
                            <p style={{ color: '#6b7280', marginBottom: 32 }}>A carregar estatísticas...</p>
                        )}

                        {/* Staff users */}
                        <div className="section-header" style={{ marginBottom: 16 }}>
                            <h2><Person size={20} /> {t('admin.staff.title')}</h2>
                            <button className="btn-primary" onClick={() => setShowCreateStaff(!showCreateStaff)}>
                                <PlusLg size={14} /> {t('admin.staff.createUser')}
                            </button>
                        </div>

                        {showCreateStaff && (
                            <div className="admin-card" style={{ marginBottom: 20 }}>
                                <h3>{t('admin.staff.newUserTitle')}</h3>
                                {staffError && <p className="alert alert-error">{staffError}</p>}
                                <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label>{t('admin.staff.form.name')}</label>
                                        <input type="text" value={staffForm.nome} onChange={e => setStaffForm(f => ({ ...f, nome: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('admin.staff.form.email')}</label>
                                        <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('admin.staff.form.password')}</label>
                                        <input type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} minLength={8} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('admin.staff.form.role')}</label>
                                        <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>
                                            <option value="administrativo">{t('admin.staff.roles.administrative')}</option>
                                            <option value="terapeuta">{t('admin.staff.roles.therapist')}</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
                                        <button type="submit" className="btn-primary" disabled={staffLoading}>{staffLoading ? t('admin.staff.form.creating') : t('admin.staff.form.create')}</button>
                                        <button type="button" className="btn-secondary" onClick={() => setShowCreateStaff(false)}>{t('common.cancel')}</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Nome</th><th>Email</th><th>Função</th><th>Tipo</th><th>Área</th><th>Estado</th><th>Ações</th></tr>
                                </thead>
                                <tbody>
                                    {staffUsers.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280' }}>Nenhum utilizador de staff</td></tr>
                                    ) : staffUsers.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.nome}</td>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>{u.email}</td>
                                            <td><span className={`status ${u.role}`}>{u.role}</span></td>
                                            <td>{u.tipo || '—'}</td>
                                            <td>{u.area_clinica || '—'}</td>
                                            <td>
                                                {u.active
                                                    ? <span style={{ color: '#10b981', fontWeight: 600, fontSize: 13 }}><CheckCircle size={14} /> Ativo</span>
                                                    : <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}><XCircle size={14} /> Inativo</span>}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-icon"
                                                    title={u.active ? 'Desativar' : 'Ativar'}
                                                    onClick={() => handleToggleActive(u.id)}
                                                >
                                                    {u.active ? <ToggleOn size={22} color="#10b981" /> : <ToggleOff size={22} color="#9ca3af" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Pendentes ── */}
                {activeTab === 'pendentes' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><ExclamationCircle size={20} /> Submissões Pendentes de Alunos</h2>
                        </div>
                        {loadingPendentes ? (
                            <p>A carregar...</p>
                        ) : (
                            (() => {
                                const total = (pendentes.fichas_avaliacao?.length || 0) +
                                    (pendentes.fichas_psicologia?.length || 0) +
                                    (pendentes.fichas_terapia_fala?.length || 0) +
                                    (pendentes.fichas_nutricao?.length || 0) +
                                    (pendentes.documentos?.length || 0);
                                if (total === 0) return <p style={{ color: '#6b7280' }}>Sem submissões pendentes.</p>;

                                const fichaRows = [
                                    ...((pendentes.fichas_avaliacao || []).map(f => ({ ...f, _tipo: 'avaliacao', _label: 'Fisioterapia' }))),
                                    ...((pendentes.fichas_psicologia || []).map(f => ({ ...f, _tipo: 'psicologia', _label: 'Psicologia' }))),
                                    ...((pendentes.fichas_terapia_fala || []).map(f => ({ ...f, _tipo: 'terapia-fala', _label: 'Terapia da Fala' }))),
                                    ...((pendentes.fichas_nutricao || []).map(f => ({ ...f, _tipo: 'nutricao', _label: 'Nutrição' }))),
                                ];

                                return (
                                    <div>
                                        {fichaRows.length > 0 && (
                                            <>
                                                <h3 style={{ marginBottom: 8, marginTop: 16 }}>Fichas Clínicas</h3>
                                                <div className="table-container">
                                                    <table className="data-table">
                                                        <thead><tr>
                                                            <th>Tipo</th><th>Utente</th><th>Aluno</th><th>Data</th><th>Ações</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {fichaRows.map(f => (
                                                                <tr key={`${f._tipo}-${f.id}`}>
                                                                    <td><span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{f._label}</span></td>
                                                                    <td>{f.utente_nome || '—'}</td>
                                                                    <td>{f.aluno_nome || '—'}</td>
                                                                    <td>{f.created_at ? new Date(f.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                                                                    <td style={{ display: 'flex', gap: 6 }}>
                                                                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarFicha(f._tipo, f.id, 'aprovar')}>
                                                                            <CheckCircle size={14} /> {t('common.approve')}
                                                                        </button>
                                                                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarFicha(f._tipo, f.id, 'rejeitar')}>
                                                                            <XCircle size={14} /> {t('common.reject')}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                        {(pendentes.documentos?.length > 0) && (
                                            <>
                                                <h3 style={{ marginBottom: 8, marginTop: 24 }}>Documentos PDF</h3>
                                                <div className="table-container">
                                                    <table className="data-table">
                                                        <thead><tr>
                                                            <th>Ficheiro</th><th>Utente</th><th>Aluno</th><th>Data</th><th>Ações</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {pendentes.documentos.map(d => (
                                                                <tr key={d.id}>
                                                                    <td>
                                                                        <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer"
                                                                            style={{ color: '#1e40af', textDecoration: 'none' }}>
                                                                            <FileText size={14} /> {d.nome_arquivo}
                                                                        </a>
                                                                    </td>
                                                                    <td>{d.utente_nome || '—'}</td>
                                                                    <td>{d.aluno_nome || '—'}</td>
                                                                    <td>{d.created_at ? new Date(d.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                                                                    <td style={{ display: 'flex', gap: 6 }}>
                                                                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarDocumento(d.id, 'aprovar')}>
                                                                            <CheckCircle size={14} /> {t('common.approve')}
                                                                        </button>
                                                                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarDocumento(d.id, 'rejeitar')}>
                                                                            <XCircle size={14} /> {t('common.reject')}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}

                {/* ── Consultas Pendentes ── */}
                {activeTab === 'consultas-pendentes' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><ClockHistory size={20} /> Marcações de Utentes Pendentes de Validação</h2>
                        </div>
                        {loadingConsultasPendentes ? (
                            <p>A carregar...</p>
                        ) : consultasPendentes.length === 0 ? (
                            <p style={{ color: '#6b7280' }}>Sem marcações pendentes.</p>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead><tr>
                                        <th>Utente</th><th>Terapeuta</th><th>Área Clínica</th><th>Data/Hora</th><th>Conflitos</th><th>Ações</th>
                                    </tr></thead>
                                    <tbody>
                                        {consultasPendentes.map(cp => (
                                            <tr key={cp.id}>
                                                <td>{cp.utente || '—'}</td>
                                                <td>{cp.terapeuta || '—'}</td>
                                                <td>{cp.area_clinica || '—'}</td>
                                                <td>
                                                    {cp.data_inicio ? new Date(cp.data_inicio).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                    {' – '}
                                                    {cp.data_fim ? new Date(cp.data_fim).toLocaleTimeString('pt-PT', { timeStyle: 'short' }) : '—'}
                                                </td>
                                                <td>
                                                    {cp.conflitos_terapeuta > 0 ? (
                                                        <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
                                                            <ExclamationCircle size={12} /> {cp.conflitos_terapeuta} consulta(s) sobreposta(s)
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#6b7280', fontSize: 12 }}>Sem conflitos</span>
                                                    )}
                                                </td>
                                                <td style={{ display: 'flex', gap: 6 }}>
                                                                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarConsulta(cp.id, 'aprovar')}>
                                                                            <CheckCircle size={14} /> {t('common.approve')}
                                                                        </button>
                                                                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarConsulta(cp.id, 'rejeitar')}>
                                                                            <XCircle size={14} /> {t('common.reject')}
                                                                        </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <GerirAlunosModal
                isOpen={isAlunosModalOpen}
                onClose={() => setIsAlunosModalOpen(false)}
                onSuccess={() => { setIsAlunosModalOpen(false); carregarAlunos(); }}
            />
            <CriarUtenteModal
                isOpen={isUtenteModalOpen}
                onClose={() => setIsUtenteModalOpen(false)}
                onSuccess={() => setIsUtenteModalOpen(false)}
            />
            <ConfirmModal
                open={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                danger={confirmModal.danger}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
            />
        </div>
    );
}
