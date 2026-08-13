import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, User } from 'lucide-react';
import api from '../api';

const VoterDashboard = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const res = await api.get('/voters/elections');
        setElections(res.data);
      } catch (err: any) {
        setError('Failed to load active elections. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, Voter!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Your identity is secured. Select an active election to securely cast your ballot.</p>
        </div>
        <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
          <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active Elections</h2>
        
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
          </div>
        ) : elections.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            No active elections found at the moment.
          </div>
        ) : (
          elections.map((election: any) => (
            <div key={election.id} className="group bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-primary-500 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-primary-100 text-primary-600 dark:bg-gray-800`}>
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{election.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ends: {new Date(election.endTime).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{election.candidates?.length || 0} Candidates</p>
                  </div>
                  <Link to={`/vote/${election.id}`} className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full transition-colors shadow-sm">
                    <ChevronRight className="h-6 w-6" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VoterDashboard;
