# Code-to-Diagram Engine - Integration & System Flow Guide

## Table of Contents
1. [System Integration Points](#system-integration-points)
2. [Real-Time Code Analysis Flow](#real-time-code-analysis-flow)
3. [Component Integration](#component-integration)
4. [State Management](#state-management)
5. [Performance Optimization](#performance-optimization)
6. [Error Handling Strategy](#error-handling-strategy)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## System Integration Points

### 1. Monaco Editor Integration

**Location**: `SynCodex Frontend/src/pages/editor.jsx`

```typescript
// In editor.jsx, add to EditorPane component
import { useCodeDiagramEngine } from '../hooks/useCodeDiagramEngine';
import { useDiagramStore } from '../stores/useDiagramStore';

function EditorPane() {
  const diagramEngine = useCodeDiagramEngine(300, DiagramType.FLOWCHART, true);
  const { isOpen, setIsOpen } = useDiagramStore();
  
  // Listen for code changes
  const handleCodeChange = useCallback((newCode: string) => {
    if (activeFile) {
      const language = detectLanguage(activeFile.name);
      diagramEngine.analyzeCode(newCode, language);
    }
  }, [activeFile, diagramEngine]);

  // Attach to Monaco change event
  useEffect(() => {
    const subscription = editorRef.current?.onDidChangeModelContent(() => {
      const code = editorRef.current?.getValue();
      handleCodeChange(code);
    });

    return () => subscription?.dispose();
  }, [handleCodeChange]);

  return (
    <>
      <MonacoEditor ref={editorRef} onChange={handleCodeChange} />
      {isOpen && <DiagramPanel diagram={diagramEngine.currentSVG} />}
    </>
  );
}
```

### 2. EditorNav Integration

**Location**: `SynCodex Frontend/src/components/editor/EditorNav.jsx`

Add button to toggle diagram panel:

```typescript
<button
  onClick={() => setIsOpen(!isOpen)}
  className="editor-nav-chip"
  title="Toggle Code Diagram"
>
  <Zap size={14} />
  Diagram
</button>
```

### 3. Diagram Panel Component

Create new file: `SynCodex Frontend/src/components/DiagramPanel.jsx`

```typescript
export function DiagramPanel({ diagram, isLoading, error }) {
  const store = useDiagramStore();
  
  return (
    <aside className="diagram-panel">
      <header className="diagram-panel-header">
        <h2>Code Diagram</h2>
        <DiagramTypeSelector />
      </header>
      
      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner error={error} />}
      {diagram && (
        <div
          className="diagram-viewport"
          dangerouslySetInnerHTML={{ __html: diagram.svgContent }}
        />
      )}
    </aside>
  );
}
```

---

## Real-Time Code Analysis Flow

### Step 1: Code Change Detection
```
User types in Monaco Editor
         ↓
Monaco onChange event fires
         ↓
EditorPane.handleCodeChange() called
         ↓
Language detected from active file
         ↓
diagramEngine.analyzeCode() invoked with (code, language)
```

### Step 2: Debounced Processing
```
Code change detected
         ↓
Debounce timer starts (300ms default)
         ↓
User continues typing... (timer resets)
         ↓
300ms of inactivity reached
         ↓
Analysis begins
```

### Step 3: Code Analysis Pipeline
```
CodeParser.analyzeCode(code, language)
         ↓
1. Normalize code (remove comments, trim)
2. Extract functions/classes
3. Extract control flow (if/for/while)
4. Extract variables
5. Return CodeAnalysisResult
         ↓
ASTBuilder.buildAST(analysisResult)
         ↓
1. Create root node
2. Build function nodes with parameters
3. Build statement nodes
4. Set parent references
5. Return AST tree
         ↓
DiagramGenerator.generate(ast, options)
         ↓
1. Determine diagram type
2. Traverse AST
3. Map to diagram nodes
4. Generate Mermaid syntax
5. Return GeneratedDiagram
         ↓
CodeToDiagramEngine.renderDiagram(diagram)
         ↓
1. Import mermaid library
2. Configure rendering
3. Render to SVG
4. Return MermaidRenderResult
         ↓
Update Diagram Panel
         ↓
Display SVG with smooth transition
```

### Step 4: Result Caching
```
Cache key generated from (code + options)
         ↓
Check if in cache
         ↓
   ├─ Cache HIT → Return cached SVG (instant)
   └─ Cache MISS → Generate new diagram
         ↓
Store result in cache
         ↓
Manage cache size (limit to 50MB)
```

---

## Component Integration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ EditorPage (/src/pages/editor.jsx)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────┐        ┌──────────────────────┐ │
│  │ Monaco Editor     │        │ Diagram Panel        │ │
│  │ (Active Code)     │◄──────►│ (Visual Output)      │ │
│  └───────────────────┘        └──────────────────────┘ │
│         △                              △                │
│         │                              │                │
│  ┌──────┴──────────────────────────────┴──────┐        │
│  │  useCodeDiagramEngine Hook                 │        │
│  │  (State + Logic)                           │        │
│  └──────┬──────────────────────────────────────┘        │
│         │                                               │
│  ┌──────┴──────────────────────────────────────┐        │
│  │  CodeToDiagramEngine                        │        │
│  │  ├─ CodeParser                             │        │
│  │  ├─ ASTBuilder                             │        │
│  │  ├─ DiagramGenerator                       │        │
│  │  └─ Mermaid Renderer                       │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │  useDiagramStore (Zustand)                  │      │
│  │  • Panel state (open/closed)                │      │
│  │  • User preferences (theme, type)           │      │
│  │  • Viewport (zoom, pan)                     │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
SynCodex Frontend/src/
├── types/
│   └── CODE_TO_DIAGRAM_TYPES.ts        (Type definitions)
├── services/
│   └── codeToDiagram/
│       ├── CodeParser.ts               (Code analysis)
│       ├── ASTBuilder.ts               (Tree building)
│       ├── DiagramGenerator.ts         (Diagram logic)
│       └── CodeToDiagramEngine.ts      (Orchestrator)
├── hooks/
│   └── useCodeDiagramEngine.ts         (React hook)
├── stores/
│   └── useDiagramStore.ts              (State management)
└── components/
    └── DiagramPanel.jsx                (UI component)
```

---

## State Management

### Diagram Store (Zustand)

**Persisted to localStorage:**
- User preferences (theme, diagram type, panel position)
- Panel open/closed state

**NOT persisted (transient):**
- Current diagram (regenerated on code change)
- Selected node
- Error messages
- Loading state

### Hook State Management

**useCodeDiagramEngine Hook:**
- Manages diagram generation lifecycle
- Handles debouncing
- Tracks performance metrics
- Caches diagrams in memory

**useDiagramStore Integration:**
```typescript
const { isOpen, setIsOpen } = useDiagramStore();
const { currentSVG, isLoading, error } = diagramEngine;

// Combine for UI
return <DiagramPanel 
  svg={currentSVG} 
  loading={isLoading}
  error={error}
  onClose={() => setIsOpen(false)}
/>;
```

---

## Performance Optimization

### 1. Debouncing Strategy
```typescript
debounceMs: 300  // Wait 300ms after last keystroke
```
- Prevents analysis on every keystroke
- Reduces redundant parsing
- Estimated CPU savings: 70-80% for typical users

### 2. Code Block Focusing
Instead of analyzing the entire file, focus on:
- Function currently under cursor
- Class definition being edited
- Limited context (function + ±5 lines)

Implementation:
```typescript
// Extract active function context
const activeFunction = findFunctionAtLine(code, cursorLine);
const analysisScope = extractFunctionContext(code, activeFunction);
```

### 3. Caching Strategy
```typescript
Cache Key = hash(code + JSON.stringify(options))
Max entries = 10 diagrams
Max size = 50MB (auto-evict oldest 20% if exceeded)
```

Cache hit rate targets:
- Average: 40-50%
- With user focus on same function: 80%+

### 4. Web Worker (Optional, Phase 2)
```typescript
// Offload parsing to background thread
const worker = new Worker('/workers/parser.worker.js');
worker.postMessage({ code, language });
worker.onmessage = (e) => {
  const analysis = e.data;
  // Continue with AST building
};
```

Estimated impact:
- Non-blocking UI
- 100-200ms faster for large files (1000+ LOC)

---

## Error Handling Strategy

### Error Types & Recovery

| Error Type | Severity | Recovery |
|-----------|----------|----------|
| `PARSING_ERROR` | High | Show error message, use previous diagram |
| `INVALID_SYNTAX` | Medium | Highlight syntax error in editor |
| `UNSUPPORTED_LANGUAGE` | Low | Show notification, disable diagram |
| `MERMAID_RENDER_ERROR` | High | Fall back to text representation |
| `TIMEOUT_ERROR` | Low | Show "Analysis taking longer..." message |

### Error Boundary Component

```typescript
<ErrorBoundary fallback={<DiagramErrorFallback />}>
  <DiagramPanel />
</ErrorBoundary>
```

### User Feedback

```typescript
if (error) {
  return (
    <div className="diagram-error">
      <AlertIcon />
      <p>{error.message}</p>
      <button onClick={() => clearError()}>Dismiss</button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

1. **CodeParser Tests**
   - Language detection accuracy
   - Function extraction correctness
   - Comment removal
   - Edge cases (nested functions, decorators)

2. **ASTBuilder Tests**
   - Tree structure validity
   - Parent reference correctness
   - Node ID uniqueness
   - Serialization/deserialization

3. **DiagramGenerator Tests**
   - Mermaid syntax validity
   - Node type mapping
   - Edge generation
   - Diagram metadata calculation

### Integration Tests

1. **End-to-End Flow**
   - Code → AST → Diagram → SVG
   - Cache hit/miss scenarios
   - Error propagation

2. **Hook Integration**
   - Debouncing behavior
   - State updates
   - Cache invalidation

3. **Store Integration**
   - Preference persistence
   - State updates trigger UI refresh

### Performance Tests

```typescript
// Benchmark parser performance
const startTime = performance.now();
CodeParser.analyze(largeCode, language);
const endTime = performance.now();
expect(endTime - startTime).toBeLessThan(500); // < 500ms
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Performance benchmarks within targets
- [ ] Bundle size < 150KB (main code + Mermaid)
- [ ] Memory usage < 50MB in typical scenarios
- [ ] Error handling covers all edge cases
- [ ] Privacy compliance verified (no external calls)
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing completed

### Feature Flag Configuration

```typescript
// In env config
REACT_APP_ENABLE_CODE_DIAGRAM_ENGINE = true  // Enable feature
REACT_APP_DIAGRAM_DEBUG_MODE = false         // Disable debug logs
REACT_APP_DIAGRAM_CACHE_SIZE_MB = 50        // Cache size limit
```

### Rollout Strategy

1. **Beta Phase (Week 1-2)**
   - Feature flag: enabled for 5% of users
   - Close monitoring of errors and performance
   - Collect user feedback via survey

2. **Gradual Rollout (Week 3-4)**
   - Feature flag: enabled for 25% of users
   - Address any reported issues
   - Monitor cache hit rates

3. **Full Release (Week 5)**
   - Feature flag: enabled for 100% of users
   - Monitor for any production issues
   - Gather usage analytics

### Post-Deployment Monitoring

**Metrics to track:**
- Diagram generation success rate (target: >98%)
- Average generation time (target: <500ms)
- Cache hit rate (target: 40%+)
- Error rate (target: <1%)
- User adoption rate (target: 40%+ within 2 weeks)

---

## Quick Start Guide for Developers

### Setup

```bash
# 1. Install mermaid (if not already installed)
npm install mermaid

# 2. Import types in your component
import {
  DiagramType,
  SupportedLanguage,
} from '@/types/CODE_TO_DIAGRAM_TYPES';

# 3. Use the hook
import { useCodeDiagramEngine } from '@/hooks/useCodeDiagramEngine';
```

### Usage Example

```typescript
function MyComponent() {
  const diagramEngine = useCodeDiagramEngine(
    300,                      // debounce ms
    DiagramType.FLOWCHART,    // default type
    true                      // auto-analyze
  );

  const handleCodeChange = (code: string) => {
    diagramEngine.analyzeCode(code, SupportedLanguage.JAVASCRIPT);
  };

  return (
    <div>
      <CodeEditor onChange={handleCodeChange} />
      {diagramEngine.isLoading && <Spinner />}
      {diagramEngine.currentSVG && (
        <div dangerouslySetInnerHTML={{ __html: diagramEngine.currentSVG.svgContent }} />
      )}
    </div>
  );
}
```

### Debugging

```typescript
// Enable debug logging
import { codeToDiagramEngine } from '@/services/codeToDiagram/CodeToDiagramEngine';

const engine = new CodeToDiagramEngine({
  enableErrorLogging: true,
  enablePerformanceMonitoring: true,
});

// Get cache stats
console.log(engine.getCacheStats());

// Get last error
console.log(engine.getLastError());
```

---

## Next Steps

1. **Immediate (Next Sprint)**
   - [ ] Review and approve architecture
   - [ ] Create DiagramPanel UI component
   - [ ] Integrate hook into EditorPage
   - [ ] Set up feature flag

2. **Short-term (Next 2 Sprints)**
   - [ ] Comprehensive testing
   - [ ] Performance optimization
   - [ ] Documentation for users
   - [ ] Beta rollout

3. **Long-term (Future Roadmap)**
   - [ ] Cross-file dependency tracking
   - [ ] AI-powered annotations
   - [ ] Collaborative diagram sharing
   - [ ] Class diagram generation
   - [ ] Interactive code execution simulation

