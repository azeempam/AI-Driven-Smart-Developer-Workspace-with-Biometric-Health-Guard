/**
 * INTEGRATION GUIDE: AI Posture & Ergonomics Assistant
 * ═══════════════════════════════════════════════════════════
 * 
 * How to integrate the Posture Assistant into your SynCodex IDE
 * 
 * Architecture Overview:
 * ─────────────────────
 * 
 * 1. PostureAnalysisEngine (services/PostureAnalysisEngine.js)
 *    └─ Pure logic layer: Pose math, angle calculations, posture scoring
 *    └─ NO React dependencies, fully reusable
 *    └─ Exports: analyzePosture(), getSmoothedScore(), detectSustainedPoorPosture()
 * 
 * 2. usePostureDetection (hooks/usePostureDetection.js)
 *    └─ React hook: MediaPipe integration, lifecycle management
 *    └─ Handles: Camera access, model initialization, frame throttling
 *    └─ Cleanup: Stops streams, disposes model, prevents memory leaks
 *    └─ Returns: videoRef, currentAnalysis, smoothedScore, controls
 * 
 * 3. PostureHealthDashboard (components/PostureHealthDashboard.jsx)
 *    └─ Themeable UI component: Score display, metrics grid, mini-map
 *    └─ Compact/expanded modes
 *    └─ Integrated with dark IDE (Tailwind CSS)
 * 
 * 4. PostureAlertNotification (components/PostureAlertNotification.jsx)
 *    └─ Toast-style notification: Poor posture alert banner
 *    └─ Auto-dismiss, action buttons, friendly messaging
 */

// ═══════════════════════════════════════════════════════════
// EXAMPLE 1: Basic Integration in CollabEditorLayout
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import PostureHealthDashboard from '../components/PostureHealthDashboard';
import PostureAlertNotification from '../components/PostureAlertNotification';
import usePostureDetection from '../hooks/usePostureDetection';

