import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, UserPlus } from 'lucide-react';
import api from '../api';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      localStorage.setItem('votesecure_token', res.data.token);
      setSuccess(`Admin account created! Your login ID is: ADMIN-${res.data.adminId}`);
      
      // Delay redirect so they can see their Admin ID
      setTimeout(() => {
        navigate('/admin');
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-10 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/30">
      
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/50">
          <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Master Admin Setup</h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
          Restricted Area. Authorized Personnel Only.
        </p>
      </div>

      {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
      
      {success ? (
        <div className="text-green-600 bg-green-50 dark:bg-green-900/20 p-6 rounded-xl text-center space-y-4 border border-green-200 dark:border-green-800">
          <p className="font-bold text-lg">{success}</p>
          <p className="text-sm">Please write this ID down. You will be redirected to the dashboard in 5 seconds...</p>
        </div>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={submitDetails}>
          <div className="space-y-4">
            <input name="full_name" type="text" required placeholder="Administrator Full Name" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-red-500 focus:border-red-500 transition-colors" />
            <input name="email" type="email" required placeholder="Official Email Address" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-red-500 focus:border-red-500 transition-colors" />
            <input name="password" type="password" required placeholder="Master Password" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-red-500 focus:border-red-500 transition-colors" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 disabled:opacity-50 transition-all flex items-center justify-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>{loading ? 'Provisioning...' : 'Provision Admin Account'}</span>
          </button>
        </form>
      )}

    </div>
  );
};

export default AdminRegister;
