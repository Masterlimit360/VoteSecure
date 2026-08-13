import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, User, IdCard, CheckCircle2, ShieldCheck, Mail, Camera, AlertCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import api from '../api';

const VoterDashboard = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('elections'); // 'elections' | 'profile'
  
  // Face Enrollment State
  const [enrollmentMode, setEnrollmentMode] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfile = async () => {
    try {
      const [electionsRes, profileRes] = await Promise.all([
        api.get('/voters/elections'),
        api.get('/voters/me')
      ]);
      setElections(electionsRes.data);
      setProfile(profileRes.data);
      
      if (!profileRes.data.isVerified) {
        setEnrollmentMode(true);
      }
    } catch (err: any) {
      setError('Failed to load dashboard data. Please try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const captureAndEnrollFace = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setEnrollError("Could not capture webcam image.");
      return;
    }

    setEnrollLoading(true);
    setEnrollError('');

    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'enroll.jpg');

      await api.post('/face/enroll', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      setEnrollmentMode(false);
      await fetchProfile(); // Refresh profile
    } catch (err: any) {
      setEnrollError(err.response?.data?.detail || 'Face enrollment failed.');
    } finally {
      setEnrollLoading(false);
    }
  }, [webcamRef]);

  const startFaceDetection = useCallback(() => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    
    detectionInterval.current = setInterval(async () => {
      if (!webcamRef.current) return;
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      try {
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const fd = new FormData();
        fd.append('image', blob, 'detect.jpg');

        const detectRes = await api.post('/face/detect', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (detectRes.data.detected) {
          setFaceDetected(true);
          if (detectionInterval.current) clearInterval(detectionInterval.current);
          setTimeout(() => captureAndEnrollFace(), 1000);
        }
      } catch (err) {}
    }, 1500);
  }, [webcamRef, captureAndEnrollFace]);

  useEffect(() => {
    if (enrollmentMode) {
      startFaceDetection();
    }
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [enrollmentMode, startFaceDetection]);

  if (enrollmentMode) {
    return (
      <div className="max-w-md w-full mx-auto space-y-8 p-10 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-fade-in text-center">
        <ShieldCheck className="h-16 w-16 text-primary-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Face Enrollment</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8">
          {!profile?.isVerified ? "You must enroll your face before accessing the dashboard." : "Re-enroll your face identity."} 
          <br/>Look directly at the camera.
        </p>
        
        <div className={`relative max-w-sm mx-auto rounded-2xl overflow-hidden shadow-inner bg-black aspect-square flex items-center justify-center transition-all duration-300 border-4 ${faceDetected ? 'border-green-500 shadow-green-500/50' : 'border-transparent'}`}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
          />
        </div>

        {enrollError && (
          <div className="mt-6 flex items-center justify-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{enrollError}</span>
          </div>
        )}

        <button
          onClick={captureAndEnrollFace}
          disabled={enrollLoading}
          className={`mt-8 text-white px-8 py-4 rounded-xl font-bold text-lg w-full transition-colors disabled:opacity-50 ${faceDetected ? 'bg-green-600 hover:bg-green-700' : 'bg-primary-600 hover:bg-primary-700'}`}
        >
          {enrollLoading ? 'Processing ML Matrix...' : faceDetected ? 'Auto-Capturing...' : 'Scan & Save Identity'}
        </button>
        
        {profile?.isVerified && (
          <button onClick={() => setEnrollmentMode(false)} className="mt-4 text-gray-500 hover:text-gray-700 dark:hover:text-white underline">
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Premium Header */}
      <div className="glass-card rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-primary-500/10 border border-white/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-primary-600 to-teal-400 bg-clip-text text-transparent">
            Welcome, {profile?.fullName || 'Voter'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Your identity is cryptographically secured.</p>
        </div>
        
        <div className="flex gap-4 mt-6 md:mt-0 relative z-10">
          <button onClick={() => setTab('elections')} className={`px-6 py-3 rounded-xl font-bold transition-all ${tab === 'elections' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            Live Elections
          </button>
          <button onClick={() => setTab('profile')} className={`px-6 py-3 rounded-xl font-bold transition-all ${tab === 'profile' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            My Profile
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium">{error}</div>}

      {/* ELECTIONS TAB */}
      {tab === 'elections' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <ShieldCheck className="mr-2 text-primary-500" /> Secure Ballots
          </h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
            </div>
          ) : elections.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 glass-card rounded-3xl border border-white/10">
              No active elections found at the moment.
            </div>
          ) : (
            elections.map((election: any) => (
              <div key={election.id} className="group glass-card rounded-3xl p-6 hover:shadow-xl hover:shadow-primary-500/10 border border-white/20 dark:border-gray-800 transition-all cursor-pointer transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-400 text-white shadow-lg`}>
                      <Calendar className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{election.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Closes: {new Date(election.endTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{election.candidates?.length || 0}</p>
                      <p className="text-sm font-medium text-gray-500">Candidates</p>
                    </div>
                    <Link to={`/vote/${election.id}`} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white p-4 rounded-full transition-all shadow-md group-hover:scale-110">
                      <ChevronRight className="h-6 w-6" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1">
            <div className="glass-card rounded-3xl p-8 border border-white/20 text-center relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary-500 to-teal-400"></div>
              
              <div className="relative mt-8 mb-6 mx-auto w-40 h-40 rounded-full border-4 border-white dark:border-gray-900 shadow-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {profile.faceImageBase64 ? (
                  <img src={profile.faceImageBase64} alt="Enrolled Face" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-full h-full p-8 text-gray-400" />
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.fullName}</h2>
              <div className="mt-2 inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Face Enrolled & Verified</span>
              </div>

              <button 
                onClick={() => { setFaceDetected(false); setEnrollmentMode(true); }}
                className="mt-6 w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Re-Enroll Identity
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="glass-card rounded-3xl p-8 border border-white/20 h-full">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">Identity Details</h3>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><IdCard className="w-6 h-6 text-primary-500" /></div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Official Index / ID Number</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{profile.indexNumber}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><Mail className="w-6 h-6 text-primary-500" /></div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Email Address</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><Calendar className="w-6 h-6 text-primary-500" /></div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Date of Birth</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{profile.dob || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default VoterDashboard;
