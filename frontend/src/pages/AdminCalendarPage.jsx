import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAllConsultasParaCalendario } from '../services/admin';
import { cancelConsulta } from '../services/consultas';

export function AdminCalendarPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    carregarCalendario();
  }, []);

  const carregarCalendario = async () => {
    try {
      const data = await getAllConsultasParaCalendario();
      
      const formattedEvents = data.map(evt => ({
        id: evt.id,
        title: evt.title,
        start: evt.start,
        end: evt.end,
        backgroundColor: evt.estado === 'cancelada' ? '#ef4444' : '#3b82f6',
        borderColor: evt.estado === 'cancelada' ? '#b91c1c' : '#2563eb',
        extendedProps: { estado: evt.estado }
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Erro ao carregar calendário:", error);
    }
  };

  const handleEventClick = async (clickInfo) => {
    const estadoAtual = clickInfo.event.extendedProps.estado;
    
    if (estadoAtual === 'cancelada') {
      alert('Esta consulta já se encontra desmarcada.');
      return;
    }

    if (window.confirm(`Tem a certeza que deseja desmarcar a ${clickInfo.event.title}?`)) {
      try {
        await cancelConsulta(clickInfo.event.id);
        alert('Consulta cancelada com sucesso!');
        carregarCalendario(); // Faz refresh para atualizar as cores
      } catch (error) {
        alert("Erro ao cancelar consulta.");
      }
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Calendário Global (Admin)</h2>
      <div className="flex-1 bg-white p-4 rounded-lg shadow overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          eventClick={handleEventClick}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          height="100%"
          locale="pt"
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia'
          }}
        />
      </div>
    </div>
  );
}