/**
 * CodeParser.ts
 * 
 * Lightweight regex-based code parser for language detection and code extraction.
 * Supports JavaScript, TypeScript, Python, Java, Go, Rust, and more.
 * 
 * Design: Client-side only, no external dependencies.
 */

import {
  SupportedLanguage,
  LanguageDetectionResult,
  CodeAnalysisResult,
  FunctionDefinition,
  ClassDefinition,
  ImportStatement,
  ControlFlowStatement,
  VariableDeclaration,
  ASTNodeType,
  Parameter,
  CallNode,
} from '../../types/CODE_TO_DIAGRAM_TYPES';

export class CodeParser {
  /**
   * Language detection based on file extension and code heuristics
   */
  static detectLanguage(
    code: string,
    fileExtension?: string
  ): LanguageDetectionResult {
    // Check file extension first (highest confidence)
    if (fileExtension) {
      const ext = fileExtension.toLowerCase();
      const extMap: Record<string, SupportedLanguage> = {
        '.js': SupportedLanguage.JAVASCRIPT,
        '.ts': SupportedLanguage.TYPESCRIPT,
        '.py': SupportedLanguage.PYTHON,
        '.java': SupportedLanguage.JAVA,
        '.go': SupportedLanguage.GO,
        '.rs': SupportedLanguage.RUST,
        '.cpp': SupportedLanguage.CPP,
        '.c': SupportedLanguage.C,
        '.cs': SupportedLanguage.CSHARP,
      };

      if (extMap[ext]) {
        return {
          language: extMap[ext],
          confidence: 0.95,
          fileExtension: ext,
          detectionMethod: 'extension',
        };
      }
    }

    // Fall back to content analysis
    return this.detectLanguageByContent(code);
  }

