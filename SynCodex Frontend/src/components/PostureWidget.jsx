import React, { useState, useEffect, useRef } from 'react';
import { useErgonomics } from '../context/ErgonomicsContext';
import {
  Activity, Camera, CameraOff, RefreshCw,
  AlertTriangle, ShieldCheck, Bug, Loader2,
  CheckCircle2, PauseCircle, PlayCircle, X,
} from 'lucide-react';

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusPill = ({ detectionStatus }) => {
  const config = {
    idle:    { icon: <CameraOff className="w-3 h-3" />,                     label: 'Offline',          cls: 'bg-gray-700/80 text-gray-400' },
    loading: { icon: <Loader2 className="w-3 h-3 animate-spin" />,          label: 'Initializing…',    cls: 'bg-blue-500/20 text-blue-400' },
    ready:   { icon: <CheckCircle2 className="w-3 h-3" />,                  label: 'Analyzing Active', cls: 'bg-emerald-500/20 text-emerald-400' },
    paused:  { icon: <PauseCircle className="w-3 h-3" />,                   label: 'Paused',           cls: 'bg-amber-500/20 text-amber-400' },
    error:   { icon: <AlertTriangle className="w-3 h-3" />,                 label: 'Error',            cls: 'bg-red-500/20 text-red-400' },
  };
  const s = config[detectionStatus] ?? config.idle;
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/5 ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
};

const ScoreArc = ({ score, postureStatus }) => {
  const R   = 30;
  const circ = 2 * Math.PI * R;
  const colorMap = { Good: '#10b981', Warning: '#f59e0b', Poor: '#ef4444' };
  const color = colorMap[postureStatus] ?? '#10b981';
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="#1f2937" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={R} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className="text-2xl font-bold text-white tabular-nums">{score}</span>
        <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color }}>{postureStatus}</span>
      </div>
    </div>
  );
};

// ─── Live Camera Preview ──────────────────────────────────────────────────────
// Renders a second <video> element synced to the same MediaStream from the
// always-alive hidden video. Widget collapse doesn't affect the background stream.
const LivePreview = ({ videoRef, canvasRef, debugMode }) => {
  const previewRef = useRef(null);

  useEffect(() => {
    const sourceVideo = videoRef?.current;
    const previewVideo = previewRef?.current;
    if (!sourceVideo || !previewVideo) return;

    // Sync srcObject whenever the source stream changes
    const syncStream = () => {
      if (previewVideo.srcObject !== sourceVideo.srcObject) {
        previewVideo.srcObject = sourceVideo.srcObject;
        if (sourceVideo.srcObject) previewVideo.play().catch(() => {});
      }
    };

    syncStream();
    // Poll every 500ms to catch stream start/stop events
    const interval = setInterval(syncStream, 500);
    return () => clearInterval(interval);
  }, [videoRef]);

  return (
    <div className="relative w-full aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800 group">
      <video
        ref={previewRef}
        autoPlay playsInline muted
        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
      />
      {debugMode && (
        <canvas
          ref={canvasRef}  // shared canvas from provider — draws landmarks here
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'cover' }}
        />
      )}
      <div className="absolute top-2 right-2">
        <span className="text-[9px] bg-black/60 text-gray-400 px-1.5 py-0.5 rounded-full">
          Local · Private
        </span>
      </div>
    </div>
  );
};

