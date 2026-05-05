/**
 * CODE_TO_DIAGRAM_TYPES.ts
 * 
 * Comprehensive TypeScript interfaces and type definitions for the
 * AI Code-to-Diagram Engine. Ensures type safety across all modules.
 * 
 * @author SynCodex Architecture Team
 * @version 2.0.0
 */

// ============================================================================
// 1. LANGUAGE & CODE ANALYSIS TYPES
// ============================================================================

/**
 * Supported programming languages for code analysis
 */
export enum SupportedLanguage {
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

/**
 * Represents the result of code language detection
 */
export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number; // 0-1, higher is more confident
  fileExtension: string;
  detectionMethod: 'extension' | 'content' | 'user-specified';
}

/**
 * Raw code analysis result with metadata
 */
export interface CodeAnalysisResult {
  language: SupportedLanguage;
  rawCode: string;
  originalLineCount: number;
  cleanedCode: string;
  normalizedCode: string;
  functions: FunctionDefinition[];
  classes: ClassDefinition[];
  imports: ImportStatement[];
  controlFlowStatements: ControlFlowStatement[];
  variables: VariableDeclaration[];
  metadata: {
    complexity: number; // Cyclomatic complexity estimate
    depth: number; // Max nesting depth
    hasAsync: boolean;
    hasTypeScript: boolean;
  };
}

// ============================================================================
// 2. AST NODE TYPES
// ============================================================================

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  id: string; // Unique identifier (UUID or deterministic hash)
  type: ASTNodeType;
  name: string;
  lineStart: number;
  lineEnd: number;
  children: ASTNode[];
  parent?: ASTNode;
  metadata: NodeMetadata;
}

/**
 * Types of AST nodes that can be represented
 */
export enum ASTNodeType {
  // Control Flow
  FUNCTION = 'FUNCTION',
  CLASS = 'CLASS',
  INTERFACE = 'INTERFACE',
  METHOD = 'METHOD',
  CONSTRUCTOR = 'CONSTRUCTOR',
  
  // Control Structures
  IF_STATEMENT = 'IF_STATEMENT',
  ELSE_STATEMENT = 'ELSE_STATEMENT',
  SWITCH_STATEMENT = 'SWITCH_STATEMENT',
  FOR_LOOP = 'FOR_LOOP',
  WHILE_LOOP = 'WHILE_LOOP',
  DO_WHILE_LOOP = 'DO_WHILE_LOOP',
  TRY_CATCH = 'TRY_CATCH',
  
  // Data/Variables
  VARIABLE_DECLARATION = 'VARIABLE_DECLARATION',
  PARAMETER = 'PARAMETER',
  RETURN_STATEMENT = 'RETURN_STATEMENT',
  OBJECT_LITERAL = 'OBJECT_LITERAL',
  ARRAY_LITERAL = 'ARRAY_LITERAL',
  
  // Function Calls & Operations
  FUNCTION_CALL = 'FUNCTION_CALL',
  ASYNC_CALL = 'ASYNC_CALL',
  PROMISE_CHAIN = 'PROMISE_CHAIN',
  METHOD_CALL = 'METHOD_CALL',
  
  // Other
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  COMMENT = 'COMMENT',
  BLOCK = 'BLOCK',
}

/**
 * Metadata associated with each AST node
 */
export interface NodeMetadata {
  isAsync?: boolean;
  isStatic?: boolean;
  isPrivate?: boolean;
  isExported?: boolean;
  complexity?: number;
  parameterCount?: number;
  returnType?: string;
  description?: string;
  hasError?: boolean;
  errorMessage?: string;
}

/**
 * Function definition extracted from code
 */
export interface FunctionDefinition extends ASTNode {
  type: ASTNodeType.FUNCTION | ASTNodeType.METHOD | ASTNodeType.CONSTRUCTOR;
  name: string;
  parameters: Parameter[];
  returnType?: string;
  isAsync: boolean;
  isArrow: boolean;
  bodyStatements: ASTNode[];
  callGraph: CallNode[]; // Functions this calls
  calledBy: CallNode[]; // Functions that call this
}

/**
 * Parameter of a function
 */
export interface Parameter {
  name: string;
  type?: string;
  isOptional?: boolean;
  isRest?: boolean;
  defaultValue?: string;
}

/**
 * Function call in the call graph
 */
export interface CallNode {
  functionName: string;
  nodeId: string;
  lineNumber: number;
  isAsync: boolean;
  arguments?: string[];
}

/**
 * Class definition
 */