  /**
   * Detect language by analyzing code content patterns
   */
  private static detectLanguageByContent(code: string): LanguageDetectionResult {
    const scored: Record<SupportedLanguage, number> = {
      [SupportedLanguage.JAVASCRIPT]: 0,
      [SupportedLanguage.TYPESCRIPT]: 0,
      [SupportedLanguage.PYTHON]: 0,
      [SupportedLanguage.JAVA]: 0,
      [SupportedLanguage.GO]: 0,
      [SupportedLanguage.RUST]: 0,
      [SupportedLanguage.CPP]: 0,
      [SupportedLanguage.C]: 0,
      [SupportedLanguage.CSHARP]: 0,
      [SupportedLanguage.PLAINTEXT]: 0,
    };

    // JavaScript/TypeScript patterns
    if (/\b(function|const|let|var|async|await|promise|\.then\(|\.catch\()\b/.test(code)) {
      scored[SupportedLanguage.JAVASCRIPT] += 2;
    }
    if (/:\s*(string|number|boolean|void|interface|type|generic)\b/.test(code)) {
      scored[SupportedLanguage.TYPESCRIPT] += 3;
    }

    // Python patterns
    if (/\b(def|class|import|from|if __name__|self|@decorator|yield)\b/.test(code)) {
      scored[SupportedLanguage.PYTHON] += 3;
    }
    if (/^\s+(if|elif|else|for|while|def|class):/m.test(code)) {
      scored[SupportedLanguage.PYTHON] += 2;
    }

    // Java patterns
    if (/\b(public|private|protected|class|interface|extends|implements|void|String|int|boolean)\b/.test(code)) {
      scored[SupportedLanguage.JAVA] += 2;
    }
    if (/\bpublic\s+static\s+void\s+main\s*\(/.test(code)) {
      scored[SupportedLanguage.JAVA] += 5;
    }

    // Go patterns
    if (/\b(package|func|import|defer|goroutine|chan|interface{})\b/.test(code)) {
      scored[SupportedLanguage.GO] += 3;
    }

    // Rust patterns
    if (/\b(fn|let|mut|impl|trait|pub|unsafe|match|Result|Option)\b/.test(code)) {
      scored[SupportedLanguage.RUST] += 2;
    }

    // C/C++ patterns
    if (/\b(#include|void|int|char|malloc|free|struct|typedef)\b/.test(code)) {
      scored[SupportedLanguage.CPP] += 1;
    }
    if (/\b(namespace|template|class|public:|private:|std::)\b/.test(code)) {
      scored[SupportedLanguage.CPP] += 2;
    }

    // C# patterns
    if (/\b(using|namespace|public|private|class|interface|void|string|int)\b/.test(code)) {
      scored[SupportedLanguage.CSHARP] += 1;
    }
    if (/\b(async|await|Task|Func|Action|LINQ|var)\b/.test(code)) {
      scored[SupportedLanguage.CSHARP] += 2;
    }

    // Find the language with the highest score
    const sorted = Object.entries(scored).sort(([, a], [, b]) => b - a);
    const [language, score] = sorted[0];

    return {
      language: language as SupportedLanguage,
      confidence: Math.min(1, score / 10),
      fileExtension: 'unknown',
      detectionMethod: 'content',
    };
  }

  /**
   * Normalize code: remove comments, extra whitespace, etc.
   */
  static normalizeCode(code: string, language: SupportedLanguage): string {
    let normalized = code;

    if (language === SupportedLanguage.PYTHON) {
      // Remove Python comments
      normalized = normalized.replace(/#.*/g, '');
    } else {
      // Remove single-line comments (// or #)
      normalized = normalized.replace(/\/\/.*$/gm, '');
      normalized = normalized.replace(/#.*$/gm, '');

      // Remove multi-line comments (/* ... */)
      normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    // Normalize whitespace
    normalized = normalized.replace(/\n\s*\n/g, '\n'); // Remove empty lines
    normalized = normalized.replace(/\s+/g, ' '); // Multiple spaces to single

    return normalized.trim();
  }

  /**
   * Extract function definitions from code
   */
  static extractFunctions(code: string, language: SupportedLanguage): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];
    let functionIndex = 0;

    if (language === SupportedLanguage.JAVASCRIPT || language === SupportedLanguage.TYPESCRIPT) {
      this.extractJSFunctions(code, functions, functionIndex);
    } else if (language === SupportedLanguage.PYTHON) {
      this.extractPythonFunctions(code, functions, functionIndex);
    } else if (language === SupportedLanguage.JAVA) {
      this.extractJavaFunctions(code, functions, functionIndex);
    }

    return functions;
  }

  /**
   * Extract JavaScript/TypeScript functions
   */
  private static extractJSFunctions(
    code: string,
    functions: FunctionDefinition[],
    startIndex: number
  ): void {
    // Regex for function declarations
    const funcRegex = /(?:async\s+)?(?:function|const|let)\s+(\w+)\s*(?:=\s*)?(?:async\s*)?\(?([^)]*)\)?(?:\s*:\s*([^{=]*?))?(?:\s*[={]|=>)/g;
    let match;

    while ((match = funcRegex.exec(code)) !== null) {
      const [fullMatch, name, paramsStr, returnType] = match;
      const lineStart = code.substring(0, match.index).split('\n').length;

      const func: FunctionDefinition = {
        id: `func_${startIndex++}`,
        type: ASTNodeType.FUNCTION,
        name,
        lineStart,
        lineEnd: lineStart + 10, // Estimate
        children: [],
        parameters: this.parseParameters(paramsStr),
        returnType,
        isAsync: /async/.test(fullMatch),
        isArrow: /=>/.test(fullMatch),
        bodyStatements: [],
        callGraph: [],
        calledBy: [],
        metadata: {
          isAsync: /async/.test(fullMatch),
          parameterCount: this.parseParameters(paramsStr).length,
        },
      };

      functions.push(func);
    }
  }

  /**
   * Extract Python functions
   */
  private static extractPythonFunctions(
    code: string,
    functions: FunctionDefinition[],
    startIndex: number
  ): void {
    const funcRegex = /^\s*(?:async\s+)?def\s+(\w+)\s*\(\s*([^)]*)\s*\)\s*(?:->\s*([^:]*))?\s*:/gm;
    let match;

    while ((match = funcRegex.exec(code)) !== null) {
      const [, name, paramsStr, returnType] = match;
      const lineStart = code.substring(0, match.index).split('\n').length;

      const func: FunctionDefinition = {
        id: `func_${startIndex++}`,
        type: ASTNodeType.FUNCTION,
        name,
        lineStart,
        lineEnd: lineStart + 10,
        children: [],
        parameters: this.parseParameters(paramsStr),
        returnType,
        isAsync: /async/.test(match[0]),
        isArrow: false,
        bodyStatements: [],
        callGraph: [],
        calledBy: [],
        metadata: {
          isAsync: /async/.test(match[0]),
          parameterCount: this.parseParameters(paramsStr).length,
        },
      };

      functions.push(func);
    }
  }

  /**
   * Extract Java functions
   */
  private static extractJavaFunctions(
    code: string,
    functions: FunctionDefinition[],
    startIndex: number
  ): void {
    const funcRegex = /(?:public|private|protected)?\s+(?:static\s+)?(?:\w+\s+)*(\w+)\s*\(\s*([^)]*)\s*\)\s*\{/g;
    let match;

    while ((match = funcRegex.exec(code)) !== null) {
      const [, name, paramsStr] = match;
      const lineStart = code.substring(0, match.index).split('\n').length;

      const func: FunctionDefinition = {
        id: `func_${startIndex++}`,
        type: ASTNodeType.FUNCTION,
        name,
        lineStart,
        lineEnd: lineStart + 15,
        children: [],
        parameters: this.parseParameters(paramsStr),
        isAsync: false,
        isArrow: false,
        bodyStatements: [],
        callGraph: [],
        calledBy: [],
        metadata: {
          parameterCount: this.parseParameters(paramsStr).length,
        },
      };

      functions.push(func);
    }
  }

  /**
   * Parse function parameters
   */
  private static parseParameters(paramsStr: string): Parameter[] {
    if (!paramsStr?.trim()) return [];

    return paramsStr
      .split(',')
      .map((param) => {
        const trimmed = param.trim();
        const [name, type] = trimmed.split(':').map((s) => s.trim());

        return {
          name: name || 'param',
          type: type,
          isOptional: trimmed.includes('?'),
        };
      })
      .filter((p) => p.name);
  }

  /**
   * Extract control flow statements
   */
  static extractControlFlow(code: string, language: SupportedLanguage): ControlFlowStatement[] {
    const statements: ControlFlowStatement[] = [];

    const ifRegex = /if\s*\([^)]*\)/g;
    const forRegex = /for\s*\([^)]*\)/g;
    const whileRegex = /while\s*\([^)]*\)/g;
    const tryCatchRegex = /(try|catch)\s*[\({]/g;

    let match;

    while ((match = ifRegex.exec(code)) !== null) {
      const lineStart = code.substring(0, match.index).split('\n').length;
      statements.push({
        id: `ctrl_${statements.length}`,
        type: ASTNodeType.IF_STATEMENT,
        name: 'if',
        lineStart,
        lineEnd: lineStart + 5,
        children: [],
        condition: match[0],
        metadata: {},
      });
    }

    return statements;
  }

  /**
   * Extract variable declarations
   */
  static extractVariables(code: string, language: SupportedLanguage): VariableDeclaration[] {
    const variables: VariableDeclaration[] = [];

    if (language === SupportedLanguage.JAVASCRIPT || language === SupportedLanguage.TYPESCRIPT) {
      const varRegex = /(?:const|let|var)\s+(\w+)\s*(?::\s*([^=;]*?))?\s*=\s*([^;]*);?/g;
      let match;

      while ((match = varRegex.exec(code)) !== null) {
        const [, name, type, value] = match;
        const lineStart = code.substring(0, match.index).split('\n').length;

        variables.push({
          id: `var_${variables.length}`,
          type: ASTNodeType.VARIABLE_DECLARATION,
          name,
          lineStart,
          lineEnd: lineStart,
          children: [],
          dataType: type,
          initialValue: value?.trim(),
          scope: 'function',
          metadata: {},
        });
      }
    }

    return variables;
  }

  /**
   * Main analysis method: returns full CodeAnalysisResult
   */
  static analyze(code: string, language: SupportedLanguage): CodeAnalysisResult {
    const normalized = this.normalizeCode(code, language);
    const functions = this.extractFunctions(code, language);
    const controlFlow = this.extractControlFlow(code, language);
    const variables = this.extractVariables(code, language);

    return {
      language,
      rawCode: code,
      originalLineCount: code.split('\n').length,
      cleanedCode: normalized,
      normalizedCode: normalized,
      functions,
      classes: [],
      imports: [],
      controlFlowStatements: controlFlow,
      variables,
      metadata: {
        complexity: functions.length + controlFlow.length,
        depth: 3,
        hasAsync: /async|await|promise|\.then/.test(code),
        hasTypeScript: language === SupportedLanguage.TYPESCRIPT,
      },
    };
  }
}

export default CodeParser;
