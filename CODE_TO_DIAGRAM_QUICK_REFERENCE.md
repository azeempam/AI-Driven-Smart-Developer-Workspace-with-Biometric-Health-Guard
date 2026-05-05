# Code-to-Diagram Engine - Quick Reference & API Guide

## Quick Overview

The **Code-to-Diagram Engine** automatically converts code in the Monaco Editor into real-time visual flowcharts and diagrams. All processing is **100% client-side** with zero external API calls.

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install mermaid zustand
```

### 2. Import Types
```typescript
import {
  DiagramType,
  SupportedLanguage,
  GeneratedDiagram,
  MermaidRenderResult,
} from '@/types/CODE_TO_DIAGRAM_TYPES';
```

### 3. Use in Component
```typescript
import { useCodeDiagramEngine } from '@/hooks/useCodeDiagramEngine';
import { useDiagramStore } from '@/stores/useDiagramStore';

export function MyEditor() {
  const diagramEngine = useCodeDiagramEngine();
  const { isOpen, setIsOpen } = useDiagramStore();

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle Diagram</button>
      {isOpen && diagramEngine.currentSVG && (
        <div dangerouslySetInnerHTML={{ __html: diagramEngine.currentSVG.svgContent }} />
      )}
    </>
  );
}
```

---

## API Reference

### CodeToDiagramEngine

Core orchestrator class that coordinates all diagram generation.

#### Methods

##### `detect Language(code, fileExtension?): LanguageDetectionResult`
Detects programming language from code or file extension.

```typescript
const result = CodeParser.detectLanguage(code, 'app.js');
// Returns: { language: JAVASCRIPT, confidence: 0.95, method: 'extension' }
```

##### `analyzeCode(code, language): Promise<CodeAnalysisResult>`
Parses code and extracts semantic structure.

```typescript
const analysis = await engine.analyzeCode(code, SupportedLanguage.JAVASCRIPT);
// Returns: CodeAnalysisResult with functions, classes, control flow, variables
```

##### `buildAST(analysisResult): ASTNode`
Builds Abstract Syntax Tree from analysis result.

```typescript
const ast = await engine.buildAST(analysis);
// Returns: ASTNode tree with parent refs and metadata
```

##### `generateDiagram(ast, options): GeneratedDiagram`
Generates diagram from AST.

```typescript
const diagram = await engine.generateDiagram(ast, {
  type: DiagramType.FLOWCHART,
  language: SupportedLanguage.JAVASCRIPT,
  direction: DiagramDirection.TOP_DOWN,
});
```

##### `renderDiagram(diagram, options?): Promise<MermaidRenderResult>`
Renders diagram to SVG using Mermaid.

```typescript
const result = await engine.renderDiagram(diagram, {
  theme: DiagramTheme.DARK,
  width: 800,
  height: 600,
});
// Returns: { svgContent: string, renderTime: number, success: boolean }
```

##### `analyzeToDiagram(code, language, options): Promise<GeneratedDiagram>`
End-to-end: Code → Analysis → AST → Diagram.

```typescript
const diagram = await engine.analyzeToDiagram(
  code,
  SupportedLanguage.JAVASCRIPT,
  { type: DiagramType.FLOWCHART }
);
```

##### `analyzeToDiagramWithRender(code, language, options, renderOptions): Promise<MermaidRenderResult>`
End-to-end: Code → Diagram → SVG.

```typescript
const result = await engine.analyzeToDiagramWithRender(
  code,
  SupportedLanguage.JAVASCRIPT,
  { type: DiagramType.FLOWCHART },
  { theme: DiagramTheme.DARK }
);
```

---

### useCodeDiagramEngine Hook

React hook for integrating diagram engine with components.

#### Parameters
- `debounceMs` (default: 300) - Debounce code analysis
- `initialDiagramType` (default: FLOWCHART) - Initial diagram type
- `autoAnalyze` (default: true) - Auto-analyze on mount

#### Return Value
```typescript
{
  isLoading: boolean;
  error: CodeDiagramError | null;
  currentDiagram: GeneratedDiagram | null;
  currentSVG: MermaidRenderResult | null;
  
  analyzeCode: (code: string, language: SupportedLanguage) => Promise<void>;
  generateDiagram: (code: string, language: SupportedLanguage, options) => Promise<void>;
  switchDiagramType: (type: DiagramType) => Promise<void>;
  exportDiagram: (format: 'svg' | 'png' | 'json') => Promise<Blob | string | null>;
  clearDiagram: () => void;
  
  cacheStats: CacheStatistics;
  lastAnalyzedAt: number;
}
```

#### Usage Example
```typescript
function CodeEditor() {
  const engine = useCodeDiagramEngine(300, DiagramType.FLOWCHART, true);

  const handleCodeChange = (code: string) => {
    engine.analyzeCode(code, SupportedLanguage.JAVASCRIPT);
  };

  if (engine.isLoading) return <div>Analyzing...</div>;
  if (engine.error) return <div>Error: {engine.error.message}</div>;

  return (
    <div>
      <CodeInput onChange={handleCodeChange} />
      {engine.currentSVG && (
        <div dangerouslySetInnerHTML={{ __html: engine.currentSVG.svgContent }} />
      )}
    </div>
  );
}
```

---

### useDiagramStore (Zustand)

State management for diagram panel and user preferences.

#### Main Store
```typescript
const store = useDiagramStore();

