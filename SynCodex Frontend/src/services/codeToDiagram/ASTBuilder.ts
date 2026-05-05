/**
 * ASTBuilder.ts
 * 
 * Builds an Abstract Syntax Tree from parsed code.
 * Transforms CodeAnalysisResult into a structured ASTNode tree.
 */

import {
  ASTNode,
  ASTNodeType,
  CodeAnalysisResult,
  FunctionDefinition,
  CallNode,
  ControlFlowBranch,
} from '../types/CODE_TO_DIAGRAM_TYPES';

export class ASTBuilder {
  private nodeIdCounter = 0;

  /**
   * Generate unique node ID
   */
  private generateNodeId(): string {
    return `node_${++this.nodeIdCounter}_${Date.now()}`;
  }

  /**
   * Build AST from code analysis result
   */
  public buildAST(analysis: CodeAnalysisResult): ASTNode {
    // Create root node
    const root: ASTNode = {
      id: this.generateNodeId(),
      type: ASTNodeType.BLOCK,
      name: 'root',
      lineStart: 0,
      lineEnd: analysis.originalLineCount,
      children: [],
      metadata: {
        complexity: analysis.metadata.complexity,
        depth: analysis.metadata.depth,
      },
    };

    // Add imports
    analysis.imports.forEach((imp) => {
      root.children.push(this.buildImportNode(imp));
    });

    // Add variables
    analysis.variables.forEach((variable) => {
      root.children.push(this.buildVariableNode(variable));
    });

    // Add functions
    analysis.functions.forEach((func) => {
      root.children.push(this.buildFunctionNode(func));
    });

    // Add control flow
    analysis.controlFlowStatements.forEach((ctrl) => {
      root.children.push(this.buildControlFlowNode(ctrl));
    });

    // Set parent references
    this.setParentReferences(root);

    return root;
  }

  /**
   * Build function node
   */
  private buildFunctionNode(func: FunctionDefinition): ASTNode {
    const node: ASTNode = {
      id: func.id || this.generateNodeId(),
      type: func.type,
      name: func.name,
      lineStart: func.lineStart,
      lineEnd: func.lineEnd,
      children: [],
      metadata: {
        isAsync: func.isAsync,
        parameterCount: func.parameters?.length || 0,
        returnType: func.returnType,
        complexity: func.bodyStatements?.length || 0,
      },
    };

    // Add parameter nodes
    func.parameters?.forEach((param) => {
      node.children.push({
        id: this.generateNodeId(),
        type: ASTNodeType.PARAMETER,
        name: param.name,
        lineStart: func.lineStart,
        lineEnd: func.lineStart,
        children: [],
        metadata: {
          type: param.type,
          isOptional: param.isOptional,
        },
      });
    });

    // Add body statements
    func.bodyStatements?.forEach((stmt) => {
      node.children.push(this.buildStatementNode(stmt));
    });

    // Add function calls (call graph)
    func.callGraph?.forEach((call) => {
      node.children.push(this.buildCallNode(call));
    });

    return node;
  }

  /**
   * Build import node
   */
  private buildImportNode(imp: any): ASTNode {
    return {
      id: this.generateNodeId(),
      type: ASTNodeType.IMPORT,
      name: imp.moduleName || 'import',
      lineStart: imp.lineStart,
      lineEnd: imp.lineEnd,
      children: [],
      metadata: {
        module: imp.moduleName,
        items: imp.items,
      },
    };
  }

  /**
   * Build variable node
   */
  private buildVariableNode(variable: any): ASTNode {
    return {
      id: this.generateNodeId(),
      type: ASTNodeType.VARIABLE_DECLARATION,
      name: variable.name,
      lineStart: variable.lineStart,
      lineEnd: variable.lineEnd,
      children: [],
      metadata: {
        dataType: variable.dataType,
        initialValue: variable.initialValue,
        scope: variable.scope,
      },
    };
  }

