// Bug Synthesis Engine - Core Implementation
// File: src/services/bugSynthesis/BugSynthesisService.ts

import {
  BugSynthesisService,
  CodeContext,
  AnalysisResult,
  Vulnerability,
  PatchAlternatives,
  PatchSuggestion,
  DefenseScore,
  SecurityAnalyzer,
  SeverityLevel,
  AnalysisContext,
  VulnerabilityKnowledgeBase,
  ConfidenceScore,
  createConfidenceScore,
  calculateDefenseScore as calcDefenseScore,
} from './types';

/**
 * Main Bug Synthesis Engine Service
 * 
 * This is the orchestrator that:
 * 1. Coordinates all security analyzers
 * 2. Synthesizes vulnerabilities
 * 3. Generates defense mappings (patches)
 * 4. Calculates Defense Score
 */
export class BugSynthesisServiceImpl implements BugSynthesisService {
  private analyzers: Map<string, SecurityAnalyzer> = new Map();
  private knowledgeBase: VulnerabilityKnowledgeBase;
  
  constructor(knowledgeBase: VulnerabilityKnowledgeBase) {
    this.knowledgeBase = knowledgeBase;
  }

  /**
   * Register a security analyzer
   */
  registerAnalyzer(analyzer: SecurityAnalyzer): void {
    this.analyzers.set(analyzer.name, analyzer);
  }

  /**
   * Main analysis pipeline
   * Orchestrates all analyzers and synthesizes results
   */
  async analyze(codeContext: CodeContext): Promise<AnalysisResult> {
    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];
    const analysisContext: AnalysisContext = {
      codeContext,
      knowledgeBase: this.knowledgeBase,
      analysisResult: {
        fileId: codeContext.fileId,
        fileName: codeContext.fileName,
        language: codeContext.language,
        analysisTime: 0,
        vulnerabilities: [],
        defenseScore: 100,
        metadata: {
          codeSize: codeContext.code.split('\n').length,
          complexity: 0,
          analyzersRun: [],
        },
      },
    };

