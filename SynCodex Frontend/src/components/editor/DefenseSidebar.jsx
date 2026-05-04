// Defense Sidebar Component - SecureSphere
// src/components/editor/DefenseSidebar.jsx

import React, { useState, useCallback } from 'react';
import { useSecurity } from '../../context/SecurityContext';

function getSeverityColor(severity) {
  const colors = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    INFO: '#06b6d4',
  };
  return colors[severity] || '#666666';
}

function getRatingText(score) {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'WARNING';
  return 'CRITICAL';
}

function getScoreColor(score) {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

export function DefenseSidebar() {
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

  const [selectedVuln, setSelectedVuln] = useState(null);

  const handleToggle = useCallback(() => {
    if (isEnabled) {
      disableAnalysis();
    } else {
      enableAnalysis();
    }
  }, [isEnabled, enableAnalysis, disableAnalysis]);

  const breakdown = {
    critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
    high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
    medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
    low: vulnerabilities.filter(v => v.severity === 'LOW').length,
  };

  const color = getScoreColor(defenseScore);
  const rating = getRatingText(defenseScore);

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
        maxWidth: '350px',
        fontSize: '13px',
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f4f4f5', margin: 0 }}>
          🛡️ SecureSphere
        </h2>
        <p style={{ fontSize: '11px', color: '#a1a1a1', margin: '4px 0 0 0' }}>
          AI Bug Detection
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#7f1d1d',
            borderRadius: '6px',
            color: '#fecaca',
            fontSize: '11px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Defense Score Gauge */}
      {!error && (
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
          {/* Score Circle */}
          <div style={{ position: 'relative', width: '96px', height: '96px' }}>
            <svg width={96} height={96} style={{ position: 'absolute' }}>
              <circle cx={48} cy={48} r={40} fill='none' stroke='#3f3f46' strokeWidth={2} />
            </svg>
            <svg width={96} height={96} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle
                cx={48}
                cy={48}
                r={40}
                fill='none'
                stroke={color}
                strokeWidth={3}
                strokeDasharray={`${(defenseScore / 100) * 251.2} 251.2`}
                strokeLinecap='round'
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>
                {Math.round(defenseScore)}
              </div>
              <div style={{ fontSize: '10px', color: '#a1a1a1' }}>/ 100</div>
            </div>
          </div>

          {/* Rating */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 'semibold', color, marginBottom: '4px' }}>
              {rating}
            </div>
            <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>Security Rating</p>
          </div>

          {/* Analyzing */}
          {isAnalyzing && <div style={{ fontSize: '12px', color: '#f59e0b' }}>🔄 Analyzing...</div>}
        </div>
      )}

      {/* Vulnerability Breakdown */}
      {vulnerabilities.length > 0 && (
        <div style={{ padding: '12px', backgroundColor: '#27272a', borderRadius: '6px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 'semibold', marginBottom: '8px', color: '#d4d4d8', margin: 0 }}>
            Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            {breakdown.critical > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                <span>🔴 Critical:</span>
                <span style={{ fontWeight: 'bold' }}>{breakdown.critical}</span>
              </div>
            )}
            {breakdown.high > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f97316' }}>
                <span>🟠 High:</span>
                <span style={{ fontWeight: 'bold' }}>{breakdown.high}</span>
              </div>
            )}
            {breakdown.medium > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#eab308' }}>
                <span>🟡 Medium:</span>
                <span style={{ fontWeight: 'bold' }}>{breakdown.medium}</span>
              </div>
            )}
            {breakdown.low > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3b82f6' }}>
                <span>🔵 Low:</span>
                <span style={{ fontWeight: 'bold' }}>{breakdown.low}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleToggle}
          style={{
            padding: '10px',
            backgroundColor: isEnabled ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'semibold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => e.target.style.opacity = '0.9'}
          onMouseLeave={e => e.target.style.opacity = '1'}
        >
          {isEnabled ? '✓ Analysis: ON' : '✗ Analysis: OFF'}
        </button>
        {vulnerabilities.length > 0 && (
          <button
            onClick={clearResults}
            style={{
              padding: '10px',
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
        )}
      </div>

      {/* Vulnerabilities List */}
      <div>
        <h3 style={{ fontSize: '12px', fontWeight: 'semibold', marginBottom: '8px', color: '#d4d4d8', margin: '0 0 8px 0' }}>
          Issues Found ({vulnerabilities.length})
        </h3>
        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {vulnerabilities.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#a1a1a1', fontSize: '12px' }}>
              ✓ No issues found
            </div>
          ) : (
            vulnerabilities.map(vuln => (
              <button
                key={vuln.id}
                onClick={() => setSelectedVuln(vuln)}
                style={{
                  padding: '10px',
                  backgroundColor: '#27272a',
                  border: `1px solid ${getSeverityColor(vuln.severity)}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '11px',
                  color: '#d4d4d8',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.target.style.backgroundColor = '#3f3f46'}
                onMouseLeave={e => e.target.style.backgroundColor = '#27272a'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getSeverityColor(vuln.severity),
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'semibold' }}>{vuln.type}</div>
                    <div style={{ color: '#a1a1a1', marginTop: '2px' }}>{vuln.title}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DefenseSidebar;