// ─── Main Widget ──────────────────────────────────────────────────────────────
export const PostureWidget = () => {
  const {
    detectionStatus,
    errorMessage,
    postureScore,
    postureStatus,
    baselineSet,
    debugMode,
    setDebugMode,
    videoRef,
    canvasRef,
    toggleTracking,
    togglePause,
    calibrate,
  } = useErgonomics();

  const [isOpen, setIsOpen] = useState(false);

  const isReady   = detectionStatus === 'ready';
  const isPaused  = detectionStatus === 'paused';
  const isLoading = detectionStatus === 'loading';
  const isError   = detectionStatus === 'error';
  const isRunning = isReady || isPaused;

  const pc = {
    Good:    { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', fab: 'border-emerald-500/40 shadow-[0_0_22px_rgba(16,185,129,0.2)]' },
    Warning: { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   fab: 'border-amber-500/40 shadow-[0_0_22px_rgba(245,158,11,0.2)]' },
    Poor:    { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     fab: 'border-red-500/40 shadow-[0_0_22px_rgba(239,68,68,0.2)]' },
  }[postureStatus] ?? { text: 'text-emerald-400', bg: '', border: 'border-gray-700', fab: 'border-gray-700' };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Expanded Panel ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={`w-80 rounded-2xl border overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${isRunning ? pc.border : 'border-gray-700'}`}
          style={{ background: 'rgba(9,11,19,0.94)', backdropFilter: 'blur(24px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-gray-100 font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Posture Assistant
            </h3>
            <div className="flex items-center gap-2">
              <StatusPill detectionStatus={detectionStatus} />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Preview Area */}
          <div className="px-4 pt-4">
            {isRunning ? (
              <LivePreview videoRef={videoRef} canvasRef={canvasRef} debugMode={debugMode} />
            ) : isLoading ? (
              <div className="aspect-video bg-gray-950 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <div className="text-center">
                  <p className="text-sm text-gray-300 font-medium">Starting Camera</p>
                  <p className="text-xs text-gray-500 mt-0.5">Model Initializing…</p>
                </div>
              </div>
            ) : isError ? (
              <div className="aspect-video bg-gray-950 rounded-xl border border-red-500/20 flex flex-col items-center justify-center gap-3 px-4 text-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
                <p className="text-xs text-red-300 leading-relaxed">{errorMessage}</p>
              </div>
            ) : (
              <div className="aspect-video bg-gray-950 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-2 text-gray-600">
                <CameraOff className="w-7 h-7" />
                <span className="text-xs">Background monitoring is off</span>
              </div>
            )}
          </div>

          {/* Score + Status */}
          {isReady && baselineSet && (
            <div className="px-4 pt-4 flex items-center gap-4">
              <ScoreArc score={postureScore} postureStatus={postureStatus} />
              <div className={`flex-1 p-3 rounded-xl border ${pc.bg} ${pc.border}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  {postureStatus === 'Good'
                    ? <Activity className={`w-3.5 h-3.5 ${pc.text}`} />
                    : <AlertTriangle className={`w-3.5 h-3.5 ${pc.text}`} />}
                  <span className={`text-sm font-semibold ${pc.text}`}>{postureStatus} Posture</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {postureStatus === 'Good'
                    ? 'Optimal ergonomic alignment.'
                    : 'Adjust your position — sit up straight.'}
                </p>
              </div>
            </div>
          )}

          {isPaused && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
              Analysis paused · Camera still active in background
            </div>
          )}

          {isReady && !baselineSet && (
            <div className="mx-4 mt-4 p-2 text-center text-xs text-gray-500 animate-pulse">
              Calibrating baseline posture…
            </div>
          )}

          {/* ── Controls ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-3 mt-2 border-t border-white/5">

            {/* Start / Stop */}
            <button
              onClick={toggleTracking}
              disabled={isLoading}
              className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                isRunning
                  ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                  : isLoading
                    ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white border-blue-500/50 hover:bg-blue-500'
              }`}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                : isRunning
                  ? <><CameraOff className="w-4 h-4" /> Stop</>
                  : <><Camera className="w-4 h-4" /> Start Monitoring</>}
            </button>

            {/* Pause / Resume — only shown while running */}
            {isRunning && (
              <button
                onClick={togglePause}
                title={isPaused ? 'Resume analysis' : 'Pause analysis (keeps camera active)'}
                className={`p-2 rounded-lg border transition-colors ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              </button>
            )}

            {/* Recalibrate */}
            {isReady && (
              <button
                onClick={calibrate}
                title="Recalibrate baseline posture"
                className="p-2 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Debug skeleton toggle */}
            {isReady && (
              <button
                onClick={() => setDebugMode((v) => !v)}
                title={debugMode ? 'Hide skeleton overlay' : 'Show landmark skeleton (debug)'}
                className={`p-2 rounded-lg border transition-colors ${
                  debugMode
                    ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <Bug className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Background mode notice */}
          {isRunning && !isOpen && (
            <p className="px-4 pb-3 text-[10px] text-gray-600 text-center">
              Monitoring continues in background when closed
            </p>
          )}
          <p className="px-4 pb-3 text-[10px] text-gray-600 text-center">
            {isRunning ? '🔒 Video processed locally · No data leaves your device' : ''}
          </p>
        </div>
      )}

      {/* ── Floating Action Button ──────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        title="Toggle Posture Assistant"
        className={`w-13 h-13 p-3 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border ${
          isReady   ? `bg-gray-900 ${pc.fab}` :
          isPaused  ? 'bg-gray-900 border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.2)]' :
          isError   ? 'bg-gray-900 border-red-500/40' :
          isLoading ? 'bg-gray-900 border-blue-500/40' :
                      'bg-gray-800 border-gray-700 hover:border-gray-500'
        }`}
      >
        {isLoading  ? <Loader2    className="w-5 h-5 text-blue-400 animate-spin" /> :
         isError    ? <AlertTriangle className="w-5 h-5 text-red-400" /> :
         isPaused   ? <PauseCircle className="w-5 h-5 text-amber-400" /> :
                      <Activity   className={`w-5 h-5 ${isReady ? pc.text : 'text-gray-400'}`} />}
      </button>
    </div>
  );
};
