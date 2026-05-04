// Bug Synthesis Engine - TypeScript Interface Architecture
// File: src/services/bugSynthesis/types.ts

//============================================================================
// CORE TYPE DEFINITIONS
//============================================================================

/**
 * Programming language support
 */
export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'rust';

/**
 * Severity levels following OWASP and CVE standards
 */
export enum SeverityLevel {
  CRITICAL = 'CRITICAL',  // CVSS 9.0-10.0 - Immediate action required
  HIGH = 'HIGH',          // CVSS 7.0-8.9 - Review and plan mitigation
  MEDIUM = 'MEDIUM',      // CVSS 4.0-6.9 - Review and address in planning
  LOW = 'LOW',            // CVSS 0.1-3.9 - May be addressed
  INFO = 'INFO',          // Informational only
}

/**
 * Confidence in vulnerability detection (0-1 scale)
 * 0.95+: True positive (regex match + semantic validation)
 * 0.80-0.95: High confidence (multiple pattern matches)
 * 0.60-0.80: Medium confidence (context-dependent)
 * <0.60: Low confidence (may be false positive)
 */
export type ConfidenceScore = number & { readonly __brand: 'ConfidenceScore' };

export const createConfidenceScore = (value: number): ConfidenceScore => {
  if (value < 0 || value > 1) {
    throw new Error('Confidence score must be between 0 and 1');
  }
  return value as ConfidenceScore;
};

/**
 * CWE (Common Weakness Enumeration) IDs
 * Reference: https://cwe.mitre.org/
 */
export type CweId = number; // e.g., 89 (SQL Injection), 79 (XSS), 22 (Path Traversal)

/**
 * OWASP Top 10 categories
 */
export enum OwaspCategory {
  A01_BROKEN_ACCESS_CONTROL = 'A01_BROKEN_ACCESS_CONTROL',
  A02_CRYPTOGRAPHIC_FAILURES = 'A02_CRYPTOGRAPHIC_FAILURES',
  A03_INJECTION = 'A03_INJECTION',
  A04_INSECURE_DESIGN = 'A04_INSECURE_DESIGN',
  A05_SECURITY_MISCONFIGURATION = 'A05_SECURITY_MISCONFIGURATION',
  A06_VULNERABLE_COMPONENTS = 'A06_VULNERABLE_COMPONENTS',
  A07_AUTH_FAILURES = 'A07_AUTH_FAILURES',
  A08_DATA_INTEGRITY_FAILURES = 'A08_DATA_INTEGRITY_FAILURES',
  A09_LOGGING_MONITORING_FAILURES = 'A09_LOGGING_MONITORING_FAILURES',
  A10_SSRF = 'A10_SSRF',
}

//============================================================================
// AST & CODE ANALYSIS TYPES
//============================================================================

/**
 * Represents a position in source code
 */
export interface CodePosition {
  line: number;           // 1-based
  column: number;         // 0-based
  offset: number;         // 0-based offset in file
}

/**
 * Represents a range of code
 */
export interface CodeRange {
  start: CodePosition;
  end: CodePosition;
  text?: string;          // Optional: the actual code text
}

/**
 * Abstract Syntax Tree node (simplified representation)
 */
export interface ASTNode {
  type: string;           // e.g., 'CallExpression', 'BinaryExpression'
  range: CodeRange;
  parent?: ASTNode;
  children: ASTNode[];
  metadata?: {
    [key: string]: any;   // Parser-specific metadata
  };
}

/**
 * Data Flow Graph - tracks how data moves through code
 */
export interface DataFlowNode {
  id: string;             // Unique identifier
  type: 'source' | 'sink' | 'transform' | 'variable';
  name: string;           // Variable/function name
  range: CodeRange;
  dependencies: string[]; // IDs of nodes this depends on
  isTainted: boolean;     // Whether this node contains tainted data
  taints: TaintInfo[];    // Details of taints
}

/**
 * Represents tainted data in the code
 */
