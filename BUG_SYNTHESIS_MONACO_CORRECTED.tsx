// DEBUGGED: SecureSphere UI Components with Error Handling
// File: src/components/SecureSphere/SecureMonacoEditorCorrected.tsx
//
// ✅ FIXES APPLIED:
// 1. Safe Monaco initialization
// 2. Proper decorator management
// 3. Memory leak prevention
// 4. Error recovery
// 5. Toggle for enabling analysis

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useSecurity } from '../../context/SecurityContextCorrected';
import { Vulnerability, SeverityLevel } from '../../services/bugSynthesis/types';

interface SecureMonacoEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  height?: string;
  theme?: string;
}

//============================================================================
// MONACO DECORATION HELPER
//============================================================================

/**
 * Create Monaco decorations from vulnerabilities
 * ✅ FIXES:
 * - Safe range calculation
 * - Proper error handling
 */
function createDecorations(vulnerabilities: Vulnerability[]): any[] {
  try {
    return vulnerabilities.map(vuln => {
      // Safety checks
      if (!vuln.range?.start || !vuln.range?.end) {
        console.warn('[MonacoDecorator] Invalid vulnerability range:', vuln);
        return null;
      }

      const startLine = Math.max(1, vuln.range.start.line || 1);
      const endLine = Math.max(startLine, vuln.range.end.line || startLine);
      const startCol = Math.max(1, vuln.range.start.column || 1);
      const endCol = Math.max(startCol + 1, vuln.range.end.column || startCol + 1);

      return {
        range: {
          startLineNumber: startLine,
          startColumn: startCol,
          endLineNumber: endLine,
          endColumn: endCol,
        },
        options: {
          isWholeLine: false,
          className: `security-vuln security-${vuln.severity.toLowerCase()}`,
          glyphMarginClassName: `glyph-${vuln.severity.toLowerCase()}`,
          glyphMarginHoverMessage: {
            value: `[${vuln.severity}] ${vuln.title}`,
          },
          minimap: {
            color: getSeverityColor(vuln.severity),
            position: 2,
          },
        },
      };
    }).filter((d): d is any => d !== null);
  } catch (error) {
    console.error('[MonacoDecorator] Error creating decorations:', error);
    return [];
  }
}

/**
 * Get color for severity level
 */
function getSeverityColor(severity: SeverityLevel): string {
  const colors: Record<SeverityLevel, string> = {
    [SeverityLevel.CRITICAL]: '#ef4444',
    [SeverityLevel.HIGH]: '#f97316',
    [SeverityLevel.MEDIUM]: '#eab308',
    [SeverityLevel.LOW]: '#3b82f6',
    [SeverityLevel.INFO]: '#06b6d4',
  };
  return colors[severity] || '#666666';
}

//============================================================================
// EDITOR COMPONENT
//============================================================================

export const SecureMonacoEditor: React.FC<SecureMonacoEditorProps> = ({
  value,
  language = 'javascript',
  onChange,
  height = '100%',
  theme = 'vs-dark',
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  const { vulnerabilities, analyzeCode, isEnabled } = useSecurity();
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle editor mount
   * ✅ FIXES:
   * - Null check
   * - Try-catch around setup
   * - Store refs safely
   */
  const handleEditorMount = useCallback((editor: any, monaco: Monaco) => {
    try {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Define custom CSS for security decorations
      if (monaco.editor) {
        const style = document.createElement('style');
        style.innerHTML = `
          .security-vuln {
            text-decoration: wavy underline;
          }
          .security-critical {
            text-decoration-color: #ef4444;
          }
          .security-high {
            text-decoration-color: #f97316;
          }
          .security-medium {
            text-decoration-color: #eab308;
          }
          .security-low {
            text-decoration-color: #3b82f6;
          }
          .security-info {
            text-decoration-color: #06b6d4;
          }
          .glyph-critical::before,
          .glyph-high::before,
          .glyph-medium::before,
          .glyph-low::before,
          .glyph-info::before {
            content: '●';
            display: inline-block;
            width: 10px;
          }
          .glyph-critical::before {
            color: #ef4444;
          }
          .glyph-high::before {
            color: #f97316;
          }
          .glyph-medium::before {
            color: #eab308;
          }
          .glyph-low::before {
            color: #3b82f6;
          }
          .glyph-info::before {
            color: #06b6d4;
          }
        `;
        document.head.appendChild(style);
      }

      setEditorReady(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Editor initialization failed';
      console.error('[SecureMonacoEditor] Mount error:', message);
      setError(message);
    }
  }, []);

  /**
   * Handle code changes
   * ✅ FIXES:
   * - Safe onChange callback
   * - Only analyze if enabled
   * - Proper error handling
   */
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      if (!newValue) return;

      try {
        // Call parent onChange
        onChange?.(newValue);

        // Trigger analysis if enabled
        if (isEnabled) {
          analyzeCode(newValue);
        }
      } catch (err) {
        console.error('[SecureMonacoEditor] Change handling error:', err);
      }
    },
    [onChange, isEnabled, analyzeCode]
  );

  /**
   * Update decorations when vulnerabilities change
   * ✅ FIXES:
   * - Check if editor exists
   * - Safe decoration update
   * - Clean old decorations
   * - Error handling
   */
  useEffect(() => {
    if (!editorRef.current || !editorReady) {
      return;
    }

    try {
      const decorations = createDecorations(vulnerabilities);

      // Update decorations
      const newIds = editorRef.current.deltaDecorations(
        decorationIdsRef.current,
        decorations
      );

      decorationIdsRef.current = newIds;
    } catch (err) {
      console.error('[SecureMonacoEditor] Decoration update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update decorations');
    }
  }, [vulnerabilities, editorReady]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      try {
        // Clear decorations
        if (editorRef.current && decorationIdsRef.current.length > 0) {
          editorRef.current.deltaDecorations(decorationIdsRef.current, []);
        }

        // Clear refs
        editorRef.current = null;
        monacoRef.current = null;
        decorationIdsRef.current = [];
      } catch (err) {
        console.error('[SecureMonacoEditor] Cleanup error:', err);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', height, display: 'flex', flexDirection: 'column' }}>
      {/* Error display */}
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '12px',
            borderBottom: '1px solid #fecaca',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Editor */}
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme={theme}
        options={{
          minimap: { enabled: true },
          glyphMargin: true,
          glyphMarginHoverMessage: true,
          wordWrap: 'on',
          fontSize: 14,
          padding: { top: 20 },
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
};

export default SecureMonacoEditor;
