import { useState, useEffect } from 'react';
import { api } from '~/utils/api';

interface ProgressStatsProps {
  compact?: boolean;
}

export default function ProgressStats({ compact = false }: ProgressStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getProgressStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching progress stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: compact ? 'var(--space-2)' : 'var(--space-4)',
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-sm)'
      }}>
        Loading stats...
      </div>
    );
  }

  if (!stats) return null;

  if (compact) {
    // Compact view for navbar
    return (
      <div style={{
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center',
        padding: 'var(--space-2)',
        fontSize: 'var(--font-size-sm)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>🔥</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {stats.currentStreak}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
            day{stats.currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{
          width: '1px',
          height: '16px',
          background: 'var(--border-light)'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>📅</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {stats.yearCompletion.toFixed(0)}%
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
            this year
          </span>
        </div>
      </div>
    );
  }

  // Full view for dedicated stats display
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid var(--border-light)`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-4)'
    }}>
      <h3 style={{
        margin: 0,
        marginBottom: 'var(--space-3)',
        fontSize: 'var(--font-size-lg)',
        fontWeight: 600,
        color: 'var(--text-primary)'
      }}>
        Your Progress
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)'
      }}>
        {/* Current Streak */}
        <div style={{
          background: 'var(--bg-elevated)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: stats.currentStreak === stats.bestStreak && stats.currentStreak > 0
            ? `2px solid var(--accent-primary)`
            : `1px solid var(--border-light)`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-1)'
          }}>
            <span style={{ fontSize: 'var(--font-size-xl)' }}>🔥</span>
            <div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '2px'
              }}>
                Current Streak
              </div>
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                {stats.currentStreak}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-1)'
          }}>
            {stats.messages.streakStatus}
          </div>
        </div>

        {/* Best Streak */}
        <div style={{
          background: 'var(--bg-elevated)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid var(--border-light)`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-1)'
          }}>
            <span style={{ fontSize: 'var(--font-size-xl)' }}>🏆</span>
            <div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '2px'
              }}>
                Best Streak
              </div>
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                {stats.bestStreak}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-1)'
          }}>
            All-time record
          </div>
        </div>

        {/* Year Completion */}
        <div style={{
          background: 'var(--bg-elevated)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid var(--border-light)`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-1)'
          }}>
            <span style={{ fontSize: 'var(--font-size-xl)' }}>📅</span>
            <div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '2px'
              }}>
                Year Progress
              </div>
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                {stats.yearCompletion.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-1)'
          }}>
            {stats.messages.yearCompletionStatus}
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      {stats.messages.main && (
        <div style={{
          background: 'var(--bg-primary)',
          border: `1px solid var(--accent-tertiary)`,
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          lineHeight: 'var(--line-height-relaxed)'
        }}>
          {stats.messages.main}
        </div>
      )}
    </div>
  );
}