export interface TaintInfo {
  sourceId: string;       // ID of taint source
  sourceName: string;     // e.g., 'req.body', 'window.location'
  sourceType: 'user_input' | 'network' | 'file_io' | 'environment' | 'database';
  propagationPath: string[]; // Path from source to current location
  sanitizers: string[];   // Applied sanitizers (if any)
  isSanitized: boolean;
}

/**
 * Code context for analysis
 */
export interface CodeContext {
  fileId: string;
  fileName: string;
  language: SupportedLanguage;
  code: string;
  ast?: ASTNode;
  dfg?: DataFlowNode[];
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  metadata?: {
    framework?: string;   // e.g., 'Express', 'React'
    version?: string;
  };
}

/**
 * Import information
 */
export interface ImportInfo {
  module: string;
  items: string[];        // What is imported
  type: 'default' | 'named' | 'namespace';
  range: CodeRange;
}

/**
 * Export information
 */
export interface ExportInfo {
  name: string;
  type: 'default' | 'named';
  range: CodeRange;
}

//============================================================================
// VULNERABILITY DETECTION TYPES
//============================================================================

/**
 * Represents a single vulnerability finding
 */
export interface Vulnerability {
  id: string;             // Unique identifier (e.g., 'vuln_12345')
  type: string;           // e.g., 'SQL_INJECTION', 'XSS'
  severity: SeverityLevel;
  confidence: ConfidenceScore;
  
  // Location in code
  range: CodeRange;
  fileId: string;
  fileName: string;
  
  // Categorization
  cweId: CweId;
  owaspCategory: OwaspCategory;
  
  // Description
  title: string;          // Short title: "Potential SQL Injection"
  description: string;    // Detailed explanation
  remediation: string;    // How to fix it
  
  // Technical details
  pattern: VulnerabilityPattern;
  evidence: AnalysisEvidence;
  relatedCode: CodeRange[];  // Other related occurrences
  
  // Metadata
  createdAt: Date;
  analyzers: string[];    // Which analyzers detected this
  tags: string[];         // e.g., ['injection', 'database', 'user-input']
}

/**
 * Vulnerability pattern that was matched
 */
export interface VulnerabilityPattern {
  patternId: string;      // e.g., 'INJ-001'
  name: string;
  regex?: RegExp;         // Optional regex pattern
  semanticMatch?: (node: ASTNode, context: AnalysisContext) => boolean;
  description: string;
  examples: string[];     // Vulnerable code examples
}

/**
 * Evidence supporting the vulnerability detection
 */
export interface AnalysisEvidence {
  matchedPattern?: string;
  taintPath?: string[];   // Taint propagation path
  semanticFactors: Record<string, number>; // e.g., { 'user_input_usage': 0.9 }
  conflictingFactors?: Record<string, number>; // Factors that reduce confidence
  analyzersAgreement: number; // 0-1 score of analyzer consensus
}

/**
 * Collection of vulnerabilities from a single analysis
 */
export interface AnalysisResult {
  fileId: string;
  fileName: string;
  language: SupportedLanguage;
  analysisTime: number;   // Milliseconds taken
  vulnerabilities: Vulnerability[];
  defenseScore: number;   // 0-100
  metadata: {
    codeSize: number;     // Lines of code
    complexity: number;   // Cyclomatic complexity
    analyzersRun: string[];
  };
}

//============================================================================
// DEFENSE MAPPING & PATCH TYPES
//============================================================================

/**
 * Suggested security patch
 */
export interface PatchSuggestion {
  id: string;
  vulnerabilityId: string;
  
  // Patch content
  originalCode: string;
  patchedCode: string;
  description: string;    // Why this patch
  
  // Patch characteristics
  type: 'minimal' | 'best_practice' | 'architectural';
  breakingChanges: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
  
  // Validation & scoring
  syntaxValid: boolean;
  typeCompatible: boolean;
  buildCompatible?: boolean; // If we can verify
  confidence: ConfidenceScore;
  
