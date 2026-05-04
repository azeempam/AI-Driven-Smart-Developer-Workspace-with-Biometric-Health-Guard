import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, ShieldCheck } from 'lucide-react';

// ─── Per-type visual config ───────────────────────────────────────────────────
const ALERT_CONFIG = {
  warning: {
    icon:        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />,
    bar:         'bg-amber-500',
    border:      'border-amber-500/30',
    glow:        'shadow-[0_4px_24px_rgba(245,158,11,0.15)]',
    iconBg:      'bg-amber-500/10',
    titleColor:  'text-amber-300',
    label:       'Posture Warning',
  },
  error: {
    icon:        <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />,
    bar:         'bg-red-500',
    border:      'border-red-500/30',
    glow:        'shadow-[0_4px_24px_rgba(239,68,68,0.15)]',
    iconBg:      'bg-red-500/10',
    titleColor:  'text-red-300',
    label:       'Poor Posture',
  },
  success: {
    icon:        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />,
    bar:         'bg-emerald-500',
    border:      'border-emerald-500/30',
    glow:        'shadow-[0_4px_24px_rgba(16,185,129,0.12)]',
    iconBg:      'bg-emerald-500/10',
    titleColor:  'text-emerald-300',
    label:       'Posture Restored',
  },
  info: {
    icon:        <Info className="w-4 h-4 shrink-0 text-blue-400" />,
    bar:         'bg-blue-500',
    border:      'border-blue-500/30',
    glow:        'shadow-[0_4px_24px_rgba(59,130,246,0.12)]',
    iconBg:      'bg-blue-500/10',
    titleColor:  'text-blue-300',
    label:       'Info',
  },
};

// ─── Progress bar that drains over `duration` ms ─────────────────────────────
const ProgressBar = ({ duration, color, paused }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden rounded-b-xl">
      <div
        className={`h-full ${color} origin-left`}
        style={{
          animation: `drainBar ${duration}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  );
};

// ─── Single Alert Card ────────────────────────────────────────────────────────
const AlertCard = ({ alert, onDismiss }) => {
  const cfg      = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.info;
  const [paused, setPaused] = useState(false);

  // Trigger enter animation after mount
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const slideStyle = {
    transition:  'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
    transform:   alert.exiting ? 'translateX(110%)' : visible ? 'translateX(0)' : 'translateX(110%)',
    opacity:     alert.exiting ? 0 : visible ? 1 : 0,
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={slideStyle}
      className={`
        relative w-full overflow-hidden
        rounded-xl border ${cfg.border} ${cfg.glow}
        bg-[rgba(10,13,22,0.90)] backdrop-blur-md
      `}
    >
      {/* Card body */}
      <div className="flex items-start gap-3 px-4 py-3 pr-10">
        {/* Icon bubble */}
        <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.iconBg} shrink-0`}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
              SynCodex Posture
            </span>
          </div>
          <p className={`text-sm font-semibold leading-snug ${cfg.titleColor}`}>
            {alert.title ?? cfg.label}
          </p>
          {alert.message && (
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {alert.message}
            </p>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(alert.id)}
        aria-label="Dismiss alert"
        className="absolute top-2.5 right-2.5 p-1 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Auto-dismiss progress bar */}
      <ProgressBar
        duration={alert.duration ?? 6000}
        color={cfg.bar}
        paused={paused}
      />
    </div>
  );
};

// ─── Alert Container — fixed top-right, below IDE nav ────────────────────────
export const PostureAlertContainer = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <>
      {/* Inject keyframe for drain animation via a <style> tag */}
      <style>{`
        @keyframes drainBar {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      {/*
        Position: fixed, top-right, below 64px nav bar.
        Width: 360px on desktop, 90vw on mobile.
        z-index: 9998 — above editor, below modals.
      */}
      <div
        aria-label="Posture notification stack"
        style={{ top: '72px', right: '24px', zIndex: 9998 }}
        className="fixed flex flex-col gap-2.5 w-[360px] max-w-[90vw] pointer-events-none"
      >
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertCard alert={alert} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </>
  );
};
