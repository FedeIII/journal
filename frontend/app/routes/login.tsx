import { useState, useEffect } from 'react';
import { useNavigate, Link } from '@remix-run/react';
import { useAuth } from '~/utils/auth';
import { api } from '~/utils/api';
import { getSessionId } from '~/utils/session';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<any>(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/entry');
    }
  }, [user, navigate]);

  // Fetch random message on mount
  useEffect(() => {
    api.getRandomMessage('login')
      .then((msg) => {
        setMessage(msg);

        // Track message view
        if (msg.id) {
          api.trackMessageInteraction({
            messageId: msg.id,
            sessionId: getSessionId(),
            context: 'login',
            userState: 'new_visitor', // We don't know yet if they have entries
          }).catch((err) => console.error('Error tracking message view:', err));
        }
      })
      .catch((err) => console.error('Error fetching message:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Track "left" outcome before navigating (user completed login)
      // Note: We can't track full engagement here since they're logging in, not registering
      if (message?.id) {
        await api.trackMessageInteraction({
          messageId: message.id,
          sessionId: getSessionId(),
          context: 'login',
          userState: 'new_visitor',
          outcome: 'left', // They're continuing, not bouncing
        }).catch((err) => console.error('Error tracking outcome:', err));
      }

      navigate('/entry');
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
        <h1>Journal - Login</h1>

        {message && (
          <div
            style={{
              background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
              border: "1px solid #667eea40",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#555",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.message_text}
          </div>
        )}

        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
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
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <button onClick={handleGoogleLogin} className="btn btn-secondary">
          Continue with Google
        </button>
        <div className="text-center">
          Don't have an account? <Link to="/register" className="link">Register</Link>
        </div>
      </div>
    </div>
  );
}