  // Impact assessment
  performanceImpact: 'none' | 'negligible' | 'moderate' | 'significant';
  breakingChangesDescription?: string;
  deprecationWarnings?: string[];
  
  // References
  cweId: CweId;
  owaspCategory: OwaspCategory;
  references: Reference[];
}

/**
 * Reference for documentation
 */
export interface Reference {
  title: string;
  url: string;
  type: 'owasp' | 'cwe' | 'cve' | 'nist' | 'documentation' | 'best_practice';
}

/**
 * Multiple patch alternatives for a vulnerability
 */
export interface PatchAlternatives {
  vulnerabilityId: string;
  patches: PatchSuggestion[];
  recommendation: string; // Which patch we recommend
}

//============================================================================
// ANALYZER INTERFACE
//============================================================================

/**
 * Context passed to analyzers
 */
export interface AnalysisContext {
  codeContext: CodeContext;
  knowledgeBase: VulnerabilityKnowledgeBase;
  analysisResult: Partial<AnalysisResult>;
}

/**
 * Standard interface for all analyzers
 */
export interface SecurityAnalyzer {
  name: string;           // e.g., 'TaintAnalyzer'
  version: string;
  supportedLanguages: SupportedLanguage[];
  
  /**
   * Run analysis and return findings
   */
  analyze(context: AnalysisContext): Promise<Vulnerability[]>;
  
  /**
   * Optional: Validate a patch for this analyzer
   */
  validatePatch?(originalCode: string, patchedCode: string): Promise<boolean>;
}

/**
 * Specific analyzer implementations
 */

/**
 * Pattern Matching Analyzer - Uses regex and semantic patterns
 */
export interface PatternMatchingAnalyzer extends SecurityAnalyzer {
  patterns: VulnerabilityPattern[];
  matchPattern(
    code: string,
    pattern: VulnerabilityPattern
  ): { match: boolean; evidence: AnalysisEvidence }[];
}

/**
 * Taint Analysis Analyzer - Tracks data flow
 */
export interface TaintAnalyzer extends SecurityAnalyzer {
  buildDataFlowGraph(ast: ASTNode): DataFlowNode[];
  identifySources(dfg: DataFlowNode[]): DataFlowNode[];
  identifySinks(dfg: DataFlowNode[]): DataFlowNode[];
  propagateTaint(dfg: DataFlowNode[], sources: DataFlowNode[]): void;
  findUnsanitizedFlows(dfg: DataFlowNode[]): Array<{
    source: DataFlowNode;
    sink: DataFlowNode;
    path: DataFlowNode[];
  }>;
}

/**
 * Type Safety Analyzer - Checks type security
 */
export interface TypeSafetyAnalyzer extends SecurityAnalyzer {
  checkTypeConfusion(ast: ASTNode, context: AnalysisContext): Vulnerability[];
  validateTypeUsage(node: ASTNode): boolean;
}

/**
 * Cryptography Validator - Checks crypto best practices
 */
export interface CryptoValidator extends SecurityAnalyzer {
  validateAlgorithm(algorithmName: string): { valid: boolean; reason?: string };
  validateKeyLength(algorithm: string, keyLength: number): boolean;
  validateMode(algorithm: string, mode: string): boolean;
  validateRNG(rngFunction: string): boolean;
}

/**
 * Authentication Analyzer - Checks auth/authz flows
 */
export interface AuthAnalyzer extends SecurityAnalyzer {
  findAuthCheckPoints(ast: ASTNode): CodeRange[];
  validateAuthFlow(ast: ASTNode): { valid: boolean; gaps: CodeRange[] };
  detectPrivilegeEscalation(ast: ASTNode): Vulnerability[];
}

/**
 * OWASP Detector - Checks against OWASP Top 10
 */
export interface OwaspDetector extends SecurityAnalyzer {
  checkOwasp(ast: ASTNode, category: OwaspCategory): Vulnerability[];
}

