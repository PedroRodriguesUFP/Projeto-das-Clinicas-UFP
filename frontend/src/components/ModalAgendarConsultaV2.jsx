import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { MiniCalendar } from './MiniCalendar.jsx';
import '../styles/modal.css';
import {
    getAreasClinicas,
    getSalas,
    getTerapeutasByArea,
    getUtentes,
    checkDisponibilidade,
    getHorariosDisponiveis,
} from '../services/consultas';
import { getUtenteDetails } from '../services/utentes.jsx';

const isStaff = (role) => ['admin', 'administrativo', 'terapeuta'].includes(role);

export function ModalAgendarConsultaV2({
    isOpen,
    onClose,
    onSubmit,
    dataSelecionada = null,
    loading = false
}) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        data: dataSelecionada || '',
        tipo: 'consulta_geral',
        area_clinica_id: '',
        sala_id: '',
        terapeuta_id: '',
        utente_id: '',
    });

    const [areasClinicas, setAreasClinicas] = useState([]);
    const [salas, setSalas] = useState([]);
    const [terapeutasFiltrados, setTerapeutasFiltrados] = useState([]);
    const [utentes, setUtentes] = useState([]);
    const [slotsDisponiveis, setSlotsDisponiveis] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [salasDisponiveis, setSalasDisponiveis] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [utenteInfo, setUtenteInfo] = useState(null);

    useEffect(() => {
        if (isOpen) {
            carregarDados();
            if (user?.role === 'terapeuta') {
                setFormData((prev) => ({ ...prev, terapeuta_id: String(user.id) }));
            }
            // For utentes, pre-fill their own info from session
            if (user?.role === 'utente') {
                setUtenteInfo({
                    nome: user.nome || user.name || '',
                    email: user.email || '',
                    telefone: user.telefone || '',
                    morada: user.morada || '',
                });
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (dataSelecionada) {
            setFormData((prev) => ({ ...prev, data: dataSelecionada }));
        }
    }, [dataSelecionada]);

    const carregarDados = async () => {
        try {
            const [areas, salasList, utentesList] = await Promise.all([
                getAreasClinicas(),
                getSalas(),
                isStaff(user?.role) ? getUtentes() : Promise.resolve([]),
            ]);
            setAreasClinicas(areas);
            setSalas(salasList);
            setUtentes(utentesList);
        } catch {}
    };

    // When area changes: load terapeutas, reset downstream
    useEffect(() => {
        if (formData.area_clinica_id) {
            getTerapeutasByArea(formData.area_clinica_id)
                .then(setTerapeutasFiltrados)
                .catch(() => setTerapeutasFiltrados([]));
        } else {
            setTerapeutasFiltrados([]);
        }
        setFormData((prev) => ({
            ...prev,
            terapeuta_id: user?.role === 'terapeuta' ? String(user.id) : '',
            sala_id: '',
        }));
        setSelectedSlot('');
        setSlotsDisponiveis([]);
        setSalasDisponiveis([]);
    }, [formData.area_clinica_id]);

    // When terapeuta or data changes: reset slot and sala
    useEffect(() => {
        setSelectedSlot('');
        setSlotsDisponiveis([]);
        setSalasDisponiveis([]);
        setFormData((prev) => ({ ...prev, sala_id: '' }));
    }, [formData.terapeuta_id, formData.data]);

    // Load available slots when terapeuta + data + area are all set
    useEffect(() => {
        if (!formData.terapeuta_id || !formData.data || !formData.area_clinica_id) {
            setSlotsDisponiveis([]);
            return;
        }
        const fetchSlots = async () => {
            setLoadingSlots(true);
            try {
                const result = await getHorariosDisponiveis(
                    formData.terapeuta_id,
                    formData.data,
                    60,
                    { areaClinicaId: formData.area_clinica_id }
                );
                setSlotsDisponiveis(result?.horarios_disponiveis || []);
            } catch {
                setSlotsDisponiveis([]);
            } finally {
                setLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [formData.terapeuta_id, formData.data, formData.area_clinica_id]);

    // Auto-fill utente info when utente_id changes (staff only)
    useEffect(() => {
        if (!isStaff(user?.role) || !formData.utente_id) {
            if (!formData.utente_id) setUtenteInfo(null);
            return;
        }
        getUtenteDetails(formData.utente_id)
            .then((data) => setUtenteInfo({
                nome: data.nome || '',
                email: data.email || '',
                telefone: data.telefone || '',
                morada: data.morada || '',
            }))
            .catch(() => setUtenteInfo(null));
    }, [formData.utente_id]);

    const handleSlotSelect = async (slot) => {
        setSelectedSlot(slot);
        setFormData((prev) => ({ ...prev, sala_id: '' }));

        const [horaStr, minStr] = slot.split(':');
        const horaFim = (parseInt(horaStr) + 1) % 24;
        const dataInicio = `${formData.data} ${slot}:00`;
        const dataFim = `${formData.data} ${String(horaFim).padStart(2, '0')}:${minStr}:00`;

        try {
            const resultado = await checkDisponibilidade(dataInicio, dataFim);
            const indisponiveis = resultado.salas_indisponiveis || [];
            const salasArea = salas.filter((sala) => {
                const temArea = sala.areas_clinicas?.some(
                    (a) => a.id === parseInt(formData.area_clinica_id)
                );
                if (!temArea) return false;
                return !indisponiveis.some((id) => parseInt(id) === sala.id);
            });
            setSalasDisponiveis(salasArea);
        } catch {
            const salasArea = salas.filter((sala) =>
                sala.areas_clinicas?.some((a) => a.id === parseInt(formData.area_clinica_id))
            );
            setSalasDisponiveis(salasArea);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const utenteId = user?.role === 'utente' ? user?.id : formData.utente_id;

        if (!formData.data || !selectedSlot || !formData.area_clinica_id || !formData.sala_id || !formData.terapeuta_id || !utenteId) {
            toast.error('Preenche todos os campos obrigatórios');
            return;
        }

        if (new Date(`${formData.data}T${selectedSlot}:00`) <= new Date()) {
            toast.error('Não é possível marcar consultas no passado. Escolhe uma data e hora futuras.');
            return;
        }

        const dataInicio = `${formData.data} ${selectedSlot}:00`;
        const [horaStr, minStr] = selectedSlot.split(':');
        const horaFim = (parseInt(horaStr) + 1) % 24;
        const dataFim = `${formData.data} ${String(horaFim).padStart(2, '0')}:${minStr}:00`;

        onSubmit({
            ...formData,
            hora: selectedSlot,
            utente_id: utenteId,
            data_inicio: dataInicio,
            data_fim: dataFim,
        });

        setFormData({
            data: '',
            tipo: 'consulta_geral',
            area_clinica_id: '',
            sala_id: '',
            terapeuta_id: user?.role === 'terapeuta' ? String(user.id) : '',
            utente_id: '',
        });
        setSelectedSlot('');
        setSlotsDisponiveis([]);
        setSalasDisponiveis([]);
        setUtenteInfo(null);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{t('consultationsPage.newAppointment')}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-two-col">
                        {/* Left column: scheduling fields */}
                        <div className="modal-col">
                            <p className="modal-col-title">{t('consultationDetails.information') || 'Detalhes da Consulta'}</p>

                            <div className="form-group">
                                <label htmlFor="area_clinica_id">Área Clínica *</label>
                                <select
                                    id="area_clinica_id"
                                    name="area_clinica_id"
                                    value={formData.area_clinica_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">{t('createPatient.selectClinicArea') || 'Seleciona uma área clínica'}</option>
                                    {areasClinicas.map((area) => (
                                        <option key={area.id} value={area.id}>
                                            {area.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="terapeuta_id">Terapeuta *</label>
                                <select
                                    id="terapeuta_id"
                                    name="terapeuta_id"
                                    value={formData.terapeuta_id}
                                    onChange={handleChange}
                                    required
                                    disabled={!formData.area_clinica_id}
                                >
                                        <option value="">
                                        {formData.area_clinica_id ? t('consultationsPage.selectTherapist') || 'Seleciona um terapeuta' : t('consultationsPage.selectAreaFirst') || 'Seleciona primeiro uma área clínica'}
                                    </option>
                                    {terapeutasFiltrados.map((terapeuta) => (
                                        <option key={terapeuta.user_id} value={terapeuta.user_id}>
                                            {terapeuta.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Data *</label>
                                <MiniCalendar
                                    value={formData.data}
                                    onChange={(dateStr) => setFormData((prev) => ({ ...prev, data: dateStr }))}
                                    minDate={today}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('consultationsPage.columns.startDate') || 'Horário'} *</label>
                                {!formData.terapeuta_id || !formData.data ? (
                                    <p className="helper-text" style={{ margin: 0 }}>
                                        {t('consultationsPage.selectTherapistAndDate') || 'Seleciona terapeuta e data para ver os horários disponíveis.'}
                                    </p>
                                ) : loadingSlots ? (
                                    <p className="helper-text" style={{ margin: 0 }}>{t('common.loading') || 'A carregar horários...'}</p>
                                ) : slotsDisponiveis.length === 0 ? (
                                    <p className="helper-text" style={{ margin: 0 }}>{t('consultationsPage.noResults') || 'Sem horários disponíveis para esta data.'}</p>
                                ) : (
                                    <div className="slots-grid">
                                        {slotsDisponiveis.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                                                onClick={() => handleSlotSelect(slot)}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedSlot && (
                                <div className="form-group">
                                    <label htmlFor="sala_id">Sala *</label>
                                    {salasDisponiveis.length === 0 ? (
                                        <p className="helper-text" style={{ margin: 0 }}>
                                                {t('consultationsPage.noRoomsAvailable') || 'Sem salas disponíveis para este horário.'}
                                            </p>
                                    ) : (
                                        <select
                                            id="sala_id"
                                            name="sala_id"
                                            value={formData.sala_id}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Seleciona uma sala</option>
                                            {salasDisponiveis.map((sala) => (
                                                <option key={sala.id} value={sala.id}>
                                                    {sala.nome}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right column: utente + personal info */}
                        <div className="modal-col">
                            <p className="modal-col-title">{t('dashboardStaff.patients') || 'Dados do Utente'}</p>

                            {isStaff(user?.role) && (
                                <div className="form-group">
                                    <label htmlFor="utente_id">Utente/Paciente *</label>
                                    <select
                                        id="utente_id"
                                        name="utente_id"
                                        value={formData.utente_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">{t('students.searchPlaceholder') || 'Seleciona um utente'}</option>
                                        {utentes.map((utente) => (
                                            <option key={utente.id} value={utente.id}>
                                                {utente.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {utenteInfo ? (
                                <div className="utente-info-panel">
                                    <div className="utente-info-row">
                                        <span className="utente-info-label">{t('register.name') || 'Nome'}</span>
                                        <span className="utente-info-value">{utenteInfo.nome || '—'}</span>
                                    </div>
                                    <div className="utente-info-row">
                                        <span className="utente-info-label">{t('login.emailLabel') || 'Email'}</span>
                                        <span className="utente-info-value">{utenteInfo.email || '—'}</span>
                                    </div>
                                    <div className="utente-info-row">
                                        <span className="utente-info-label">{t('home.phone') || 'Telefone'}</span>
                                        <span className="utente-info-value">{utenteInfo.telefone || '—'}</span>
                                    </div>
                                    <div className="utente-info-row">
                                        <span className="utente-info-label">{t('createPatient.address') || 'Morada'}</span>
                                        <span className="utente-info-value">{utenteInfo.morada || '—'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="utente-info-panel">
                                    <p className="utente-info-empty">
                                        {isStaff(user?.role)
                                            ? t('students.selectPatientInfo') || 'Seleciona um utente para ver os dados de contacto.'
                                            : t('students.contactInfoUnavailable') || 'Informações de contacto não disponíveis.'}
                                    </p>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="tipo">{t('consultationDetails.type') || 'Tipo de Consulta'}</label>
                                <select
                                    id="tipo"
                                    name="tipo"
                                    value={formData.tipo}
                                    onChange={handleChange}
                                >
                                    <option value="consulta_geral">{t('consultationsPage.defaultType') || 'Consulta Geral'}</option>
                                    <option value="consulta_especializada">{t('consultationsPage.specialized') || 'Consulta Especializada'}</option>
                                    <option value="seguimento">{t('consultationsPage.followUp') || 'Seguimento'}</option>
                                    <option value="avaliacao">{t('consultationsPage.evaluation') || 'Avaliação'}</option>
                                </select>
                            </div>

                            <div className="modal-buttons" style={{ marginTop: 'auto' }}>
                                <button type="button" className="btn-secondary" onClick={onClose}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? t('common.loading') : t('consultationsPage.newAppointment')}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
