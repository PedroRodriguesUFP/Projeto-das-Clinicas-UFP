import { useState, useMemo } from 'react';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function MiniCalendar({ value, onChange, minDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = parseDate(value);
  const min = parseDate(minDate) || today;

  const initial = selected || (min > today ? min : today);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day) => {
    if (!day) return;
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    if (date < min) return;
    onChange(toStr(date));
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <button type="button" className="mini-cal-nav" onClick={prevMonth}>‹</button>
        <span className="mini-cal-title">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" className="mini-cal-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="mini-calendar-grid">
        {DAYS.map(d => (
          <div key={d} className="mini-cal-dow">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const date = new Date(viewYear, viewMonth, day);
          date.setHours(0, 0, 0, 0);
          const isPast = date < min;
          const isSelected = selected &&
            selected.getFullYear() === viewYear &&
            selected.getMonth() === viewMonth &&
            selected.getDate() === day;
          return (
            <button
              key={day}
              type="button"
              className={`mini-cal-day${isSelected ? ' selected' : ''}${isPast ? ' disabled' : ''}`}
              onClick={() => handleDay(day)}
              disabled={isPast}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
