import { useState, useCallback, useRef } from 'react';

let alertIdCounter = 0;

/**
 * usePostureAlerts
 * Manages a queue of posture notification alerts.
 * Provides addAlert / dismissAlert — consumed by ErgonomicsContext.
 */
export const usePostureAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const timersRef = useRef({});

  const dismissAlert = useCallback((id) => {
    // Mark as exiting so CSS transition plays before removal
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, exiting: true } : a))
    );
    // Remove from DOM after transition (300ms)
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 320);

    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addAlert = useCallback(
    ({ type = 'info', title, message, duration = 6000 }) => {
      // Deduplicate: if same type is already visible, don't stack
      setAlerts((prev) => {
        const alreadyExists = prev.some((a) => a.type === type && !a.exiting);
        if (alreadyExists) {
          // Refresh the existing one instead
          return prev.map((a) =>
            a.type === type && !a.exiting
              ? { ...a, title, message, createdAt: Date.now() }
              : a
          );
        }

        const id = ++alertIdCounter;
        const newAlert = { id, type, title, message, exiting: false, createdAt: Date.now(), duration };

        // Schedule auto-dismiss
        timersRef.current[id] = setTimeout(() => dismissAlert(id), duration);

        return [...prev, newAlert];
      });
    },
    [dismissAlert]
  );

  return { alerts, addAlert, dismissAlert };
};
