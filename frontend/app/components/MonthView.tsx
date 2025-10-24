import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { api } from '~/utils/api';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';

interface MonthViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  viewMode: 'month' | 'week';
  setViewMode: (mode: 'month' | 'week') => void;
}

export default function MonthView({ currentDate, setCurrentDate, viewMode, setViewMode }: MonthViewProps) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const data = await api.getEntriesInRange(
          format(calendarStart, 'yyyy-MM-dd'),
          format(calendarEnd, 'yyyy-MM-dd')
        );
        const entriesMap = new Map();
        data.forEach((entry: any) => {
          entriesMap.set(format(new Date(entry.entry_date), 'yyyy-MM-dd'), entry);
        });
        setEntries(entriesMap);
      } catch (err) {
        console.error('Error fetching entries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [currentDate]);

  const handleDayClick = (date: Date) => {
    navigate(`/day/${format(date, 'MM-dd')}`);
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
        paddingBottom: 'var(--space-3)',
        borderBottom: `1px solid var(--border-light)`
      }}>
        <button
          onClick={handlePrevMonth}
          className="btn btn-secondary"
          style={{
            width: 'auto',
            padding: 'var(--space-2) var(--space-3)'
          }}
        >
          ← Prev
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="view-toggle-group">
            <button
              onClick={() => setViewMode('month')}
              className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            >
              Week
            </button>
          </div>

          <h2 style={{
            fontSize: 'var(--font-size-2xl)',
            margin: 0,
            color: 'var(--text-primary)',
            fontWeight: 400
          }}>
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={handleToday}
            className="btn btn-secondary"
            style={{
              width: 'auto',
              padding: 'var(--space-2) var(--space-3)'
            }}
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="btn btn-secondary"
            style={{
              width: 'auto',
              padding: 'var(--space-2) var(--space-3)'
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading entries...</div>
      ) : (
        <div className="calendar-grid">
          {weekDays.map((day) => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const hasEntry = entries.has(dateString);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={dateString}
                className={`calendar-day ${hasEntry ? 'has-entry' : ''} ${isTodayDate ? 'today' : ''}`}
                onClick={() => handleDayClick(day)}
                style={{
                  opacity: isCurrentMonth ? 1 : 0.4,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: isTodayDate ? 'bold' : 'normal', fontSize: 'var(--font-size-lg)' }}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
