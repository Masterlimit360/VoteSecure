import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus, Clock, Crown } from 'lucide-react';
import api from '../api';

const AdminRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; role: string; isApproved: boolean; token?: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/admin/register', formData);
      
      // If first admin (SuperAdmin), save token
      if (res.data.token) {
        localStorage.setItem('votesecure_token', res.data.token);
      }

      setResult({
        message: res.data.message,
        role: res.data.role,
        isApproved: res.data.isApproved,
        token: res.data.token
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-10 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-amber-100 dark:border-amber-900/30">
      
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/50">
          <ShieldCheck className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Admin Registration</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Register for an admin account. Your account will need to be approved by a SuperAdmin before you can access the dashboard.
        </p>
        <div className="mt-3 inline-flex items-center space-x-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-xs font-bold">
          <Crown className="w-3 h-3" />
          <span>First registration becomes SuperAdmin</span>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
      
      {result ? (
        <div className="space-y-6">
          {result.isApproved ? (
            /* SuperAdmin auto-approved */
            <div className="text-center space-y-4">
              <div className="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-xl border border-primary-200 dark:border-primary-800">
                <Crown className="h-12 w-12 text-primary-500 mx-auto mb-3" />
                <p className="font-bold text-lg text-gray-900 dark:text-white">SuperAdmin Account Created!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{result.message}</p>
              </div>
              <Link
                to="/admin"
                className="inline-block w-full py-4 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-all text-center"
              >
                Go to Admin Dashboard →
              </Link>
            </div>
          ) : (
            /* Regular admin pending approval */
            <div className="text-center space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800">
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-3 animate-pulse" />
                <p className="font-bold text-lg text-gray-900 dark:text-white">Registration Submitted!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{result.message}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                <p className="font-medium">What happens next?</p>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• A SuperAdmin will review your registration</li>
                  <li>• Once approved, you can log in with your email and password</li>
                  <li>• You'll receive admin access to manage elections</li>
                </ul>
              </div>
              <Link
                to="/login"
                className="inline-block w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all text-center"
              >
                Return to Login
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={submitDetails}>
          <div className="space-y-4">
            <input name="full_name" type="text" required placeholder="Full Name" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500 transition-colors" />
            <input name="email" type="email" required placeholder="Email Address" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500 transition-colors" />
            <input name="password" type="password" required placeholder="Password" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500 transition-colors" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 disabled:opacity-50 transition-all flex items-center justify-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>{loading ? 'Submitting...' : 'Register Admin Account'}</span>
          </button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an admin account?{' '}
            <Link to="/login" className="font-medium text-amber-600 hover:text-amber-500 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      )}

    </div>
  );
};

export default AdminRegister;
