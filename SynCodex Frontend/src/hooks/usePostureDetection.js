import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Privacy-First Posture Detection Hook
 * Runs entirely on the client side. Video stream never leaves the browser.
 */
export const usePostureDetection = () => {
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [score, setScore] = useState(100);
  const [status, setStatus] = useState('Good'); // 'Good', 'Warning', 'Poor'
  const [baseline, setBaseline] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastProcessingTimeRef = useRef(-1);

  // Initialize MediaPipe Pose Landmarker
  useEffect(() => {
    let isMounted = true;

    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setIsReady(true);
        }
      } catch (error) {
        console.error("Failed to initialize PoseLandmarker:", error);
      }
    };

    initModel();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // Compute posture metrics
  const analyzePosture = useCallback((landmarks) => {
    if (!landmarks || landmarks.length === 0) return;

    const pose = landmarks[0];
    
    // MediaPipe Pose landmarks indices
    const NOSE = 0;
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;

    // Extract needed points
    const nose = pose[NOSE];
    const leftShoulder = pose[LEFT_SHOULDER];
    const rightShoulder = pose[RIGHT_SHOULDER];

    if (!nose || !leftShoulder || !rightShoulder) return;

    // Calculate mid-shoulder point
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };

    // 1. Neck/Slouch Metric: Distance from nose to mid-shoulder
    // In good posture, head is up. Slouching drops the head closer to shoulders.
    const neckLength2D = Math.sqrt(
      Math.pow(nose.x - midShoulder.x, 2) + Math.pow(nose.y - midShoulder.y, 2)
    );

    // 2. Shoulder Roll Metric: Distance between shoulders
    // Slouching often rolls shoulders forward, narrowing the 2D width
    const shoulderWidth2D = Math.sqrt(
      Math.pow(leftShoulder.x - rightShoulder.x, 2) + Math.pow(leftShoulder.y - rightShoulder.y, 2)
    );

    // Composite metric (Ratio of neck length to shoulder width)
    // This makes it relatively invariant to distance from camera
    const currentPostureMetric = neckLength2D / (shoulderWidth2D || 1);

    if (baseline === null) {
      // Auto-calibrate on first valid frame if no baseline exists
      setBaseline(currentPostureMetric);
      return;
    }

    // Calculate score relative to baseline
    // Score > 90 is good, 70-90 warning, < 70 poor
    const deviation = currentPostureMetric / baseline;
    let newScore = Math.min(100, Math.max(0, Math.round(deviation * 100)));

    // Smooth the score (Exponential Moving Average) to prevent jitter
    setScore(prev => {
      const smoothed = Math.round((prev * 0.8) + (newScore * 0.2));
      
      if (smoothed > 85) setStatus('Good');
      else if (smoothed > 70) setStatus('Warning');
      else setStatus('Poor');
      
      return smoothed;
    });

  }, [baseline]);

  // Main processing loop
  const processVideo = useCallback(() => {
    if (!videoRef.current || !landmarkerRef.current || !isActive) return;

    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState >= 2) {
      const nowInMs = performance.now();
      
      // Throttle: Analyze at most 2 frames per second (every 500ms) to save CPU
      if (nowInMs - lastProcessingTimeRef.current >= 500) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          
          try {
            const results = landmarkerRef.current.detectForVideo(video, nowInMs);
            analyzePosture(results.landmarks);
          } catch (e) {
            console.error("Landmark detection error:", e);
          }
        }
        lastProcessingTimeRef.current = nowInMs;
      }
    }

    // Schedule next frame
    animationRef.current = requestAnimationFrame(processVideo);
  }, [isActive, analyzePosture]);

  // Start/Stop tracking
  const toggleTracking = async () => {
    if (isActive) {
      // Stop tracking
      setIsActive(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } else {
      // Start tracking
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, frameRate: { ideal: 15 } } 
        });
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsActive(true);
          // Start the loop
          animationRef.current = requestAnimationFrame(processVideo);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
  };

  const calibrate = () => {
    setBaseline(null); // Will auto-calibrate on next frame
    setScore(100);
    setStatus('Good');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isReady,
    isActive,
    score,
    status,
    videoRef,
    toggleTracking,
    calibrate
  };
};
