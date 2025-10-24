import { useState, useEffect } from 'react';
import { useNavigate, Link } from '@remix-run/react';
import { useAuth } from '~/utils/auth';
import { api } from '~/utils/api';
import { getSessionId } from '~/utils/session';
import { getCachedMessage, setCachedMessage, clearCachedMessage } from '~/utils/messageCache';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<any>(null);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/entry');
    }
  }, [user, navigate]);

  // Fetch or use cached message on mount
  useEffect(() => {
    // Check cache first
    const cached = getCachedMessage('register');

    if (cached) {
      // Use cached message
      setMessage(cached);

      // Track view for cached message
      if (cached.id) {
        api.trackMessageInteraction({
          messageId: cached.id,
          sessionId: getSessionId(),
          context: 'register',
          userState: 'new_visitor',
        }).catch((err) => console.error('Error tracking message view:', err));
      }
    } else {
      // Fetch new random message and cache it
      api.getRandomMessage('register')
        .then((msg) => {
          setMessage(msg);

          // Cache the message
          setCachedMessage(msg, 'register');

          // Track message view
          if (msg.id) {
            api.trackMessageInteraction({
              messageId: msg.id,
              sessionId: getSessionId(),
              context: 'register',
              userState: 'new_visitor',
            }).catch((err) => console.error('Error tracking message view:', err));
          }
        })
        .catch((err) => console.error('Error fetching message:', err));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register(email, password, name);

      // Track registration outcome
      if (message?.id && response.user) {
        await api.trackMessageInteraction({
          messageId: message.id,
          sessionId: getSessionId(),
          userId: response.user.id,
          context: 'register',
          userState: 'new_visitor',
          outcome: 'registered',
        }).catch((err) => console.error('Error tracking outcome:', err));
      }

      // Clear the cached register message so they get a new one for entry page
      clearCachedMessage('register');

      navigate('/entry');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3001/api/auth/google';
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Journal</h1>
        <p style={{
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "var(--font-size-sm)",
          marginTop: "calc(var(--space-3) * -1)",
          marginBottom: "var(--space-4)",
          fontStyle: "italic"
        }}>
          Begin your journey
        </p>

        {message && (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: `2px solid var(--accent-primary)`,
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              marginBottom: "var(--space-4)",
              fontSize: "var(--font-size-sm)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              fontStyle: "italic",
              position: "relative",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{
              position: "absolute",
              top: 0,
              left: "var(--space-3)",
              transform: "translateY(-50%)",
              background: "var(--bg-elevated)",
              padding: "0 var(--space-2)",
              color: "var(--accent-tertiary)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>
              ⊹ Welcome ⊹
            </div>
            {message.message_text}
          </div>
        )}

        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <button onClick={handleGoogleLogin} className="btn btn-secondary">
          Continue with Google
        </button>
        <div className="text-center">
          Already have an account? <Link to="/login" className="link">Login</Link>
        </div>
      </div>
    </div>
  );
}
