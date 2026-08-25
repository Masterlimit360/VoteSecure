import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import api from '../api';
import { useFaceScanner } from '../hooks/useFaceScanner';

const Register = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form Data
  const [formData, setFormData] = useState({
    full_name: '',
    index_number: '',
    email: '',
    dob: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/register', formData);
      // Save token securely for the face enrollment step
      localStorage.setItem('votesecure_token', res.data.token);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register account');
    } finally {
      setLoading(false);
    }
  };

  const captureAndEnrollFace = useCallback(async (imageSrc: string) => {
    if (!imageSrc) {
      setError("Could not capture webcam image.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert base64 to Blob
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'enroll.jpg');

      await api.post('/face/enroll', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Successfully enrolled face, redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Face enrollment failed. Please ensure good lighting and try again.');
    } finally {
      setLoading(false);
    }
  }, [webcamRef, navigate]);

  const { feedback, isValid, reset } = useFaceScanner(webcamRef, canvasRef, captureAndEnrollFace);

  const handleManualCapture = () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      captureAndEnrollFace(imageSrc);
    } else {
      setError('Webcam stream not available. Please allow camera permissions.');
    }
  };

  const handleRescan = () => {
    setError('');
    reset();
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-6 sm:p-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 transition-all">
      
      {step === 1 && (
        <>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25">
              <UserPlus className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Register Voter</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already have an account? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition-colors">Sign in here</Link>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 rounded-2xl">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={submitDetails}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input name="full_name" type="text" required placeholder="John Doe" autoComplete="name" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">ID / Index Number</label>
              <input name="index_number" type="text" required placeholder="e.g. 10293847" autoComplete="off" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input name="email" type="email" required placeholder="john@example.com" autoComplete="email" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Date of Birth</label>
              <input name="dob" type="date" required autoComplete="bday" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Password</label>
              <input name="password" type="password" required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" autoComplete="new-password" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary-600/25 disabled:opacity-50 transition-all text-sm mt-2">
              {loading ? 'Creating Account...' : 'Continue to Face Enrollment'}
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <div className="text-center space-y-5">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Secure Face Enrollment</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Look directly at the camera. We will automatically capture your biometric matrix.</p>
          </div>
          
          <div className="inline-block bg-gray-100 dark:bg-gray-800 px-5 py-1.5 rounded-full font-bold text-xs sm:text-sm text-primary-600 dark:text-primary-400 shadow-inner">
            {feedback}
          </div>

          <div className={`relative max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black aspect-square flex items-center justify-center transition-all duration-300 border-4 ${isValid ? 'border-green-500 ring-4 ring-green-500/30' : 'border-gray-200 dark:border-gray-800'}`}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              mirrored={true}
            />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" />
          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 rounded-2xl text-left">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleManualCapture}
              disabled={loading}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 disabled:opacity-50 transition-all text-sm"
            >
              {loading ? 'Processing Biometrics...' : isValid ? 'Auto-Capturing...' : 'Capture & Enroll Face'}
            </button>

            <button
              type="button"
              onClick={handleRescan}
              className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all text-sm"
              title="Rescan / Reset Camera"
            >
              Rescan
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Register;
