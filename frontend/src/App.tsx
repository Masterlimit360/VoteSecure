import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Moon, Sun, ShieldCheck } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import VoterDashboard from './pages/VoterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VotingFlow from './pages/VotingFlow';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-primary-50 dark:bg-gray-950 transition-colors duration-300">
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-primary-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <ShieldCheck className="h-8 w-8 text-primary-500" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">VoteSecure</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <Link to="/login" className="text-gray-700 dark:text-gray-300 hover:text-primary-500 font-medium">Login</Link>
                <Link to="/register" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<VoterDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/vote/:id" element={<VotingFlow />} />
          </Routes>
        </main>

        <footer className="bg-white dark:bg-gray-900 border-t border-primary-100 dark:border-gray-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} VoteSecure. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
