import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/utils/auth';
import { api } from '~/utils/api';
import { format } from 'date-fns';
import Login from './login';
import Entry from './entry';
import Calendar from './calendar';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingEntry, setCheckingEntry] = useState(true);
  const [hasEntryToday, setHasEntryToday] = useState(false);

  useEffect(() => {
    const checkTodayEntry = async () => {
      if (!authLoading && user) {
        try {
          const today = format(new Date(), 'yyyy-MM-dd');
          const entry = await api.getEntry(today);
          setHasEntryToday(!!entry);
        } catch (err) {
          console.error('Error checking today entry:', err);
          setHasEntryToday(false);
        } finally {
          setCheckingEntry(false);
        }
      } else if (!authLoading) {
        setCheckingEntry(false);
      }
    };

    checkTodayEntry();
  }, [user, authLoading]);

  // Show loading while checking auth or entry status
  if (authLoading || (user && checkingEntry)) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  // Not logged in → show login page
  if (!user) {
    return <Login />;
  }

  // Logged in but no entry today → show entry screen
  if (!hasEntryToday) {
    return <Entry />;
  }

  // Logged in and has entry today → show calendar week view
  return <Calendar />;
}
