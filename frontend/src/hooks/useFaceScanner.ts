import { useState, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import Webcam from 'react-webcam';

export const useFaceScanner = (webcamRef: MutableRefObject<Webcam | null>, canvasRef: MutableRefObject<HTMLCanvasElement | null>, onCaptureReady: (imageSrc: string) => void) => {
  const [feedback, setFeedback] = useState<string>('Loading Face Scanner...');
  const [isValid, setIsValid] = useState<boolean>(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTime = useRef<number>(-1);
  const validFramesCount = useRef<number>(0);
  const REQUIRED_VALID_FRAMES = 15; // approx 0.5 second at 30fps

  useEffect(() => {
    let isMounted = true;
    
    const initModel = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
          setFeedback('Align your face');
        }
      } catch (e) {
        console.error("Error loading mediapipe:", e);
        if (isMounted) setFeedback('Error loading scanner');
      }
    };

    initModel();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
    };
  }, []);

  useEffect(() => {
    const detect = () => {
      if (!webcamRef.current || !webcamRef.current.video || !faceLandmarkerRef.current || !canvasRef.current) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Ensure canvas matches video dimensions exactly
      if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      if (video.readyState >= 2 && video.videoWidth > 0 && ctx) {
        const startTimeMs = performance.now();
        if (lastVideoTime.current !== video.currentTime) {
          lastVideoTime.current = video.currentTime;
          
          try {
            const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Because webcam is mirrored, we must mirror canvas context too for drawing
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];
              const drawingUtils = new DrawingUtils(ctx);
              
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
                color: "#C0C0C070", lineWidth: 1
              });
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });

              // Analyze position and distance
              let minX = 1, minY = 1, maxX = 0, maxY = 0;
              landmarks.forEach(lm => {
                minX = Math.min(minX, lm.x);
                minY = Math.min(minY, lm.y);
                maxX = Math.max(maxX, lm.x);
                maxY = Math.max(maxY, lm.y);
              });
              
              const faceWidth = maxX - minX;
              const faceHeight = maxY - minY;
              const faceArea = faceWidth * faceHeight;
              const centerX = minX + faceWidth / 2;
              const centerY = minY + faceHeight / 2;

              let currentFeedback = "";
              let currentIsValid = false;

              if (faceArea < 0.12) {
                currentFeedback = "Draw Closer";
              } else if (faceArea > 0.6) {
                currentFeedback = "Move Back";
              } else if (centerX < 0.35 || centerX > 0.65 || centerY < 0.35 || centerY > 0.65) {
                currentFeedback = "Center your face";
              } else {
                // Check head pose using transformation matrix if available
                if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
                  const matrix = results.facialTransformationMatrixes[0].data;
                  // rough estimation of yaw/pitch from matrix
                  const yaw = Math.atan2(matrix[8], matrix[10]);
                  const pitch = Math.atan2(-matrix[9], Math.sqrt(matrix[8]*matrix[8] + matrix[10]*matrix[10]));
                  
                  if (yaw < -0.3) currentFeedback = "Look slightly Right"; // Inverted because camera is mirrored
                  else if (yaw > 0.3) currentFeedback = "Look slightly Left";
                  else if (pitch < -0.3) currentFeedback = "Look Up";
                  else if (pitch > 0.3) currentFeedback = "Look Down";
                  else {
                    currentFeedback = "Hold still...";
                    currentIsValid = true;
                  }
                } else {
                  currentFeedback = "Hold still...";
                  currentIsValid = true;
                }
              }

              if (currentIsValid) {
                validFramesCount.current += 1;
                if (validFramesCount.current >= REQUIRED_VALID_FRAMES) {
                  setIsValid(true);
                  setFeedback("Face Captured!");
                  const imageSrc = webcamRef.current.getScreenshot();
                  if (imageSrc) {
                    onCaptureReady(imageSrc);
                    validFramesCount.current = 0; // Reset after capture
                    return; // Stop loop after capture
                  }
                }
              } else {
                validFramesCount.current = 0;
                setIsValid(false);
              }
              setFeedback(currentFeedback);
            } else {
              setFeedback('No face detected');
              setIsValid(false);
              validFramesCount.current = 0;
            }
            
            ctx.restore();
          } catch (e) {
             console.error(e);
          }
        }
      }
      
      requestRef.current = requestAnimationFrame(detect);
    };

    if (faceLandmarkerRef.current) {
      requestRef.current = requestAnimationFrame(detect);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [webcamRef, canvasRef, onCaptureReady]);

  return { feedback, isValid };
};
