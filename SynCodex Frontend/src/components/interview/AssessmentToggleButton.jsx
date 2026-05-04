/**
 * AssessmentToggleButton Component
 * Clean, compact toggle button for room header or toolbar
 * Non-intrusive indicator of assessment state
 */

import React from 'react';
import { Mic, MicOff } from 'lucide-react';

export function AssessmentToggleButton({
  isEnabled,
  onToggle,
  isRecording = false,
  className = '',
  variant = 'header', // 'header' or 'toolbar'
}) {
  if (variant === 'header') {
    return (
      <button
        onClick={onToggle}
        className={`
          relative group p-2 rounded-lg transition-all duration-200
          ${isEnabled
            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'bg-slate-700/20 hover:bg-slate-700/40 text-slate-400 hover:text-slate-300 border border-slate-700/30'
          }
          ${className}
        `}
        title={isEnabled ? 'Assessment enabled' : 'Enable assessment'}
      >
        {/* Icon */}
        <div className="relative">
          {isRecording && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          {isEnabled ? (
            <Mic size={18} />
          ) : (
            <MicOff size={18} />
          )}
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-950 text-xs text-slate-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {isEnabled
            ? isRecording
              ? 'Recording...'
              : 'Assessment On'
            : 'Enable Assessment'}
        </div>
      </button>
    );
  }

  if (variant === 'toolbar') {
    return (
      <button
        onClick={onToggle}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${isEnabled
            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'bg-slate-700/20 hover:bg-slate-700/40 text-slate-400 hover:text-slate-300 border border-slate-700/30'
          }
          ${className}
        `}
        title={isEnabled ? 'Assessment enabled' : 'Enable assessment'}
      >
        <div className="relative">
          {isRecording && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          {isEnabled ? (
            <Mic size={16} />
          ) : (
            <MicOff size={16} />
          )}
        </div>
        <span className="text-sm font-medium">
          {isEnabled
            ? isRecording
              ? 'Recording'
              : 'Assessment'
            : 'Assessment'}
        </span>
      </button>
    );
  }

  return null;
}

export default AssessmentToggleButton;
