// DEBUGGED: Security Context with Error Boundary & Lifecycle Management
// File: src/context/SecurityContextCorrected.tsx
//
// ✅ FIXES APPLIED:
// 1. Proper React lifecycle with useEffect cleanup
// 2. Error boundary pattern
// 3. Safe state management (no dangling listeners)
// 4. Optional toggle for enabling/disabling analysis
// 5. Memory leak prevention
// 6. Type safety

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { Vulnerability, AnalysisResult } from '../services/bugSynthesis/types';
import {
  getBugSynthesisService,
  disposeBugSynthesisService,
  BugSynthesisServiceFixed,
} from '../services/bugSynthesis/BugSynthesisServiceCorrected';

//============================================================================
// TYPE DEFINITIONS
//============================================================================

interface SecurityContextType {
  // State
  analysisResult: AnalysisResult | null;
  vulnerabilities: Vulnerability[];
  defenseScore: number;
  isAnalyzing: boolean;
  isEnabled: boolean;
  error: string | null;

  // Controls
  enableAnalysis: () => void;
  disableAnalysis: () => void;
  analyzeCode: (code: string) => Promise<void>;
  clearResults: () => void;
}

//============================================================================
// ERROR BOUNDARY IMPLEMENTATION
//============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SecurityErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[SecurityErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '4px',
          marginBottom: '16px',
        }}>
          <strong>Security Analysis Error:</strong>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 12px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
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

//============================================================================
// CONTEXT CREATION
//============================================================================

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

//============================================================================
// PROVIDER IMPLEMENTATION
//============================================================================

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  // Service reference (stable across renders)
  const serviceRef = useRef<BugSynthesisServiceFixed | null>(null);

  // State
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [defenseScore, setDefenseScore] = useState<number>(100);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  /**
   * Initialize service on mount
   * ✅ FIXES:
   * - Singleton pattern to avoid multiple instances
   * - Try-catch for initialization errors
   * - Proper cleanup on unmount
   */
  useEffect(() => {
    console.log('[SecurityProvider] Mounting');

    try {
      serviceRef.current = getBugSynthesisService();

      // Check if service initialized correctly
      if (!serviceRef.current?.isHealthy()) {
        const initError = serviceRef.current?.getInitError();
        console.warn('[SecurityProvider] Service not healthy:', initError?.message);
        setError(`Service initialization failed: ${initError?.message}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SecurityProvider] Service initialization error:', message);
      setError(message);
    }

    return () => {
      console.log('[SecurityProvider] Unmounting');
      isMountedRef.current = false;

      // Cleanup
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      disposeBugSynthesisService();
      serviceRef.current = null;
    };
  }, []);

  /**
   * Enable analysis
   */
  const enableAnalysis = useCallback(() => {
    console.log('[SecurityProvider] Analysis enabled');
    setIsEnabled(true);
    setError(null);
  }, []);

  /**
   * Disable analysis
   */
  const disableAnalysis = useCallback(() => {
    console.log('[SecurityProvider] Analysis disabled');
    setIsEnabled(false);

    // Cleanup pending analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsAnalyzing(false);
  }, []);

  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setAnalysisResult(null);
    setVulnerabilities([]);
    setDefenseScore(100);
    setError(null);
  }, []);

  /**
   * Main analysis function
   * ✅ FIXES:
   * - Guard: Check if enabled
   * - Guard: Check if service exists
   * - Debounce to prevent excessive analysis
   * - Try-catch with proper error handling
   * - Cleanup function references
   * - Only update state if mounted
   */
  const analyzeCode = useCallback(
    async (code: string) => {
      // Guard: Not enabled
      if (!isEnabled) {
        return;
      }

      // Guard: No service
      if (!serviceRef.current) {
        console.error('[SecurityProvider] Service not available');
        setError('Analysis service not available');
        return;
      }

      // Guard: Code is empty
      if (!code || code.trim().length === 0) {
        setVulnerabilities([]);
        setDefenseScore(100);
        return;
      }

      // Clear previous error
      setError(null);

      // Clear pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce: Wait 500ms before analyzing
      debounceTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;

        setIsAnalyzing(true);

        try {
          const result = await serviceRef.current!.analyze({
            fileId: 'editor',
            fileName: 'current.js',
            language: 'javascript',
            code,
          });

          // Only update if component still mounted
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
      }, 500); // 500ms debounce

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
      };
    },
    [isEnabled]
  );

  const value: SecurityContextType = {
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
};

//============================================================================
// HOOK FOR CONSUMING CONTEXT
//============================================================================

/**
 * Hook to use security context
 * ✅ FIXES:
 * - Proper error message if used outside provider
 * - Type safety
 */
export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);

  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }

  return context;
};

export { SecurityErrorBoundary };
export default SecurityContext;
