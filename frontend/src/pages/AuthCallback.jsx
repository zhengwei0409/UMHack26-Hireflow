import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeAuthFromToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      completeAuthFromToken(token)
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => {
          localStorage.removeItem('hireflow_token');
          navigate('/login', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, completeAuthFromToken]);

  return <div className="loading-screen">Signing you in...</div>;
};

export default AuthCallback;
