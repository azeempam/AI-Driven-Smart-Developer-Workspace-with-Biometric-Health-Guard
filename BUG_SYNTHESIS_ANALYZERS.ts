// Security Analyzers Implementation
// File: src/services/bugSynthesis/analyzers/

import {
  SecurityAnalyzer,
  AnalysisContext,
  Vulnerability,
  SeverityLevel,
  OwaspCategory,
  createConfidenceScore,
  SupportedLanguage,
  DataFlowNode,
  TaintInfo,
  ASTNode,
} from '../types';

//============================================================================
// 1. TAINT ANALYSIS ENGINE
//============================================================================

/**
 * TaintAnalyzer - Tracks data flow and detects information leakage
 * 
 * Strategy:
 * 1. Identify sources (user input, network, files)
 * 2. Mark them as tainted
 * 3. Propagate taint through assignments and function calls
 * 4. Detect when tainted data reaches a sink without sanitization
 */
export class TaintAnalyzer implements SecurityAnalyzer {
  name = 'TaintAnalyzer';
  version = '1.0.0';
  supportedLanguages: SupportedLanguage[] = ['typescript', 'javascript'];

  private taintSources = [
    'req.body',
    'req.query',
    'req.params',
    'req.headers',
    'process.env',
    'window.location',
    'document.location',
    'navigator.userAgent',
    'localStorage.getItem',
    'sessionStorage.getItem',
    'fs.readFileSync',
    'fs.readFile',
    'JSON.parse',
  ];

  private taintSinks = [
    'eval',
    'Function',
    'innerHTML',
    'insertAdjacentHTML',
    'document.write',
    'db.query',
    'db.execute',
    'exec',
    'spawn',
    'child_process.exec',
    'child_process.spawn',
    'system',
    'shell.exec',
  ];

  private sanitizers = [
    'sanitize',
    'escape',
    'encodeURIComponent',
    'encodeURI',
    'JSON.stringify',
    'parseInt',
    'parseFloat',
    'Number',
  ];

  async analyze(context: AnalysisContext): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Build data flow graph
    if (!context.codeContext.ast) {
      return vulnerabilities;
    }

    const dfg = this.buildDataFlowGraph(context.codeContext.ast);
    const sources = this.identifySources(dfg);
    this.propagateTaint(dfg, sources);
    
    // Find unsanitized flows from sources to sinks
    const unsanitizedFlows = this.findUnsanitizedFlows(dfg);

