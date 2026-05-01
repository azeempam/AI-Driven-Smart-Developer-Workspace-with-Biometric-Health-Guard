/**
 * PostureHealthDashboard.jsx
 * 
 * AI Posture & Ergonomics Assistant - Health Dashboard Widget
 * ─────────────────────────────────────────────────────────────
 * 
 * Compact, toggleable widget displaying:
 * ✓ Real-time Posture Score (0-100)
 * ✓ Key metrics: Neck Angle, Shoulders, Head Position
 * ✓ Status indicators with color coding
 * ✓ Mini-map of detected key points
 * ✓ Themed UI matching dark IDE (bg-gray-900)
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import usePostureDetection from '../hooks/usePostureDetection';
import { getPostureSummary } from '../services/PostureAnalysisEngine';

const PostureHealthDashboard = ({ isDarkTheme = true }) => {
  const {
    videoRef,
    canvasRef,
    isDetecting,
    error,
    currentAnalysis,
    smoothedScore,
    sustainedPoorPosture,
    startDetection,
    stopDetection,
  } = usePostureDetection();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATION TRIGGER: Sustained poor posture detected
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sustainedPoorPosture && !showNotification) {
      setShowNotification(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [sustainedPoorPosture, showNotification]);

  // ─────────────────────────────────────────────────────────────
  // COLOR & STATUS MAPPING
  // ─────────────────────────────────────────────────────────────

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'warning':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'bad':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const summary = currentAnalysis ? getPostureSummary(currentAnalysis) : null;

  // ─────────────────────────────────────────────────────────────
  // MINI-MAP: Visual representation of key landmarks
  // ─────────────────────────────────────────────────────────────

  const MiniLandmarkMap = ({ landmarks }) => {
    if (!landmarks || landmarks.length === 0) {
      return (
        <div className="h-20 bg-gray-950/50 rounded border border-gray-700/50 flex items-center justify-center">
          <span className="text-xs text-gray-500">Detecting...</span>
        </div>
      );
    }

    const keyIndices = [0, 7, 8, 11, 12, 23, 24]; // nose, ears, shoulders, hips
    const keyLabels = ['N', 'LE', 'RE', 'LS', 'RS', 'LH', 'RH'];

    return (
      <div className="h-20 bg-gray-950/50 rounded border border-gray-700/50 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Draw skeleton */}
          <line x1={landmarks[11]?.x * 100} y1={landmarks[11]?.y * 100} x2={landmarks[12]?.x * 100} y2={landmarks[12]?.y * 100} stroke="rgba(100, 200, 255, 0.3)" strokeWidth="0.5" />
          <line x1={landmarks[0]?.x * 100} y1={landmarks[0]?.y * 100} x2={landmarks[11]?.x * 100} y2={landmarks[11]?.y * 100} stroke="rgba(100, 200, 255, 0.3)" strokeWidth="0.5" />
          <line x1={landmarks[0]?.x * 100} y1={landmarks[0]?.y * 100} x2={landmarks[12]?.x * 100} y2={landmarks[12]?.y * 100} stroke="rgba(100, 200, 255, 0.3)" strokeWidth="0.5" />

          {/* Draw key landmarks */}
          {keyIndices.map((idx, i) => {
            const landmark = landmarks[idx];
            if (!landmark) return null;
            return (
              <g key={idx}>
                <circle
                  cx={landmark.x * 100}
                  cy={landmark.y * 100}
                  r="2"
                  fill="rgba(34, 197, 94, 0.8)"
                />
                <text
                  x={landmark.x * 100}
                  y={landmark.y * 100 - 3}
                  fontSize="2"
                  fill="rgba(34, 197, 94, 1)"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {keyLabels[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div
      className={`${
        isDarkTheme ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      } rounded-lg border shadow-lg`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-gray-100">Posture Assistant</h3>
          {sustainedPoorPosture && (
            <span className="ml-2 px-2 py-1 rounded text-xs font-bold bg-red-900/40 text-red-300 border border-red-700/50 animate-pulse">
              ALERT
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Start/Stop Button */}
          <button
            onClick={isDetecting ? stopDetection : startDetection}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              isDetecting
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'
            }`}
          >
            {isDetecting ? 'Stop' : 'Start'}
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-800 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* COLLAPSED VIEW: Show score only */}
      {!isExpanded && currentAnalysis && (
        <div className="px-4 py-3 flex items-center justify-center gap-3">
          <span className={`text-2xl font-bold ${getScoreColor(smoothedScore)}`}>
            {smoothedScore}
          </span>
          <span className="text-sm text-gray-400">{summary.statusText}</span>
        </div>
      )}

      {/* EXPANDED VIEW: Full dashboard */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* ERROR STATE */}
          {error && (
            <div className="p-3 rounded bg-red-900/20 border border-red-700/50 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-300">Error</p>
                <p className="text-xs text-red-400/80">{error}</p>
              </div>
            </div>
          )}

          {/* DETECTING STATE */}
          {!isDetecting && !error && (
            <div className="p-3 rounded bg-yellow-900/20 border border-yellow-700/50 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">
                Click "Start" to begin posture analysis
              </p>
            </div>
          )}

          {/* SCORE CARD */}
          {currentAnalysis && (
            <>
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-gray-400">
                    Posture Score
                  </span>
                  <span className={`text-3xl font-bold ${getScoreColor(smoothedScore)}`}>
                    {smoothedScore}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      smoothedScore >= 70
                        ? 'bg-green-500'
                        : smoothedScore >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${smoothedScore}%` }}
                  />
                </div>
              </div>

              {/* METRICS GRID */}
              <div className="grid grid-cols-3 gap-2">
                {/* Neck Angle */}
                <div
                  className={`p-3 rounded border ${getStatusColor(
                    currentAnalysis.neckStatus
                  )}`}
                >
                  <p className="text-[10px] uppercase tracking-wide opacity-70">
                    Neck Angle
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {currentAnalysis.neckAngle}°
                  </p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {currentAnalysis.neckStatus === 'good'
                      ? '✓ Good'
                      : currentAnalysis.neckStatus === 'warning'
                      ? '⚠ Warning'
                      : '✗ Bad'}
                  </p>
                </div>

                {/* Shoulder Alignment */}
                <div
                  className={`p-3 rounded border ${getStatusColor(
                    currentAnalysis.shoulderStatus
                  )}`}
                >
                  <p className="text-[10px] uppercase tracking-wide opacity-70">
                    Shoulders
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {(currentAnalysis.shoulderAlign * 100).toFixed(0)}%
                  </p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {currentAnalysis.shoulderStatus === 'good'
                      ? '✓ Level'
                      : currentAnalysis.shoulderStatus === 'warning'
                      ? '⚠ Uneven'
                      : '✗ Tilted'}
                  </p>
                </div>

                {/* Head Forward */}
                <div
                  className={`p-3 rounded border ${getStatusColor(
                    currentAnalysis.headForwardStatus
                  )}`}
                >
                  <p className="text-[10px] uppercase tracking-wide opacity-70">
                    Head Pos
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {currentAnalysis.headForward.toFixed(2)}
                  </p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {currentAnalysis.headForwardStatus === 'good'
                      ? '✓ Neutral'
                      : currentAnalysis.headForwardStatus === 'warning'
                      ? '⚠ Forward'
                      : '✗ Slouching'}
                  </p>
                </div>
              </div>

              {/* MINI-LANDMARK MAP */}
              <MiniLandmarkMap landmarks={currentAnalysis.landmarks} />

              {/* WARNINGS */}
              {currentAnalysis.warnings && currentAnalysis.warnings.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-3 space-y-1">
                  {currentAnalysis.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-300">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* HIDDEN VIDEO & CANVAS (for pose detection) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ display: 'none' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PostureHealthDashboard;