// State access
store.isOpen;              // Panel open/closed
store.isLoading;           // Generation in progress
store.currentDiagram;      // Latest diagram
store.zoomLevel;           // Viewport zoom (0.5-3)
store.panX, store.panY;    // Viewport pan position

// State setters
store.setIsOpen(true);
store.setCurrentDiagram(diagram);
store.setZoomLevel(1.5);
store.setPan(100, 200);
```

#### Selector Hooks (Granular Updates)

```typescript
// State-only selectors (don't trigger re-render on action changes)
const { isOpen, isLoading, currentDiagram } = useDiagramPanelState();

// Control-only selectors (actions only)
const { setIsOpen, setCurrentDiagram } = useDiagramPanelControls();

// Preferences
const { theme, panelPosition, defaultDiagramType } = useDiagramPreferences();

// Viewport controls
const { zoomLevel, setZoomLevel, setPan } = useDiagramViewport();

// Batch actions
const { resetState, resetPreferences } = useDiagramActions();
```

#### Persistence
Preferences are automatically persisted to localStorage:
- Panel open/closed state
- User theme preference
- Default diagram type
- Panel position (left/right/bottom)

---

## Supported Languages

### Detection
Automatic detection based on:
1. **File extension** (highest priority, 0.95 confidence)
2. **Content analysis** (fallback)

### Supported Languages
```typescript
enum SupportedLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  JAVA = 'java',
  GO = 'go',
  RUST = 'rust',
  CPP = 'cpp',
  C = 'c',
  CSHARP = 'csharp',
  PLAINTEXT = 'plaintext',
}
```

### File Extensions
```
JavaScript:  .js, .jsx, .mjs
TypeScript:  .ts, .tsx
Python:      .py, .pyw
Java:        .java
Go:          .go
Rust:        .rs
C++:         .cpp, .cc, .cxx, .h, .hpp
C:           .c, .h
C#:          .cs
```

---

## Diagram Types

### 1. Flowchart (Default)
Visualizes function logic and control flow.

```
┌─────────────┐
│   START     │
└──────┬──────┘
       ↓
   ┌───────┐
   │ IF    │
   └───┬───┘
    ┌──┴──┐
    ↓     ↓
  [YES] [NO]
    ↓     ↓
  ...    ...
```

**Best for**: Understanding function logic, control flow paths

**Config**:
```typescript
{
  type: DiagramType.FLOWCHART,
  direction: DiagramDirection.TOP_DOWN,  // TD, BU, LR, RL
}
```

### 2. Sequence Diagram
Visualizes function-to-function interactions.

```
User       Function1       Function2
 │            │               │
 ├───call────→│               │
 │            ├───call───────→│
 │            │    return     │
 │            │←──────────────┤
 │            │    return     │
 │←───result──┤               │
```

**Best for**: Understanding call chains, async operations

**Config**:
```typescript
{
  type: DiagramType.SEQUENCE,
}
```

### 3. State Diagram
Visualizes state transitions and conditionals.

```
    ┌─────────┐
    │  START  │
    └────┬────┘
         ↓
    ┌─────────┐
    │ State 1 │
    └────┬────┘
         ↓
    ┌─────────┐
    │ State 2 │
    └────┬────┘
         ↓
    ┌─────────┐
    │   END   │
    └─────────┘
```

**Best for**: Visualizing conditional logic, state machines

**Config**:
```typescript
{
  type: DiagramType.STATE,
}
```

### 4. Class Diagram
Visualizes class structure and methods.

```
┌──────────────────┐
│   MyClass        │
├──────────────────┤
│ +property: type  │
├──────────────────┤
│ +method(): void  │
└──────────────────┘
```

**Best for**: Understanding class structure

**Config**:
```typescript
{
  type: DiagramType.CLASS,
}
```

---

## Error Handling

### Error Types

```typescript
enum ErrorType {
  PARSING_ERROR = 'PARSING_ERROR',
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  AST_GENERATION_ERROR = 'AST_GENERATION_ERROR',
  DIAGRAM_GENERATION_ERROR = 'DIAGRAM_GENERATION_ERROR',
  MERMAID_RENDER_ERROR = 'MERMAID_RENDER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNSUPPORTED_LANGUAGE = 'UNSUPPORTED_LANGUAGE',
}
```

### Error Interface
```typescript
interface CodeDiagramError {
  type: ErrorType;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  context?: any;
  timestamp: number;
}
```

### Error Handling in Component

```typescript
function DiagramPanel() {
  const { currentSVG, error, isLoading } = useCodeDiagramEngine();

  if (error) {
    return (
      <ErrorAlert 
        title="Diagram Generation Failed"
        message={error.message}
        type={error.severity}
      />
    );
  }

  if (isLoading) return <LoadingSpinner />;

  return <DiagramView svg={currentSVG?.svgContent} />;
}
```

---

## Performance Tips

### 1. Debouncing
Default 300ms debounce prevents analysis on every keystroke.

```typescript
// Increase for slower devices
const engine = useCodeDiagramEngine(500, DiagramType.FLOWCHART);