export function CollabEditorLayoutWithPosture() {
  const [showPostureAlert, setShowPostureAlert] = useState(false);
  const { sustainedPoorPosture } = usePostureDetection();

  const handleTakeBreak = useCallback(() => {
    // Trigger break mode (5 minutes without editing)
    console.log('User taking a break...');
    // You can integrate with your EyeCareTimer or create a BreakMode
  }, []);

  return (
    <>
      {/* Main IDE layout */}
      <div className="h-screen flex flex-col bg-gray-900">
        {/* ... existing IDE content ... */}

        {/* INTEGRATE DASHBOARD: Compact widget in status bar or sidebar */}
        <div className="fixed bottom-20 right-4 w-96 z-40">
          <PostureHealthDashboard isDarkTheme={true} />
        </div>

        {/* INTEGRATE ALERT: Show notification when sustained poor posture detected */}
        <PostureAlertNotification
          isVisible={sustainedPoorPosture}
          onDismiss={() => {
            // Log that user dismissed notification
            console.log('User dismissed posture alert');
          }}
          onTakeBreak={handleTakeBreak}
        />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 2: Standalone Health Dashboard in Status Bar
// ═══════════════════════════════════════════════════════════

export function EditorStatusBarWithPosture() {
  return (
    <div className="h-6 bg-blue-600 flex items-center px-3 text-white text-xs">
      {/* Existing status items... */}

      {/* Posture Dashboard (compact) */}
      <div className="ml-auto">
        <PostureHealthDashboard isDarkTheme={true} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 3: Using the Hook Directly (Advanced)
// ═══════════════════════════════════════════════════════════

export function CustomPostureMonitor() {
  const {
    videoRef,
    canvasRef,
    isDetecting,
    currentAnalysis,
    smoothedScore,
    sustainedPoorPosture,
    startDetection,
    stopDetection,
  } = usePostureDetection();

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <h3>Raw Posture Data</h3>

      <button onClick={isDetecting ? stopDetection : startDetection}>
        {isDetecting ? 'Stop' : 'Start'} Detection
      </button>

      {currentAnalysis && (
        <div>
          <p>Score: {smoothedScore}</p>
          <p>Neck Angle: {currentAnalysis.neckAngle}°</p>
          <p>Slouching: {currentAnalysis.isSlouching ? 'Yes' : 'No'}</p>
        </div>
      )}

      {/* Hidden refs for MediaPipe */}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TECHNICAL DETAILS: Posture Scoring Algorithm
// ═══════════════════════════════════════════════════════════

/**
 * POSTURE SCORE CALCULATION
 * 
 * Final Score = (Neck Score × 0.4) + (Shoulder Score × 0.3) + (Head Forward Score × 0.3)
 * 
 * 1. NECK ANGLE SCORE (40% weight)
 * ─────────────────────────────────
 * Good Range: 85-95°
 * 
 *   Score = 100 if 85 ≤ angle ≤ 95
 *   Score = 100 - (85 - angle) × 5   if angle < 85    [head forward penalty]
 *   Score = 100 - (angle - 95) × 3   if angle > 95    [head back penalty, less common]
 * 
 * Example: If angle = 75° (very slouched)
 *   Score = 100 - (85 - 75) × 5 = 100 - 50 = 50 points
 * 
 * 2. SHOULDER ALIGNMENT SCORE (30% weight)
 * ──────────────────────────────────────────
 * Measures Y-axis difference between left and right shoulders (normalized: 0-1)
 * 
 * Good Threshold: < 0.05 (nearly level)
 * Warning: 0.05 - 0.08 (slightly uneven)
 * Bad: > 0.08 (very uneven)
 * 
 *   Score = 100 if diff ≤ 0.05
 *   Score = 100 - diff × 1000   if diff > 0.08
 * 
 * 3. HEAD FORWARD SCORE (30% weight)
 * ────────────────────────────────────
 * Measures how far head projects forward from shoulder line
 * (normalized X distance: 0-1)
 * 
 * Good: 0.10 - 0.15 (natural slight forward head)
 * Warning: 0.15 - 0.20
 * Bad (Slouching): > 0.20
 * 
 *   Score = 100 if distance ≤ 0.18
 *   Score = 100 - (distance - 0.20) × 300   if distance > 0.20
 * 
 * 
 * SMOOTHING: Moving Average
 * ──────────────────────────
 * To prevent jittery score updates, calculate 5-frame moving average:
 * 
 *   Smoothed Score = mean(last 5 frames' scores)
 * 
 * 
 * SUSTAINED POOR POSTURE DETECTION
 * ─────────────────────────────────
 * Alert threshold: Continuous slouching for >5 minutes
 * 
 *   if (% of frames with slouching > 70% in last 5 minutes) {
 *     trigger notification
 *   }
 */

// ═══════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION DETAILS
// ═══════════════════════════════════════════════════════════

/**
 * CPU OPTIMIZATION STRATEGY
 * 
 * 1. FRAME THROTTLING (2 FPS analysis)
 * ─────────────────────────────────────
 * Instead of analyzing every frame from camera (30 FPS), only process
 * every 500ms (2 FPS). This reduces MediaPipe inference calls.
 * 
 *   const DETECTION_FPS = 2;
 *   const FRAME_SKIP_INTERVAL = Math.floor(1000 / DETECTION_FPS) = 500ms
 *   
 *   // In detection loop:
 *   if (now - lastTime < FRAME_SKIP_INTERVAL) {
 *     requestAnimationFrame(detectPose);
 *     return; // Skip this frame
 *   }
 * 
 * Result: ~2% CPU usage (vs ~15% for 30 FPS)
 * 
 * 
 * 2. EFFICIENT HISTORY MANAGEMENT
 * ─────────────────────────────────
 * Keep only last 60 frames (~30 seconds at 2 FPS) for memory efficiency:
 * 
 *   const SCORE_HISTORY_MAX = 60;
 *   if (history.length > SCORE_HISTORY_MAX) {
 *     history = history.slice(-SCORE_HISTORY_MAX);
 *   }
 * 
 * 
 * 3. REQUESTANIMATIONFRAME + THROTTLING
 * ──────────────────────────────────────
 * Never use setInterval for video processing (blocks render thread).
 * Use requestAnimationFrame for efficient browser scheduling:
 * 
 *   const detectPose = () => {
 *     // Check throttle condition
 *     // Run inference
 *     // Update state
 *     animationFrameRef.current = requestAnimationFrame(detectPose);
 *   };
 * 
 * 
 * 4. CLEANUP & MEMORY LEAK PREVENTION
 * ────────────────────────────────────
 * On component unmount:
 * 
 *   useEffect(() => {
 *     return () => {
 *       // Stop animation frame loop
 *       cancelAnimationFrame(animationFrameRef.current);
 *       
 *       // Stop media streams (critical!)
 *       streamRef.current?.getTracks().forEach(track => track.stop());
 *       
 *       // Dispose MediaPipe model
 *       poseDetectorRef.current?.close();
 *       
 *       // Clear refs
 *       videoRef.current = null;
 *     };
 *   }, []);
 */

// ═══════════════════════════════════════════════════════════
// CUSTOMIZATION: Theming with Tailwind
// ═══════════════════════════════════════════════════════════

/**
 * DARK THEME INTEGRATION
 * 
 * The components use Tailwind CSS with dark theme classes:
 * 
 * Base: bg-gray-900 (matches your IDE)
 * Borders: border-gray-800, border-gray-700/50
 * Text: text-gray-100, text-gray-400
 * Status colors:
 *   - Good: text-green-400, bg-green-400/10
 *   - Warning: text-yellow-400, bg-yellow-400/10
 *   - Bad: text-red-400, bg-red-400/10
 * 
 * 
 * TO CUSTOMIZE COLORS:
 * 
 * Option 1: Pass theme config to components
 *   <PostureHealthDashboard isDarkTheme={true} />
 * 
 * Option 2: Override Tailwind classes in your CSS:
 *   .posture-score { @apply text-cyan-500; }
 * 
 * Option 3: Use CSS variables:
 *   --posture-good: #10b981;
 *   --posture-warning: #f59e0b;
 *   --posture-bad: #ef4444;
 */

// ═══════════════════════════════════════════════════════════
// DEPLOYMENT CHECKLIST
// ═══════════════════════════════════════════════════════════

/**
 * ☐ Install MediaPipe dependencies:
 *     npm install @mediapipe/tasks-vision
 * 
 * ☐ Verify HTTPS support (MediaPipe requires secure context)
 *     Most modern browsers enforce this
 * 
 * ☐ Test camera permissions
 *     Check browser console for permission errors
 * 
 * ☐ Monitor CPU usage in DevTools
 *     Should be <5% during posture analysis
 * 
 * ☐ Test on low-end devices
 *     2 FPS throttling should work on older laptops
 * 
 * ☐ Privacy compliance
 *     Add privacy policy mentioning on-device processing
 *     No video data leaves the browser
 * 
 * ☐ Accessibility
 *     Ensure keyboard navigation works
 *     Screen reader friendly labels
 * 
 * ☐ Performance monitoring
 *     Add performance metrics in your analytics
 *     Track: detection_fps, average_score, model_load_time
 */

export default {
  CollabEditorLayoutWithPosture,
  EditorStatusBarWithPosture,
  CustomPostureMonitor,
};
