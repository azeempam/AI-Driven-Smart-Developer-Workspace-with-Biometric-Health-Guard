/**
 * DiagramGenerator.ts
 * 
 * Transforms AST into Mermaid diagram syntax.
 * Supports flowchart, sequence, state, and class diagrams.
 */

import {
  ASTNode,
  ASTNodeType,
  DiagramType,
  DiagramDirection,
  DiagramGeneratorOptions,
  GeneratedDiagram,
  DiagramNode,
  DiagramEdge,
  DiagramNodeType,
  DiagramEdgeType,
  DiagramTheme,
} from '../../types/CODE_TO_DIAGRAM_TYPES';

export class DiagramGenerator {
  private nodeCounter = 0;
  private nodeMap = new Map<string, DiagramNode>();
  private edges: DiagramEdge[] = [];

  /**
   * Generate diagram from AST
   */
  public generate(
    ast: ASTNode,
    options: DiagramGeneratorOptions
  ): GeneratedDiagram {
    this.reset();

    let mermaidSyntax = '';
    const sourceASTNodeIds: string[] = [];

    switch (options.type) {
      case DiagramType.FLOWCHART:
        mermaidSyntax = this.generateFlowchart(ast, options);
        break;
      case DiagramType.SEQUENCE:
        mermaidSyntax = this.generateSequenceDiagram(ast, options);
        break;
      case DiagramType.STATE:
        mermaidSyntax = this.generateStateDiagram(ast, options);
        break;
      case DiagramType.CLASS:
        mermaidSyntax = this.generateClassDiagram(ast, options);
        break;
      default:
        mermaidSyntax = this.generateFlowchart(ast, options);
    }

    // Extract AST node IDs
    this.nodeMap.forEach((node) => {
      if (node.sourceASTNodeId) {
        sourceASTNodeIds.push(node.sourceASTNodeId);
      }
    });

    const nodes = Array.from(this.nodeMap.values());

    return {
      id: `diagram_${Date.now()}`,
      type: options.type,
      title: `${options.language} ${options.type} Diagram`,
      mermaidSyntax,
      nodes,
      edges: this.edges,
      metadata: {
        complexity: nodes.length + this.edges.length,
        nodeCount: nodes.length,
        edgeCount: this.edges.length,
        maxDepth: this.calculateMaxDepth(ast),
        hasLoops: this.detectLoops(ast),
        hasAsyncOperations: this.detectAsyncOps(ast),
        theme: options.theme || DiagramTheme.DEFAULT,
        language: options.language,
      },
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      sourceASTNodes: sourceASTNodeIds,
    };
  }

  /**
   * Generate flowchart diagram
   */
  private generateFlowchart(ast: ASTNode, options: DiagramGeneratorOptions): string {
    const direction = options.direction || DiagramDirection.TOP_DOWN;
    let syntax = `flowchart ${direction}\n`;

    const visited = new Set<string>();

    const traverse = (node: ASTNode, parentId?: string) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      const nodeId = `node_${this.nodeCounter++}`;
      const label = this.sanitizeLabel(node.name);

      // Create diagram node
      const diagramNode: DiagramNode = {
        id: nodeId,
        label,
        type: this.mapASTNodeToDiagramNodeType(node.type),
        shape: this.mapASTNodeShape(node.type),
        sourceLineNumber: node.lineStart,
        sourceASTNodeId: node.id,
      };

      this.nodeMap.set(nodeId, diagramNode);

      // Add node to syntax
      const shape = this.getNodeShape(node.type);
      syntax += `    ${nodeId}${shape[0]}${label}${shape[1]}\n`;

      // Add edges
      if (parentId) {
        const edge: DiagramEdge = {
          fromNodeId: parentId,
          toNodeId: nodeId,
          type: DiagramEdgeType.FLOW,
        };
        this.edges.push(edge);
        syntax += `    ${parentId} --> ${nodeId}\n`;
      }

      // Process children (filtered by type)
      node.children?.forEach((child) => {
        if (this.shouldIncludeInDiagram(child.type)) {
          traverse(child, nodeId);
        }
      });
    };

    // Find function nodes to focus on
    const functions = this.findNodes(ast, ASTNodeType.FUNCTION);

    if (functions.length === 0) {
      traverse(ast);
    } else {
      functions.slice(0, 3).forEach((func) => traverse(func)); // Limit to 3 functions
    }

