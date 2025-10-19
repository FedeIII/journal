import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/utils/auth';
import { api } from '~/utils/api';
import Navbar from '~/components/Navbar';
import MonthView from '~/components/MonthView';
import WeekView from '~/components/WeekView';

export type ViewMode = 'month' | 'week';

export default function Calendar() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div>
      <Navbar />
      <div className="calendar">
        <div className="calendar-header">
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={viewMode === 'month' ? 'btn' : 'btn btn-secondary'}
              onClick={() => setViewMode('month')}
              style={{ width: 'auto', padding: '8px 16px' }}
            >
              Month View
            </button>
            <button
              className={viewMode === 'week' ? 'btn' : 'btn btn-secondary'}
              onClick={() => setViewMode('week')}
              style={{ width: 'auto', padding: '8px 16px' }}
            >
              Week View
            </button>
          </div>
          <button
            className="btn"
            onClick={() => navigate('/entry')}
            style={{ width: 'auto', padding: '8px 16px' }}
          >
            New Entry
          </button>
        </div>

        {viewMode === 'month' ? (
          <MonthView currentDate={currentDate} setCurrentDate={setCurrentDate} />
        ) : (
          <WeekView currentDate={currentDate} setCurrentDate={setCurrentDate} />
        )}
      </div>
    </div>
  );
}
