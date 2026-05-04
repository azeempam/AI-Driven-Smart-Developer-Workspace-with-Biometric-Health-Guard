// DEBUGGED: Defense Score Sidebar Component with Fallbacks
// File: src/components/SecureSphere/DefenseSidebarCorrected.tsx
//
// ✅ FIXES APPLIED:
// 1. Safe conditional rendering
// 2. Error state handling
// 3. Loading states
// 4. Fallback UI if service fails
// 5. Proper component composition

import React, { useCallback, useState } from 'react';
import { useSecurity } from '../../context/SecurityContextCorrected';
import { SeverityLevel, Vulnerability } from '../../services/bugSynthesis/types';

//============================================================================
// TYPE DEFINITIONS
//============================================================================

interface DefenseSidebarProps {
  onVulnerabilitySelect?: (vuln: Vulnerability) => void;
}

//============================================================================
// HELPER FUNCTIONS
//============================================================================

/**
 * Get color for score
 */
function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // amber
  if (score >= 50) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get rating text
 */
function getRatingText(score: number): string {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Get rating icon
 */
function getRatingIcon(score: number): string {
  if (score >= 90) return '✓';
  if (score >= 70) return '◐';
  if (score >= 50) return '!';
  return '⚠';
}

//============================================================================
// COMPONENTS
//============================================================================

/**
 * Loading skeleton
 */
const DefenseScoreSkeleton: React.FC = () => (
  <div
    style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      opacity: 0.6,
    }}
  >
    <div
      style={{
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        backgroundColor: '#3f3f46',
        margin: '0 auto',
      }}
    />
    <div style={{ height: '8px', backgroundColor: '#3f3f46', borderRadius: '4px' }} />
    <div style={{ height: '8px', backgroundColor: '#3f3f46', borderRadius: '4px' }} />
  </div>
);

/**
 * Error fallback UI
 */
const DefenseScoreError: React.FC<{ error: string | null; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: '#7f1d1d',
      borderRadius: '8px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚠️</div>
    <p style={{ fontSize: '12px', marginBottom: '12px', color: '#fecaca' }}>
      {error || 'Analysis service unavailable'}
    </p>
    <button
      onClick={onRetry}
      style={{
        padding: '6px 12px',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

/**
 * Main Defense Score Display
 */
const DefenseScoreGauge: React.FC<{ score: number; isAnalyzing: boolean }> = ({
  score,
  isAnalyzing,
}) => {
  const color = getScoreColor(score);
  const rating = getRatingText(score);
  const icon = getRatingIcon(score);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#27272a',
        borderRadius: '8px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* Score Gauge */}
      <div
        style={{
          position: 'relative',
          width: '96px',
          height: '96px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background circle */}
        <svg width={96} height={96} style={{ position: 'absolute' }}>
          <circle
            cx={48}
            cy={48}
            r={40}
            fill='none'
            stroke='#3f3f46'
            strokeWidth={2}
          />
        </svg>

        {/* Progress circle */}
        <svg width={96} height={96} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle
            cx={48}
            cy={48}
            r={40}
            fill='none'
            stroke={color}
            strokeWidth={3}
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            strokeLinecap='round'
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        </svg>

        {/* Inner content */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color,
            }}
          >
            {Math.round(score)}
          </div>
          <div style={{ fontSize: '10px', color: '#a1a1a1' }}>/ 100</div>
        </div>
      </div>

      {/* Rating */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '18px', color }} title='Rating icon'>
            {icon}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 'semibold',
              color,
            }}
          >
            {rating}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#737373' }}>Security Rating</p>
      </div>

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <div style={{ fontSize: '12px', color: '#f59e0b' }}>🔄 Analyzing...</div>
      )}
    </div>
  );
};

/**
 * Vulnerability breakdown
 */
