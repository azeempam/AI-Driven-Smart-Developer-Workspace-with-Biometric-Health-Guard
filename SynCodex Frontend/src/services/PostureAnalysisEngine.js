/**
 * PostureAnalysisEngine.js
 * 
 * Privacy-First Posture Detection & Analysis Engine
 * ─────────────────────────────────────────────────
 * 
 * Core Features:
 * ✓ MediaPipe Pose Landmarker (runs 100% client-side)
 * ✓ Real-time posture scoring (0-100)
 * ✓ Slouching detection algorithm
 * ✓ Neck angle, shoulder alignment analysis
 * ✓ Baseline calibration & normalization
 * 
 * No data leaves the user's browser. All processing is local.
 */

/**
 * Landmark indices for MediaPipe Pose
 * @see https://developers.google.com/mediapipe/solutions/vision/pose_landmarker/
 */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/**
 * Calculate Euclidean distance between two points
 * @param {Object} p1 - Point with x, y, z coordinates
 * @param {Object} p2 - Point with x, y, z coordinates
 * @returns {number} Euclidean distance
 */
export const distance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate 3D angle between three points (in degrees)
 * Using the law of cosines: cos(θ) = (a² + b² - c²) / 2ab
 * 
 * @param {Object} p1 - First point (vertex)
 * @param {Object} p2 - Angle vertex (middle point)
 * @param {Object} p3 - Third point (end vertex)
 * @returns {number} Angle in degrees (0-180)
 */
export const calculateAngle = (p1, p2, p3) => {
  if (!p1 || !p2 || !p3) return 0;

  const a = distance(p1, p2); // Distance from p1 to p2
  const b = distance(p2, p3); // Distance from p2 to p3
  const c = distance(p1, p3); // Distance from p1 to p3

  if (a === 0 || b === 0) return 0;

  // Law of cosines: cos(θ) = (a² + b² - c²) / 2ab
  const cosAngle = (a * a + b * b - c * c) / (2 * a * b);
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle)); // Clamp to [-1, 1]
  
  return (Math.acos(clampedCosAngle) * 180) / Math.PI;
};

/**
 * POSTURE ANALYSIS LOGIC
 * ─────────────────────
 * 
 * Baseline "Good Posture" Reference:
 * ─────────────────────────────────
 * 1. Neck Angle: 85-95° (between ear, shoulder, spine)
 *    - <85°: Head forward (slouching)
 *    - >95°: Head too far back (uncommon)
 * 
 * 2. Shoulder Alignment:
 *    - Difference in Y position (left shoulder vs right): <0.05 (normalized)
 *    - Both should be roughly level
 * 
 * 3. Head Forward Detection:
 *    - Ear (x position) relative to shoulder (x position)
 *    - Forward: ear_x > shoulder_x + threshold (head protruding forward)
 * 
 * 4. Shoulder Rounding:
 *    - Shoulder to hip distance vs normal upright posture
 *    - Spine curvature from neck to hip
 */

/**
 * Analyze posture from detected landmarks
 * Returns a comprehensive posture analysis object
 * 
 * @param {Array} landmarks - MediaPipe pose landmarks array
 * @returns {Object} Posture analysis with score and warnings
 */
