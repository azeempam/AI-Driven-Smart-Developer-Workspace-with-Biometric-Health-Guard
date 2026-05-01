/**
 * PostureAlertNotification.jsx
 * 
 * Subtle, effective notification system for poor posture detection
 * ─────────────────────────────────────────────────────────────
 * 
 * Features:
 * ✓ Friendly, non-intrusive warning banner
 * ✓ Animated entrance/exit
 * ✓ Action buttons: Dismiss, Take a break
 * ✓ Integrated with dark IDE theme
 * ✓ Auto-hide after 8 seconds
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Eye, Coffee } from 'lucide-react';

const PostureAlertNotification = ({
  isVisible = false,
  onDismiss = () => {},
  onTakeBreak = () => {},
}) => {
  const [isShowing, setIsShowing] = useState(isVisible);

  useEffect(() => {
    setIsShowing(isVisible);

    if (isVisible) {
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setIsShowing(false);
        onDismiss();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  if (!isShowing) return null;

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
      {/* Backdrop blur container */}
      <div
        className={`backdrop-blur-md bg-gray-950/90 border border-amber-700/50 rounded-lg shadow-2xl pointer-events-auto overflow-hidden transition-all duration-300 ${
          isShowing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Alert content */}
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-amber-300">
                Posture Alert: Sustained Poor Posture Detected
              </h3>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                You've been in poor posture for over 5 minutes. Your neck, shoulders, and
                back are under strain. Consider adjusting your position or taking a short
                break to stretch.
              </p>
            </div>
            <button
              onClick={() => {
                setIsShowing(false);
                onDismiss();
              }}
              className="flex-shrink-0 p-1 rounded hover:bg-amber-700/20 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-amber-300" />
            </button>
          </div>

          {/* Quick tips */}
          <div className="ml-8 text-xs text-amber-200/70 space-y-1">
            <p>💡 Try these adjustments:</p>
            <ul className="list-disc list-inside space-y-0.5 pl-0">
              <li>Pull shoulders back and down</li>
              <li>Align ears over shoulders</li>
              <li>Monitor neck angle (85-95° is ideal)</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 ml-8 pt-2">
            <button
              onClick={() => {
                setIsShowing(false);
                onDismiss();
              }}
              className="flex-1 px-3 py-2 rounded text-xs font-semibold bg-amber-700/20 text-amber-300 hover:bg-amber-700/40 border border-amber-700/30 transition-all"
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Adjust Now
            </button>
            <button
              onClick={() => {
                setIsShowing(false);
                onTakeBreak();
              }}
              className="flex-1 px-3 py-2 rounded text-xs font-semibold bg-green-700/20 text-green-300 hover:bg-green-700/40 border border-green-700/30 transition-all"
            >
              <Coffee className="w-3 h-3 inline mr-1" />
              Break (5 min)
            </button>
          </div>
        </div>

        {/* Animated progress bar (disappears in 8s) */}
        <div className="h-1 bg-amber-900/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse"
            style={{
              animation: 'shrink 8s linear forwards',
            }}
          />
        </div>
      </div>

      {/* CSS animation for progress bar */}
      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default PostureAlertNotification;