export interface ClassDefinition extends ASTNode {
  type: ASTNodeType.CLASS | ASTNodeType.INTERFACE;
  name: string;
  parent?: string; // Parent class name
  implements?: string[]; // Interfaces implemented
  methods: FunctionDefinition[];
  properties: PropertyDefinition[];
  constructors: FunctionDefinition[];
}

/**
 * Class property
 */
export interface PropertyDefinition {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  defaultValue?: string;
}

/**
 * Import/module reference
 */
export interface ImportStatement extends ASTNode {
  type: ASTNodeType.IMPORT;
  moduleName: string;
  items: string[];
  isDefault: boolean;
}

/**
 * Variable declaration
 */
export interface VariableDeclaration extends ASTNode {
  type: ASTNodeType.VARIABLE_DECLARATION;
  name: string;
  dataType?: string;
  initialValue?: string;
  scope: 'global' | 'function' | 'block';
}

/**
 * Control flow statement (if, loop, try-catch, etc.)
 */
export interface ControlFlowStatement extends ASTNode {
  type: ASTNodeType.IF_STATEMENT | ASTNodeType.FOR_LOOP | ASTNodeType.WHILE_LOOP | ASTNodeType.TRY_CATCH | ASTNodeType.SWITCH_STATEMENT;
  condition?: string;
  branches?: ControlFlowBranch[];
}

/**
 * Branch of a control flow statement
 */
export interface ControlFlowBranch {
  type: 'if' | 'else-if' | 'else' | 'case' | 'default' | 'try' | 'catch' | 'finally';
  condition?: string;
  statements: ASTNode[];
}

// ============================================================================
// 3. DIAGRAM TYPES
// ============================================================================

/**
 * Supported diagram types
 */
export enum DiagramType {
  FLOWCHART = 'flowchart',
  SEQUENCE = 'sequence',
  STATE = 'state',
  CLASS = 'class',
  MINDMAP = 'mindmap',
  GANTT = 'gantt',
}

/**
 * Diagram direction (for flowchart)
 */
export enum DiagramDirection {
  TOP_DOWN = 'TD',
  BOTTOM_UP = 'BU',
  LEFT_RIGHT = 'LR',
  RIGHT_LEFT = 'RL',
}

/**
 * Generated diagram representation
 */
export interface GeneratedDiagram {
  id: string; // Unique diagram ID
  type: DiagramType;
  title: string;
  description?: string;
  mermaidSyntax: string; // Raw Mermaid.js syntax
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  metadata: DiagramMetadata;
  createdAt: number; // Timestamp
  lastUpdated: number;
  sourceASTNodes: string[]; // IDs of AST nodes that generated this
}

/**
 * Node in a diagram
 */
export interface DiagramNode {
  id: string;
  label: string;
  type: DiagramNodeType;
  shape?: DiagramNodeShape;
  style?: DiagramNodeStyle;
  sourceLineNumber?: number;
  sourceASTNodeId?: string;
}

/**
 * Types of nodes in a diagram
 */
export enum DiagramNodeType {
  START = 'start',
  END = 'end',
  PROCESS = 'process',
  DECISION = 'decision',
  LOOP = 'loop',
  INPUT_OUTPUT = 'io',
  FUNCTION_CALL = 'function_call',
  ERROR = 'error',
  PARALLEL = 'parallel',
}

/**
 * Shape of a diagram node
 */
export enum DiagramNodeShape {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  DIAMOND = 'diamond',
  ROUNDED = 'rounded',
  STADIUM = 'stadium',
  SUBROUTINE = 'subroutine',
  CYLINDER = 'cylinder',
  HEXAGON = 'hexagon',
}

/**
 * Styling for diagram nodes
 */
export interface DiagramNodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
}

/**
 * Edge/connection between nodes
 */
export interface DiagramEdge {
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  type: DiagramEdgeType;
  style?: DiagramEdgeStyle;
}

/**
 * Types of edges
 */
export enum DiagramEdgeType {
  FLOW = 'flow',
  CALL = 'call',
  ASYNC_CALL = 'async_call',
  CONDITION_TRUE = 'condition_true',
  CONDITION_FALSE = 'condition_false',
  RETURN = 'return',
  THROW = 'throw',
}

/**
 * Edge styling
 */
export interface DiagramEdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  arrowType?: 'solid' | 'dashed' | 'dotted';
  label?: string;
  labelPosition?: 'top' | 'middle' | 'bottom';
}

/**
 * Metadata for a diagram
 */
export interface DiagramMetadata {
  complexity: number;
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  hasLoops: boolean;
  hasAsyncOperations: boolean;
  theme?: DiagramTheme;
  language: SupportedLanguage;
}

/**
 * Diagram theme
 */
