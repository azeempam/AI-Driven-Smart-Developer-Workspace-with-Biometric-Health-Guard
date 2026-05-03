import React, { useState } from 'react';
import { useErgonomics } from '../context/ErgonomicsContext';
import { Activity, Camera, CameraOff, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export const PostureWidget = () => {
  const { 
    isReady, 
    isActive, 
    score, 
    status, 
    videoRef, 
    toggleTracking, 
    calibrate 
  } = useErgonomics();

  const [isExpanded, setIsExpanded] = useState(false);

  // Status-based styling
  const getStatusStyles = () => {
    switch(status) {
      case 'Poor': return 'text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
      case 'Warning': return 'text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
      case 'Good': default: return 'text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    }
  };

  const getStatusBg = () => {
    switch(status) {
      case 'Poor': return 'bg-red-500/20';
      case 'Warning': return 'bg-yellow-500/20';
      case 'Good': default: return 'bg-emerald-500/20';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans transition-all duration-300">
      
      {/* Expanded Widget Panel */}
      {isExpanded && (
        <div className="w-72 bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl overflow-hidden p-4 flex flex-col gap-4 animate-in slide-in-from-bottom-5 fade-in duration-200">
          
          <div className="flex items-center justify-between">
            <h3 className="text-gray-100 font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Privacy-First Posture
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium bg-gray-800 px-2 py-1 rounded-full">
              Local AI
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-gray-950 border border-gray-800 aspect-video flex items-center justify-center group">
            {/* The video stream is processed locally. We apply a blur to the UI feed to emphasize privacy. */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-500 ${isActive ? 'opacity-50 blur-sm group-hover:blur-none' : 'hidden'}`}
            />
            {!isActive && (
              <div className="flex flex-col items-center text-gray-500 gap-2">
                <CameraOff className="w-6 h-6" />
                <span className="text-xs">Camera Offline</span>
              </div>
            )}
            
            {/* Score Overlay */}
            {isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/40 pointer-events-none">
                <span className={`text-4xl font-bold tracking-tighter drop-shadow-md ${getStatusStyles().split(' ')[0]}`}>
                  {score}
                </span>
                <span className="text-xs text-gray-300 font-medium uppercase tracking-widest">Score</span>
              </div>
            )}
          </div>

          {isActive && (
            <div className={`p-3 rounded-lg border flex items-start gap-3 ${getStatusStyles()} ${getStatusBg()} bg-opacity-10 backdrop-blur-sm`}>
              {status === 'Good' ? <Activity className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
              <div className="flex flex-col">
                <span className="text-sm font-semibold capitalize">{status} Posture</span>
                <span className="text-xs opacity-80 mt-0.5">
                  {status === 'Good' ? 'Optimal ergonomic alignment.' : 'Please correct your posture and sit up straight.'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
            <button 
              onClick={toggleTracking}
              disabled={!isReady}
              className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                  : 'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {isActive ? 'Stop' : (isReady ? 'Start Assist' : 'Loading AI...')}
            </button>
            
            {isActive && (
              <button 
                onClick={calibrate}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                title="Recalibrate Baseline"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center backdrop-blur-md transition-all duration-300 border ${
          isActive 
            ? `bg-gray-900 border ${getStatusStyles().split(' ')[1]}`
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
        } ${isActive && !isExpanded ? getStatusStyles().split(' ')[2] : ''}`}
      >
        <Activity className={`w-5 h-5 ${isActive ? getStatusStyles().split(' ')[0] : ''}`} />
      </button>

    </div>
  );
};
