import { useAuth } from '~/utils/auth';
import { useNavigate } from '@remix-run/react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Journal</h1>
      <div>
        <span style={{ marginRight: '16px' }}>Welcome, {user.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
