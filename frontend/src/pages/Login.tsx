import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import api from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'voter' | 'admin'>('voter');

  // Voter form
  const [voterForm, setVoterForm] = useState({ index_number: '', password: '' });
  // Admin form
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });

  const handleVoterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', voterForm);
      localStorage.setItem('votesecure_token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/admin/login', adminForm);
      localStorage.setItem('votesecure_token', res.data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-10 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
      <div className="text-center">
        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full transition-colors duration-300 ${loginMode === 'voter' ? 'bg-primary-100 dark:bg-primary-900' : 'bg-amber-100 dark:bg-amber-900'}`}>
          {loginMode === 'voter' 
            ? <Fingerprint className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            : <ShieldCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          }
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to VoteSecure
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            register for a new account
          </Link>
        </p>
      </div>

      {/* Login Mode Toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          type="button"
          onClick={() => { setLoginMode('voter'); setError(''); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${loginMode === 'voter' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Voter Login
        </button>
        <button
          type="button"
          onClick={() => { setLoginMode('admin'); setError(''); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${loginMode === 'admin' ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Admin Login
        </button>
      </div>

      {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}

      {/* Voter Login Form */}
      {loginMode === 'voter' && (
        <form className="space-y-6" onSubmit={handleVoterLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="voter-index-number" className="sr-only">Index Number / ID</label>
              <input
                id="voter-index-number"
                name="index_number"
                type="text"
                required
                value={voterForm.index_number}
                onChange={(e) => setVoterForm({ ...voterForm, index_number: e.target.value })}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Index Number / Student ID"
              />
            </div>
            <div>
              <label htmlFor="voter-password" className="sr-only">Password</label>
              <input
                id="voter-password"
                name="password"
                type="password"
                required
                value={voterForm.password}
                onChange={(e) => setVoterForm({ ...voterForm, password: e.target.value })}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign in as Voter'}
            </button>
          </div>
        </form>
      )}

      {/* Admin Login Form */}
      {loginMode === 'admin' && (
        <form className="space-y-6" onSubmit={handleAdminLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="admin-email" className="sr-only">Email Address</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                required
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Admin Email Address"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="sr-only">Password</label>
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign in as Admin'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Need an admin account?{' '}
            <Link to="/admin/register" className="font-medium text-amber-600 hover:text-amber-500 transition-colors">
              Register here
            </Link>
          </p>
        </form>
      )}
    </div>
  );
};

export default Login;
