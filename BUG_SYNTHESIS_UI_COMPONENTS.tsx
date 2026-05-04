// SecureSphere UI/UX Integration Guide
// File: src/components/SecureSphere/

import React, { useState, useEffect, useCallback } from 'react';
import { Vulnerability, DefenseScore, PatchSuggestion, SeverityLevel } from '../../services/bugSynthesis/types';

//============================================================================
// 1. DEFENSE SCORE SIDEBAR WIDGET
//============================================================================

/**
 * DefenseSidebar Component
 * Displays the Defense Score with color-coded indicator
 * Dark theme integration: bg-gray-900, text-gray-50
 */
interface DefenseSidebarProps {
  defenseScore: DefenseScore;
  vulnerabilities: Vulnerability[];
  onVulnerabilitySelect: (vulnerability: Vulnerability) => void;
  onApplyPatch: (patch: PatchSuggestion) => void;
}

export const DefenseSidebar: React.FC<DefenseSidebarProps> = ({
  defenseScore,
  vulnerabilities,
  onVulnerabilitySelect,
  onApplyPatch,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const getScoreColor = (): string => {
    if (defenseScore.score >= 90) return '#10b981'; // green-600
    if (defenseScore.score >= 70) return '#f59e0b'; // amber-500
    if (defenseScore.score >= 50) return '#f97316'; // orange-600
    return '#ef4444'; // red-600
  };

  const getRatingIcon = (): string => {
    switch (defenseScore.rating) {
      case 'EXCELLENT':
        return '✓';
      case 'GOOD':
        return '◐';
      case 'WARNING':
        return '!';
      case 'CRITICAL':
        return '⚠';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-50 border-l border-gray-700 p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-100">SecureSphere</h2>

        {/* Defense Score Gauge */}
        <div className="flex flex-col items-center gap-3 mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${getScoreColor()} 0deg ${
                (defenseScore.score / 100) * 360
              }deg, #374151 ${(defenseScore.score / 100) * 360}deg)`,
            }}
          >
            <div className="w-20 h-20 rounded-full bg-gray-800 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: getScoreColor() }}>
                {Math.round(defenseScore.score)}
              </span>
              <span className="text-xs text-gray-400">/ 100</span>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span
                className="text-2xl"
                style={{ color: getScoreColor() }}
              >
                {getRatingIcon()}
              </span>
              <span className="font-semibold" style={{ color: getScoreColor() }}>
                {defenseScore.rating}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Security Rating</p>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-red-400">🔴 Critical:</span>
            <span className="font-semibold">{defenseScore.breakdown.criticalCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-orange-400">🟠 High:</span>
            <span className="font-semibold">{defenseScore.breakdown.highCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-400">🟡 Medium:</span>
            <span className="font-semibold">{defenseScore.breakdown.mediumCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-400">🔵 Low:</span>
            <span className="font-semibold">{defenseScore.breakdown.lowCount}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 space-y-2">
        <button
          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
          onClick={() => {
            // Scroll to first critical vulnerability
          }}
        >
          Review Critical
        </button>
        <button
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition"
          onClick={() => {
            // Auto-apply all recommended patches
          }}
        >
          Auto-Fix Safe Issues
        </button>
        <button
          className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-50 rounded text-sm font-medium transition"
          onClick={() => {
            // Export report
          }}
        >
          Export Report
        </button>
      </div>

      {/* Vulnerabilities List */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold mb-3 text-gray-300">Issues Found</h3>
        <div className="space-y-2">
          {vulnerabilities.map(vuln => (
            <div
              key={vuln.id}
              className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 cursor-pointer transition"
              onClick={() => onVulnerabilitySelect(vuln)}
            >
              <div className="flex items-start gap-2">
                {/* Severity Badge */}
                <div
                  className={`mt-0.5 rounded-full w-2.5 h-2.5 flex-shrink-0 ${
                    vuln.severity === SeverityLevel.CRITICAL
                      ? 'bg-red-500'
                      : vuln.severity === SeverityLevel.HIGH
                      ? 'bg-orange-500'
                      : vuln.severity === SeverityLevel.MEDIUM
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-100">{vuln.type}</p>
                  <p className="text-xs text-gray-400 mt-1">{vuln.title}</p>
                  <p className="text-xs text-gray-500 mt-1">Line {vuln.range.start.line}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

//============================================================================
// 2. VULNERABILITY DETAIL PANEL
//============================================================================

/**
 * VulnerabilityPanel Component
 * Shows detailed information about a selected vulnerability
 */
interface VulnerabilityPanelProps {
  vulnerability: Vulnerability;
  patches: PatchSuggestion[];
  onApplyPatch: (patch: PatchSuggestion) => void;
  onClose: () => void;
}

export const VulnerabilityPanel: React.FC<VulnerabilityPanelProps> = ({
  vulnerability,
  patches,
  onApplyPatch,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-gray-50 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{vulnerability.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{vulnerability.type}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Severity</p>
              <p
                className="text-lg font-bold mt-1"
                style={{
                  color: {
                    [SeverityLevel.CRITICAL]: '#ef4444',
                    [SeverityLevel.HIGH]: '#f97316',
                    [SeverityLevel.MEDIUM]: '#eab308',
                    [SeverityLevel.LOW]: '#3b82f6',
                    [SeverityLevel.INFO]: '#06b6d4',
                  }[vulnerability.severity],
                }}
              >
                {vulnerability.severity}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Confidence</p>
              <p className="text-lg font-bold mt-1 text-blue-400">
                {(vulnerability.confidence * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">CWE ID</p>
              <p className="text-lg font-bold mt-1 text-purple-400">{vulnerability.cweId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Location</p>
              <p className="text-lg font-bold mt-1 text-gray-300">
                Line {vulnerability.range.start.line}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Description</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{vulnerability.description}</p>
          </div>

          {/* Remediation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Remediation</h3>
            <div className="bg-gray-800 p-3 rounded border border-gray-700">
              <p className="text-sm text-gray-300">{vulnerability.remediation}</p>
            </div>
          </div>

          {/* Vulnerable Code */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Vulnerable Code</h3>
            <pre className="bg-gray-800 p-3 rounded border border-gray-700 overflow-x-auto text-xs text-gray-300">
              <code>{vulnerability.evidence.taintPath?.join(' → ') || 'N/A'}</code>
            </pre>
          </div>

          {/* Suggested Patches */}
          {patches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Suggested Patches</h3>
              <div className="space-y-3">
                {patches.map((patch, idx) => (
                  <div
                    key={patch.id}
                    className="bg-gray-800 border border-gray-700 rounded p-4 hover:border-gray-600 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-100">
                          Patch {idx + 1}: {patch.type}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{patch.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-green-400">
                          {(patch.confidence * 100).toFixed(0)}% Confidence
                        </p>
                      </div>
                    </div>

                    <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 overflow-x-auto mb-3">
                      <code>{patch.patchedCode}</code>
                    </pre>

                    <button
                      onClick={() => onApplyPatch(patch)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition"
                    >
                      Apply Patch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Learn More</h3>
            <div className="space-y-2">
              <a
                href={`https://cwe.mitre.org/data/definitions/${vulnerability.cweId}.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-400 hover:text-blue-300"
              >
                CWE-{vulnerability.cweId}: {vulnerability.type}
              </a>
              <a
                href={`https://owasp.org/www-project-top-ten/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-400 hover:text-blue-300"
              >
                OWASP Top 10 - {vulnerability.owaspCategory}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

//============================================================================
// 3. INLINE CODE DECORATION (Monaco Editor Integration)
//============================================================================

/**
 * MonacoSecurityDecorations
 * Renders real-time security warnings in the editor
 */
export function createMonacoDecorations(vulnerabilities: Vulnerability[]) {
  return vulnerabilities.map(vuln => ({
    range: new (window as any).monaco.Range(
      vuln.range.start.line,
      vuln.range.start.column + 1,
      vuln.range.end.line,
      vuln.range.end.column + 1
    ),
    options: {
      isWholeLine: false,
      className: `security-${vuln.severity.toLowerCase()}`,
      glyphMarginClassName: `glyph-${vuln.severity.toLowerCase()}`,
      glyphMarginHoverMessage: {
        value: `[${vuln.severity}] ${vuln.title}\n${vuln.description}`,
      },
      minimap: {
        color: getSeverityColor(vuln.severity),
        position: 2, // inline
      },
    },
  }));
}

function getSeverityColor(severity: SeverityLevel): string {
  const colors: Record<SeverityLevel, string> = {
    [SeverityLevel.CRITICAL]: '#ef4444',
    [SeverityLevel.HIGH]: '#f97316',
    [SeverityLevel.MEDIUM]: '#eab308',
    [SeverityLevel.LOW]: '#3b82f6',
    [SeverityLevel.INFO]: '#06b6d4',
  };
  return colors[severity];
}

/**
 * CSS styles for inline decorations
 */
export const decorationStyles = `
  /* Critical vulnerabilities - red squiggly underline */
  .security-critical {
    text-decoration: wavy underline #ef4444;
    text-underline-offset: 2px;
  }

  .glyph-critical {
    background-color: #ef4444;
    border-radius: 50%;
    width: 12px !important;
    height: 12px !important;
    margin: 3px 0;
  }

  /* High vulnerabilities - orange squiggly underline */
  .security-high {
    text-decoration: wavy underline #f97316;
    text-underline-offset: 2px;
  }

  .glyph-high {
    background-color: #f97316;
    border-radius: 50%;
    width: 10px !important;
    height: 10px !important;
    margin: 4px 0;
  }

  /* Medium vulnerabilities - yellow squiggly underline */
  .security-medium {
    text-decoration: wavy underline #eab308;
    text-underline-offset: 2px;
  }

  .glyph-medium {
    background-color: #eab308;
    border-radius: 50%;
    width: 8px !important;
    height: 8px !important;
    margin: 5px 0;
  }

  /* Low vulnerabilities - blue info marker */
  .security-low {
    text-decoration: dotted underline #3b82f6;
    text-underline-offset: 2px;
  }

  .glyph-low {
    background-color: #3b82f6;
    border-radius: 50%;
    width: 6px !important;
    height: 6px !important;
    margin: 6px 0;
  }

  /* Info - cyan info marker */
  .security-info {
    text-decoration: dotted underline #06b6d4;
    text-underline-offset: 2px;
  }

  .glyph-info {
    background-color: #06b6d4;
    border-radius: 50%;
    width: 6px !important;
    height: 6px !important;
    margin: 6px 0;
  }
`;

//============================================================================
// 4. THREAT INDICATOR BADGE
//============================================================================

/**
 * ThreatIndicator Component
 * Shows a visual indicator in the bottom right of the editor
 */
interface ThreatIndicatorProps {
  defenseScore: number;
}

export const ThreatIndicator: React.FC<ThreatIndicatorProps> = ({ defenseScore }) => {
  const getThreatLevel = () => {
    if (defenseScore >= 80) return { level: 'SAFE', color: '#10b981' };
    if (defenseScore >= 60) return { level: 'CAUTION', color: '#f59e0b' };
    if (defenseScore >= 40) return { level: 'WARNING', color: '#f97316' };
    return { level: 'DANGER', color: '#ef4444' };
  };

  const threat = getThreatLevel();

  return (
    <div
      className="fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm font-semibold border-2"
      style={{
        backgroundColor: threat.color + '20',
        borderColor: threat.color,
        color: threat.color,
      }}
    >
      {threat.level}
    </div>
  );
};

//============================================================================
// 5. SECURITY HOOK FOR INTEGRATION
//============================================================================

/**
 * useBugSynthesis Hook
 * Manages vulnerability analysis and state
 */
export function useBugSynthesis(code: string, fileId: string) {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [defenseScore, setDefenseScore] = useState<DefenseScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Debounced analysis
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!code || !fileId) return;

      setIsAnalyzing(true);
      try {
        // Call bug synthesis service
        // const result = await bugSynthesisService.analyze({
        //   fileId,
        //   fileName: 'editor.js',
        //   language: 'javascript',
        //   code,
        // });
        // setVulnerabilities(result.vulnerabilities);
        // setDefenseScore(result.defenseScore);
      } catch (error) {
        console.error('Analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [code, fileId]);

  return { vulnerabilities, defenseScore, isAnalyzing };
}

export default {
  DefenseSidebar,
  VulnerabilityPanel,
  ThreatIndicator,
  createMonacoDecorations,
  useBugSynthesis,
  decorationStyles,
};
