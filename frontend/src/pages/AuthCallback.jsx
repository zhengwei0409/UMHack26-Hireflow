import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('hireflow_token', token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 to-slate-800 absolute inset-0 z-50">
      <div className="w-12 h-12 border-4 border-t-white border-white/20 rounded-full animate-spin mb-4"></div>
      <div className="text-xl font-medium text-white/90">Completing sign in...</div>
    </div>
  );
};

export default AuthCallback;