    try {
      // Step 1: Run all analyzers in parallel
      const analyzerPromises = Array.from(this.analyzers.values())
        .filter(analyzer => analyzer.supportedLanguages.includes(codeContext.language))
        .map(async analyzer => {
          try {
            console.log(`[BugSynthesis] Running analyzer: ${analyzer.name}`);
            const findings = await analyzer.analyze(analysisContext);
            analysisContext.analysisResult.metadata!.analyzersRun.push(analyzer.name);
            return findings;
          } catch (error) {
            console.error(`[BugSynthesis] Error in ${analyzer.name}:`, error);
            return [];
          }
        });

      const analyzerResults = await Promise.all(analyzerPromises);

      // Step 2: Consolidate findings from all analyzers
      analyzerResults.forEach(findings => {
        vulnerabilities.push(...findings);
      });

      // Step 3: Deduplicate vulnerabilities
      const deduplicatedVulns = this.deduplicateVulnerabilities(vulnerabilities);

      // Step 4: Remove false positives
      const filteredVulns = await this.filterFalsePositives(deduplicatedVulns, analysisContext);

      // Step 5: Sort by severity and confidence
      const sortedVulns = this.sortVulnerabilities(filteredVulns);

      // Step 6: Calculate Defense Score
      const defenseScore = this.calculateDefenseScore(sortedVulns);

      const analysisTime = Date.now() - startTime;

      return {
        fileId: codeContext.fileId,
        fileName: codeContext.fileName,
        language: codeContext.language,
        analysisTime,
        vulnerabilities: sortedVulns,
        defenseScore: defenseScore.score,
        metadata: {
          codeSize: codeContext.code.split('\n').length,
          complexity: this.calculateComplexity(codeContext),
          analyzersRun: analysisContext.analysisResult.metadata!.analyzersRun,
        },
      };
    } catch (error) {
      console.error('[BugSynthesis] Analysis pipeline error:', error);
      throw error;
    }
  }

  /**
   * Deduplicate vulnerabilities by merging duplicates
   */
  private deduplicateVulnerabilities(vulns: Vulnerability[]): Vulnerability[] {
    const seen = new Map<string, Vulnerability>();

    vulns.forEach(vuln => {
      const key = `${vuln.type}_${vuln.range.start.line}_${vuln.range.start.column}`;
      
      if (seen.has(key)) {
        // Merge duplicate findings
        const existing = seen.get(key)!;
        // Keep the one with higher confidence
        if (vuln.confidence > existing.confidence) {
          seen.set(key, vuln);
        }
        // Track that multiple analyzers found this
        existing.analyzers = [...new Set([...existing.analyzers, ...vuln.analyzers])];
      } else {
        seen.set(key, vuln);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Filter out false positives using heuristics
   */
  private async filterFalsePositives(
    vulns: Vulnerability[],
    context: AnalysisContext
  ): Promise<Vulnerability[]> {
    // Remove vulnerabilities with confidence < 0.5 (likely false positives)
    return vulns.filter(vuln => vuln.confidence >= 0.5);
  }

  /**
   * Sort vulnerabilities by severity (highest first) then confidence
   */
  private sortVulnerabilities(vulns: Vulnerability[]): Vulnerability[] {
    const severityOrder: Record<SeverityLevel, number> = {
      [SeverityLevel.CRITICAL]: 0,
      [SeverityLevel.HIGH]: 1,
      [SeverityLevel.MEDIUM]: 2,
      [SeverityLevel.LOW]: 3,
      [SeverityLevel.INFO]: 4,
    };

    return vulns.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate patches for a vulnerability
   */
  async generatePatches(
    vulnerability: Vulnerability,
    codeContext: CodeContext
  ): Promise<PatchAlternatives> {
    const patches: PatchSuggestion[] = [];

    // Extract vulnerable code
    const lines = codeContext.code.split('\n');
    const startLine = vulnerability.range.start.line - 1;
    const endLine = vulnerability.range.end.line;
    const originalCode = lines.slice(startLine, endLine).join('\n');

    // Generate 3 patch alternatives based on vulnerability type
    const alternatives = this.generatePatchAlternatives(
      vulnerability.type,
      originalCode,
      vulnerability
    );

    for (const alt of alternatives) {
      const patch: PatchSuggestion = {
        id: `patch_${Date.now()}_${Math.random()}`,
        vulnerabilityId: vulnerability.id,
        originalCode,
        patchedCode: alt.code,
        description: alt.description,
        type: alt.type,
        breakingChanges: alt.breakingChanges || false,
        estimatedComplexity: alt.complexity,
        syntaxValid: this.validateSyntax(alt.code, codeContext.language),
        typeCompatible: true, // TODO: Implement type checking
        confidence: createConfidenceScore(alt.confidence),
        performanceImpact: alt.performanceImpact || 'none',
        cweId: vulnerability.cweId,
        owaspCategory: vulnerability.owaspCategory,
        references: alt.references || [],
      };

      if (patch.syntaxValid) {
        patches.push(patch);
      }
    }

    return {
      vulnerabilityId: vulnerability.id,
      patches,
      recommendation: patches[0]?.id || 'none',
    };
  }

  /**
   * Generate patch alternatives for different vulnerability types
   */
  private generatePatchAlternatives(
    vulnerabilityType: string,
    originalCode: string,
    vulnerability: Vulnerability
  ): Array<{
    code: string;
    description: string;
    type: 'minimal' | 'best_practice' | 'architectural';
    complexity: 'low' | 'medium' | 'high';
    confidence: number;
    breakingChanges?: boolean;
    performanceImpact?: 'none' | 'negligible' | 'moderate' | 'significant';
    references?: Array<{ title: string; url: string; type: string }>;
  }> {
    const alternatives = [];

    switch (vulnerabilityType) {
      case 'SQL_INJECTION':
        alternatives.push(
          {
            code: this.patchSqlInjectionMinimal(originalCode),
            description: 'Use parameterized queries (prepared statements)',
            type: 'minimal',
            complexity: 'low',
            confidence: 0.95,
            references: [
              {
                title: 'OWASP: SQL Injection',
                url: 'https://owasp.org/www-community/attacks/SQL_Injection',
                type: 'owasp',
              },
            ],
          },
          {
            code: this.patchSqlInjectionBestPractice(originalCode),
            description: 'Use ORM with built-in protection',
            type: 'best_practice',
            complexity: 'medium',
            confidence: 0.88,
            breakingChanges: true,
          },
          {
            code: this.patchSqlInjectionArchitectural(originalCode),
            description: 'Implement stored procedures with input validation',
            type: 'architectural',
            complexity: 'high',
            confidence: 0.92,
            breakingChanges: true,
          }
        );
        break;

      case 'WEAK_CRYPTOGRAPHY':
        alternatives.push(
          {
            code: this.patchWeakCryptoMinimal(originalCode),
            description: 'Replace weak algorithm with industry-standard',
            type: 'minimal',
            complexity: 'low',
            confidence: 0.98,
          },
          {
            code: this.patchWeakCryptoBestPractice(originalCode),
            description: 'Use bcrypt for passwords with proper salting',
            type: 'best_practice',
            complexity: 'low',
            confidence: 0.96,
          }
        );
        break;

      case 'MISSING_AUTH_CHECK':
        alternatives.push(
          {
            code: this.patchMissingAuthMinimal(originalCode),
            description: 'Add authentication middleware',
            type: 'minimal',
            complexity: 'low',
            confidence: 0.93,
          },
          {
            code: this.patchMissingAuthBestPractice(originalCode),
            description: 'Add authentication + authorization checks with roles',
            type: 'best_practice',
            complexity: 'medium',
            confidence: 0.91,
          }
        );
        break;

      case 'XSS':
        alternatives.push(
          {
            code: this.patchXssMinimal(originalCode),
            description: 'Use textContent instead of innerHTML',
            type: 'minimal',
            complexity: 'low',
            confidence: 0.94,
          },
          {
            code: this.patchXssBestPractice(originalCode),
            description: 'Use DomPurify for sanitization',
            type: 'best_practice',
            complexity: 'medium',
            confidence: 0.96,
          }
        );
        break;

      default:
        // Generic patch
        alternatives.push({
          code: originalCode + '\n// TODO: Review security',
          description: 'Manual review recommended',
          type: 'minimal',
          complexity: 'low',
          confidence: 0.3,
        });
    }

    return alternatives;
  }

  /**
   * PATCH GENERATORS FOR SPECIFIC VULNERABILITIES
   */

  private patchSqlInjectionMinimal(code: string): string {
    // Replace string concatenation with parameterized query
    return code
      .replace(/\+\s*['"`]/g, '"')
      .replace(/['"`]\s*\+/g, '"')
      .replace(/'[^']*'\s*\+/g, '?')
      .replace(/\+\s*'[^']*'/g, ', [')
      .concat(']');
  }

  private patchSqlInjectionBestPractice(code: string): string {
    // Suggest using an ORM or query builder
    return code.replace(
      /db\.(query|execute)\s*\(\s*["'`][^"'`]*["'`]/,
      'db.prepared'
    );
  }

  private patchSqlInjectionArchitectural(code: string): string {
    // Suggest using stored procedures
    return code.replace(
      /db\.(query|execute)\s*\(/,
      'db.callProcedure('
    );
  }

  private patchWeakCryptoMinimal(code: string): string {
    return code
      .replace(/crypto\.createHash\('md5'/g, "crypto.createHash('sha256'")
      .replace(/crypto\.createHash\('sha1'/g, "crypto.createHash('sha256'")
      .replace(/CryptoJS\.MD5\(/g, 'CryptoJS.SHA256(');
  }

  private patchWeakCryptoBestPractice(code: string): string {
    return code
      .replace(
        /crypto\.createHash\('sha256'\)/g,
        'bcrypt.hash(password, 10)'
      )
      .replace(/CryptoJS\.(SHA256|MD5)\(/g, 'bcrypt.hash(');
  }

  private patchMissingAuthMinimal(code: string): string {
    // Add auth middleware marker
    return code.replace(
      /(app\.(?:post|get|put|delete|patch)\s*\([^,]+,)/,
      '$1 authenticateJWT,'
    );
  }

  private patchMissingAuthBestPractice(code: string): string {
    return code.replace(
      /(app\.(?:post|get|put|delete|patch)\s*\([^,]+,)/,
      '$1 authenticateJWT, authorizeRole("admin"),'
    );
  }

  private patchXssMinimal(code: string): string {
    return code
      .replace(/\.innerHTML\s*=/g, '.textContent =')
      .replace(/innerHTML:/g, 'textContent:');
  }

  private patchXssBestPractice(code: string): string {
    return code
      .replace(/\.innerHTML\s*=/g, '.innerHTML = DOMPurify.sanitize(')
      .concat(')');
  }

  /**
   * Validate syntax of patched code
   */
  private validateSyntax(code: string, language: string): boolean {
    try {
      if (language === 'typescript' || language === 'javascript') {
        // Basic validation - could use @babel/parser
        return !code.includes('{{') && !code.includes('}}');
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply a patch to code
   */
  async applyPatch(
    code: string,
    patch: PatchSuggestion
  ): Promise<{ success: boolean; patchedCode?: string; error?: string }> {
    try {
      const lines = code.split('\n');
      const patchLines = patch.patchedCode.split('\n');
      
      // Find the vulnerable code
      let startLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(patch.originalCode.split('\n')[0])) {
          startLine = i;
          break;
        }
      }

      if (startLine === -1) {
        return { success: false, error: 'Could not find vulnerable code in file' };
      }

      // Replace vulnerable code with patched code
      const originalLines = patch.originalCode.split('\n');
      lines.splice(startLine, originalLines.length, ...patchLines);
      const patchedCode = lines.join('\n');

      return { success: true, patchedCode };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Calculate Defense Score
   */
  calculateDefenseScore(vulnerabilities: Vulnerability[]): DefenseScore {
    return calcDefenseScore({ vulnerabilities });
  }

  /**
   * Calculate code complexity (simplified)
   */
  private calculateComplexity(context: CodeContext): number {
    // Count conditional statements as a proxy for complexity
    const conditionals = (context.code.match(/if|else|switch|case|for|while/g) || []).length;
    return Math.min(50, conditionals); // Cap at 50
  }

  /**
   * Export analysis report
   */
  async exportReport(result: AnalysisResult): Promise<string> {
    const report = {
      timestamp: new Date().toISOString(),
      file: result.fileName,
      defenseScore: result.defenseScore,
      vulnerabilityCount: result.vulnerabilities.length,
      vulnerabilities: result.vulnerabilities.map(v => ({
        type: v.type,
        severity: v.severity,
        confidence: v.confidence,
        title: v.title,
        line: v.range.start.line,
        column: v.range.start.column,
      })),
    };

    return JSON.stringify(report, null, 2);
  }
}

// Export factory function
export function createBugSynthesisService(
  knowledgeBase: VulnerabilityKnowledgeBase
): BugSynthesisService {
  return new BugSynthesisServiceImpl(knowledgeBase);
}