export enum DiagramTheme {
  DEFAULT = 'default',
  DARK = 'dark',
  LIGHT = 'light',
  FOREST = 'forest',
  NEUTRAL = 'neutral',
}

// ============================================================================
// 4. GENERATOR & RENDERER TYPES
// ============================================================================

/**
 * Options for diagram generation
 */
export interface DiagramGeneratorOptions {
  type: DiagramType;
  language: SupportedLanguage;
  focusFunction?: string; // Optional: focus on specific function
  maxDepth?: number; // Max call stack depth to show
  includeTypes?: boolean;
  includeComments?: boolean;
  showCallStack?: boolean;
  direction?: DiagramDirection;
  theme?: DiagramTheme;
  customNodeLabels?: Record<string, string>;
}

/**
 * Options for Mermaid rendering
 */
export interface MermaidRenderOptions {
  theme?: DiagramTheme;
  width?: number;
  height?: number;
  scale?: number;
  format?: 'svg' | 'png' | 'pdf';
  backgroundColor?: string;
  fontFamily?: string;
  useMaxWidth?: boolean;
}

/**
 * Result of Mermaid rendering
 */
export interface MermaidRenderResult {
  svgContent: string;
  width: number;
  height: number;
  mermaidVersion: string;
  renderTime: number; // milliseconds
  success: boolean;
  error?: string;
}

// ============================================================================
// 5. CACHE & STORAGE TYPES
// ============================================================================

/**
 * Cached diagram entry
 */
export interface CachedDiagram {
  id: string;
  codeHash: string; // Hash of source code
  astHash: string; // Hash of AST
  diagram: GeneratedDiagram;
  svgContent: string;
  createdAt: number;
  expiresAt?: number;
}

/**
 * Parser cache entry
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  hash: string; // Content hash for validation
  createdAt: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number; // 0-1
  missRate: number;
  averageRetrievalTime: number; // milliseconds
}

// ============================================================================
// 6. ERROR & LOGGING TYPES
// ============================================================================

/**
 * Error that occurs during code analysis or rendering
 */
export interface CodeDiagramError {
  type: ErrorType;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  lineNumber?: number;
  columnNumber?: number;
  suggestion?: string;
  context?: any;
  timestamp: number;
}

/**
 * Types of errors that can occur
 */
export enum ErrorType {
  PARSING_ERROR = 'PARSING_ERROR',
  LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED',
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  AST_GENERATION_ERROR = 'AST_GENERATION_ERROR',
  DIAGRAM_GENERATION_ERROR = 'DIAGRAM_GENERATION_ERROR',
  MERMAID_RENDER_ERROR = 'MERMAID_RENDER_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Log entry for debugging and monitoring
 */
export interface DiagramEngineLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: {
    language?: SupportedLanguage;
    diagramType?: DiagramType;
    codeLength?: number;
    processingTime?: number;
    error?: CodeDiagramError;
  };
}

// ============================================================================
// 7. UI & COMPONENT TYPES
// ============================================================================

/**
 * State of the diagram panel
 */
export interface DiagramPanelState {
  isOpen: boolean;
  isLoading: boolean;
  currentDiagram: GeneratedDiagram | null;
  selectedNode: DiagramNode | null;
  zoomLevel: number; // 0.5 - 3.0
  panX: number;
  panY: number;
  width: number;
  height: number;
  error: CodeDiagramError | null;
  diagramType: DiagramType;
  theme: DiagramTheme;
}

/**
 * User preferences for diagram panel
 */
export interface DiagramPanelPreferences {
  defaultDiagramType: DiagramType;
  autoUpdate: boolean;
  updateDebounceMs: number;
  showTypes: boolean;
  showComments: boolean;
  theme: DiagramTheme;
  panelPosition: 'left' | 'right' | 'bottom';
  panelSize: 'small' | 'medium' | 'large';
  enableExport: boolean;
  cacheSize: number; // MB
}

/**
 * Event triggered by diagram interactions
 */
export interface DiagramInteractionEvent {
  type: DiagramInteractionType;
  timestamp: number;
  nodeId?: string;
  sourceLineNumber?: number;
  data?: any;
}

/**
 * Types of diagram interactions
 */
export enum DiagramInteractionType {
  NODE_CLICKED = 'NODE_CLICKED',
  NODE_HOVERED = 'NODE_HOVERED',
  EDGE_CLICKED = 'EDGE_CLICKED',
  ZOOM_CHANGED = 'ZOOM_CHANGED',
  PAN_CHANGED = 'PAN_CHANGED',
  DIAGRAM_TYPE_CHANGED = 'DIAGRAM_TYPE_CHANGED',
  EXPORT_REQUESTED = 'EXPORT_REQUESTED',
}