//============================================================================
// VULNERABILITY KNOWLEDGE BASE
//============================================================================

/**
 * Local, encrypted knowledge base of vulnerabilities
 */
export interface VulnerabilityKnowledgeBase {
  // Pattern storage
  getPattern(patternId: string): VulnerabilityPattern | null;
  getPatternsByCategory(category: OwaspCategory): VulnerabilityPattern[];
  getPatternsByCwe(cweId: CweId): VulnerabilityPattern[];
  
  // Cryptography standards
  getApprovedAlgorithms(type: 'symmetric' | 'asymmetric' | 'hash'): string[];
  getMinKeyLength(algorithm: string): number;
  isDeprecatedAlgorithm(algorithm: string): boolean;
  
  // Rules
  getRule(ruleId: string): SecurityRule | null;
  getRulesByCategory(category: OwaspCategory): SecurityRule[];
  
  // Secure code patterns
  getSecurePattern(vulnerabilityType: string): SecureCodePattern | null;
  getSecurePatchTemplate(vulnerabilityType: string): string | null;
  
  // Metadata
  getLastUpdated(): Date;
  getVersion(): string;
}

/**
 * A security rule that can be checked
 */
export interface SecurityRule {
  ruleId: string;
  name: string;
  condition: (ast: ASTNode, context: AnalysisContext) => boolean;
  violation: Vulnerability;
}

/**
 * A template for secure code
 */
export interface SecureCodePattern {
  vulnerabilityType: string;
  unsafeExample: string;
  safeExample: string;
  explanation: string;
  performanceNotes?: string;
}

//============================================================================
// DEFENSE SCORE CALCULATION
//============================================================================

/**
 * Inputs for Defense Score calculation
 */
export interface DefenseScoreInput {
  vulnerabilities: Vulnerability[];
}

/**
 * Output of Defense Score calculation
 */
export interface DefenseScore {
  score: number;          // 0-100
  rating: 'CRITICAL' | 'WARNING' | 'GOOD' | 'EXCELLENT';
  breakdown: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
  };
  weightedRisks: {
    criticality: number;  // Sum of (severity * confidence)
    totalPossible: number;
  };
}

/**
 * Calculate Defense Score from vulnerabilities
 */
export function calculateDefenseScore(input: DefenseScoreInput): DefenseScore {
  const { vulnerabilities } = input;
  
  const breakdown = {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
  };
  
  const severityWeights: Record<SeverityLevel, number> = {
    [SeverityLevel.CRITICAL]: 40,
    [SeverityLevel.HIGH]: 20,
    [SeverityLevel.MEDIUM]: 10,
    [SeverityLevel.LOW]: 5,
    [SeverityLevel.INFO]: 1,
  };
  
  let totalRisk = 0;
  let maxPossible = 0;
  
  vulnerabilities.forEach((vuln) => {
    const weight = severityWeights[vuln.severity];
    const risk = weight * vuln.confidence;
    
    totalRisk += risk;
    maxPossible = Math.max(maxPossible, weight);
    
    // Count by severity
    if (vuln.severity === SeverityLevel.CRITICAL) breakdown.criticalCount++;
    else if (vuln.severity === SeverityLevel.HIGH) breakdown.highCount++;
    else if (vuln.severity === SeverityLevel.MEDIUM) breakdown.mediumCount++;
    else if (vuln.severity === SeverityLevel.LOW) breakdown.lowCount++;
    else breakdown.infoCount++;
  });
  
  // Normalize: 100 * (1 - risk/maxPossible)
  const normalizedRisk = maxPossible > 0 ? totalRisk / maxPossible : 0;
  const score = Math.max(0, Math.min(100, 100 * (1 - normalizedRisk)));
  
  let rating: 'CRITICAL' | 'WARNING' | 'GOOD' | 'EXCELLENT';
  if (score >= 90) rating = 'EXCELLENT';
  else if (score >= 70) rating = 'GOOD';
  else if (score >= 50) rating = 'WARNING';
  else rating = 'CRITICAL';
  
  return {
    score,
    rating,
    breakdown,
    weightedRisks: {
      criticality: totalRisk,
      totalPossible: maxPossible,
    },
  };
}

