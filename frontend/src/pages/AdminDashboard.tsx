
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Vote, ShieldAlert } from 'lucide-react';

const AdminDashboard = () => {
  const mockData = [
    { name: 'Candidate A', votes: 400 },
    { name: 'Candidate B', votes: 300 },
    { name: 'Candidate C', votes: 200 },
    { name: 'Candidate D', votes: 278 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-colors">
          + Create Election
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Verified Voters</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">1,248</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-primary-100 dark:bg-primary-900/50 p-4 rounded-full">
            <Vote className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Votes Cast</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">892</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-full">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Face Mismatches</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">14</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Live Election Results: Primary Ballot</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="name" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', color: '#fff'}}
              />
              <Bar dataKey="votes" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