const VulnerabilityBreakdown: React.FC<{ vulnerabilities: Vulnerability[] }> = ({
  vulnerabilities,
}) => {
  const breakdown = {
    critical: vulnerabilities.filter(v => v.severity === SeverityLevel.CRITICAL).length,
    high: vulnerabilities.filter(v => v.severity === SeverityLevel.HIGH).length,
    medium: vulnerabilities.filter(v => v.severity === SeverityLevel.MEDIUM).length,
    low: vulnerabilities.filter(v => v.severity === SeverityLevel.LOW).length,
    info: vulnerabilities.filter(v => v.severity === SeverityLevel.INFO).length,
  };

  return (
    <div style={{ padding: '12px', backgroundColor: '#27272a', borderRadius: '6px' }}>
      <h4 style={{ fontSize: '12px', fontWeight: 'semibold', marginBottom: '8px', color: '#d4d4d8' }}>
        Breakdown
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ef4444' }}>🔴 Critical:</span>
          <span style={{ fontWeight: 'bold' }}>{breakdown.critical}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#f97316' }}>🟠 High:</span>
          <span style={{ fontWeight: 'bold' }}>{breakdown.high}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#eab308' }}>🟡 Medium:</span>
          <span style={{ fontWeight: 'bold' }}>{breakdown.medium}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#3b82f6' }}>🔵 Low:</span>
          <span style={{ fontWeight: 'bold' }}>{breakdown.low}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Vulnerabilities list
 */
const VulnerabilityList: React.FC<{
  vulnerabilities: Vulnerability[];
  onSelect?: (vuln: Vulnerability) => void;
}> = ({ vulnerabilities, onSelect }) => {
  if (vulnerabilities.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#a1a1a1',
        }}
      >
        ✓ No vulnerabilities found
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {vulnerabilities.map(vuln => (
        <button
          key={vuln.id}
          onClick={() => onSelect?.(vuln)}
          style={{
            padding: '8px',
            backgroundColor: '#27272a',
            border: `1px solid ${getScoreColor(100 - (vuln.confidence as number) * 100)}`,
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '11px',
            color: '#d4d4d8',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3f3f46')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#27272a')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: getScoreColor(100 - (vuln.confidence as number) * 100),
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'semibold' }}>{vuln.type}</div>
              <div style={{ color: '#a1a1a1', marginTop: '2px' }}>L{vuln.range.start.line}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

/**
 * Control buttons
 */
const ControlButtons: React.FC<{ onClear: () => void; isEnabled: boolean; onToggle: () => void }> = ({
  onClear,
  isEnabled,
  onToggle,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <button
      onClick={onToggle}
      style={{
        padding: '8px',
        backgroundColor: isEnabled ? '#10b981' : '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'semibold',
        cursor: 'pointer',
      }}
    >
      {isEnabled ? '🛡️ Analysis: ON' : '🛡️ Analysis: OFF'}
    </button>
    <button
      onClick={onClear}
      style={{
        padding: '8px',
        backgroundColor: '#3f3f46',
        color: '#d4d4d8',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      Clear Results
    </button>
  </div>
);

//============================================================================
// MAIN SIDEBAR COMPONENT
//============================================================================

export const DefenseSidebar: React.FC<DefenseSidebarProps> = ({ onVulnerabilitySelect }) => {
  const {
    defenseScore,
    vulnerabilities,
    isAnalyzing,
    error,
    isEnabled,
    enableAnalysis,
    disableAnalysis,
    clearResults,
  } = useSecurity();

  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);

  const handleToggle = useCallback(() => {
    if (isEnabled) {
      disableAnalysis();
    } else {
      enableAnalysis();
    }
  }, [isEnabled, enableAnalysis, disableAnalysis]);

  const handleSelectVuln = useCallback(
    (vuln: Vulnerability) => {
      setSelectedVuln(vuln);
      onVulnerabilitySelect?.(vuln);
    },
    [onVulnerabilitySelect]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#18181b',
        borderLeft: '1px solid #3f3f46',
        padding: '16px',
        gap: '16px',
        overflowY: 'auto',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f4f4f5', margin: 0 }}>
          SecureSphere
        </h2>
        <p style={{ fontSize: '11px', color: '#a1a1a1', margin: '4px 0 0 0' }}>
          AI Bug Synthesis Engine
        </p>
      </div>

      {/* Defense Score */}
      {error && <DefenseScoreError error={error} onRetry={() => clearResults()} />}

      {!error && !defenseScore && isAnalyzing ? (
        <DefenseScoreSkeleton />
      ) : (
        defenseScore !== null && (
          <DefenseScoreGauge score={defenseScore} isAnalyzing={isAnalyzing} />
        )
      )}

      {/* Breakdown */}
      {vulnerabilities.length > 0 && (
        <VulnerabilityBreakdown vulnerabilities={vulnerabilities} />
      )}

      {/* Controls */}
      <ControlButtons
        isEnabled={isEnabled}
        onToggle={handleToggle}
        onClear={clearResults}
      />

      {/* Vulnerabilities */}
      <div>
        <h3 style={{ fontSize: '12px', fontWeight: 'semibold', marginBottom: '8px', color: '#d4d4d8' }}>
          Issues Found ({vulnerabilities.length})
        </h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <VulnerabilityList
            vulnerabilities={vulnerabilities}
            onSelect={handleSelectVuln}
          />
        </div>
      </div>
    </div>
  );
};

export default DefenseSidebar;