//============================================================================
// UI/UX TYPES
//============================================================================

/**
 * Sidebar widget state
 */
export interface DefenseSidebarState {
  isOpen: boolean;
  defenseScore: DefenseScore;
  selectedVulnerability?: Vulnerability;
  expandedCategories: OwaspCategory[];
  filters: {
    severityFilter: SeverityLevel[];
    showResolved: boolean;
  };
}

/**
 * Monaco Editor decoration info
 */
export interface MonacoDecoration {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  options: {
    isWholeLine: boolean;
    className: string;     // e.g., 'vuln-critical', 'vuln-high'
    glyphMarginClassName: string;
    glyphMarginHoverMessage: string;
    message: string;
  };
}

/**
 * Code action for Monaco Editor
 */
export interface MonacoCodeAction {
  title: string;
  kind: 'quickfix' | 'refactor' | 'info';
  diagnostics: any[];
  edit?: {
    changes: {
      [uri: string]: any[]; // TextEdit[]
    };
  };
  command?: {
    title: string;
    command: string;
    arguments: any[];
  };
}

//============================================================================
// SERVICE INTERFACE
//============================================================================

/**
 * Main Bug Synthesis Engine service
 */
export interface BugSynthesisService {
  /**
   * Analyze code and return vulnerabilities
   */
  analyze(codeContext: CodeContext): Promise<AnalysisResult>;
  
  /**
   * Generate patches for a vulnerability
   */
  generatePatches(vulnerability: Vulnerability, codeContext: CodeContext): Promise<PatchAlternatives>;
  
  /**
   * Apply a patch to code
   */
  applyPatch(code: string, patch: PatchSuggestion): Promise<{ success: boolean; patchedCode?: string; error?: string }>;
  
  /**
   * Get Defense Score for vulnerabilities
   */
  calculateDefenseScore(vulnerabilities: Vulnerability[]): DefenseScore;
  
  /**
   * Export analysis report
   */
  exportReport(result: AnalysisResult): Promise<string>; // JSON or HTML
}

//============================================================================
// EXAMPLE IMPLEMENTATIONS
//============================================================================

/**
 * Example: Creating a SQL Injection vulnerability
 */
export function createSqlInjectionVulnerability(
  range: CodeRange,
  taintPath: string[]
): Vulnerability {
  return {
    id: `sql_inj_${Date.now()}`,
    type: 'SQL_INJECTION',
    severity: SeverityLevel.CRITICAL,
    confidence: createConfidenceScore(0.92),
    range,
    fileId: 'unknown',
    fileName: 'unknown.js',
    cweId: 89,
    owaspCategory: OwaspCategory.A03_INJECTION,
    title: 'Potential SQL Injection via String Concatenation',
    description: `User input from ${taintPath.join(' → ')} is concatenated directly into a SQL query without parameterization. This allows attackers to inject arbitrary SQL commands.`,
    remediation: 'Use parameterized queries (prepared statements) instead of string concatenation. Example: db.query("SELECT * FROM users WHERE id = ?", [userId])',
    pattern: {
      patternId: 'INJ-002',
      name: 'SQL String Concatenation',
      description: 'Detects SQL queries built via string concatenation with user input',
      examples: [
        `const query = "SELECT * FROM users WHERE email = '" + userEmail + "'";`,
        `db.query("INSERT INTO logs VALUES ('" + timestamp + "', '" + message + "')");`,
      ],
    },
    evidence: {
      taintPath,
      semanticFactors: {
        'uses_sql_keywords': 1.0,
        'concatenation_detected': 1.0,
        'user_input_tainted': 0.95,
      },
      analyzersAgreement: 0.92,
    },
    relatedCode: [],
    createdAt: new Date(),
    analyzers: ['TaintAnalyzer', 'PatternMatcher'],
    tags: ['injection', 'database', 'user-input', 'critical'],
  };
}