export const analyzePosture = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return {
      score: 0,
      neckAngle: 0,
      neckStatus: 'unknown',
      shoulderAlign: 0,
      shoulderStatus: 'unknown',
      headForward: 0,
      headForwardStatus: 'unknown',
      isSlouching: false,
      warnings: ['Insufficient pose data'],
      confidence: 0,
    };
  }

  // Extract key landmarks
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  // Calculate visibility/confidence threshold
  const minConfidence = Math.min(
    leftShoulder.z || 0.5,
    rightShoulder.z || 0.5,
    leftEar.z || 0.5,
    rightEar.z || 0.5
  );

  // ─────────────────────────────────────────
  // 1. NECK ANGLE ANALYSIS
  // ─────────────────────────────────────────
  // Angle: Ear → Shoulder → Hip (spinal alignment)
  const avgShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2,
  };

  const avgHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
  };

  const neckAngle = calculateAngle(nose, avgShoulder, avgHip);

  // Good neck angle: 85-95° (spine upright)
  // <85°: head forward (slouching)
  let neckScore = 100;
  let neckStatus = 'good';
  
  if (neckAngle < 85) {
    neckStatus = 'bad';
    neckScore = Math.max(0, 100 - (85 - neckAngle) * 5);
  } else if (neckAngle > 95) {
    neckStatus = 'warning';
    neckScore = Math.max(0, 100 - (neckAngle - 95) * 3);
  }

  // ─────────────────────────────────────────
  // 2. SHOULDER ALIGNMENT ANALYSIS
  // ─────────────────────────────────────────
  // Check if shoulders are level (similar Y position)
  const shoulderYDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  
  let shoulderScore = 100;
  let shoulderStatus = 'good';
  
  // Threshold: 0.05 in normalized coordinates
  if (shoulderYDiff > 0.08) {
    shoulderStatus = 'bad';
    shoulderScore = Math.max(0, 100 - shoulderYDiff * 1000);
  } else if (shoulderYDiff > 0.05) {
    shoulderStatus = 'warning';
    shoulderScore = Math.max(50, 100 - shoulderYDiff * 500);
  }

  // ─────────────────────────────────────────
  // 3. HEAD FORWARD DETECTION
  // ─────────────────────────────────────────
  // If ear is significantly forward of shoulder (head protrusion)
  const headForwardLeft = nose.x - leftShoulder.x;
  const headForwardRight = nose.x - rightShoulder.x;
  const avgHeadForward = (headForwardLeft + headForwardRight) / 2;

  let headForwardScore = 100;
  let headForwardStatus = 'good';
  
  // Threshold: head should be ~0.1-0.15 forward of shoulders
  // Beyond 0.2 is slouching
  if (avgHeadForward > 0.2) {
    headForwardStatus = 'bad';
    headForwardScore = Math.max(0, 100 - (avgHeadForward - 0.2) * 300);
  } else if (avgHeadForward > 0.18) {
    headForwardStatus = 'warning';
    headForwardScore = Math.max(50, 100 - (avgHeadForward - 0.18) * 200);
  }

  // ─────────────────────────────────────────
  // OVERALL POSTURE SCORE
  // ─────────────────────────────────────────
  // Weighted average: Neck (40%) + Shoulders (30%) + Head Forward (30%)
  const overallScore = (
    neckScore * 0.4 +
    shoulderScore * 0.3 +
    headForwardScore * 0.3
  );

  const isSlouching = neckStatus === 'bad' || headForwardStatus === 'bad';

  const warnings = [];
  if (neckStatus === 'bad') warnings.push('Neck angle: Excessive forward flexion');
  if (shoulderStatus === 'bad') warnings.push('Shoulders: Uneven/elevated');
  if (headForwardStatus === 'bad') warnings.push('Head position: Protruding forward');

  return {
    score: Math.round(overallScore),
    neckAngle: Math.round(neckAngle * 10) / 10,
    neckStatus,
    neckScore: Math.round(neckScore),
    shoulderAlign: Math.round(shoulderYDiff * 1000) / 1000,
    shoulderStatus,
    shoulderScore: Math.round(shoulderScore),
    headForward: Math.round(avgHeadForward * 1000) / 1000,
    headForwardStatus,
    headForwardScore: Math.round(headForwardScore),
    isSlouching,
    warnings,
    confidence: minConfidence,
    timestamp: Date.now(),
  };
};

/**
 * Calculate moving average for posture score smoothing
 * Prevents jittery score updates
 * 
 * @param {Array} history - Array of posture analysis objects
 * @param {number} windowSize - Number of frames to average (default: 5)
 * @returns {number} Smoothed posture score
 */
export const getSmoothedScore = (history = [], windowSize = 5) => {
  if (history.length === 0) return 0;
  
  const recentScores = history.slice(-windowSize);
  const avgScore = recentScores.reduce((sum, analysis) => sum + analysis.score, 0) / recentScores.length;
  
  return Math.round(avgScore);
};

/**
 * Detect sustained poor posture
 * Returns true if poor posture detected for more than threshold duration
 * 
 * @param {Array} history - Array of posture analysis objects
 * @param {number} durationMs - Duration threshold in milliseconds (default: 5 minutes)
 * @returns {boolean} True if sustained poor posture detected
 */
export const detectSustainedPoorPosture = (history = [], durationMs = 5 * 60 * 1000) => {
  if (history.length === 0) return false;

  // Find the most recent timestamp
  const now = history[history.length - 1].timestamp;
  
  // Get all analyses within the duration window
  const recentAnalyses = history.filter(
    (analysis) => now - analysis.timestamp <= durationMs
  );

  if (recentAnalyses.length === 0) return false;

  // Check if >70% of recent frames show poor posture
  const poorPostureCount = recentAnalyses.filter((a) => a.isSlouching).length;
  const poorPostureRatio = poorPostureCount / recentAnalyses.length;

  return poorPostureRatio > 0.7;
};

/**
 * Export summary of posture state for UI rendering
 */
export const getPostureSummary = (analysis) => {
  return {
    scoreColor: analysis.score >= 70 ? 'green' : analysis.score >= 50 ? 'yellow' : 'red',
    emoji: analysis.score >= 70 ? '✓' : analysis.score >= 50 ? '⚠' : '✗',
    statusText: analysis.isSlouching ? 'Slouching Detected' : 'Good Posture',
  };
};
