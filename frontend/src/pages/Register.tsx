import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import api from '../api';

const Register = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
      startFaceDetection();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register account');
    } finally {
      setLoading(false);
    }
  };

  const captureAndEnrollFace = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
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
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Face enrollment failed. Please ensure good lighting and try again.');
    } finally {
      setLoading(false);
    }
  }, [webcamRef, navigate]);

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
          
          // Auto-capture after 1 second of detection
          setTimeout(() => {
            captureAndEnrollFace();
          }, 1000);
        }
      } catch (err) {
        // Silently ignore detection errors to not interrupt the flow
      }
    }, 1500); // Poll every 1.5s
  }, [webcamRef, captureAndEnrollFace]);

  // Clean up interval on unmount
  useCallback(() => {
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, []);

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-10 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
      
      {step === 1 && (
        <>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900">
              <UserPlus className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Register Voter</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already have an account? <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">Sign in here</Link>
            </p>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <form className="mt-8 space-y-6" onSubmit={submitDetails}>
            <div className="space-y-4">
              <input name="full_name" type="text" required placeholder="Full Name" autoComplete="name" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
              <input name="index_number" type="text" required placeholder="ID / Index Number" autoComplete="off" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
              <input name="email" type="email" required placeholder="Email Address" autoComplete="email" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
              <input name="dob" type="date" required placeholder="Date of Birth" autoComplete="bday" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
              <input name="password" type="password" required placeholder="Password" autoComplete="new-password" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
              {loading ? 'Creating Account...' : 'Continue to Face Scan'}
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <div className="text-center">
          <ShieldCheck className="h-16 w-16 text-primary-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Face Enrollment</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8">Look directly at the camera. We will automatically capture your face when detected.</p>
          
          <div className={`relative max-w-sm mx-auto rounded-2xl overflow-hidden shadow-inner bg-black aspect-square flex items-center justify-center transition-all duration-300 border-4 ${faceDetected ? 'border-green-500 shadow-green-500/50' : 'border-transparent'}`}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
            />
          </div>

          {error && (
            <div className="mt-6 flex items-center justify-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={captureAndEnrollFace}
            disabled={loading}
            className={`mt-8 text-white px-8 py-4 rounded-xl font-bold text-lg w-full transition-colors disabled:opacity-50 ${faceDetected ? 'bg-green-600 hover:bg-green-700' : 'bg-primary-600 hover:bg-primary-700'}`}
          >
            {loading ? 'Processing ML Matrix...' : faceDetected ? 'Auto-Capturing...' : 'Scan & Save Identity'}
          </button>
        </div>
      )}

    </div>
  );
};

export default Register;
