import React, { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const VotingFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  
  const [step, setStep] = useState(1); // 1: Verify Face, 2: Vote, 3: Success
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  
  const [candidates] = useState([
    { id: 101, name: 'Candidate A', bio: 'Experienced leader.' },
    { id: 102, name: 'Candidate B', bio: 'Fresh perspectives.' }
  ]);

  const captureAndVerify = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setVerifying(true);
    setError('');

    try {
      // In a real implementation we would convert the base64 imageSrc to a blob 
      // and send it to our `/api/face/verify` proxy.
      
      // Mocking the verification delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success! Move to voting step
      setStep(2);
    } catch (err) {
      setError('Facial verification failed. Please ensure good lighting and try again.');
    } finally {
      setVerifying(false);
    }
  }, [webcamRef]);

  const castVote = async (candidateId: number) => {
    try {
      // API call to /api/votes would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(3);
    } catch (err) {
      setError('Failed to cast vote.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {step === 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-800 text-center">
          <ShieldCheck className="h-16 w-16 text-primary-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Identity</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8">Please look directly at the camera to verify your identity before accessing the ballot.</p>
          
          <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden shadow-inner bg-black aspect-video flex items-center justify-center">
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
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={captureAndVerify}
            disabled={verifying}
            className="mt-8 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold text-lg w-full max-w-md transition-colors disabled:opacity-50"
          >
            {verifying ? 'Scanning face...' : 'Verify & Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Official Ballot</h2>
              <p className="text-primary-600 dark:text-primary-400 font-medium flex items-center mt-1">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Identity Verified
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {candidates.map(candidate => (
              <div key={candidate.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:border-primary-500 hover:shadow-md transition-all flex flex-col items-center text-center">
                <div className="h-24 w-24 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
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
