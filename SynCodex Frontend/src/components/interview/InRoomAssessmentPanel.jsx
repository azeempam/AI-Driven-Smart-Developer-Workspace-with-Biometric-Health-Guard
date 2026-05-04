/**
 * InRoomAssessmentPanel Component
 * Clean, non-intrusive assessment UI for active room sessions
 * Integrates with room header or AI Assistant panel
 * 
 * Features:
 * - Toggle-based activation (not automatic)
 * - Non-blocking permission checks
 * - Live recording with audio visualization
 * - Seamless collapse/expand
 */

import React, { useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader,
  Settings,
} from 'lucide-react';
import useInRoomAssessment from '../../hooks/useInRoomAssessment';

export function InRoomAssessmentPanel({ roomId, roomName, onClose }) {
  const assessment = useInRoomAssessment();
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle start recording with UI feedback
  const handleStartRecording = async () => {
    setIsStartingRecording(true);
    const success = await assessment.startRecording();
    setIsStartingRecording(false);
  };

  // Permission status indicator
  const getPermissionStatus = (state, hasDevice) => {
    if (!hasDevice) return { icon: AlertCircle, color: 'text-yellow-500', label: 'No Device' };
    if (state === 'granted') return { icon: CheckCircle2, color: 'text-green-500', label: 'Granted' };
    if (state === 'denied') return { icon: AlertCircle, color: 'text-red-500', label: 'Denied' };
    if (state === 'prompt') return { icon: AlertCircle, color: 'text-yellow-500', label: 'Grant Access' };
    if (state === 'unknown') return { icon: Loader, color: 'text-slate-400', label: 'Checking...' };
    return { icon: AlertCircle, color: 'text-orange-500', label: 'Error' };
  };

  const micStatus = getPermissionStatus(
    assessment.permissions.microphone.state,
    assessment.permissions.microphone.hasDevice
  );
  const camStatus = getPermissionStatus(
    assessment.permissions.camera.state,
    assessment.permissions.camera.hasDevice
  );

  // Audio level visualization
  const audioLevelBars = Array(12)
    .fill(0)
    .map((_, i) => {
      const filled = Math.ceil(assessment.audioLevel * 12);
      return i < filled;
    });

  // If not enabled, don't render
  if (!assessment.isAssessmentEnabled) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {assessment.recordingActive ? (
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full absolute" />
                <div className="w-2 h-2 bg-red-500 rounded-full absolute animate-ping" />
              </div>
            ) : (
              <Mic size={16} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Interview Assessment
            </h3>
            <p className="text-xs text-slate-400">
              {roomName || roomId}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {assessment.recordingActive && (
            <div className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-mono">
              {formatTime(Math.floor(assessment.recordingTime))}
            </div>
          )}
          <button
            onClick={() => setShowPermissionDetails(!showPermissionDetails)}
            className="p-1.5 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-slate-300"
            title="Show diagnostics"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => assessment.disableAssessment()}
            className="p-1.5 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-slate-300"
            title="Close assessment"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content */}
      {!showPermissionDetails && (
        <div className="px-4 py-4 space-y-4">
          {/* Error Message */}
          {assessment.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              ⚠️ {assessment.error}
            </div>
          )}

          {/* Recording Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Recording</span>
              <span className="text-xs text-slate-500">
                {assessment.recordingActive ? 'Active' : 'Ready'}
              </span>
            </div>
            <button
              onClick={
                assessment.recordingActive
                  ? assessment.stopRecording
                  : handleStartRecording
              }
              disabled={isStartingRecording}
              className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                assessment.recordingActive
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50'
                  : isStartingRecording
                    ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {isStartingRecording ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Starting...
                </>
              ) : assessment.recordingActive ? (
                <>
                  <MicOff size={16} />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic size={16} />
                  Start Recording
                </>
              )}
            </button>
          </div>

          {/* Audio Level Indicator */}
          {assessment.recordingActive && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">Audio Level</div>
              <div className="flex items-center gap-1 py-2">
                {audioLevelBars.map((filled, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-6 rounded-sm transition-colors ${
                      filled
                        ? i < 8
                          ? 'bg-green-500'
                          : i < 10
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        : 'bg-slate-700/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Permission Status */}
          <div className="grid grid-cols-2 gap-2">
            {/* Microphone Status */}
            <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Mic size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Mic</span>
              </div>
              <div className="flex items-center gap-1">
                {React.createElement(micStatus.icon, {
                  size: 14,
                  className: `${micStatus.color} flex-shrink-0`,
                })}
                <span className="text-xs text-slate-400">{micStatus.label}</span>
              </div>
            </div>

            {/* Camera Status */}
            <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <svg size={14} className="text-slate-400 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span className="text-xs font-semibold text-slate-300">Cam</span>
              </div>
              <div className="flex items-center gap-1">
                {React.createElement(camStatus.icon, {
                  size: 14,
                  className: `${camStatus.color} flex-shrink-0`,
                })}
                <span className="text-xs text-slate-400">{camStatus.label}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Details Panel */}
      {showPermissionDetails && (
        <div className="px-4 py-4 space-y-3 max-h-64 overflow-y-auto">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Permission Diagnostics
          </h4>

          {/* Microphone Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {React.createElement(micStatus.icon, {
                size: 16,
                className: micStatus.color,
              })}
              <span className="text-sm font-medium text-slate-300">Microphone</span>
            </div>
            <div className="ml-6 space-y-1 text-xs text-slate-400">
              <p>Device: {assessment.permissions.microphone.hasDevice ? '✓ Found' : '✗ Not Found'}</p>
              <p>Permission: {assessment.permissions.microphone.state || 'Unknown'}</p>
              {assessment.permissions.microphone.state === 'denied' && (
                <>
                  <p className="text-yellow-500 mt-2">Access Denied</p>
                  <button
                    onClick={() => assessment.requestMicrophonePermission()}
                    className="mt-2 px-2 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded transition-colors"
                  >
                    Request Again
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Camera Details */}
          <div className="space-y-2 border-t border-slate-700/30 pt-3">
            <div className="flex items-center gap-2">
              {React.createElement(camStatus.icon, {
                size: 16,
                className: camStatus.color,
              })}
              <span className="text-sm font-medium text-slate-300">Camera</span>
            </div>
            <div className="ml-6 space-y-1 text-xs text-slate-400">
              <p>Device: {assessment.permissions.camera.hasDevice ? '✓ Found' : '✗ Not Found'}</p>
              <p>Permission: {assessment.permissions.camera.state || 'Unknown'}</p>
              {assessment.permissions.camera.state === 'denied' && (
                <>
                  <p className="text-yellow-500 mt-2">Access Denied</p>
                  <button
                    onClick={() => assessment.requestCameraPermission()}
                    className="mt-2 px-2 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded transition-colors"
                  >
                    Request Again
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="border-t border-slate-700/30 pt-3 text-xs text-slate-500">
            <p>
              If permissions are denied, enable them in your browser settings:
            </p>
            <p className="mt-1 text-slate-600">
              Settings → Privacy & Security → Camera/Microphone
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default InRoomAssessmentPanel;
