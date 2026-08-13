import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, ChevronRight, User } from 'lucide-react';
import axios from 'axios';

const VoterDashboard = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mocking data fetch for now
  useEffect(() => {
    setTimeout(() => {
      setElections([
        {
          id: 1,
          title: 'SRC Presidential Election 2026',
          status: 'active',
          endTime: new Date(Date.now() + 86400000).toISOString(),
          candidates: 4
        },
        {
          id: 2,
          title: 'Departmental Representatives',
          status: 'draft',
          endTime: new Date(Date.now() + 172800000).toISOString(),
          candidates: 2
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, Voter!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Your identity is verified. You can cast your votes in active elections below.</p>
        </div>
        <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
          <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active Elections</h2>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
          </div>
        ) : (
          elections.map((election: any) => (
            <div key={election.id} className="group bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-primary-500 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${election.status === 'active' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'} dark:bg-gray-800`}>
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{election.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ends at: {new Date(election.endTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{election.candidates} Candidates</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {election.status === 'active' ? 'Ready to vote' : 'Starting soon'}
                    </p>
                  </div>
                  {election.status === 'active' ? (
                    <Link to={`/vote/${election.id}`} className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full transition-colors shadow-sm">
                      <ChevronRight className="h-6 w-6" />
                    </Link>
                  ) : (
                    <div className="bg-gray-200 dark:bg-gray-800 text-gray-400 p-2 rounded-full">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  )}
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