  /**
   * Build control flow node
   */
  private buildControlFlowNode(ctrl: any): ASTNode {
    const node: ASTNode = {
      id: this.generateNodeId(),
      type: ctrl.type,
      name: ctrl.name,
      lineStart: ctrl.lineStart,
      lineEnd: ctrl.lineEnd,
      children: [],
      metadata: {
        condition: ctrl.condition,
      },
    };

    // Add branches
    ctrl.branches?.forEach((branch: ControlFlowBranch) => {
      const branchNode: ASTNode = {
        id: this.generateNodeId(),
        type: ASTNodeType.BLOCK,
        name: `${branch.type}_branch`,
        lineStart: ctrl.lineStart,
        lineEnd: ctrl.lineEnd,
        children: [],
        metadata: {
          branchType: branch.type,
          condition: branch.condition,
        },
      };

      // Add statements in branch
      branch.statements?.forEach((stmt) => {
        branchNode.children.push(this.buildStatementNode(stmt));
      });

      node.children.push(branchNode);
    });

    return node;
  }

  /**
   * Build statement node
   */
  private buildStatementNode(statement: any): ASTNode {
    return {
      id: this.generateNodeId(),
      type: statement.type || ASTNodeType.BLOCK,
      name: statement.name || 'statement',
      lineStart: statement.lineStart,
      lineEnd: statement.lineEnd,
      children: [],
      metadata: {},
    };
  }

  /**
   * Build function call node
   */
  private buildCallNode(call: CallNode): ASTNode {
    return {
      id: call.nodeId || this.generateNodeId(),
      type: ASTNodeType.FUNCTION_CALL,
      name: call.functionName,
      lineStart: call.lineNumber,
      lineEnd: call.lineNumber,
      children: [],
      metadata: {
        isAsync: call.isAsync,
        arguments: call.arguments,
      },
    };
  }

  /**
   * Set parent references for all nodes
   */
  private setParentReferences(node: ASTNode, parent?: ASTNode): void {
    if (parent) {
      node.parent = parent;
    }

    node.children?.forEach((child) => {
      this.setParentReferences(child, node);
    });
  }

  /**
   * Get all nodes of a specific type
   */
  public findNodesByType(root: ASTNode, type: ASTNodeType): ASTNode[] {
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
   * Extract function call graph
   */
  public extractCallGraph(root: ASTNode): Map<string, CallNode[]> {
    const callGraph = new Map<string, CallNode[]>();

    const traverse = (node: ASTNode, parentFunctionName?: string) => {
      if (node.type === ASTNodeType.FUNCTION) {
        const calls: CallNode[] = [];
        node.children?.forEach((child) => {
          if (child.type === ASTNodeType.FUNCTION_CALL) {
            calls.push({
              functionName: child.name,
              nodeId: child.id,
              lineNumber: child.lineStart,
              isAsync: child.metadata.isAsync || false,
              arguments: child.metadata.arguments,
            });
          }
        });
        callGraph.set(node.name, calls);
      }

      node.children?.forEach((child) =>
        traverse(child, node.type === ASTNodeType.FUNCTION ? node.name : parentFunctionName)
      );
    };

    traverse(root);
    return callGraph;
  }

  /**
   * Get node depth
   */
  public getNodeDepth(node: ASTNode): number {
    let depth = 0;
    let current = node;

    while (current.parent) {
      depth++;
      current = current.parent;
    }

    return depth;
  }

  /**
   * Get all leaf nodes (no children)
   */
  public getLeafNodes(root: ASTNode): ASTNode[] {
    const leaves: ASTNode[] = [];

    const traverse = (node: ASTNode) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      } else {
        node.children.forEach(traverse);
      }
    };

    traverse(root);
    return leaves;
  }

  /**
   * Serialize AST to JSON for storage/transmission
   */
  public serializeAST(root: ASTNode): string {
    const serializable = this.removeCircularReferences(root);
    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Remove circular references (parent pointers) for serialization
   */
  private removeCircularReferences(node: ASTNode): any {
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      lineStart: node.lineStart,
      lineEnd: node.lineEnd,
      children: node.children?.map((child) => this.removeCircularReferences(child)) || [],
      metadata: node.metadata,
    };
  }

  /**
   * Deserialize AST from JSON
   */
  public deserializeAST(json: string): ASTNode {
    const data = JSON.parse(json);
    const ast = this.buildFromJSON(data);
    this.setParentReferences(ast);
    return ast;
  }

  /**
   * Build AST node from JSON
   */
  private buildFromJSON(data: any): ASTNode {
    return {
      id: data.id,
      type: data.type,
      name: data.name,
      lineStart: data.lineStart,
      lineEnd: data.lineEnd,
      children: data.children?.map((child: any) => this.buildFromJSON(child)) || [],
      metadata: data.metadata,
    };
  }
}

export default new ASTBuilder();
