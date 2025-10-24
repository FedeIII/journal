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
        {viewMode === 'month' ? (
          <MonthView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}
      </div>
    </div>
  );
}
