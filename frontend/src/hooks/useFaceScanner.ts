import { useState, useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import Webcam from 'react-webcam';

export const useFaceScanner = (
  webcamRef: MutableRefObject<Webcam | null>,
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  onCaptureReady: (imageSrc: string) => void,
  enabled: boolean = true
) => {
  const [feedback, setFeedback] = useState<string>('Initializing Face Scanner...');
  const [isValid, setIsValid] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTime = useRef<number>(-1);
  const validFramesCount = useRef<number>(0);
  const capturedRef = useRef<boolean>(false);

  // Store callback in a ref so the animation loop always sees the latest version
  const onCaptureReadyRef = useRef(onCaptureReady);
  useEffect(() => {
    onCaptureReadyRef.current = onCaptureReady;
  }, [onCaptureReady]);

  const REQUIRED_VALID_FRAMES = 22; // ~0.7s at 30fps

  // 1. Load the MediaPipe FaceLandmarker model
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
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
          setFeedback('Position your face in the frame');
          setModelReady(true);
        }
      } catch (e) {
        console.error("Error loading MediaPipe FaceLandmarker:", e);
        if (isMounted) setFeedback('Scanner ready (fallback mode)');
      }
    };

    initModel();

    return () => {
      isMounted = false;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  // 2. Run the detection loop — starts only after model is ready AND enabled is true
  useEffect(() => {
    if (!modelReady || !enabled) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setIsValid(false);
      return;
    }

    capturedRef.current = false;
    validFramesCount.current = 0;
    lastVideoTime.current = -1;
    setFeedback('Position your face in the frame');

    const detect = () => {
      // If already captured or scanner disabled, stop the loop
      if (capturedRef.current || !enabled) return;

      const webcam = webcamRef.current;
      const canvas = canvasRef.current;
      const faceLandmarker = faceLandmarkerRef.current;

      if (!webcam || !webcam.video || !faceLandmarker || !canvas) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = webcam.video;
      const ctx = canvas.getContext('2d');

      // Ensure canvas matches video dimensions
      if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (video.readyState < 2 || video.videoWidth === 0 || !ctx) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      // Only process new frames
      if (lastVideoTime.current === video.currentTime) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }
      lastVideoTime.current = video.currentTime;

      try {
        const startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(video, startTimeMs);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mirror the canvas to match the mirrored webcam
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const drawingUtils = new DrawingUtils(ctx);

          // Draw face mesh overlay
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
            color: "#C0C0C070", lineWidth: 1
          });
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });

          // Compute bounding box of the face (normalized 0-1)
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          for (const lm of landmarks) {
            if (lm.x < minX) minX = lm.x;
            if (lm.y < minY) minY = lm.y;
            if (lm.x > maxX) maxX = lm.x;
            if (lm.y > maxY) maxY = lm.y;
          }

          const faceWidth = maxX - minX;
          const faceHeight = maxY - minY;
          const faceArea = faceWidth * faceHeight;
          const centerX = minX + faceWidth / 2;
          const centerY = minY + faceHeight / 2;

          let currentFeedback = "";
          let currentIsValid = false;

          // Check distance
          if (faceArea < 0.08) {
            currentFeedback = "Move closer to the camera";
          } else if (faceArea > 0.65) {
            currentFeedback = "Move back a little";
          }
          // Check centering
          else if (centerX < 0.3 || centerX > 0.7) {
            currentFeedback = "Center your face horizontally";
          } else if (centerY < 0.25 || centerY > 0.75) {
            currentFeedback = "Center your face vertically";
          }
          // Check head pose
          else {
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              const yaw = Math.atan2(matrix[8], matrix[10]);
              const pitch = Math.atan2(-matrix[9], Math.sqrt(matrix[8] * matrix[8] + matrix[10] * matrix[10]));

              if (yaw < -0.35) currentFeedback = "Turn head slightly right";
              else if (yaw > 0.35) currentFeedback = "Turn head slightly left";
              else if (pitch < -0.35) currentFeedback = "Tilt head up a little";
              else if (pitch > 0.35) currentFeedback = "Tilt head down a little";
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
            const progress = Math.min(100, Math.round((validFramesCount.current / REQUIRED_VALID_FRAMES) * 100));
            setFeedback(`Hold still... ${progress}%`);
            setIsValid(true);

            if (validFramesCount.current >= REQUIRED_VALID_FRAMES) {
              capturedRef.current = true;
              setFeedback("✓ Face Captured!");

              // Crop tight 256x256 face portrait using MediaPipe landmarks bounding box
              let imageSrc: string | null = null;
              try {
                const vWidth = video.videoWidth;
                const vHeight = video.videoHeight;
                if (vWidth > 0 && vHeight > 0) {
                  const x1 = Math.max(0, minX * vWidth);
                  const y1 = Math.max(0, minY * vHeight);
                  const x2 = Math.min(vWidth, maxX * vWidth);
                  const y2 = Math.min(vHeight, maxY * vHeight);

                  const faceW = x2 - x1;
                  const faceH = y2 - y1;

                  // Add 20% margin around the face
                  const padX = faceW * 0.20;
                  const padY = faceH * 0.20;

                  const cropX = Math.max(0, x1 - padX);
                  const cropY = Math.max(0, y1 - padY);
                  const cropW = Math.min(vWidth - cropX, faceW + padX * 2);
                  const cropH = Math.min(vHeight - cropY, faceH + padY * 2);

                  const cropCanvas = document.createElement('canvas');
                  cropCanvas.width = 256;
                  cropCanvas.height = 256;
                  const cropCtx = cropCanvas.getContext('2d');
                  if (cropCtx) {
                    cropCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 256, 256);
                    imageSrc = cropCanvas.toDataURL('image/jpeg', 0.92);
                  }
                }
              } catch (cropErr) {
                console.warn("Client face crop fallback:", cropErr);
              }

              // Fallback to full screenshot if cropping failed
              if (!imageSrc) {
                imageSrc = webcam.getScreenshot();
              }

              if (imageSrc) {
                onCaptureReadyRef.current(imageSrc);
              }
              ctx.restore();
              return; // Stop the animation loop
            }
          } else {
            validFramesCount.current = 0;
            setIsValid(false);
            setFeedback(currentFeedback);
          }
        } else {
          setFeedback('No face detected — look at the camera');
          setIsValid(false);
          validFramesCount.current = 0;
        }

        ctx.restore();
      } catch (e) {
        console.error("FaceLandmarker detection error:", e);
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    // Start the detection loop
    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [modelReady, enabled, webcamRef, canvasRef]);

  // Allow the consuming component to reset the scanner (e.g. after a failed enrollment)
  const reset = useCallback(() => {
    capturedRef.current = false;
    validFramesCount.current = 0;
    setIsValid(false);
    setFeedback('Position your face in the frame');
  }, []);

  return { feedback, isValid, reset, modelReady };
};
