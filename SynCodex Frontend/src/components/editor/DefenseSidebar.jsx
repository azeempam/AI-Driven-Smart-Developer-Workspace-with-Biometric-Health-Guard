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
    <aside className="editor-defense-sidebar">
      <div className="editor-defense-header">
        <div>
          <div className="editor-defense-kicker">SecureSphere</div>
          <h2 className="editor-defense-title">Security Scan</h2>
        </div>
        <div className="editor-defense-score" style={{ borderColor: `${color}55`, color }}>
          {Math.round(defenseScore)}
        </div>
      </div>

      {error && (
        <div className="editor-defense-alert">
          {error}
        </div>
      )}

      {!error && (
        <div className="editor-defense-card editor-defense-gauge">
          <div className="editor-defense-ring" style={{ borderColor: `${color}55` }}>
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
            <div className="editor-defense-ring-value">
              <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>
                {Math.round(defenseScore)}
              </div>
              <div style={{ fontSize: '10px', color: '#a1a1a1' }}>/ 100</div>
            </div>
          </div>

          <div className="editor-defense-rating-wrap" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 'semibold', color, marginBottom: '4px' }}>
              {rating}
            </div>
            <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>Security Rating</p>
          </div>

          {isAnalyzing && <div style={{ fontSize: '12px', color: '#f59e0b' }}>Analyzing...</div>}
        </div>
      )}

      {vulnerabilities.length > 0 && (
        <div className="editor-defense-card">
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
    </aside>
  );
}

export default DefenseSidebar;
