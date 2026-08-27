import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api';
import { useFaceScanner } from '../hooks/useFaceScanner';

const VotingFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState(1); // 1: Verify Face, 2: Vote, 3: Success
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  
  // Real candidates fetched from DB
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    // We fetch the active elections and filter to the current ID to get its candidates.
    // In a real app we'd have a specific GET /elections/:id endpoint, but we can reuse the active elections list here.
    const loadCandidates = async () => {
      try {
        const res = await api.get('/voters/elections');
        const election = res.data.find((e: any) => e.id === parseInt(id || '0'));
        if (election) {
          setCandidates(election.candidates || []);
        } else {
          setError('Election not found or no longer active.');
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCandidates();
  }, [id]);

  const captureAndVerify = useCallback(async (imageSrc: string) => {
    if (!imageSrc) return;

    setVerifying(true);
    setError('');

    try {
      const resImg = await fetch(imageSrc);
      const blob = await resImg.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'verify.jpg');

      // Call the Face Service proxy to verify identity against enrolled face
      const response = await api.post('/face/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.verified) {
        setStep(2);
      } else {
        setError('Face verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Facial verification failed. Please ensure good lighting and try again.');
    } finally {
      setVerifying(false);
    }
  }, []);

  const { feedback, isValid, reset } = useFaceScanner(
    webcamRef,
    canvasRef,
    captureAndVerify,
    step === 1 && !verifying
  );

  const handleManualVerify = () => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      captureAndVerify(screenshot);
    } else {
      setError('Webcam stream not ready. Please allow camera permissions.');
    }
  };

  const handleRescan = () => {
    setError('');
    reset();
  };

  const castVote = async (candidateId: number) => {
    try {
      await api.post('/voters/votes', {
        electionId: parseInt(id || '0'),
        candidateId
      });
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cast vote.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {step === 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-5">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Biometric Voter Verification</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Look directly at the camera to verify your cryptographic identity before accessing the ballot.</p>
          </div>
          
          <div className="inline-block bg-gray-100 dark:bg-gray-800 px-5 py-1.5 rounded-full font-bold text-xs sm:text-sm text-primary-600 dark:text-primary-400 shadow-inner">
            {feedback}
          </div>

          <div className={`relative max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video flex items-center justify-center transition-all duration-300 border-4 ${isValid ? 'border-green-500 ring-4 ring-green-500/30' : 'border-gray-200 dark:border-gray-800'}`}>
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
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 rounded-2xl text-left max-w-md mx-auto">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="flex gap-3 max-w-md mx-auto pt-2">
            <button
              type="button"
              onClick={handleManualVerify}
              disabled={verifying}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 disabled:opacity-50 transition-all text-sm"
            >
              {verifying ? 'Verifying Identity...' : isValid ? 'Auto-Capturing...' : 'Verify & Continue'}
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

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Official Ballot</h2>
              <p className="text-primary-600 dark:text-primary-400 font-medium flex items-center mt-1">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Identity Cryptographically Verified
              </p>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {candidates.map(candidate => (
              <div key={candidate.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:border-primary-500 hover:shadow-md transition-all flex flex-col items-center text-center">
                <div className="h-24 w-24 bg-primary-100 text-primary-600 dark:bg-gray-800 flex items-center justify-center rounded-full mb-4 font-bold text-2xl overflow-hidden shadow-sm">
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                  ) : (
                    candidate.name.charAt(0)
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{candidate.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">{candidate.bio}</p>
                <button
                  onClick={() => castVote(candidate.id)}
                  className="mt-auto w-full border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white px-4 py-2 rounded-xl font-bold transition-colors"
                >
                  Vote for {candidate.name}
                </button>
              </div>
            ))}
            {candidates.length === 0 && <p className="text-gray-500 col-span-2 text-center py-10">No candidates available for this election yet.</p>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-6">
          <CheckCircle2 className="h-24 w-24 text-primary-500 mx-auto" />
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Vote Cast Successfully!</h2>
          <p className="text-gray-500 dark:text-gray-400">Your ballot has been securely recorded and encrypted.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3 rounded-xl font-bold transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default VotingFlow;
