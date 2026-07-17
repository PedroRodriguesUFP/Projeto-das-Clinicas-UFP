import { useEffect, useState } from 'react';
import { CalendarDate } from 'react-bootstrap-icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import '../styles/calendario.css';

export function CalendarioVisualizacao({
    consultas = [],
    onDateClick = null,
    onEventClick = null,
    mode = 'month'
}) {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);

    const isMobile = () => window.innerWidth < 768;

    useEffect(() => {
        try {
            if (!consultas || consultas.length === 0) {
                setEvents([]);
                return;
            }

            const eventosFormatados = consultas.map((consulta) => {
                try {
                    const startStr = consulta.data_inicio || consulta.data || '';
                    const endStr = consulta.data_fim || (() => {
                        const d = new Date(startStr + 'Z');
                        d.setUTCMinutes(d.getUTCMinutes() + parseInt(consulta.duracao || 60));
                        return d.toISOString().slice(0, 19);
                    })();

                    const coresEstado = {
                        agendada: '#3498db',
                        realizada: '#2ecc71',
                        cancelada: '#e74c3c',
                        faltou: '#95a5a6',
                    };

                    const pendente = consulta.estado_validacao === 'pendente';

                    return {
                        id: String(consulta.id),
                        title: `${pendente ? '⏳ ' : ''}${consulta.tipo || 'Consulta'} - ${consulta.utente_nome || 'Cliente'}${pendente ? ' (pendente de aprovação)' : ''}`,
                        start: startStr,
                        end: endStr,
                        backgroundColor: coresEstado[consulta.estado] || '#3498db',
                        borderColor: pendente ? '#f59e0b' : (coresEstado[consulta.estado] || '#3498db'),
                        display: 'block',
                        extendedProps: {
                            consultaId: consulta.id,
                            estado: consulta.estado,
                            estadoValidacao: consulta.estado_validacao,
                            tipo: consulta.tipo,
                            utente: consulta.utente_nome,
                        }
                    };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);

            setEvents(eventosFormatados);
            setError(null);
        } catch (e) {
            setError(e.message);
        }
    }, [consultas]);

    const handleDateClick = (info) => {
        try {
            if (onDateClick) onDateClick(info.dateStr);
        } catch (e) {}
    };

    const handleEventClick = (info) => {
        try {
            if (onEventClick) onEventClick(info.event.extendedProps.consultaId, info.event.extendedProps);
        } catch (e) {}
    };

    const getInitialView = () => {
        if (isMobile()) return 'listWeek';
        if (mode === 'week') return 'timeGridWeek';
        if (mode === 'day') return 'timeGridDay';
        return 'dayGridMonth';
    };

    const getHeaderToolbar = () => {
        if (isMobile()) {
            return {
                left: 'prev,next today',
                center: 'title',
                right: 'listWeek,dayGridMonth',
            };
        }
        return {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
        };
    };

    if (error) {
        return (
            <div className="calendario-container">
                <div style={{ color: 'red', padding: '1rem' }}>
                    Erro ao carregar calendário: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="calendario-container">
            <div className="calendario-header">
                <h3><CalendarDate size={18} /> Calendário</h3>
                <p className="calendario-legenda">
                    <span className="legenda-item"><span className="cor agendada"></span> Agendada</span>
                    <span className="legenda-item"><span className="cor realizada"></span> Realizada</span>
                    <span className="legenda-item"><span className="cor cancelada"></span> Cancelada</span>
                    <span className="legenda-item"><span className="cor faltou"></span> Faltou</span>
                </p>
            </div>

            <div className="fc-wrapper" style={{ position: 'relative', width: '100%', minHeight: '400px' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={getInitialView()}
                    headerToolbar={getHeaderToolbar()}
                    buttonText={{
                        today: 'Hoje',
                        month: 'Mês',
                        week: 'Semana',
                        day: 'Dia',
                        list: 'Lista',
                    }}
                    events={events}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    height="100%"
                    contentHeight="auto"
                    timeZone="UTC"
                    locale="pt"
                    editable={false}
                    windowResize={(arg) => {
                        if (isMobile()) {
                            arg.view.calendar.changeView('listWeek');
                        } else if (arg.view.type === 'listWeek') {
                            arg.view.calendar.changeView('dayGridMonth');
                        }
                    }}
                    noEventsText="Sem consultas neste período"
                />
            </div>
        </div>
    );
}
