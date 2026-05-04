// Security Context Provider - Simplified for SynCodex
// src/context/SecurityContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getBugSynthesisService,
  disposeBugSynthesisService,
} from '../services/bugSynthesis/BugSynthesisServiceCorrected';

// Create context
const SecurityContext = createContext(null);

// Error Boundary Component
class SecurityErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SecurityErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '12px',
        }}>
          <strong>Security Engine Error:</strong>
          <p style={{ margin: '4px 0' }}>{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '4px 8px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Provider Component
export function SecurityProvider({ children }) {
  const serviceRef = useRef(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [defenseScore, setDefenseScore] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef(null);

  // Initialize service
  useEffect(() => {
    console.log('[SecurityProvider] Mounting');
    try {
      serviceRef.current = getBugSynthesisService();
      if (!serviceRef.current?.isHealthy()) {
        const initError = serviceRef.current?.getInitError();
        console.warn('[SecurityProvider] Service not healthy:', initError?.message);
      }
    } catch (err) {
      console.error('[SecurityProvider] Service init error:', err.message);
      setError(err.message);
    }

    return () => {
      console.log('[SecurityProvider] Unmounting');
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      disposeBugSynthesisService();
      serviceRef.current = null;
    };
  }, []);

  const enableAnalysis = useCallback(() => {
    console.log('[SecurityProvider] Analysis enabled');
    setIsEnabled(true);
    setError(null);
  }, []);

  const disableAnalysis = useCallback(() => {
    console.log('[SecurityProvider] Analysis disabled');
    setIsEnabled(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  const clearResults = useCallback(() => {
    setAnalysisResult(null);
    setVulnerabilities([]);
    setDefenseScore(100);
    setError(null);
  }, []);

  const analyzeCode = useCallback(async (code, fileName = 'current.js', language = 'javascript') => {
    if (!isEnabled) return;
    if (!serviceRef.current) {
      console.error('[SecurityProvider] Service not available');
      setError('Analysis service not available');
      return;
    }
    if (!code || code.trim().length === 0) {
      setVulnerabilities([]);
      setDefenseScore(100);
      return;
    }

    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      setIsAnalyzing(true);

      try {
        const result = await serviceRef.current.analyze({
          fileId: 'editor',
          fileName: fileName,
          language: language,
          code,
        });

        if (isMountedRef.current) {
          setAnalysisResult(result);
          setVulnerabilities(result.vulnerabilities);
          setDefenseScore(result.defenseScore);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        console.error('[SecurityProvider] Analysis error:', message);
        if (isMountedRef.current) {
          setError(message);
          setVulnerabilities([]);
          setDefenseScore(100);
        }
      } finally {
        if (isMountedRef.current) {
          setIsAnalyzing(false);
        }
      }
    }, 500);
  }, [isEnabled]);

  const value = {
    analysisResult,
    vulnerabilities,
    defenseScore,
    isAnalyzing,
    isEnabled,
    error,
    enableAnalysis,
    disableAnalysis,
    analyzeCode,
    clearResults,
  };

  return (
    <SecurityErrorBoundary>
      <SecurityContext.Provider value={value}>
        {children}
      </SecurityContext.Provider>
    </SecurityErrorBoundary>
  );
}

// Hook to use context
export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }
  return context;
}

export default SecurityContext;
