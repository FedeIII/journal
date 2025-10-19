import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/utils/auth';
import { api } from '~/utils/api';
import Editor from '~/components/Editor';
import Navbar from '~/components/Navbar';
import { format } from 'date-fns';

export default function Entry() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');
  const displayDate = format(today, 'EEEE, MMMM d, yyyy');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      api
        .getEntry(todayString)
        .then((entry) => {
          if (entry) {
            setContent(entry.content);
          }
        })
        .catch((err) => {
          console.error('Error loading entry:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [user, todayString]);

  const handleSave = async () => {
    if (!content) return;

    setSaving(true);
    try {
      await api.saveEntry(todayString, content);
      navigate('/');
    } catch (err) {
      console.error('Error saving entry:', err);
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div>
      <Navbar />
      <div className="editor-container">
        <h1 className="date-title">{displayDate}</h1>
        <Editor content={content} onChange={setContent} />
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving}
            style={{ width: 'auto', padding: '12px 24px' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/calendar')}
            style={{ width: 'auto', padding: '12px 24px' }}
          >
            View Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
