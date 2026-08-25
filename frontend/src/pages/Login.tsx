import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint, ShieldCheck, ScanFace, Sparkles, AlertCircle, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';
import Webcam from 'react-webcam';
import api from '../api';
import { useFaceScanner } from '../hooks/useFaceScanner';

const Login = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loginMode, setLoginMode] = useState<'face' | 'voter' | 'admin'>('face');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ name: string; confidence: number } | null>(null);

  // Voter form
  const [voterForm, setVoterForm] = useState({ index_number: '', password: '' });
  // Admin form
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });

  // Face Scan Login Callback
  const handleFaceLogin = useCallback(async (imageSrc: string) => {
    if (!imageSrc || loading) return;

    setLoading(true);
    setError('');
    setSuccessInfo(null);

    try {
      // Convert base64 data URL to Blob
      const resImg = await fetch(imageSrc);
      const blob = await resImg.blob();

      const formData = new FormData();
      formData.append('image', blob, 'face-login.jpg');

      const res = await api.post('/auth/face-login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.token) {
        localStorage.setItem('votesecure_token', res.data.token);
        setSuccessInfo({
          name: res.data.voter?.fullName || 'Voter',
          confidence: res.data.confidence || 95
        });

        // Smooth redirect after visual confirmation
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Face verification failed. Please ensure good lighting and look directly at the camera.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loading, navigate]);

  const { feedback, isValid, reset } = useFaceScanner(webcamRef, canvasRef, handleFaceLogin);

  const handleManualCapture = () => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      handleFaceLogin(screenshot);
    } else {
      setError('Webcam stream not ready. Please ensure camera access is granted.');
    }
  };

  const handleVoterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', voterForm);
      localStorage.setItem('votesecure_token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/admin/login', adminForm);
      localStorage.setItem('votesecure_token', res.data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg w-full mx-auto space-y-8 p-6 sm:p-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 transition-all">
      <div className="text-center">
        <div
          className={`mx-auto flex items-center justify-center h-16 w-16 rounded-2xl shadow-lg transition-all duration-300 ${
            loginMode === 'face'
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/30'
              : loginMode === 'voter'
              ? 'bg-gradient-to-tr from-primary-600 to-primary-400 text-white shadow-primary-500/30'
              : 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/30'
          }`}
        >
          {loginMode === 'face' ? (
            <ScanFace className="h-8 w-8" />
          ) : loginMode === 'voter' ? (
            <Fingerprint className="h-8 w-8" />
          ) : (
            <ShieldCheck className="h-8 w-8" />
          )}
        </div>
        <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Sign in to VoteSecure
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <Link
            to="/register"
            className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition-colors"
          >
            register for a new voter account
          </Link>
        </p>
      </div>

      {/* Login Mode Selector Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl gap-1 border border-gray-200/50 dark:border-gray-700/50">
        <button
          type="button"
          onClick={() => {
            setLoginMode('face');
            setError('');
            setSuccessInfo(null);
            reset();
          }}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            loginMode === 'face'
              ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ScanFace className="w-4 h-4 shrink-0" />
          <span>Face Scan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLoginMode('voter');
            setError('');
            setSuccessInfo(null);
          }}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            loginMode === 'voter'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>Password</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLoginMode('admin');
            setError('');
            setSuccessInfo(null);
          }}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            loginMode === 'admin'
              ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Admin</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {successInfo && (
        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl animate-fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-base">Identity Verified: {successInfo.name}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Confidence score: {successInfo.confidence}% &bull; Logging into dashboard...
            </p>
          </div>
        </div>
      )}

      {/* 1. Biometric Face Scan Mode */}
      {loginMode === 'face' && (
        <div className="space-y-5 text-center">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              AI Face Recognition
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                isValid
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {feedback}
            </span>
          </div>

          <div
            className={`relative w-full max-w-sm mx-auto aspect-square rounded-3xl overflow-hidden shadow-2xl bg-black flex items-center justify-center transition-all duration-300 border-4 ${
              successInfo
                ? 'border-emerald-500 ring-4 ring-emerald-500/30'
                : isValid
                ? 'border-green-500 ring-4 ring-green-500/30'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              mirrored={true}
            />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" />

            {loading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4">
                <RefreshCw className="w-10 h-10 animate-spin text-emerald-400" />
                <p className="font-bold text-sm">Matching Face Biometrics...</p>
                <p className="text-xs text-gray-300">Comparing vector matrix against enrolled voters</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Position your face squarely in the frame. The camera will automatically scan and match your account.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleManualCapture}
              disabled={loading || !!successInfo}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
            >
              <ScanFace className="w-4 h-4" />
              {loading ? 'Matching...' : 'Scan Face & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                reset();
              }}
              className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5"
              title="Reset Scanner & Rescan"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rescan</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Voter Password Form */}
      {loginMode === 'voter' && (
        <form className="space-y-5" onSubmit={handleVoterLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="voter-index-number" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Index Number / Voter ID
              </label>
              <input
                id="voter-index-number"
                name="index_number"
                type="text"
                required
                value={voterForm.index_number}
                onChange={(e) => setVoterForm({ ...voterForm, index_number: e.target.value })}
                className="appearance-none rounded-xl block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
                placeholder="e.g. 10293847"
              />
            </div>
            <div>
              <label htmlFor="voter-password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="voter-password"
                name="password"
                type="password"
                required
                value={voterForm.password}
                onChange={(e) => setVoterForm({ ...voterForm, password: e.target.value })}
                className="appearance-none rounded-xl block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign in as Voter'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Admin Login Form */}
      {loginMode === 'admin' && (
        <form className="space-y-5" onSubmit={handleAdminLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Admin Email Address
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                required
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                className="appearance-none rounded-xl block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
                placeholder="admin@votesecure.org"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="appearance-none rounded-xl block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign in as Administrator'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1">
            Need an administrator account?{' '}
            <Link to="/admin/register" className="font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400 transition-colors">
              Register here
            </Link>
          </p>
        </form>
      )}
    </div>
  );
};

export default Login;
