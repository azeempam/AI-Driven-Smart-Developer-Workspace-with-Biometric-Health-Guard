/**
 * usePostureDetection.js
 * 
 * Privacy-First Posture Detection Hook
 * ─────────────────────────────────────
 * 
 * Custom React hook that:
 * ✓ Initializes MediaPipe Pose Landmarker (browser-only, no cloud)
 * ✓ Manages webcam stream lifecycle
 * ✓ Runs pose detection at optimized FPS (2 fps to minimize CPU)
 * ✓ Cleans up properly on unmount (prevents memory leaks)
 * ✓ Provides real-time posture analysis data
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  analyzePosture,
  getSmoothedScore,
  detectSustainedPoorPosture,
  getPostureSummary,
} from '../services/PostureAnalysisEngine';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION CONSTANTS
// ─────────────────────────────────────────────────────────────

const DETECTION_FPS = 2; // Analyze 2 frames per second (500ms interval)
const FRAME_SKIP_INTERVAL = Math.floor(1000 / DETECTION_FPS);
const SCORE_HISTORY_MAX = 60; // Keep last 60 frames (~30 seconds)
const POOR_POSTURE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// ─────────────────────────────────────────────────────────────
// HOOK IMPLEMENTATION
// ─────────────────────────────────────────────────────────────

export const usePostureDetection = () => {
  // ─────────────────────────────────────────────────────────────
  // STATE & REFS
  // ─────────────────────────────────────────────────────────────

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseDetectorRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const isRunningRef = useRef(false);

  // State for UI components
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [postures, setPostures] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [smoothedScore, setSmoothedScore] = useState(0);
  const [sustainedPoorPosture, setSustainedPoorPosture] = useState(false);
  const [landmarks, setLandmarks] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // 1. INITIALIZE MEDIAPIPE POSE LANDMARKER
  // ─────────────────────────────────────────────────────────────

  const initializePoseDetector = useCallback(async () => {
    try {
      // Dynamically import MediaPipe
      const { PoseLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
      );

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      const detector = await PoseLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          },
          runningMode: 'VIDEO',
          numPoses: 1, // Detect only one person (the user)
        }
      );

      poseDetectorRef.current = detector;
      setIsInitialized(true);
      console.log('✓ MediaPipe Pose Landmarker initialized (privacy-first, client-side only)');
      return detector;
    } catch (err) {
      const errorMsg = `Posture detection init failed: ${err.message}`;
      console.error('✗', errorMsg);
      setError(errorMsg);
      return null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. REQUEST WEBCAM ACCESS (with user permission)
  // ─────────────────────────────────────────────────────────────

  const requestCameraAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        console.log('✓ Camera access granted');
        return stream;
      }
    } catch (err) {
      const errorMsg = `Camera access denied: ${err.message}`;
      console.error('✗', errorMsg);
      setError(errorMsg);
      return null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. CORE DETECTION LOOP (optimized with throttling)
  // ─────────────────────────────────────────────────────────────

  const detectPose = useCallback(() => {
    if (
      !isRunningRef.current ||
      !videoRef.current ||
      !poseDetectorRef.current ||
      videoRef.current.readyState !== 2 // HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // THROTTLING: Only analyze every N milliseconds
    // ─────────────────────────────────────────────────────────────
    const now = performance.now();
    if (now - lastDetectionTimeRef.current < FRAME_SKIP_INTERVAL) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }
    lastDetectionTimeRef.current = now;

    try {
      // Run MediaPipe inference
      const poseLandmarkerResult = poseDetectorRef.current.detectForVideo(
        videoRef.current,
        now
      );

      if (
        !poseLandmarkerResult.landmarks ||
        poseLandmarkerResult.landmarks.length === 0
      ) {
        animationFrameRef.current = requestAnimationFrame(detectPose);
        return;
      }

      // Get the detected landmarks for the first (and only) person
      const detectedLandmarks = poseLandmarkerResult.landmarks[0];
      setLandmarks(detectedLandmarks);

      // ─────────────────────────────────────────────────────────────
      // ANALYZE POSTURE
      // ─────────────────────────────────────────────────────────────
      const analysis = analyzePosture(detectedLandmarks);
      setCurrentAnalysis(analysis);

      // Update posture history
      setPostures((prev) => {
        const updated = [...prev, analysis];
        // Keep history size manageable
        return updated.length > SCORE_HISTORY_MAX
          ? updated.slice(-SCORE_HISTORY_MAX)
          : updated;
      });

      // Calculate smoothed score
      setPostures((prevPostures) => {
        const smoothed = getSmoothedScore(prevPostures, 5);
        setSmoothedScore(smoothed);

        // Detect sustained poor posture
        const sustained = detectSustainedPoorPosture(
          prevPostures,
          POOR_POSTURE_DURATION
        );
        setSustainedPoorPosture(sustained);

        return prevPostures;
      });

      // ─────────────────────────────────────────────────────────────
      // OPTIONAL: Draw landmarks on canvas (debug mode)
      // ─────────────────────────────────────────────────────────────
      if (canvasRef.current && videoRef.current) {
        drawLandmarks(canvasRef.current, detectedLandmarks, videoRef.current);
      }
    } catch (err) {
      console.error('✗ Pose detection error:', err);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(detectPose);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 4. VISUALIZATION: Draw landmarks on canvas (debug)
  // ─────────────────────────────────────────────────────────────

  const drawLandmarks = (canvas, landmarks, video) => {
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Draw skeleton connections (key points for posture)
    const connections = [
      [11, 12], // shoulders
      [11, 23], // left shoulder-hip
      [12, 24], // right shoulder-hip
      [0, 11], // nose-left shoulder
      [0, 12], // nose-right shoulder
    ];

    ctx.strokeStyle = 'rgba(0, 255, 100, 0.7)';
    ctx.lineWidth = 2;

    connections.forEach(([from, to]) => {
      const p1 = landmarks[from];
      const p2 = landmarks[to];

      if (p1 && p2 && p1.x && p2.x) {
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw key landmarks as circles
    const keyLandmarkIndices = [0, 11, 12, 7, 8, 23, 24]; // nose, shoulders, ears, hips
    keyLandmarkIndices.forEach((idx) => {
      const point = landmarks[idx];
      if (point && point.x && point.y) {
        ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 5. START DETECTION
  // ─────────────────────────────────────────────────────────────

  const startDetection = useCallback(async () => {
    try {
      setError(null);

      // Initialize detector if not already done
      if (!poseDetectorRef.current) {
        const detector = await initializePoseDetector();
        if (!detector) throw new Error('Failed to initialize detector');
      }

      // Request camera access
      if (!streamRef.current) {
        const stream = await requestCameraAccess();
        if (!stream) throw new Error('Failed to access camera');
      }

      // Start detection loop
      isRunningRef.current = true;
      setIsDetecting(true);
      detectPose();

      console.log('✓ Posture detection started');
    } catch (err) {
      console.error('✗ Failed to start detection:', err);
      setError(err.message);
    }
  }, [initializePoseDetector, requestCameraAccess, detectPose]);

  // ─────────────────────────────────────────────────────────────
  // 6. STOP DETECTION & CLEANUP (prevent memory leaks)
  // ─────────────────────────────────────────────────────────────

  const stopDetection = useCallback(() => {
    console.log('⊗ Stopping posture detection...');

    // Stop animation frame loop
    isRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('⊗ Media stream track stopped');
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsDetecting(false);
    setPostures([]);
    setCurrentAnalysis(null);
    setLandmarks(null);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 7. CLEANUP ON UNMOUNT
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      console.log('⊗ usePostureDetection cleanup');
      stopDetection();

      // Dispose MediaPipe model
      if (poseDetectorRef.current && poseDetectorRef.current.close) {
        poseDetectorRef.current.close();
        poseDetectorRef.current = null;
      }
    };
  }, [stopDetection]);

  // ─────────────────────────────────────────────────────────────
  // RETURN PUBLIC API
  // ─────────────────────────────────────────────────────────────

  return {
    // Refs for video and debug canvas
    videoRef,
    canvasRef,

    // State
    isInitialized,
    isDetecting,
    error,
    currentAnalysis,
    smoothedScore,
    sustainedPoorPosture,
    landmarks,
    postureHistory: postures,

    // Controls
    startDetection,
    stopDetection,
  };
};

export default usePostureDetection;
