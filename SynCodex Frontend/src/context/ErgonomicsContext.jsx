import React, { createContext, useContext, useRef } from 'react';
import { usePostureEngine } from '../hooks/usePostureDetection';
import { usePostureAlerts } from '../hooks/usePostureAlerts';
import { PostureAlertContainer } from '../components/PostureAlertContainer';

const ErgonomicsContext = createContext(null);

export const useErgonomics = () => {
  const ctx = useContext(ErgonomicsContext);
  if (!ctx) throw new Error('useErgonomics must be used inside <ErgonomicsProvider>');
  return ctx;
};

/**
 * ErgonomicsProvider
 *
 * Architecture:
 * - Owns the persistent hidden <video> and <canvas> elements (always in DOM)
 * - Owns the alert queue via usePostureAlerts
 * - Passes addAlert down to the engine so it fires regardless of widget state
 * - Renders the <PostureAlertContainer> fixed top-right (non-blocking)
 */
export const ErgonomicsProvider = ({ children }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  // Alert queue — managed at provider level so alerts survive widget close
  const { alerts, addAlert, dismissAlert } = usePostureAlerts();

  // Engine receives addAlert so it never calls toast directly
  const engine = usePostureEngine(videoRef, canvasRef, addAlert);

  return (
    <ErgonomicsContext.Provider value={{ ...engine, videoRef, canvasRef }}>
      {children}

      {/* ── Non-blocking Alert Stack (top-right, below IDE nav) ─────────── */}
      <PostureAlertContainer alerts={alerts} onDismiss={dismissAlert} />

      {/* ── Persistent Media Layer (always mounted, visually hidden) ─────── */}
      <div
        aria-hidden="true"
        style={{
          position:      'fixed',
          width:         0,
          height:        0,
          overflow:      'hidden',
          visibility:    'hidden',
          pointerEvents: 'none',
          zIndex:        -1,
        }}
      >
        <video ref={videoRef} autoPlay playsInline muted width={320} height={240} />
        <canvas ref={canvasRef} width={320} height={240} />
      </div>
    </ErgonomicsContext.Provider>
  );
};