    return syntax;
  }

  /**
   * Generate sequence diagram
   */
  private generateSequenceDiagram(ast: ASTNode, options: DiagramGeneratorOptions): string {
    let syntax = `sequenceDiagram\n`;

    const functions = this.findNodes(ast, ASTNodeType.FUNCTION);

    if (functions.length === 0) return syntax;

    // Identify main function
    const mainFunc = functions[0];
    syntax += `    participant ${this.sanitizeLabel(mainFunc.name)}\n`;

    // Add function calls as messages
    let lastActor = this.sanitizeLabel(mainFunc.name);

    this.traverseSequence(mainFunc, syntax, lastActor, (s) => {
      syntax = s;
    });

    return syntax;
  }

  /**
   * Generate state diagram
   */
  private generateStateDiagram(ast: ASTNode, options: DiagramGeneratorOptions): string {
    let syntax = `stateDiagram-v2\n`;

    const conditionals = this.findNodes(ast, ASTNodeType.IF_STATEMENT);
    const loops = this.findNodes(ast, ASTNodeType.FOR_LOOP);

    if (conditionals.length === 0 && loops.length === 0) {
      return syntax + `    [*] --> Done\n    Done --> [*]\n`;
    }

    syntax += `    [*] --> Start\n`;

    conditionals.forEach((cond, i) => {
      const label = this.sanitizeLabel(cond.name || `Condition_${i}`);
      syntax += `    Start --> ${label}\n`;
      syntax += `    ${label} --> End\n`;
    });

    loops.forEach((loop, i) => {
      const label = this.sanitizeLabel(loop.name || `Loop_${i}`);
      syntax += `    Start --> ${label}\n`;
      syntax += `    ${label} --> ${label}\n`;
      syntax += `    ${label} --> End\n`;
    });

    syntax += `    End --> [*]\n`;

    return syntax;
  }

  /**
   * Generate class diagram
   */
  private generateClassDiagram(ast: ASTNode, options: DiagramGeneratorOptions): string {
    let syntax = `classDiagram\n`;

    const classes = this.findNodes(ast, ASTNodeType.CLASS);
    const functions = this.findNodes(ast, ASTNodeType.FUNCTION);

    classes.forEach((cls) => {
      const className = this.sanitizeLabel(cls.name);
      syntax += `    class ${className} {\n`;

      // Add methods
      cls.children?.forEach((child) => {
        if (child.type === ASTNodeType.METHOD || child.type === ASTNodeType.FUNCTION) {
          const methodName = this.sanitizeLabel(child.name);
          const returnType = child.metadata.returnType || 'void';
          syntax += `        +${methodName}() ${returnType}\n`;
        }
      });

      syntax += `    }\n`;
    });

    return syntax;
  }

  /**
   * Map AST node type to diagram node type
   */
  private mapASTNodeToDiagramNodeType(astType: ASTNodeType): DiagramNodeType {
    const typeMap: Record<ASTNodeType, DiagramNodeType> = {
      [ASTNodeType.FUNCTION]: DiagramNodeType.PROCESS,
      [ASTNodeType.CLASS]: DiagramNodeType.PROCESS,
      [ASTNodeType.IF_STATEMENT]: DiagramNodeType.DECISION,
      [ASTNodeType.FOR_LOOP]: DiagramNodeType.LOOP,
      [ASTNodeType.WHILE_LOOP]: DiagramNodeType.LOOP,
      [ASTNodeType.TRY_CATCH]: DiagramNodeType.ERROR,
      [ASTNodeType.FUNCTION_CALL]: DiagramNodeType.FUNCTION_CALL,
      [ASTNodeType.RETURN_STATEMENT]: DiagramNodeType.END,
      [ASTNodeType.VARIABLE_DECLARATION]: DiagramNodeType.PROCESS,
      // Default for all other types
      [ASTNodeType.METHOD]: DiagramNodeType.PROCESS,
      [ASTNodeType.INTERFACE]: DiagramNodeType.PROCESS,
      [ASTNodeType.CONSTRUCTOR]: DiagramNodeType.PROCESS,
      [ASTNodeType.ELSE_STATEMENT]: DiagramNodeType.DECISION,
      [ASTNodeType.SWITCH_STATEMENT]: DiagramNodeType.DECISION,
      [ASTNodeType.DO_WHILE_LOOP]: DiagramNodeType.LOOP,
      [ASTNodeType.ASYNC_CALL]: DiagramNodeType.FUNCTION_CALL,
      [ASTNodeType.PROMISE_CHAIN]: DiagramNodeType.FUNCTION_CALL,
      [ASTNodeType.METHOD_CALL]: DiagramNodeType.FUNCTION_CALL,
      [ASTNodeType.OBJECT_LITERAL]: DiagramNodeType.PROCESS,
      [ASTNodeType.ARRAY_LITERAL]: DiagramNodeType.PROCESS,
      [ASTNodeType.IMPORT]: DiagramNodeType.PROCESS,
      [ASTNodeType.EXPORT]: DiagramNodeType.PROCESS,
      [ASTNodeType.COMMENT]: DiagramNodeType.PROCESS,
      [ASTNodeType.BLOCK]: DiagramNodeType.PROCESS,
      [ASTNodeType.PARAMETER]: DiagramNodeType.INPUT_OUTPUT,
    };

    return typeMap[astType] || DiagramNodeType.PROCESS;
  }

  /**
   * Map AST node to shape
   */
  private mapASTNodeShape(astType: ASTNodeType): string {
    const shapeMap: Record<ASTNodeType, string> = {
      [ASTNodeType.FUNCTION]: '([',
      [ASTNodeType.IF_STATEMENT]: '{',
      [ASTNodeType.FOR_LOOP]: '{{',
      [ASTNodeType.WHILE_LOOP]: '{{',
      [ASTNodeType.TRY_CATCH]: '([',
      [ASTNodeType.RETURN_STATEMENT]: ')',
      // Default rectangle
      [ASTNodeType.CLASS]: '[',
      [ASTNodeType.INTERFACE]: '[',
      [ASTNodeType.METHOD]: '[',
      [ASTNodeType.CONSTRUCTOR]: '[',
      [ASTNodeType.ELSE_STATEMENT]: '{',
      [ASTNodeType.SWITCH_STATEMENT]: '{',
      [ASTNodeType.DO_WHILE_LOOP]: '{{',
      [ASTNodeType.ASYNC_CALL]: '[',
      [ASTNodeType.PROMISE_CHAIN]: '[',
      [ASTNodeType.METHOD_CALL]: '[',
      [ASTNodeType.FUNCTION_CALL]: '[',
      [ASTNodeType.VARIABLE_DECLARATION]: '[',
      [ASTNodeType.PARAMETER]: '[',
      [ASTNodeType.OBJECT_LITERAL]: '[',
      [ASTNodeType.ARRAY_LITERAL]: '[',
      [ASTNodeType.IMPORT]: '[',
      [ASTNodeType.EXPORT]: '[',
      [ASTNodeType.COMMENT]: '[',
      [ASTNodeType.BLOCK]: '[',
    };

    const open = shapeMap[astType] || '[';
    const close = open === '([' ? '])' : open === '{{' ? '}}' : open === '{' ? '}' : ']';

    return [open, close];
  }

  /**
   * Get node shape for Mermaid syntax
   */
  private getNodeShape(type: ASTNodeType): [string, string] {
    switch (type) {
      case ASTNodeType.IF_STATEMENT:
      case ASTNodeType.SWITCH_STATEMENT:
        return ['{', '}'];
      case ASTNodeType.FOR_LOOP:
      case ASTNodeType.WHILE_LOOP:
      case ASTNodeType.DO_WHILE_LOOP:
        return ['{{', '}}'];
      case ASTNodeType.RETURN_STATEMENT:
        return ['([', '])'];
      default:
        return ['[', ']'];
    }
  }

  /**
   * Sanitize label for Mermaid syntax
   */
  private sanitizeLabel(label: string): string {
    return label
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .substring(0, 30)
      .toUpperCase();
  }

  /**
   * Should node be included in diagram
   */
  private shouldIncludeInDiagram(type: ASTNodeType): boolean {
    const included = [
      ASTNodeType.FUNCTION,
      ASTNodeType.IF_STATEMENT,
      ASTNodeType.FOR_LOOP,
      ASTNodeType.WHILE_LOOP,
      ASTNodeType.TRY_CATCH,
      ASTNodeType.FUNCTION_CALL,
      ASTNodeType.RETURN_STATEMENT,
    ];

    return included.includes(type);
  }

  /**
   * Find nodes of specific type
   */
  private findNodes(root: ASTNode, type: ASTNodeType): ASTNode[] {
    const results: ASTNode[] = [];

    const traverse = (node: ASTNode) => {
      if (node.type === type) {
        results.push(node);
      }
      node.children?.forEach(traverse);
    };

    traverse(root);
    return results;
  }

  /**
   * Traverse sequence for sequence diagram
   */
  private traverseSequence(
    node: ASTNode,
    syntax: string,
    currentActor: string,
    setSyntax: (s: string) => void
  ): void {
    node.children?.forEach((child) => {
      if (child.type === ASTNodeType.FUNCTION_CALL) {
        const targetFunc = this.sanitizeLabel(child.name);
        const message = `${currentActor}->>+${targetFunc}: call`;
        syntax += `    ${message}\n`;
        syntax += `    ${targetFunc}-->>-${currentActor}: return\n`;
      }
    });

    setSyntax(syntax);
  }

  /**
   * Calculate max nesting depth
   */
  private calculateMaxDepth(root: ASTNode): number {
    let maxDepth = 0;

    const traverse = (node: ASTNode, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      node.children?.forEach((child) => traverse(child, depth + 1));
    };

    traverse(root, 0);
    return maxDepth;
  }

  /**
   * Detect if code has loops
   */
  private detectLoops(root: ASTNode): boolean {
    const traverse = (node: ASTNode): boolean => {
      if (
        node.type === ASTNodeType.FOR_LOOP ||
        node.type === ASTNodeType.WHILE_LOOP ||
        node.type === ASTNodeType.DO_WHILE_LOOP
      ) {
        return true;
      }
      return node.children?.some(traverse) || false;
    };

    return traverse(root);
  }

  /**
   * Detect async operations
   */
  private detectAsyncOps(root: ASTNode): boolean {
    const traverse = (node: ASTNode): boolean => {
      if (
        node.type === ASTNodeType.ASYNC_CALL ||
        node.type === ASTNodeType.PROMISE_CHAIN ||
        node.metadata?.isAsync
      ) {
        return true;
      }
      return node.children?.some(traverse) || false;
    };

    return traverse(root);
  }

  /**
   * Reset for next generation
   */
  private reset(): void {
    this.nodeCounter = 0;
    this.nodeMap.clear();
    this.edges = [];
  }
}

export default new DiagramGenerator();
