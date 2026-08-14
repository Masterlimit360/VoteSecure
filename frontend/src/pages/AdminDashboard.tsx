import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Vote, ShieldAlert } from 'lucide-react';
import api from '../api';

const AdminDashboard = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  
  // Forms
  const [showElectionForm, setShowElectionForm] = useState(false);
  const [newElection, setNewElection] = useState({ title: '', start_time: '', end_time: '' });

  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', bio: '', photoUrl: '' });

  const fetchElections = async () => {
    try {
      const res = await api.get('/admin/elections');
      setElections(res.data);
      if (res.data.length > 0 && !selectedElectionId) {
        setSelectedElectionId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResults = async (electionId: number) => {
    try {
      const res = await api.get(`/admin/elections/${electionId}/results`);
      // Convert group-by data into Recharts friendly array
      // e.g. res.data = [ { candidateId: 1, _count: { id: 5 } } ]
      const formattedData = res.data.map((r: any) => ({
        name: `Candidate ${r.candidateId}`,
        votes: r._count.id
      }));
      setResults(formattedData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchResults(selectedElectionId);
      // We would also map the actual candidate names instead of IDs, but this is fine for MVP chart data
    }
  }, [selectedElectionId]);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/elections', newElection);
      setShowElectionForm(false);
      fetchElections();
    } catch (err) {
      alert("Failed to create election.");
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElectionId) return;
    try {
      await api.post(`/admin/elections/${selectedElectionId}/candidates`, newCandidate);
      setShowCandidateForm(false);
      fetchElections(); // Refresh to update candidates list
    } catch (err) {
      alert("Failed to add candidate.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Management Console</h1>
        <button onClick={() => setShowElectionForm(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-colors">
          + Create Election
        </button>
      </div>

      {showElectionForm && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">New Election</h2>
          <form className="flex gap-4 items-end" onSubmit={handleCreateElection}>
            <div className="flex-1">
              <label className="block text-sm mb-1 dark:text-gray-300">Title</label>
              <input type="text" required onChange={(e) => setNewElection({...newElection, title: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1 dark:text-gray-300">Start Time</label>
              <input type="datetime-local" required onChange={(e) => setNewElection({...newElection, start_time: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1 dark:text-gray-300">End Time</label>
              <input type="datetime-local" required onChange={(e) => setNewElection({...newElection, end_time: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white" />
            </div>
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-xl">Save</button>
            <button type="button" onClick={() => setShowElectionForm(false)} className="bg-gray-300 px-4 py-2 rounded-xl">Cancel</button>
          </form>
        </div>
      )}

      {selectedElectionId && showCandidateForm && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Candidate to Election #{selectedElectionId}</h2>
          <form className="flex gap-4 items-end" onSubmit={handleAddCandidate}>
            <div className="flex-1">
              <label className="block text-sm mb-1 dark:text-gray-300">Name</label>
              <input type="text" required onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1 dark:text-gray-300">Bio</label>
              <input type="text" onChange={(e) => setNewCandidate({...newCandidate, bio: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1 dark:text-gray-300">Image URL</label>
              <input type="text" onChange={(e) => setNewCandidate({...newCandidate, photoUrl: e.target.value})} placeholder="https://..." className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white" />
            </div>
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-xl">Add</button>
            <button type="button" onClick={() => setShowCandidateForm(false)} className="bg-gray-300 px-4 py-2 rounded-xl">Cancel</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Elections</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{elections.length}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-primary-100 dark:bg-primary-900/50 p-4 rounded-full">
            <Vote className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Candidates Data</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">Live Sync</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-full">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">System Status</p>
            <p className="text-2xl font-bold text-green-600">Secure</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <select 
            className="p-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg font-bold"
            value={selectedElectionId || ''}
            onChange={(e) => setSelectedElectionId(parseInt(e.target.value))}
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>{el.title}</option>
            ))}
          </select>
          <button onClick={() => setShowCandidateForm(true)} className="text-primary-600 dark:text-primary-400 text-sm font-bold border border-primary-600 dark:border-primary-400 px-4 py-2 rounded-lg">
            + Add Candidate to Selected Election
          </button>
        </div>

        <div className="h-80 w-full">
          {results.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No votes cast yet for this election.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
