import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Users,
  Vote,
  ShieldAlert,
  Crown,
  CheckCircle2,
  XCircle,
  UserPlus,
  PlusCircle,
  Image as ImageIcon,
  Upload,
  Calendar,
  X,
  UserCheck
} from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  // Forms
  const [showElectionForm, setShowElectionForm] = useState(false);
  const [newElection, setNewElection] = useState({ title: '', start_time: '', end_time: '' });

  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', bio: '', photoUrl: '' });
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Find candidate names from current election
      const currentElection = elections.find((e) => e.id === electionId);
      const formattedData = res.data.map((r: any) => {
        const candidate = currentElection?.candidates?.find((c: any) => c.id === r.candidateId);
        return {
          name: candidate ? candidate.name : `Candidate #${r.candidateId}`,
          votes: r._count.id
        };
      });
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
    }
  }, [selectedElectionId, elections]);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/elections', newElection);
      setShowElectionForm(false);
      setNewElection({ title: '', start_time: '', end_time: '' });
      await fetchElections();
    } catch (err) {
      alert('Failed to create election.');
    } finally {
      setLoading(false);
    }
  };

  // Image File Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCandidate((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElectionId) return;
    if (!newCandidate.name.trim()) {
      alert('Please enter candidate name.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/admin/elections/${selectedElectionId}/candidates`, newCandidate);
      setShowCandidateForm(false);
      setNewCandidate({ name: '', bio: '', photoUrl: '' });
      await fetchElections();
    } catch (err) {
      alert('Failed to add candidate.');
    } finally {
      setLoading(false);
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

  const selectedElection = elections.find((e) => e.id === selectedElectionId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Admin Management Console
          </h1>
          <div className="mt-1.5 flex items-center space-x-2">
            {isSuperAdmin ? (
              <span className="inline-flex items-center space-x-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-amber-500/30">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>SuperAdmin Console</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-primary-500/30">
                <ShieldAlert className="w-3.5 h-3.5 text-primary-500" />
                <span>Election Admin</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowElectionForm(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary-600/25 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create New Election</span>
        </button>
      </div>

      {/* SuperAdmin: Pending Admins Section */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-amber-200 dark:border-amber-800/50 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 dark:bg-amber-800/50 p-2.5 rounded-xl">
                <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Pending Admin Approvals</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Review and authorize new administrator accounts</p>
              </div>
            </div>
            {pendingAdmins.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                {pendingAdmins.length} pending
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {pendingAdmins.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium text-sm">No pending administrator requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAdmins.map((admin: any) => (
                  <div
                    key={admin.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-base shrink-0">
                        {admin.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{admin.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleApproveAdmin(admin.id)}
                        className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRejectAdmin(admin.id)}
                        className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Election Form (Responsive Modal / Card) */}
      {showElectionForm && (
        <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 animate-fade-in">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Election</h2>
            </div>
            <button
              onClick={() => setShowElectionForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateElection} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 lg:col-span-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Election Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student Council Presidential Election 2026"
                  value={newElection.title}
                  onChange={(e) => setNewElection({ ...newElection, title: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newElection.start_time}
                  onChange={(e) => setNewElection({ ...newElection, start_time: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newElection.end_time}
                  onChange={(e) => setNewElection({ ...newElection, end_time: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowElectionForm(false)}
                className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Save & Publish Election'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Candidate Form (Responsive Mobile-Ready Dialog / Card) */}
      {selectedElectionId && showCandidateForm && (
        <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-primary-200 dark:border-primary-900/50 animate-fade-in">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Contestant / Candidate</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Assigning to election: {selectedElection?.title || `#${selectedElectionId}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCandidateForm(false);
                setNewCandidate({ name: '', bio: '', photoUrl: '' });
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddCandidate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contestant Name & Bio */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Contestant Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alexander Hamilton"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Bio & Campaign Manifesto
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Short biography, qualifications, or key vision..."
                    value={newCandidate.bio}
                    onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Contestant Photo / Image Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Contestant Photo
                  </label>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        imageInputMode === 'upload'
                          ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        imageInputMode === 'url'
                          ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {/* Image Preview & Upload Box */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  {/* Photo Preview Thumbnail */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-200 dark:border-gray-600 shadow-inner flex items-center justify-center">
                    {newCandidate.photoUrl ? (
                      <img
                        src={newCandidate.photoUrl}
                        alt="Candidate preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    )}
                    {newCandidate.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setNewCandidate({ ...newCandidate, photoUrl: '' })}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Input Controls */}
                  <div className="flex-1 w-full space-y-2">
                    {imageInputMode === 'upload' ? (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
                        >
                          <Upload className="w-4 h-4 text-primary-500" />
                          <span>Select Image From Device</span>
                        </button>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 text-center sm:text-left">
                          Supports PNG, JPG, WEBP up to 5MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          placeholder="https://example.com/photo.jpg"
                          value={newCandidate.photoUrl}
                          onChange={(e) => setNewCandidate({ ...newCandidate, photoUrl: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          Direct web link to candidate image
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowCandidateForm(false);
                  setNewCandidate({ name: '', bio: '', photoUrl: '' });
                }}
                className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
              >
                {loading ? 'Adding Contestant...' : 'Save Contestant'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-2xl text-blue-600 dark:text-blue-400">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Elections</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{elections.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-primary-100 dark:bg-primary-900/40 p-4 rounded-2xl text-primary-600 dark:text-primary-400">
            <Vote className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Selected Candidates</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {selectedElection?.candidates?.length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Security Core</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">Verified</p>
          </div>
        </div>
      </div>

      {/* Selected Election Results & Contestants Section */}
      <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Election:
            </label>
            <select
              className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl font-bold text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none w-full sm:w-auto"
              value={selectedElectionId || ''}
              onChange={(e) => setSelectedElectionId(parseInt(e.target.value))}
            >
              {elections.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowCandidateForm(true)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-bold border border-primary-500/50 hover:bg-primary-50 dark:hover:bg-primary-950/40 px-4 py-2.5 rounded-xl transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Candidate to Selected Election</span>
          </button>
        </div>

        {/* Live Vote Chart */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
            Live Vote Distribution
          </h3>
          <div className="h-72 w-full">
            {results.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', color: '#fff' }}
                  />
                  <Bar dataKey="votes" fill="#22c55e" radius={[8, 8, 0, 0]} barSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                No votes cast yet for this election.
              </div>
            )}
          </div>
        </div>

        {/* Contestants / Candidates Grid for Selected Election */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Enrolled Contestants ({selectedElection?.candidates?.length || 0})
            </h3>
          </div>

          {selectedElection?.candidates && selectedElection.candidates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedElection.candidates.map((candidate: any) => (
                <div
                  key={candidate.id}
                  className="flex items-center space-x-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-primary-400 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-100 dark:bg-gray-700 shrink-0 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400 text-lg shadow-sm">
                    {candidate.photoUrl ? (
                      <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      candidate.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{candidate.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {candidate.bio || 'No bio provided'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              No contestants added yet. Click &quot;+ Add Candidate to Selected Election&quot; to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