// Decrease for responsive feel
const engine = useCodeDiagramEngine(100, DiagramType.FLOWCHART);
```

### 2. Code Focusing (Optional)
Analyze only active function instead of whole file.

```typescript
const getActiveFunction = (code: string, cursorLine: number) => {
  // Extract function containing cursor line
  // Reduces parsing time by 70-80%
};
```

### 3. Caching
Cache automatically enabled. Check hit rate:

```typescript
const { cacheStats } = useCodeDiagramEngine();
console.log(`Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
```

### 4. Export Performance
SVG export is instant (< 5ms).
PNG export involves canvas conversion (50-100ms).

```typescript
// Fast
await engine.exportDiagram('svg');

// Slower
await engine.exportDiagram('png');
```

---

## Common Use Cases

### Use Case 1: Real-Time Diagram in Editor

```typescript
function EditorWithDiagram() {
  const engine = useCodeDiagramEngine();
  const { isOpen, setIsOpen } = useDiagramStore();

  return (
    <div className="editor-layout">
      <div className="editor-pane">
        <Editor onChange={(code) => engine.analyzeCode(code, JAVASCRIPT)} />
      </div>
      {isOpen && (
        <div className="diagram-pane">
          {engine.currentSVG && (
            <svg dangerouslySetInnerHTML={{ __html: engine.currentSVG.svgContent }} />
          )}
        </div>
      )}
    </div>
  );
}
```

### Use Case 2: Code Documentation

```typescript
function CodeDocumentation({ code, language }) {
  const [diagram, setDiagram] = useState<GeneratedDiagram | null>(null);

  useEffect(() => {
    engine.analyzeToDiagram(code, language, { type: DiagramType.FLOWCHART })
      .then(setDiagram);
  }, [code, language]);

  return (
    <div>
      <h2>Code Structure</h2>
      <Diagram diagram={diagram} />
    </div>
  );
}
```

### Use Case 3: Export for Presentation

```typescript
async function exportCodeDiagram(code: language) {
  const engine = new CodeToDiagramEngine();
  const diagram = await engine.analyzeToDiagram(
    code,
    language,
    { type: DiagramType.FLOWCHART }
  );

  // Export options
  const svgBlob = await engine.exportDiagram('svg');
  const pngBlob = await engine.exportDiagram('png');
  const jsonData = await engine.exportDiagram('json');

  // Download files
  downloadFile(svgBlob, 'diagram.svg');
  downloadFile(pngBlob, 'diagram.png');
}
```

---

## Debugging & Monitoring

### Enable Debug Mode

```typescript
const engine = new CodeToDiagramEngine({
  enableErrorLogging: true,
  enablePerformanceMonitoring: true,
});

// View cache stats
console.log(engine.getCacheStats());
// Output: { totalEntries: 5, hitRate: 0.45, totalSize: 12.5 }

// View last error
console.log(engine.getLastError());
```

### Performance Monitoring

```typescript
// In hook component
const { currentSVG } = useCodeDiagramEngine();

if (currentSVG?.renderTime > 500) {
  console.warn('Slow render:', currentSVG.renderTime);
}
```

### Browser DevTools

1. **Performance Tab**
   - Profile code parsing
   - Monitor rendering time
   - Check memory usage

2. **Network Tab**
   - Verify no external API calls (client-side only)
   - Monitor bundle size

3. **Storage Tab**
   - View localStorage for persisted preferences
   - Check cache size

---

## Troubleshooting

### Issue: Diagram not updating
**Cause**: Code change event not detected  
**Solution**: 
```typescript
// Ensure onChange handler is properly connected
<MonacoEditor 
  onChange={(newCode) => engine.analyzeCode(newCode, language)}
/>
```

### Issue: Slow performance on large files
**Cause**: Parsing entire file  
**Solution**:
```typescript
// Extract active function only
const activeFunc = getActiveFunction(code, cursorLine);
engine.analyzeCode(activeFunc, language);
```

### Issue: Mermaid not rendering
**Cause**: Mermaid library not imported  
**Solution**:
```bash
npm install mermaid
# or ensure mermaid is in dependencies
```

### Issue: Memory usage growing
**Cause**: Cache not being managed  
**Solution**:
```typescript
// Clear cache periodically
engine.clearCache();

// Or reset store
useDiagramStore().resetState();
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Today | Initial release |

---

## Support

- Documentation: See CODE_TO_DIAGRAM_ARCHITECTURE.md
- Integration Guide: See CODE_TO_DIAGRAM_INTEGRATION_GUIDE.md
- Type Definitions: See CODE_TO_DIAGRAM_TYPES.ts
- Source Code: See SynCodex Frontend/src/services/codeToDiagram/