// ============================================================================
// 8. ENGINE & MANAGER TYPES
// ============================================================================

/**
 * Main code-to-diagram engine interface
 */
export interface ICodeToDiagramEngine {
  // Analysis
  analyzeCode(code: string, language: SupportedLanguage): Promise<CodeAnalysisResult>;
  detectLanguage(code: string, fileExtension?: string): LanguageDetectionResult;
  
  // AST Building
  buildAST(analysisResult: CodeAnalysisResult): Promise<ASTNode>;
  
  // Diagram Generation
  generateDiagram(
    ast: ASTNode,
    options: DiagramGeneratorOptions
  ): Promise<GeneratedDiagram>;
  
  // Rendering
  renderDiagram(
    diagram: GeneratedDiagram,
    options: MermaidRenderOptions
  ): Promise<MermaidRenderResult>;
  
  // Batch operations
  analyzeToDiagram(
    code: string,
    language: SupportedLanguage,
    options: DiagramGeneratorOptions
  ): Promise<GeneratedDiagram>;
  
  analyzeToDiagramWithRender(
    code: string,
    language: SupportedLanguage,
    options: DiagramGeneratorOptions,
    renderOptions: MermaidRenderOptions
  ): Promise<MermaidRenderResult>;
  
  // Cache management
  getCacheStats(): CacheStatistics;
  clearCache(): void;
  
  // Error handling
  getLastError(): CodeDiagramError | null;
}

/**
 * Configuration for the engine
 */
export interface EngineConfig {
  enableCache: boolean;
  cacheSizeLimit: number; // MB
  maxCodeLength: number; // characters
  parsingTimeout: number; // milliseconds
  renderingTimeout: number;
  enableErrorLogging: boolean;
  enablePerformanceMonitoring: boolean;
  workerEnabled: boolean; // Use Web Worker for parsing
  theme: DiagramTheme;
  language: SupportedLanguage;
}

// ============================================================================
// 9. INTEGRATION & HOOK TYPES
// ============================================================================

/**
 * Hook for managing diagram generation and state
 */
export interface UseDiagramEngineReturn {
  // State
  isLoading: boolean;
  error: CodeDiagramError | null;
  currentDiagram: GeneratedDiagram | null;
  panelState: DiagramPanelState;
  
  // Actions
  analyzCode: (code: string, language: SupportedLanguage) => Promise<void>;
  generateDiagram: (options: Partial<DiagramGeneratorOptions>) => Promise<void>;
  switchDiagramType: (type: DiagramType) => Promise<void>;
  exportDiagram: (format: 'svg' | 'png' | 'pdf') => Promise<Blob>;
  togglePanel: () => void;
  clearDiagram: () => void;
  
  // Cache
  cacheStats: CacheStatistics;
}

/**
 * Hook for Monaco Editor integration
 */
export interface UseCodeChangeListenerReturn {
  onCodeChange: (code: string, language: SupportedLanguage) => Promise<void>;
  debounceMs: number;
  isProcessing: boolean;
  lastAnalyzedAt: number;
}

// ============================================================================
// 10. EXPORT TYPES
// ============================================================================

/**
 * Exported diagram file metadata
 */
export interface ExportedDiagramFile {
  id: string;
  title: string;
  format: 'svg' | 'png' | 'pdf' | 'mermaid';
  content: string | Blob;
  metadata: {
    sourceLanguage: SupportedLanguage;
    diagramType: DiagramType;
    generatedAt: number;
    generatedBy: string; // SynCodex version
  };
}

/**
 * Batch export configuration
 */
export interface BatchExportConfig {
  diagramIds: string[];
  format: 'svg' | 'png' | 'pdf' | 'markdown' | 'json';
  includeMetadata: boolean;
  zipOutput: boolean;
}

// ============================================================================
// 11. METRICS & MONITORING TYPES
// ============================================================================

/**
 * Performance metrics for diagram generation
 */
export interface DiagramPerformanceMetrics {
  parsingTimeMs: number;
  astBuildingTimeMs: number;
  diagramGenerationTimeMs: number;
  renderingTimeMs: number;
  totalTimeMs: number;
  cacheHit: boolean;
  memoryUsedMb: number;
}

/**
 * Aggregated engine statistics
 */
export interface EngineStatistics {
  totalCodeAnalyzed: number;
  totalDiagrams generated: number;
  averageParsingTimeMs: number;
  averageRenderingTimeMs: number;
  errorCount: number;
  successRate: number;
  cacheHitRate: number;
}

export default {
  SupportedLanguage,
  DiagramType,
  ASTNodeType,
  DiagramNodeType,
  ErrorType,
  DiagramInteractionType,
};
