import { useEffect } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { useAuth } from '~/utils/auth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokenFromCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setTokenFromCallback(token);
      navigate('/entry');
    } else {
      navigate('/login');
    }
  }, [searchParams, setTokenFromCallback, navigate]);

  return (
    <div className="loading">
      Authenticating...
    </div>
  );
}
