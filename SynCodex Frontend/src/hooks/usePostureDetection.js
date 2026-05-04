import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
// No toast import here — alerts are dispatched via addAlert from ErgonomicsContext


// ─── Landmark indices ─────────────────────────────────────────────────────────
const LM = { NOSE: 0, LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_HIP: 23, RIGHT_HIP: 24 };

// ─── Canvas debug colors ──────────────────────────────────────────────────────
const LANDMARK_COLOR = '#06b6d4';
const CONNECTOR_COLOR = '#7c3aed';
const CONNECTIONS = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.NOSE, LM.LEFT_SHOULDER],
  [LM.NOSE, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
];

/**
 * usePostureEngine — Background posture detection engine.
 *
 * Lifecycle is tied to the PROVIDER, not the widget.
 * The rAF loop and camera stream survive widget collapse/expand.
 *
 * @param {React.RefObject} videoRef  — ref to the always-mounted hidden <video>
 * @param {React.RefObject} canvasRef — ref to a debug <canvas> (optional)
 */
export const usePostureEngine = (videoRef, canvasRef, addAlert) => {
  // ── Status machine ─────────────────────────────────────────────────────────
  // 'idle'     → engine off, no camera
  // 'loading'  → getUserMedia / model in-flight
  // 'ready'    → inference loop running (even if widget is collapsed)
  // 'paused'   → stream alive, loop suspended by user
  // 'error'    → terminal or recoverable error
  const [detectionStatus, setDetectionStatus] = useState('idle');
  const [errorMessage, setErrorMessage]       = useState('');
  const [postureScore, setPostureScore]       = useState(100);
  const [postureStatus, setPostureStatus]     = useState('Good');
  const [baselineSet, setBaselineSet]         = useState(false);
  const [debugMode, setDebugMode]             = useState(false);

  // ── Internal refs (not state — avoids stale-closure bugs in rAF loop) ──────
  const landmarkerRef          = useRef(null);
  const streamRef              = useRef(null);
  const animationRef           = useRef(null);
  const lastVideoTimeRef       = useRef(-1);
  const lastProcessingTimeRef  = useRef(-1);
  const baselineRef            = useRef(null);
  const loopActiveRef          = useRef(false);  // controls rAF loop independently of React state
  const pausedRef              = useRef(false);   // pause without stopping camera
  const lastToastStatusRef     = useRef('Good');
  const debugModeRef           = useRef(false);   // shadow of debugMode for use inside rAF closure

  // Keep debugModeRef in sync without recreating processFrame
  useEffect(() => { debugModeRef.current = debugMode; }, [debugMode]);

  // ── Model initialization (runs once on provider mount) ────────────────────
  useEffect(() => {
    let isMounted = true;
    console.log('[SynCodex Posture] Loading MediaPipe model…');

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          console.log('[SynCodex Posture] ✅ Model ready.');
        }
      } catch (err) {
        console.error('[SynCodex Posture] ❌ Model load failed:', err);
        if (isMounted) {
          setDetectionStatus('error');
          setErrorMessage('AI Model failed to load. Check your network connection.');
        }
      }
    };

    init();
    return () => {
      isMounted = false;
      landmarkerRef.current?.close();
    };
  }, []);

  // ── Ergonomics math ───────────────────────────────────────────────────────
  const analyzePosture = useCallback((landmarks) => {
    if (!landmarks?.length) return;

    const pose  = landmarks[0];
    const nose  = pose[LM.NOSE];
    const lSh   = pose[LM.LEFT_SHOULDER];
    const rSh   = pose[LM.RIGHT_SHOULDER];
    if (!nose || !lSh || !rSh) return;

    const mid = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 };

    // Scale-invariant posture ratio: neck projection / shoulder width
    const neck   = Math.hypot(nose.x - mid.x, nose.y - mid.y);
    const width  = Math.hypot(lSh.x  - rSh.x,  lSh.y  - rSh.y);
    const metric = neck / (width || 1);

    if (baselineRef.current === null) {
      baselineRef.current = metric;
      setBaselineSet(true);
      console.log('[SynCodex Posture] ✅ Baseline:', metric.toFixed(4));
      return;
    }

    const raw = Math.min(100, Math.max(0, Math.round((metric / baselineRef.current) * 100)));

    setPostureScore((prev) => {
      const score     = Math.round(prev * 0.8 + raw * 0.2);
      const newStatus = score > 85 ? 'Good' : score > 70 ? 'Warning' : 'Poor';

      setPostureStatus(newStatus);

      // Notify only on status CHANGE — works even when widget is collapsed
      if (newStatus !== lastToastStatusRef.current) {
        lastToastStatusRef.current = newStatus;

        if (newStatus === 'Warning') {
          addAlert({
            type: 'warning',
            title: 'Posture Warning',
            message: 'You are starting to slouch. Sit up straight!',
            duration: 6000,
          });
          sendBrowserNotification('Posture Warning ⚠️', 'You are starting to slouch.');
        } else if (newStatus === 'Poor') {
          addAlert({
            type: 'error',
            title: 'Poor Posture Detected',
            message: 'Please correct your position immediately.',
            duration: 10000,
          });
          sendBrowserNotification('Poor Posture Detected 🚨', 'Please correct your position now.');
        } else if (newStatus === 'Good' && prev < 85) {
          addAlert({
            type: 'success',
            title: 'Great Posture!',
            message: 'Optimal ergonomic alignment restored.',
            duration: 3500,
          });
        }
      }

      return score;
    });
  }, []);

  // ── Debug canvas overlay ──────────────────────────────────────────────────
  const drawDebugCanvas = useCallback((landmarks) => {
    const canvas = canvasRef?.current;
    const video  = videoRef?.current;
    if (!canvas || !video) return;

    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks?.length) return;
    const pose = landmarks[0];
    const W = canvas.width, H = canvas.height;

    ctx.strokeStyle = CONNECTOR_COLOR;
    ctx.lineWidth   = 2;
    CONNECTIONS.forEach(([a, b]) => {
      if (!pose[a] || !pose[b]) return;
      ctx.beginPath();
      ctx.moveTo(pose[a].x * W, pose[a].y * H);
      ctx.lineTo(pose[b].x * W, pose[b].y * H);
      ctx.stroke();
    });

    ctx.fillStyle = LANDMARK_COLOR;
    [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP].forEach((i) => {
      if (!pose[i]) return;
      ctx.beginPath();
      ctx.arc(pose[i].x * W, pose[i].y * H, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [canvasRef, videoRef]);

  // ── Background rAF loop — survives widget collapse ────────────────────────
  // IMPORTANT: Uses refs for everything — NO state in closure.
  // This means the function reference never needs to change.
  const processFrame = useCallback(() => {
    if (!loopActiveRef.current) return; // hard stop

    const video     = videoRef?.current;
    const landmarker = landmarkerRef.current;

    if (!pausedRef.current && video && landmarker && video.readyState >= 2) {
      const now = performance.now();

      // Throttle: analyze at 2 FPS max (500 ms) to keep CPU free for Monaco
      if (now - lastProcessingTimeRef.current >= 500) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          try {
            const results = landmarker.detectForVideo(video, now);
            analyzePosture(results.landmarks);
            if (debugModeRef.current) drawDebugCanvas(results.landmarks);
          } catch (err) {
            console.error('[SynCodex Posture] Inference error:', err);
          }
        }
        lastProcessingTimeRef.current = now;
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [analyzePosture, drawDebugCanvas, videoRef]);

  // ── Start camera + loop ───────────────────────────────────────────────────
  const startMonitoring = useCallback(async () => {
    if (!landmarkerRef.current) {
      setDetectionStatus('error');
      setErrorMessage('Model is still loading. Try again in a moment.');
      return;
    }
    if (loopActiveRef.current) return; // already running

    setDetectionStatus('loading');
    setErrorMessage('');
    console.log('[SynCodex Posture] Requesting camera…');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: { ideal: 15 } },
      });
      streamRef.current = stream;

      const video = videoRef?.current;
      if (!video) throw new Error('Video element not mounted in provider.');

      video.srcObject = stream;
      await video.play();

      loopActiveRef.current = true;
      pausedRef.current     = false;
      setDetectionStatus('ready');
      console.log('[SynCodex Posture] ✅ Background monitoring started.');
      animationRef.current = requestAnimationFrame(processFrame);

      // Request browser notification permission proactively
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (err) {
      console.error('[SynCodex Posture] ❌ Camera error:', err);
      loopActiveRef.current = false;
      setDetectionStatus('error');
      setErrorMessage(translateCameraError(err));
    }
  }, [videoRef, processFrame]);

  // ── Stop camera + loop ────────────────────────────────────────────────────
  const stopMonitoring = useCallback(() => {
    loopActiveRef.current = false;
    pausedRef.current     = false;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const video = videoRef?.current;
    if (video) video.srcObject = null;

    const canvas = canvasRef?.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    baselineRef.current         = null;
    lastToastStatusRef.current  = 'Good';
    setDetectionStatus('idle');
    setPostureScore(100);
    setPostureStatus('Good');
    setBaselineSet(false);
    console.log('[SynCodex Posture] Monitoring stopped. Stream released.');
  }, [videoRef, canvasRef]);

  // ── Pause / Resume (keeps camera alive, suspends analysis) ───────────────
  const pauseMonitoring = useCallback(() => {
    if (!loopActiveRef.current) return;
    pausedRef.current = true;
    setDetectionStatus('paused');
    console.log('[SynCodex Posture] Analysis paused (stream still open).');
  }, []);

  const resumeMonitoring = useCallback(() => {
    if (!loopActiveRef.current) return;
    pausedRef.current = false;
    setDetectionStatus('ready');
    console.log('[SynCodex Posture] Analysis resumed.');
  }, []);

  const togglePause = useCallback(() => {
    if (pausedRef.current) resumeMonitoring();
    else pauseMonitoring();
  }, [pauseMonitoring, resumeMonitoring]);

  // ── Recalibrate baseline ──────────────────────────────────────────────────
  const calibrate = useCallback(() => {
    baselineRef.current        = null;
    lastToastStatusRef.current = 'Good';
    setBaselineSet(false);
    setPostureScore(100);
    setPostureStatus('Good');
    console.log('[SynCodex Posture] Recalibrating baseline on next frame…');
  }, []);

  // ── Toggle tracking (start or stop) ──────────────────────────────────────
  const toggleTracking = useCallback(() => {
    if (loopActiveRef.current) stopMonitoring();
    else startMonitoring();
  }, [startMonitoring, stopMonitoring]);

  // ── Full cleanup on provider unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      loopActiveRef.current = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      console.log('[SynCodex Posture] Provider unmounted. Resources released.');
    };
  }, []);

  return {
    detectionStatus,   // 'idle' | 'loading' | 'ready' | 'paused' | 'error'
    errorMessage,
    postureScore,
    postureStatus,     // 'Good' | 'Warning' | 'Poor'
    baselineSet,
    debugMode,
    setDebugMode,
    toggleTracking,
    togglePause,
    calibrate,
  };
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function translateCameraError(err) {
  switch (err.name) {
    case 'NotAllowedError':  return 'Camera Permission Denied. Allow access in browser settings.';
    case 'NotFoundError':    return 'No Camera Found. Please connect a webcam.';
    case 'NotReadableError': return 'Camera is in use by another application.';
    default:                 return `Camera Error: ${err.message}`;
  }
}

function sendBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'posture-alert', // replaces previous notification, no spam
    });
  }
}