/**
 * Example: Creating a cryptography vulnerability
 */
export function createWeakCryptoVulnerability(
  range: CodeRange,
  algorithm: string
): Vulnerability {
  return {
    id: `crypto_weak_${Date.now()}`,
    type: 'WEAK_CRYPTOGRAPHY',
    severity: SeverityLevel.CRITICAL,
    confidence: createConfidenceScore(0.98),
    range,
    fileId: 'unknown',
    fileName: 'unknown.js',
    cweId: 327,
    owaspCategory: OwaspCategory.A02_CRYPTOGRAPHIC_FAILURES,
    title: `Use of Weak Cryptographic Algorithm: ${algorithm}`,
    description: `The code uses ${algorithm} for security-sensitive operations. ${algorithm} is cryptographically broken and should not be used for hashing or encryption.`,
    remediation: `Replace ${algorithm} with a strong alternative:
- For hashing passwords: Use bcrypt, Argon2, or scrypt
- For general hashing: Use SHA-256 or SHA-3
- For encryption: Use AES-256 with GCM mode`,
    pattern: {
      patternId: 'CRYPTO-001',
      name: 'Weak Cryptographic Algorithm',
      description: `Detects use of deprecated algorithms like ${algorithm}`,
      examples: [
        `crypto.createHash('md5').update(password).digest('hex');`,
        `CryptoJS.MD5(sensitiveData);`,
      ],
    },
    evidence: {
      matchedPattern: algorithm,
      semanticFactors: {
        'algorithm_deprecated': 1.0,
        'used_for_security': 0.9,
      },
      analyzersAgreement: 0.98,
    },
    relatedCode: [],
    createdAt: new Date(),
    analyzers: ['CryptoValidator'],
    tags: ['cryptography', 'weak-algorithm', 'critical'],
  };
}

/**
 * Example: Creating an authentication bypass vulnerability
 */
export function createAuthBypassVulnerability(
  range: CodeRange,
  functionName: string
): Vulnerability {
  return {
    id: `auth_bypass_${Date.now()}`,
    type: 'MISSING_AUTH_CHECK',
    severity: SeverityLevel.CRITICAL,
    confidence: createConfidenceScore(0.87),
    range,
    fileId: 'unknown',
    fileName: 'unknown.js',
    cweId: 306,
    owaspCategory: OwaspCategory.A01_BROKEN_ACCESS_CONTROL,
    title: `Missing Authentication Check in ${functionName}`,
    description: `The function ${functionName} performs a privileged operation but does not validate that the user is authenticated. An unauthenticated attacker can invoke this function and bypass authentication.`,
    remediation: `Add authentication middleware before this route. Example:
app.post('/admin/users', authenticateJWT, (req, res) => {
  // Protected code here
});`,
    pattern: {
      patternId: 'AUTH-001',
      name: 'Missing Authentication',
      description: 'Detects admin/privileged functions without auth checks',
      examples: [
        `app.post('/admin/delete-user', (req, res) => { /* No auth check */ });`,
        `export const deleteAllUsers = (req, res) => { /* Missing auth */ };`,
      ],
    },
    evidence: {
      semanticFactors: {
        'function_is_privileged': 0.9,
        'no_auth_check_found': 1.0,
      },
      analyzersAgreement: 0.87,
    },
    relatedCode: [],
    createdAt: new Date(),
    analyzers: ['AuthAnalyzer'],
    tags: ['authentication', 'access-control', 'critical'],
  };
}

export default {
  SeverityLevel,
  OwaspCategory,
  createConfidenceScore,
  calculateDefenseScore,
  createSqlInjectionVulnerability,
  createWeakCryptoVulnerability,
  createAuthBypassVulnerability,
};
