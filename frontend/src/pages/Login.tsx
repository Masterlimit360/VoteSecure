import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate successful login and redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-10 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900">
          <Fingerprint className="h-8 w-8 text-primary-600 dark:text-primary-400" />
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
      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div className="rounded-md shadow-sm space-y-4">
          <div>
            <label htmlFor="index-number" className="sr-only">Index Number / ID</label>
            <input
              id="index-number"
              name="index_number"
              type="text"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
              placeholder="Index Number / ID"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
              placeholder="Password"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
              Forgot your password?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