    unsanitizedFlows.forEach(flow => {
      const vulnerability: Vulnerability = {
        id: `taint_${Date.now()}_${Math.random()}`,
        type: this.classifyFlowType(flow),
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.90),
        range: flow.sink.range,
        fileId: context.codeContext.fileId,
        fileName: context.codeContext.fileName,
        cweId: this.getCweForFlowType(flow),
        owaspCategory: OwaspCategory.A03_INJECTION,
        title: `Potential ${this.classifyFlowType(flow)} - Unsanitized Data Flow`,
        description: `User input from ${flow.source.name} flows to dangerous sink ${flow.sink.name} without sanitization.`,
        remediation: `Add sanitization: use escape(), sanitize(), or parameterized queries.`,
        pattern: {
          patternId: 'TAINT-001',
          name: 'Unsanitized Data Flow to Sink',
          description: 'Tainted data reaches a dangerous sink without sanitization',
          examples: [
            `const user = req.body.name; db.query("SELECT * FROM users WHERE name = " + user);`,
            `const url = window.location.search; document.innerHTML = url;`,
          ],
        },
        evidence: {
          taintPath: flow.path.map(n => n.name),
          semanticFactors: {
            'user_input_detected': 1.0,
            'sink_detected': 1.0,
            'no_sanitizer': 1.0,
          },
          analyzersAgreement: 0.90,
        },
        relatedCode: [],
        createdAt: new Date(),
        analyzers: [this.name],
        tags: ['taint-analysis', 'injection', 'user-input'],
      };

      vulnerabilities.push(vulnerability);
    });

    return vulnerabilities;
  }

  /**
   * Build data flow graph from AST
   */
  buildDataFlowGraph(ast: ASTNode): DataFlowNode[] {
    const nodes: DataFlowNode[] = [];
    const nodeMap = new Map<string, DataFlowNode>();

    this.traverseAst(ast, (node: ASTNode) => {
      const nodeId = `${node.range.start.line}_${node.range.start.column}`;

      if (this.isVariableDeclaration(node) || this.isAssignment(node)) {
        const varNode: DataFlowNode = {
          id: nodeId,
          type: 'variable',
          name: this.extractVariableName(node),
          range: node.range,
          dependencies: [],
          isTainted: false,
          taints: [],
        };
        nodes.push(varNode);
        nodeMap.set(nodeId, varNode);
      } else if (this.isFunctionCall(node)) {
        const funcNode: DataFlowNode = {
          id: nodeId,
          type: this.isSinkFunction(node) ? 'sink' : 'transform',
          name: this.extractFunctionName(node),
          range: node.range,
          dependencies: [],
          isTainted: false,
          taints: [],
        };
        nodes.push(funcNode);
        nodeMap.set(nodeId, funcNode);
      }
    });

    // Link dependencies
    this.linkDependencies(nodes, ast);

    return nodes;
  }

  /**
   * Identify taint sources
   */
  identifySources(dfg: DataFlowNode[]): DataFlowNode[] {
    return dfg.filter(node => {
      return this.taintSources.some(source => node.name.includes(source));
    });
  }

  /**
   * Identify taint sinks
   */
  identifySinks(dfg: DataFlowNode[]): DataFlowNode[] {
    return dfg.filter(node => node.type === 'sink');
  }

  /**
   * Propagate taint through data flow graph
   */
  propagateTaint(dfg: DataFlowNode[], sources: DataFlowNode[]): void {
    const queue = [...sources];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const node = queue.shift()!;

      if (visited.has(node.id)) continue;
      visited.add(node.id);

      node.isTainted = true;
      node.taints.push({
        sourceId: sources[0].id,
        sourceName: sources[0].name,
        sourceType: this.getSourceType(sources[0].name),
        propagationPath: [sources[0].name, node.name],
        sanitizers: [],
        isSanitized: false,
      });

      // Propagate to dependent nodes
      dfg.forEach(depNode => {
        if (depNode.dependencies.includes(node.id) && !visited.has(depNode.id)) {
          queue.push(depNode);
        }
      });
    }
  }

  /**
   * Find unsanitized flows from sources to sinks
   */
  findUnsanitizedFlows(
    dfg: DataFlowNode[]
  ): Array<{
    source: DataFlowNode;
    sink: DataFlowNode;
    path: DataFlowNode[];
  }> {
    const flows: Array<{ source: DataFlowNode; sink: DataFlowNode; path: DataFlowNode[] }> = [];
    const sources = this.identifySources(dfg);
    const sinks = this.identifySinks(dfg);

    sources.forEach(source => {
      sinks.forEach(sink => {
        const path = this.findPath(source, sink, dfg);
        if (path.length > 0) {
          // Check if any sanitizer is applied
          const hasSanitizer = path.some(node =>
            this.sanitizers.some(san => node.name.includes(san))
          );

          if (!hasSanitizer) {
            flows.push({ source, sink, path });
          }
        }
      });
    });

    return flows;
  }

  /**
   * Find path between two nodes in the graph
   */
  private findPath(
    start: DataFlowNode,
    end: DataFlowNode,
    dfg: DataFlowNode[]
  ): DataFlowNode[] {
    const queue: Array<{ node: DataFlowNode; path: DataFlowNode[] }> = [{ node: start, path: [start] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node.id === end.id) {
        return path;
      }

      if (visited.has(node.id)) continue;
      visited.add(node.id);

      dfg.forEach(neighbor => {
        if (neighbor.dependencies.includes(node.id) && !visited.has(neighbor.id)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      });
    }

    return [];
  }

  // Helper methods
  private traverseAst(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);
    node.children.forEach(child => this.traverseAst(child, callback));
  }

  private isVariableDeclaration(node: ASTNode): boolean {
    return ['VariableDeclaration', 'VariableDeclarator'].includes(node.type);
  }

  private isAssignment(node: ASTNode): boolean {
    return ['AssignmentExpression', 'BinaryExpression'].includes(node.type);
  }

  private isFunctionCall(node: ASTNode): boolean {
    return node.type === 'CallExpression';
  }

  private isSinkFunction(node: ASTNode): boolean {
    const funcName = this.extractFunctionName(node);
    return this.taintSinks.some(sink => funcName.includes(sink));
  }

  private extractVariableName(node: ASTNode): string {
    // Simplified extraction
    return node.metadata?.name || 'unknown_var';
  }

  private extractFunctionName(node: ASTNode): string {
    return node.metadata?.functionName || 'unknown_func';
  }

  private linkDependencies(nodes: DataFlowNode[], ast: ASTNode): void {
    // Simplified dependency linking
    nodes.forEach(node => {
      nodes.forEach(other => {
        if (node.id !== other.id && other.range.start.offset > node.range.end.offset) {
          if (!node.dependencies.includes(other.id)) {
            node.dependencies.push(other.id);
          }
        }
      });
    });
  }

  private getSourceType(
    sourceName: string
  ): 'user_input' | 'network' | 'file_io' | 'environment' | 'database' {
    if (sourceName.includes('req.')) return 'network';
    if (sourceName.includes('process.env')) return 'environment';
    if (sourceName.includes('fs.')) return 'file_io';
    if (sourceName.includes('db.')) return 'database';
    return 'user_input';
  }

  private classifyFlowType(flow: {
    source: DataFlowNode;
    sink: DataFlowNode;
    path: DataFlowNode[];
  }): string {
    const sinkName = flow.sink.name;
    if (sinkName.includes('eval') || sinkName.includes('Function')) return 'CODE_INJECTION';
    if (sinkName.includes('innerHTML') || sinkName.includes('insertAdjacentHTML')) return 'XSS';
    if (sinkName.includes('db.query') || sinkName.includes('db.execute')) return 'SQL_INJECTION';
    if (sinkName.includes('exec') || sinkName.includes('spawn')) return 'COMMAND_INJECTION';
    return 'INJECTION';
  }

  private getCweForFlowType(flow: {
    source: DataFlowNode;
    sink: DataFlowNode;
    path: DataFlowNode[];
  }): number {
    const flowType = this.classifyFlowType(flow);
    const cweMap: Record<string, number> = {
      CODE_INJECTION: 95,
      XSS: 79,
      SQL_INJECTION: 89,
      COMMAND_INJECTION: 78,
      INJECTION: 91,
    };
    return cweMap[flowType] || 91;
  }
}

