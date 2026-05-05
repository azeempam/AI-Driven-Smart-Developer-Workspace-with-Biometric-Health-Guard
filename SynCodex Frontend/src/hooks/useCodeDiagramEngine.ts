/**
 * useCodeDiagramEngine.ts
 * 
 * React hook for integrating Code-to-Diagram engine with Monaco editor.
 * Handles real-time updates, debouncing, and state management.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  GeneratedDiagram,
  DiagramType,
  DiagramGeneratorOptions,
  MermaidRenderOptions,
  MermaidRenderResult,
  CodeDiagramError,
  SupportedLanguage,
  DiagramTheme,
} from '../types/CODE_TO_DIAGRAM_TYPES';
import { codeToDiagramEngine } from '../services/codeToDiagram/CodeToDiagramEngine';

export interface UseDiagramEngineReturn {
  // State
  isLoading: boolean;
  error: CodeDiagramError | null;
  currentDiagram: GeneratedDiagram | null;
  currentSVG: MermaidRenderResult | null;

  // Actions
  analyzeCode: (code: string, language: SupportedLanguage) => Promise<void>;
  generateDiagram: (
    code: string,
    language: SupportedLanguage,
    options: Partial<DiagramGeneratorOptions>
  ) => Promise<void>;
  switchDiagramType: (type: DiagramType) => Promise<void>;
  exportDiagram: (format: 'svg' | 'png' | 'json') => Promise<Blob | string | null>;
  clearDiagram: () => void;

  // Cache & Performance
  cacheStats: any;
  lastAnalyzedAt: number;
}

/**
 * Hook for managing diagram generation and rendering
 */
export function useCodeDiagramEngine(
  debounceMs: number = 300,
  initialDiagramType: DiagramType = DiagramType.FLOWCHART,
  autoAnalyze: boolean = true
): UseDiagramEngineReturn {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CodeDiagramError | null>(null);
  const [currentDiagram, setCurrentDiagram] = useState<GeneratedDiagram | null>(null);
  const [currentSVG, setCurrentSVG] = useState<MermaidRenderResult | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(0);
  const [diagramType, setDiagramType] = useState<DiagramType>(initialDiagramType);
  const [language, setLanguage] = useState<SupportedLanguage>(SupportedLanguage.JAVASCRIPT);

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastCodeHashRef = useRef<string>('');

  /**
   * Simple hash for code to detect changes
   */
  const hashCode = useCallback((code: string): string => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }
    return Math.abs(hash).toString(36);
  }, []);

  /**
   * Analyze code and generate diagram
   */
  const analyzeAndRender = useCallback(
    async (code: string, lang: SupportedLanguage) => {
      // Skip if code hasn't changed
      const codeHash = hashCode(code);
      if (codeHash === lastCodeHashRef.current) {
        return;
      }

      lastCodeHashRef.current = codeHash;
      setIsLoading(true);
      setError(null);

      try {
        const options: DiagramGeneratorOptions = {
          type: diagramType,
          language: lang,
          direction: undefined,
          theme: DiagramTheme.DARK,
        };

        // Generate diagram
        const diagram = await codeToDiagramEngine.analyzeToDiagram(
          code,
          lang,
          options
        );

        setCurrentDiagram(diagram);

        // Render to SVG
        const renderOptions: MermaidRenderOptions = {
          theme: DiagramTheme.DARK,
          width: 800,
          height: 600,
          scale: 1,
        };

        const svg = await codeToDiagramEngine.renderDiagram(diagram, renderOptions);
        setCurrentSVG(svg);

        setLastAnalyzedAt(Date.now());
      } catch (err) {
        const engineError = codeToDiagramEngine.getLastError();
        setError(engineError);
        console.error('Diagram generation failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [diagramType, hashCode]
  );

  /**
   * Debounced analyze function
   */
  const analyzeCode = useCallback(
    async (code: string, lang: SupportedLanguage) => {
      setLanguage(lang);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        analyzeAndRender(code, lang);
      }, debounceMs);
    },
    [debounceMs, analyzeAndRender]
  );

  /**
   * Generate diagram with custom options
   */
  const generateDiagram = useCallback(
    async (
      code: string,
      lang: SupportedLanguage,
      options: Partial<DiagramGeneratorOptions>
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const mergedOptions: DiagramGeneratorOptions = {
          type: options.type || diagramType,
          language: lang,
          direction: options.direction,
          theme: options.theme || DiagramTheme.DARK,
        };

        const diagram = await codeToDiagramEngine.analyzeToDiagram(
          code,
          lang,
          mergedOptions
        );

        setCurrentDiagram(diagram);

        // Auto-render
        const svg = await codeToDiagramEngine.renderDiagram(diagram, {
          theme: DiagramTheme.DARK,
        });

        setCurrentSVG(svg);
      } catch (err) {
        const engineError = codeToDiagramEngine.getLastError();
        setError(engineError);
      } finally {
        setIsLoading(false);
      }
    },
    [diagramType]
  );

  /**
   * Switch diagram type and re-render
   */
  const switchDiagramType = useCallback(
    async (type: DiagramType) => {
      setDiagramType(type);

      if (currentDiagram) {
        setIsLoading(true);
        setError(null);

        try {
          const options: DiagramGeneratorOptions = {
            type,
            language,
            theme: DiagramTheme.DARK,
          };

          const diagram = await codeToDiagramEngine.generateDiagram(
            { children: [] } as any,
            options
          );

          setCurrentDiagram(diagram);

          const svg = await codeToDiagramEngine.renderDiagram(diagram, {
            theme: DiagramTheme.DARK,
          });

          setCurrentSVG(svg);
        } catch (err) {
          const engineError = codeToDiagramEngine.getLastError();
          setError(engineError);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [currentDiagram, language]
  );

  /**
   * Export diagram
   */
  const exportDiagram = useCallback(
    async (format: 'svg' | 'png' | 'json'): Promise<Blob | string | null> => {
      if (!currentSVG && format !== 'json') {
        console.warn('No SVG to export');
        return null;
      }

      if (format === 'svg' && currentSVG?.svgContent) {
        const blob = new Blob([currentSVG.svgContent], { type: 'image/svg+xml' });
        return blob;
      }

      if (format === 'json' && currentDiagram) {
        const json = JSON.stringify(currentDiagram, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        return blob;
      }

      if (format === 'png' && currentSVG?.svgContent) {
        // Convert SVG to PNG using Canvas
        return exportSVGToPNG(currentSVG.svgContent);
      }

      return null;
    },
    [currentSVG, currentDiagram]
  );

  /**
   * Clear diagram
   */
  const clearDiagram = useCallback(() => {
    setCurrentDiagram(null);
    setCurrentSVG(null);
    setError(null);
    lastCodeHashRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    error,
    currentDiagram,
    currentSVG,
    analyzeCode,
    generateDiagram,
    switchDiagramType,
    exportDiagram,
    clearDiagram,
    cacheStats: codeToDiagramEngine.getCacheStats(),
    lastAnalyzedAt,
  };
}

/**
 * Helper: Convert SVG to PNG
 */
async function exportSVGToPNG(svgContent: string): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const img = new Image();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(resolve, 'image/png');
        URL.revokeObjectURL(url);
      };

      img.src = url;
    });
  } catch (error) {
    console.error('Failed to export PNG:', error);
    return null;
  }
}

export default useCodeDiagramEngine;
