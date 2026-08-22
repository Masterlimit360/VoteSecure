import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Vote, ShieldAlert, Crown, CheckCircle2, XCircle, UserPlus } from 'lucide-react';
import api from '../api';

// Helper: decode JWT payload without a library
const decodeToken = (token: string): any => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const AdminDashboard = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Forms
  const [showElectionForm, setShowElectionForm] = useState(false);
  const [newElection, setNewElection] = useState({ title: '', start_time: '', end_time: '' });

  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', bio: '', photoUrl: '' });

  // Determine role from JWT
  useEffect(() => {
    const token = localStorage.getItem('votesecure_token');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setIsSuperAdmin(decoded.role === 'superadmin');
      }
    }
  }, []);

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

  const fetchPendingAdmins = async () => {
    try {
      const res = await api.get('/admin/pending-admins');
      setPendingAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingAdmins();
    }
  }, [isSuperAdmin]);

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

  const handleApproveAdmin = async (adminId: number) => {
    try {
      await api.post(`/admin/approve-admin/${adminId}`);
      fetchPendingAdmins();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve admin');
    }
  };

  const handleRejectAdmin = async (adminId: number) => {
    if (!confirm('Are you sure you want to reject this admin? Their account will be permanently deleted.')) return;
    try {
      await api.post(`/admin/reject-admin/${adminId}`);
      fetchPendingAdmins();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject admin');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Management Console</h1>
          <div className="mt-1 flex items-center space-x-2">
            {isSuperAdmin ? (
              <span className="inline-flex items-center space-x-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
                <Crown className="w-3 h-3" />
                <span>SuperAdmin</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-xs font-bold">
                <ShieldAlert className="w-3 h-3" />
                <span>Admin</span>
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setShowElectionForm(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-colors">
          + Create Election
        </button>
      </div>

      {/* SuperAdmin: Pending Admins Section */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800/50 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-lg">
                <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pending Admin Approvals</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Review and approve admin registration requests</p>
              </div>
            </div>
            {pendingAdmins.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {pendingAdmins.length} pending
              </span>
            )}
          </div>

          <div className="p-6">
            {pendingAdmins.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="font-medium">No pending requests</p>
                <p className="text-sm">All admin registrations have been processed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAdmins.map((admin: any) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
                        {admin.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{admin.fullName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveAdmin(admin.id)}
                          className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectAdmin(admin.id)}
                          className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