//============================================================================
// 2. PATTERN MATCHING ANALYZER
//============================================================================

/**
 * PatternMatcher - Uses regex and semantic patterns to detect vulnerabilities
 */
export class PatternMatchingAnalyzer implements SecurityAnalyzer {
  name = 'PatternMatcher';
  version = '1.0.0';
  supportedLanguages: SupportedLanguage[] = ['typescript', 'javascript'];

  private patterns = [
    {
      patternId: 'INJ-001',
      regex: /eval\s*\(\s*['"`]|Function\s*\(\s*['"`]/g,
      type: 'CODE_INJECTION',
      severity: SeverityLevel.CRITICAL,
      cwe: 95,
    },
    {
      patternId: 'INJ-002',
      regex: /["']SELECT\s+\*?\s+FROM.+["']\s*\+|["']\s*\+\s*["'](?:SELECT|INSERT|UPDATE|DELETE)/g,
      type: 'SQL_INJECTION',
      severity: SeverityLevel.CRITICAL,
      cwe: 89,
    },
    {
      patternId: 'XSS-001',
      regex: /\.innerHTML\s*=\s*(?!DOMPurify|sanitize)/g,
      type: 'XSS',
      severity: SeverityLevel.HIGH,
      cwe: 79,
    },
    {
      patternId: 'CRYPTO-001',
      regex: /crypto\.createHash\(['"](?:md5|sha1|md4|des)['"]|CryptoJS\.MD5|CryptoJS\.SHA1/g,
      type: 'WEAK_CRYPTOGRAPHY',
      severity: SeverityLevel.CRITICAL,
      cwe: 327,
    },
    {
      patternId: 'AUTH-001',
      regex: /export\s+(?:async\s+)?(?:function|const)\s+\w+Admin\w*\s*=.*=>|app\.(?:post|get|put|delete)\s*\(['"]\/admin/g,
      type: 'MISSING_AUTH_CHECK',
      severity: SeverityLevel.CRITICAL,
      cwe: 306,
    },
    {
      patternId: 'SECRET-001',
      regex: /(?:api|secret|password|token|key)\s*[:=]\s*['"][^'"]{8,}['"]|process\.env\.[A-Z_]+\s*=\s*['"][^'"]{8,}['"]/ g,
      type: 'HARDCODED_SECRET',
      severity: SeverityLevel.CRITICAL,
      cwe: 798,
    },
  ];

  async analyze(context: AnalysisContext): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    const code = context.codeContext.code;

    this.patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        const lineStart = code.lastIndexOf('\n', match.index) + 1;
        const columnNumber = match.index - lineStart;

        const vulnerability: Vulnerability = {
          id: `pattern_${Date.now()}_${Math.random()}`,
          type: pattern.type,
          severity: pattern.severity,
          confidence: createConfidenceScore(0.85),
          range: {
            start: { line: lineNumber, column: columnNumber, offset: match.index },
            end: {
              line: lineNumber,
              column: columnNumber + match[0].length,
              offset: match.index + match[0].length,
            },
            text: match[0],
          },
          fileId: context.codeContext.fileId,
          fileName: context.codeContext.fileName,
          cweId: pattern.cwe,
          owaspCategory: this.getCweToOwasp(pattern.cwe),
          title: `Potential ${pattern.type} - Pattern Match`,
          description: `Code matches known vulnerable pattern: ${pattern.patternId}`,
          remediation: this.getRemediation(pattern.type),
          pattern: {
            patternId: pattern.patternId,
            name: pattern.type,
            regex: pattern.regex,
            description: `Detects ${pattern.type}`,
            examples: [],
          },
          evidence: {
            matchedPattern: pattern.patternId,
            semanticFactors: {
              'pattern_match_confidence': 0.85,
            },
            analyzersAgreement: 0.85,
          },
          relatedCode: [],
          createdAt: new Date(),
          analyzers: [this.name],
          tags: ['pattern-match', pattern.type.toLowerCase()],
        };

        vulnerabilities.push(vulnerability);
      }
    });

    return vulnerabilities;
  }

  private getCweToOwasp(cwe: number): OwaspCategory {
    const cweToOwasp: Record<number, OwaspCategory> = {
      89: OwaspCategory.A03_INJECTION,
      79: OwaspCategory.A03_INJECTION,
      95: OwaspCategory.A03_INJECTION,
      78: OwaspCategory.A03_INJECTION,
      327: OwaspCategory.A02_CRYPTOGRAPHIC_FAILURES,
      798: OwaspCategory.A05_SECURITY_MISCONFIGURATION,
      306: OwaspCategory.A01_BROKEN_ACCESS_CONTROL,
    };
    return cweToOwasp[cwe] || OwaspCategory.A03_INJECTION;
  }

  private getRemediation(vulnerabilityType: string): string {
    const remediations: Record<string, string> = {
      CODE_INJECTION: 'Avoid using eval() and Function(). Use safer alternatives or whitelisting.',
      SQL_INJECTION: 'Use parameterized queries or an ORM to prevent SQL injection.',
      XSS: 'Use textContent instead of innerHTML, or sanitize with DOMPurify.',
      WEAK_CRYPTOGRAPHY: 'Use modern cryptographic algorithms like SHA-256 or bcrypt.',
      MISSING_AUTH_CHECK: 'Add authentication middleware to protect privileged routes.',
      HARDCODED_SECRET: 'Never hardcode secrets. Use environment variables or secure vaults.',
    };
    return remediations[vulnerabilityType] || 'Review and secure the code.';
  }
}

//============================================================================
// Export analyzers
//============================================================================

export { TaintAnalyzer, PatternMatchingAnalyzer };

export const createDefaultAnalyzers = (): SecurityAnalyzer[] => {
  return [
    new TaintAnalyzer(),
    new PatternMatchingAnalyzer(),
  ];
};
