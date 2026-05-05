/**
 * CodeToDiagramEngine.ts
 * 
 * Main orchestrator for the Code-to-Diagram system.
 * Coordinates parser, AST builder, diagram generator, and Mermaid renderer.
 * 
 * All processing is CLIENT-SIDE ONLY for privacy.
 */

import CodeParser from './CodeParser';
import ASTBuilder from './ASTBuilder';
import DiagramGenerator from './DiagramGenerator';
import {
  SupportedLanguage,
  LanguageDetectionResult,
  CodeAnalysisResult,
  GeneratedDiagram,
  MermaidRenderResult,
  MermaidRenderOptions,
  DiagramGeneratorOptions,
  ICodeToDiagramEngine,
  EngineConfig,
  CodeDiagramError,
  ErrorType,
  CacheStatistics,
  DiagramPerformanceMetrics,
} from '../types/CODE_TO_DIAGRAM_TYPES';

export class CodeToDiagramEngine implements ICodeToDiagramEngine {
  private config: EngineConfig;
  private diagramCache = new Map<string, any>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastError: CodeDiagramError | null = null;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = {
      enableCache: true,
      cacheSizeLimit: 50, // MB
      maxCodeLength: 500000, // 500KB
      parsingTimeout: 5000, // 5 seconds
      renderingTimeout: 10000, // 10 seconds
      enableErrorLogging: true,
      enablePerformanceMonitoring: true,
      workerEnabled: false,
      ...config,
    };
  }

  /**
   * Detect language from code or file extension
   */
  public detectLanguage(
    code: string,
    fileExtension?: string
  ): LanguageDetectionResult {
    return CodeParser.detectLanguage(code, fileExtension);
  }

  /**
   * Analyze code and return structured representation
   */
  public async analyzeCode(
    code: string,
    language: SupportedLanguage
  ): Promise<CodeAnalysisResult> {
    const startTime = performance.now();

    try {
      // Validate input
      if (!code || code.length > this.config.maxCodeLength) {
        throw {
          type: ErrorType.INVALID_SYNTAX,
          message: 'Code exceeds maximum length',
          code: 'CODE_TOO_LONG',
          severity: 'error',
        } as CodeDiagramError;
      }

      // Parse code
      const result = await Promise.race([
        Promise.resolve(CodeParser.analyze(code, language)),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Parsing timeout')),
            this.config.parsingTimeout
          )
        ),
      ]);

      const endTime = performance.now();
      const metrics: DiagramPerformanceMetrics = {
        parsingTimeMs: endTime - startTime,
        astBuildingTimeMs: 0,
        diagramGenerationTimeMs: 0,
        renderingTimeMs: 0,
        totalTimeMs: 0,
        cacheHit: false,
        memoryUsedMb: 0,
      };

      return result;
    } catch (error) {
      this.handleError(
        error,
        ErrorType.PARSING_ERROR,
        'Failed to parse code'
      );
      throw this.lastError;
    }
  }

  /**
   * Build AST from analysis result
   */
  public async buildAST(analysisResult: CodeAnalysisResult) {
    const startTime = performance.now();

    try {
      const ast = ASTBuilder.buildAST(analysisResult);
      const endTime = performance.now();

      console.debug(
        `AST built in ${endTime - startTime}ms with ${ast.children?.length || 0} nodes`
      );

      return ast;
    } catch (error) {
      this.handleError(
        error,
        ErrorType.AST_GENERATION_ERROR,
        'Failed to build AST'
      );
      throw this.lastError;
    }
  }

  /**
   * Generate diagram from AST
   */
  public async generateDiagram(
    ast: any,
    options: DiagramGeneratorOptions
  ): Promise<GeneratedDiagram> {
    const startTime = performance.now();

    try {
      const diagram = DiagramGenerator.generate(ast, options);
      const endTime = performance.now();

      console.debug(`Diagram generated in ${endTime - startTime}ms`);

      return diagram;
    } catch (error) {
      this.handleError(
        error,
        ErrorType.DIAGRAM_GENERATION_ERROR,
        'Failed to generate diagram'
      );
      throw this.lastError;
    }
  }

  /**
   * Render Mermaid diagram to SVG
   */
  public async renderDiagram(
    diagram: GeneratedDiagram,
    options: MermaidRenderOptions = {}
  ): Promise<MermaidRenderResult> {
    const startTime = performance.now();

    try {
      // Dynamically import mermaid
      const mermaid = (await import('mermaid')).default;

      // Configure mermaid
      mermaid.initialize({
        startOnLoad: true,
        theme: options.theme || 'dark',
        securityLevel: 'loose',
      });

      // Create container
      const container = document.createElement('div');
      container.id = `mermaid_${Date.now()}`;
      container.style.display = 'none';

      // Render
      const { svg } = await mermaid.render(container.id, diagram.mermaidSyntax);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      return {
        svgContent: svg,
        width: options.width || 800,
        height: options.height || 600,
        mermaidVersion: (mermaid as any).version || '10.0.0',
        renderTime,
        success: true,
      };
    } catch (error) {
      this.handleError(
        error,
        ErrorType.MERMAID_RENDER_ERROR,
        'Failed to render Mermaid diagram'
      );
      return {
        svgContent: '',
        width: 0,
        height: 0,
        mermaidVersion: '',
        renderTime: 0,
        success: false,
        error: this.lastError?.message,
      };
    }
  }

  /**
   * End-to-end: Code -> Analysis -> AST -> Diagram
   */
  public async analyzeToDiagram(
    code: string,
    language: SupportedLanguage,
    options: DiagramGeneratorOptions
  ): Promise<GeneratedDiagram> {
    const cacheKey = this.generateCacheKey(code, language, options);

    // Check cache
    if (this.config.enableCache && this.diagramCache.has(cacheKey)) {
      this.cacheHits++;
      return this.diagramCache.get(cacheKey);
    }

    this.cacheMisses++;

    try {
      const analysis = await this.analyzeCode(code, language);
      const ast = await this.buildAST(analysis);
      const diagram = await this.generateDiagram(ast, options);

      // Cache result
      if (this.config.enableCache) {
        this.diagramCache.set(cacheKey, diagram);
        this.manageCacheSize();
      }

      return diagram;
    } catch (error) {
      throw error;
    }
  }

  /**
   * End-to-end: Code -> Diagram -> SVG
   */
  public async analyzeToDiagramWithRender(
    code: string,
    language: SupportedLanguage,
    options: DiagramGeneratorOptions,
    renderOptions: MermaidRenderOptions = {}
  ): Promise<MermaidRenderResult> {
    try {
      const diagram = await this.analyzeToDiagram(code, language, options);
      const rendered = await this.renderDiagram(diagram, renderOptions);
      return rendered;
    } catch (error) {
      return {
        svgContent: '',
        width: 0,
        height: 0,
        mermaidVersion: '',
        renderTime: 0,
        success: false,
        error: 'Failed to render diagram',
      };
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStatistics {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total === 0 ? 0 : this.cacheHits / total;

    return {
      totalEntries: this.diagramCache.size,
      totalSize: this.estimateCacheSize(),
      hitRate,
      missRate: 1 - hitRate,
      averageRetrievalTime: 2, // Estimate: ~2ms for cache hits
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.diagramCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get last error
   */
  public getLastError(): CodeDiagramError | null {
    return this.lastError;
  }

  /**
   * Private: Generate cache key
   */
  private generateCacheKey(
    code: string,
    language: SupportedLanguage,
    options: DiagramGeneratorOptions
  ): string {
    const hash = this.simpleHash(code + JSON.stringify(options));
    return `${language}_${options.type}_${hash}`;
  }

  /**
   * Private: Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Private: Estimate cache size in MB
   */
  private estimateCacheSize(): number {
    let totalSize = 0;
    this.diagramCache.forEach((diagram) => {
      totalSize +=
        JSON.stringify(diagram).length / (1024 * 1024); // Convert to MB
    });
    return totalSize;
  }

  /**
   * Private: Manage cache size
   */
  private manageCacheSize(): void {
    const currentSize = this.estimateCacheSize();

    if (currentSize > this.config.cacheSizeLimit) {
      // Remove oldest entries (FIFO)
      const entriesToDelete = Math.ceil(this.diagramCache.size * 0.2); // Delete 20%
      let deleted = 0;

      for (const key of this.diagramCache.keys()) {
        if (deleted >= entriesToDelete) break;
        this.diagramCache.delete(key);
        deleted++;
      }
    }
  }

  /**
   * Private: Handle errors
   */
  private handleError(
    error: any,
    type: ErrorType,
    message: string
  ): void {
    this.lastError = {
      type,
      message,
      code: type,
      severity: 'error',
      context: error,
      timestamp: Date.now(),
    };

    if (this.config.enableErrorLogging) {
      console.error(`[CodeToDiagramEngine] ${message}:`, error);
    }
  }
}

// Export singleton instance
export const codeToDiagramEngine = new CodeToDiagramEngine({
  enableCache: true,
  enableErrorLogging: true,
  enablePerformanceMonitoring: true,
});

export default codeToDiagramEngine;
