# AI Code-to-Diagram Engine - Implementation & Integration Guide

**Version**: 2.0.0  
**Purpose**: Complete step-by-step guide for integrating the Code-to-Diagram Engine  
**Audience**: Frontend developers implementing the feature

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Integration](#detailed-integration)
3. [Component Implementation](#component-implementation)
4. [Testing Strategy](#testing-strategy)
5. [Performance Tuning](#performance-tuning)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Step 1: Verify Dependencies (Already Installed)

```bash
# Check package.json for these (should already exist):
- mermaid: ^10.9.0
- zustand: ^5.0.0
- @monaco-editor/react: ^4.7.0
- lodash: ^4.17.21
```

### Step 2: Import Core Files

Ensure these files exist in your project:

```
src/
├── services/codeToDiagram/
│   ├── CodeParser.ts
│   ├── ASTBuilder.ts
│   ├── DiagramGenerator.ts
│   └── CodeToDiagramEngine.ts
├── types/
│   └── CODE_TO_DIAGRAM_TYPES.ts
├── hooks/
│   └── useCodeDiagramEngine.ts
└── stores/
    └── useDiagramStore.ts
```

### Step 3: Create DiagramPanel Component

Create: `src/components/DiagramPanel.jsx`

```typescript
import React from 'react';
import { useCodeDiagramEngine } from '@/hooks/useCodeDiagramEngine';
import { useDiagramStore } from '@/stores/useDiagramStore';

export function DiagramPanel() {
  const engine = useCodeDiagramEngine();
  const { isOpen } = useDiagramStore();

  if (!isOpen) return null;

  return (
    <div className="diagram-panel">
      {engine.isLoading && <p>Loading...</p>}
      {engine.error && <p className="error">{engine.error.message}</p>}
      {engine.currentSVG && (
        <div
          className="diagram-viewer"
          dangerouslySetInnerHTML={{ __html: engine.currentSVG.svgContent }}
        />
      )}
    </div>
  );
}
```

### Step 4: Integrate into Editor Page

Update: `src/pages/editor.jsx`

```typescript
import { DiagramPanel } from '@/components/DiagramPanel';

export function EditorPage() {
  return (
    <div className="editor-layout">
      <MonacoEditor {...props} />
      <DiagramPanel />
    </div>
  );
}
```

### Step 5: Add Toggle Button

Update: `src/components/editor/EditorNav.jsx`

```typescript
import { useDiagramStore } from '@/stores/useDiagramStore';

export function EditorNav() {
  const { isOpen, setIsOpen } = useDiagramStore();

  return (
    <nav>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Hide' : 'Show'} Diagram
      </button>
    </nav>
  );
}
```

---

## Detailed Integration

### Integration Point 1: Monaco Editor Change Listener

**File**: `src/pages/editor.jsx`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useCodeDiagramEngine } from '@/hooks/useCodeDiagramEngine';
import { SupportedLanguage } from '@/types/CODE_TO_DIAGRAM_TYPES';

export function EditorPage() {
  const editorRef = useRef(null);
  const diagramEngine = useCodeDiagramEngine(
    300,  // debounceMs
    DiagramType.FLOWCHART,  // initialDiagramType
    true  // autoAnalyze
  );

  const detectLanguageFromFile = useCallback((fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      'js': SupportedLanguage.JAVASCRIPT,
      'ts': SupportedLanguage.TYPESCRIPT,
      'py': SupportedLanguage.PYTHON,
      'java': SupportedLanguage.JAVA,
      'go': SupportedLanguage.GO,
      // ... add more as needed
    };
    return langMap[ext] || SupportedLanguage.JAVASCRIPT;
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Listen for code changes
    const subscription = editor.onDidChangeModelContent(() => {
      const code = editor.getValue();
      const language = detectLanguageFromFile(activeFile?.name);
      
      // Analyze code (with built-in debounce)
      diagramEngine.analyzeCode(code, language);
    });

    return () => subscription?.dispose();
  }, [activeFile, diagramEngine, detectLanguageFromFile]);

  return (
    <div className="editor-container">
      <MonacoEditor 
        ref={editorRef}
        height="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
      />
      <DiagramPanel />
    </div>
  );
}
```

### Integration Point 2: State Management with Zustand

**File**: `src/stores/useDiagramStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDiagramStore = create(
  persist(
    (set, get) => ({
      // UI State
      isOpen: false,
      isLoading: false,
      selectedNode: null,
      
      // User Preferences (persisted)
      theme: 'dark',
      diagramType: 'flowchart',
      autoUpdate: true,
      panelPosition: 'right',
      
      // Setters
      setIsOpen: (isOpen) => set({ isOpen }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setDiagramType: (type) => set({ diagramType: type }),
      setTheme: (theme) => set({ theme }),
      
      // Batch update
      resetState: () => set({
        isOpen: false,
        isLoading: false,
        selectedNode: null,
      }),
    }),
    {
      name: 'diagram-store',
      version: 1,
      // Only persist user preferences, not runtime state
      partialize: (state) => ({
        theme: state.theme,
        diagramType: state.diagramType,
        autoUpdate: state.autoUpdate,
        panelPosition: state.panelPosition,
      }),
    }
  )
);

// Selector hooks for performance optimization
export const useDiagramOpen = () => useDiagramStore((s) => s.isOpen);
export const useDiagramType = () => useDiagramStore((s) => s.diagramType);
export const useDiagramTheme = () => useDiagramStore((s) => s.theme);
```

### Integration Point 3: Hook Integration

**File**: `src/hooks/useCodeDiagramEngine.ts`

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { codeToDiagramEngine } from '@/services/codeToDiagram/CodeToDiagramEngine';
import { useDiagramStore } from '@/stores/useDiagramStore';

export function useCodeDiagramEngine(
  debounceMs = 300,
  initialDiagramType = 'flowchart',
  autoAnalyze = true
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [currentSVG, setCurrentSVG] = useState(null);
  const [lastMetrics, setLastMetrics] = useState(null);

  const debounceTimerRef = useRef(null);
  const lastCodeHashRef = useRef('');
  const diagramTypeRef = useRef(initialDiagramType);

  // Update diagram type from store
  const diagramType = useDiagramStore((s) => s.diagramType);
  useEffect(() => {
    diagramTypeRef.current = diagramType;
  }, [diagramType]);

  /**
   * Main analysis function
   */
  const analyzeAndRender = useCallback(
    async (code, language) => {
      // Skip if unchanged
      const hash = hashCode(code);
      if (hash === lastCodeHashRef.current) return;
      
      lastCodeHashRef.current = hash;
      setIsLoading(true);
      setError(null);

      try {
        // Generate diagram
        const diagram = await codeToDiagramEngine.analyzeToDiagram(
          code,
          language,
          { type: diagramTypeRef.current }
        );

        setCurrentDiagram(diagram);

        // Render to SVG
        const svg = await codeToDiagramEngine.renderDiagram(
          diagram,
          { theme: useDiagramStore.getState().theme }
        );

        setCurrentSVG(svg);
        setLastMetrics(svg.metrics);
      } catch (err) {
        const codeDiagramError = codeToDiagramEngine.getLastError();
        setError(codeDiagramError);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Debounced wrapper
   */
  const analyzeCode = useCallback(
    (code, language) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        analyzeAndRender(code, language);
      }, debounceMs);
    },
    [debounceMs, analyzeAndRender]
  );

  /**
   * Switch diagram type
   */
  const switchDiagramType = useCallback(
    async (newType) => {
      if (!currentDiagram) return;
      
      try {
        diagramTypeRef.current = newType;
        useDiagramStore.getState().setDiagramType(newType);
        
        // Re-render with new type
        const svg = await codeToDiagramEngine.renderDiagram(
          currentDiagram,
          { type: newType }
        );
        
        setCurrentSVG(svg);
      } catch (err) {
        setError(codeToDiagramEngine.getLastError());
      }
    },
    [currentDiagram]
  );

  /**
   * Export diagram
   */
  const exportDiagram = useCallback(
    async (format) => {
      if (!currentDiagram) return null;
      
      try {
        const result = await codeToDiagramEngine.exportDiagram(
          currentDiagram,
          format
        );
        return result;
      } catch (err) {
        setError(codeToDiagramEngine.getLastError());
        return null;
      }
    },
    [currentDiagram]
  );

  const clearDiagram = useCallback(() => {
    setCurrentDiagram(null);
    setCurrentSVG(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    currentDiagram,
    currentSVG,
    lastMetrics,
    
    analyzeCode,
    switchDiagramType,
    exportDiagram,
    clearDiagram,
  };
}

/**
 * Simple hash function
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return Math.abs(hash).toString(36);
}
```

---

## Component Implementation

### DiagramPanel Component (Full Implementation)

**File**: `src/components/DiagramPanel.jsx`

```typescript
import React, { useEffect, useState } from 'react';
import { ChevronDown, Download, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useCodeDiagramEngine } from '@/hooks/useCodeDiagramEngine';
import { useDiagramStore } from '@/stores/useDiagramStore';
import { DiagramTypeSelector } from './DiagramTypeSelector';
import { MermaidViewer } from './MermaidViewer';
import './DiagramPanel.css';

export function DiagramPanel() {
  const engine = useCodeDiagramEngine();
  const store = useDiagramStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const result = await engine.exportDiagram(format);
      
      if (format === 'svg' || format === 'png') {
        // Download blob
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diagram.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        // Download JSON
        const url = URL.createObjectURL(new Blob([result]));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'diagram.json';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleZoom = (direction) => {
    const newZoom = direction === 'in' 
      ? Math.min(3, store.zoomLevel + 0.1)
      : Math.max(0.5, store.zoomLevel - 0.1);
    
    store.setZoomLevel(newZoom);
  };

  if (!store.isOpen) return null;

  return (
    <aside className="diagram-panel" style={{ width: store.panelSize === 'large' ? '500px' : '400px' }}>
      {/* Header */}
      <div className="diagram-panel-header">
        <div className="header-left">
          <h2>Code Architecture</h2>
          <button
            className="collapse-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          </button>
        </div>
        
        <button
          className="close-btn"
          onClick={() => store.setIsOpen(false)}
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Controls */}
          <div className="diagram-controls">
            <DiagramTypeSelector />
            
            <div className="zoom-controls">
              <button onClick={() => handleZoom('out')} title="Zoom Out">−</button>
              <span>{Math.round(store.zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom('in')} title="Zoom In">+</button>
            </div>

            <button
              onClick={() => engine.clearDiagram()}
              title="Clear diagram"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Content Area */}
          <div className="diagram-content">
            {engine.isLoading && (
              <div className="loading-state">
                <div className="spinner" />
                <p>Analyzing code...</p>
              </div>
            )}

            {engine.error && (
              <div className="error-state">
                <p className="error-title">Analysis Error</p>
                <p className="error-message">{engine.error.message}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
              </div>
            )}

            {engine.currentSVG && !engine.isLoading && (
              <MermaidViewer
                svg={engine.currentSVG}
                zoomLevel={store.zoomLevel}
                onNodeClick={(nodeId) => {
                  // Handle node click - find corresponding code line
                  console.log('Node clicked:', nodeId);
                }}
              />
            )}

            {!engine.isLoading && !engine.error && !engine.currentSVG && (
              <div className="empty-state">
                <p>Open or edit a code file to see the diagram</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {engine.currentSVG && (
            <div className="diagram-footer">
              <div className="export-buttons">
                <button
                  onClick={() => handleExport('svg')}
                  disabled={isExporting}
                  title="Download as SVG"
                >
                  <Download size={14} /> SVG
                </button>
                <button
                  onClick={() => handleExport('png')}
                  disabled={isExporting}
                  title="Download as PNG"
                >
                  <Download size={14} /> PNG
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  title="Download as JSON"
                >
                  <Download size={14} /> JSON
                </button>
              </div>

              {engine.lastMetrics && (
                <div className="metrics">
                  <small>
                    {engine.lastMetrics.diagramGenerationTimeMs}ms render time
                  </small>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
```

### DiagramTypeSelector Component

**File**: `src/components/DiagramTypeSelector.jsx`

```typescript
import React from 'react';
import { useDiagramStore } from '@/stores/useDiagramStore';
import { DiagramType } from '@/types/CODE_TO_DIAGRAM_TYPES';

export function DiagramTypeSelector() {
  const { diagramType, setDiagramType } = useDiagramStore();

  const types = [
    { value: DiagramType.FLOWCHART, label: 'Flowchart', icon: '📊' },
    { value: DiagramType.SEQUENCE, label: 'Sequence', icon: '📈' },
    { value: DiagramType.STATE, label: 'State', icon: '🔄' },
    { value: DiagramType.CLASS, label: 'Class', icon: '🏗️' },
  ];

  return (
    <div className="diagram-type-selector">
      {types.map((type) => (
        <button
          key={type.value}
          className={`type-btn ${diagramType === type.value ? 'active' : ''}`}
          onClick={() => setDiagramType(type.value)}
          title={type.label}
        >
          <span className="icon">{type.icon}</span>
          <span className="label">{type.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### MermaidViewer Component

**File**: `src/components/MermaidViewer.jsx`

```typescript
import React, { useEffect, useRef } from 'react';

export function MermaidViewer({ svg, zoomLevel, onNodeClick }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !svg) return;

    // Set SVG content
    containerRef.current.innerHTML = svg.svgContent;

    // Apply zoom transform
    const svgElement = containerRef.current.querySelector('svg');
    if (svgElement) {
      svgElement.style.transform = `scale(${zoomLevel})`;
      svgElement.style.transformOrigin = 'top left';
      svgElement.style.display = 'inline-block';
    }

    // Add click handlers to nodes
    const nodes = containerRef.current.querySelectorAll('[data-node-id]');
    nodes.forEach((node) => {
      node.addEventListener('click', () => {
        const nodeId = node.getAttribute('data-node-id');
        onNodeClick?.(nodeId);
        
        // Visual feedback
        nodes.forEach((n) => n.classList.remove('selected'));
        node.classList.add('selected');
      });
    });
  }, [svg, zoomLevel, onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="mermaid-viewer"
      style={{
        overflow: 'auto',
        height: '100%',
        width: '100%',
      }}
    />
  );
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/__tests__/CodeParser.test.ts
import { CodeParser } from '@/services/codeToDiagram/CodeParser';
import { SupportedLanguage } from '@/types/CODE_TO_DIAGRAM_TYPES';

describe('CodeParser', () => {
  describe('detectLanguage', () => {
    it('detects JavaScript from extension', () => {
      const result = CodeParser.detectLanguage('const x = 1;', 'file.js');
      expect(result.language).toBe(SupportedLanguage.JAVASCRIPT);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('detects Python from content', () => {
      const code = 'def hello():\n    print("world")';
      const result = CodeParser.detectLanguage(code);
      expect(result.language).toBe(SupportedLanguage.PYTHON);
    });
  });

  describe('analyze', () => {
    it('extracts functions from JavaScript', () => {
      const code = 'function add(a, b) { return a + b; }';
      const result = CodeParser.analyze(code, SupportedLanguage.JAVASCRIPT);
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('add');
    });
  });
});
```

### Integration Tests

```typescript
// src/__tests__/CodeToDiagramEngine.integration.test.ts
import { CodeToDiagramEngine } from '@/services/codeToDiagram/CodeToDiagramEngine';
import { DiagramType, SupportedLanguage } from '@/types/CODE_TO_DIAGRAM_TYPES';

describe('CodeToDiagramEngine Integration', () => {
  let engine: CodeToDiagramEngine;

  beforeEach(() => {
    engine = new CodeToDiagramEngine();
  });

  it('converts JavaScript code to flowchart', async () => {
    const code = `
      function calculate(x) {
        if (x > 0) return x * 2;
        else return x / 2;
      }
    `;

    const diagram = await engine.analyzeToDiagram(
      code,
      SupportedLanguage.JAVASCRIPT,
      { type: DiagramType.FLOWCHART }
    );

    expect(diagram).toBeDefined();
    expect(diagram.mermaidSyntax).toContain('graph');
  });

  it('renders diagram to SVG', async () => {
    const code = 'function test() {}';
    
    const result = await engine.analyzeToDiagramWithRender(
      code,
      SupportedLanguage.JAVASCRIPT,
      { type: DiagramType.FLOWCHART }
    );

    expect(result.success).toBe(true);
    expect(result.svgContent).toContain('<svg');
    expect(result.renderTime).toBeLessThan(1000);
  });
});
```

### Component Tests

```typescript
// src/__tests__/DiagramPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { DiagramPanel } from '@/components/DiagramPanel';

// Mock the hooks
jest.mock('@/hooks/useCodeDiagramEngine');
jest.mock('@/stores/useDiagramStore');

describe('DiagramPanel', () => {
  it('renders loading state', () => {
    // Mock loading state
    useCodeDiagramEngine.mockReturnValue({
      isLoading: true,
      currentSVG: null,
    });

    render(<DiagramPanel />);
    expect(screen.getByText('Analyzing code...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    useCodeDiagramEngine.mockReturnValue({
      isLoading: false,
      error: { message: 'Parse error' },
    });

    render(<DiagramPanel />);
    expect(screen.getByText('Parse error')).toBeInTheDocument();
  });

  it('renders SVG content', () => {
    useCodeDiagramEngine.mockReturnValue({
      isLoading: false,
      error: null,
      currentSVG: { svgContent: '<svg></svg>' },
    });

    render(<DiagramPanel />);
    expect(screen.getByText('<svg></svg>')).toBeInTheDocument();
  });
});
```

---

## Performance Tuning

### 1. Optimize Debounce Delay

```typescript
// Current: 300ms (default)
// For slow systems: 500ms
// For fast systems: 200ms

const diagramEngine = useCodeDiagramEngine(
  200,  // Faster response
  DiagramType.FLOWCHART
);
```

### 2. Enable Web Workers (Future)

```typescript
// When implemented, enable workers for heavy computation
const engine = new CodeToDiagramEngine({
  workerEnabled: true,
  maxCodeLength: 500000,
});
```

### 3. Adjust Cache Size

```typescript
// For devices with limited memory
const engine = new CodeToDiagramEngine({
  cacheSizeLimit: 20,  // Smaller cache
});

// For devices with plenty of memory
const engine = new CodeToDiagramEngine({
  cacheSizeLimit: 100,  // Larger cache
});
```

### 4. Reduce Diagram Complexity

```typescript
// Limit diagram nodes for large files
const diagram = await engine.generateDiagram(ast, {
  maxNodes: 100,
  maxDepth: 10,
  simplifyMode: true,
});
```

---

## Troubleshooting

### Issue: Diagram Not Updating

**Diagnosis**:
1. Check browser console for errors
2. Verify Monaco editor onChange event fires
3. Confirm debounce timer is not stuck

**Solution**:
```typescript
// Add debug logging
const analyzeCode = useCallback((code, lang) => {
  console.log('analyzeCode called with:', { 
    codeLength: code.length, 
    language: lang 
  });
  
  // ... rest of implementation
}, []);
```

### Issue: Memory Usage Growing

**Diagnosis**:
1. Monitor cache size in DevTools
2. Check for memory leaks in React
3. Verify cache eviction is working

**Solution**:
```typescript
// Monitor cache
const stats = engine.getCacheStatistics();
console.log(`Cache size: ${stats.itemCount}/${stats.maxItems}`);

// Clear cache manually if needed
engine.clearCache();
```

### Issue: Mermaid SVG Not Rendering

**Diagnosis**:
1. Check Mermaid syntax validity
2. Verify SVG content is valid HTML
3. Check for DOM sanitization issues

**Solution**:
```typescript
// Ensure SVG is properly formatted
const result = await engine.renderDiagram(diagram);
console.log('SVG length:', result.svgContent.length);
console.log('First 100 chars:', result.svgContent.substring(0, 100));
```

### Issue: Performance Degradation Over Time

**Diagnosis**:
1. Monitor memory usage
2. Check cache hit rate
3. Profile parsing time

**Solution**:
```typescript
// Add periodic cache clearing
useEffect(() => {
  const interval = setInterval(() => {
    const stats = engine.getCacheStatistics();
    if (stats.hitRate < 0.5) {
      console.log('Low cache hit rate, clearing...');
      engine.clearCache();
    }
  }, 60000); // Every minute

  return () => clearInterval(interval);
}, []);
```

---

## Deployment Checklist

- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript types imported correctly
- [ ] Engine services initialized
- [ ] React hooks implemented
- [ ] Zustand store configured
- [ ] DiagramPanel component created
- [ ] Monaco editor integration complete
- [ ] Toggle button added to EditorNav
- [ ] CSS styles imported/created
- [ ] Error handling implemented
- [ ] Performance monitoring added
- [ ] Tests passing (unit + integration)
- [ ] Browser compatibility verified
- [ ] Mermaid library version >= 10.9
- [ ] Memory usage monitored
- [ ] Cache functionality tested
- [ ] Export features working
- [ ] Collaborative editing (Yjs) tested
- [ ] Production build optimized
- [ ] Feature flags configured
- [ ] Documentation updated

---

## Production Deployment Steps

### 1. Build Optimization

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'code-diagram-engine': [
            './src/services/codeToDiagram/CodeParser',
            './src/services/codeToDiagram/ASTBuilder',
            './src/services/codeToDiagram/DiagramGenerator',
            './src/services/codeToDiagram/CodeToDiagramEngine',
          ],
        }
      }
    },
    // Tree shake unused code
    terserOptions: {
      compress: { drop_console: true },
    }
  }
});
```

### 2. Feature Flags

```typescript
// .env.production
VITE_ENABLE_CODE_DIAGRAM=true
VITE_ENABLE_WORKERS=false  # Disable until fully tested
VITE_ENABLE_TELEMETRY=false  # Privacy first
```

### 3. Performance Monitoring

```typescript
// Send metrics to monitoring service
if (process.env.VITE_ENABLE_TELEMETRY) {
  analytics.trackDiagramGenerated({
    language: language,
    type: diagramType,
    timeMs: metrics.totalTimeMs,
  });
}
```

### 4. Rollout Strategy

- **Phase 1**: Internal testing (1 week)
- **Phase 2**: Beta rollout to 10% of users
- **Phase 3**: Monitor performance and errors
- **Phase 4**: Full rollout (if Phase 3 successful)
- **Phase 5**: Optimization based on user feedback

---

**Document Version**: 2.0.0  
**Last Updated**: May 2026  
**Status**: ✅ Production Ready
