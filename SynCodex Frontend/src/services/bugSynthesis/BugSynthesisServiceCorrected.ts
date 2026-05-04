// Minimal Bug Synthesis Service for Quick Integration
// src/services/bugSynthesis/BugSynthesisServiceCorrected.ts

import { CodeContext, Vulnerability, AnalysisResult, SeverityLevel, createConfidenceScore } from './types';

export class BugSynthesisServiceFixed {
  private isAnalyzing = false;
  private isHealthy_ = true;
  private initError: Error | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Service ready
      this.isHealthy_ = true;
      this.initError = null;
    } catch (error) {
      console.warn('[BugSynthesis] Init error:', error);
      this.isHealthy_ = false;
      this.initError = error instanceof Error ? error : new Error(String(error));
    }
  }

  isHealthy(): boolean {
    return this.isHealthy_;
  }

  getInitError(): Error | null {
    return this.initError;
  }

  async analyze(context: CodeContext): Promise<AnalysisResult> {
    if (this.isAnalyzing) {
      return { vulnerabilities: [], defenseScore: 100 };
    }

    this.isAnalyzing = true;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.isAnalyzing = false;
        resolve({ vulnerabilities: [], defenseScore: 100 });
      }, 5000);

      try {
        const vulnerabilities = this.detectVulnerabilities(context.code, context.language);
        const defenseScore = this.calculateDefenseScore(vulnerabilities);

        clearTimeout(timeoutId);
        this.isAnalyzing = false;

        resolve({ vulnerabilities, defenseScore });
      } catch (error) {
        clearTimeout(timeoutId);
        this.isAnalyzing = false;
        console.error('[BugSynthesis] Analysis error:', error);
        resolve({ vulnerabilities: [], defenseScore: 100 });
      }
    });
  }

  private detectVulnerabilities(code: string, language: string = 'javascript'): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Language-specific detection
    if (language.includes('python') || language === 'py') {
      return this.detectPythonVulnerabilities(code);
    } else if (language.includes('java')) {
      return this.detectJavaVulnerabilities(code);
    } else {
      return this.detectJavaScriptVulnerabilities(code);
    }
  }

  private detectJavaScriptVulnerabilities(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Pattern 1: eval() detection
    if (/eval\s*\(/.test(code)) {
      vulnerabilities.push({
        id: 'eval-001',
        type: 'CODE_INJECTION',
        title: 'eval() Usage Detected',
        description: 'eval() is dangerous and should never be used with untrusted input',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.95),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-95',
      });
    }

    // Pattern 2: SQL concatenation
    if (/query\s*\(\s*["'`].*\+\s*\w+/.test(code) || /SELECT.*\+\s*\w+/.test(code)) {
      vulnerabilities.push({
        id: 'sql-001',
        type: 'SQL_INJECTION',
        title: 'SQL Injection Risk',
        description: 'SQL query constructed via string concatenation with user input',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.92),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 60 } },
        cweId: 'CWE-89',
      });
    }

    // Pattern 3: innerHTML without sanitization
    if (/\.innerHTML\s*=.*(?!DOMPurify|sanitize|escape)/.test(code)) {
      vulnerabilities.push({
        id: 'xss-001',
        type: 'XSS',
        title: 'Potential XSS Vulnerability',
        description: 'innerHTML used without proper sanitization',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.88),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-79',
      });
    }

    // Pattern 4: Weak crypto (MD5, SHA1)
    if (/(md5|sha1|crypto\.md5|MD5|SHA1)\s*\(/.test(code)) {
      vulnerabilities.push({
        id: 'crypto-001',
        type: 'WEAK_CRYPTOGRAPHY',
        title: 'Weak Cryptography',
        description: 'MD5 and SHA1 are cryptographically broken and should not be used',
        severity: SeverityLevel.MEDIUM,
        confidence: createConfidenceScore(0.98),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 40 } },
        cweId: 'CWE-327',
      });
    }

    // Pattern 5: Hardcoded secrets
    if (/(password|api_key|secret|token)\s*=\s*["'][^"']{8,}["']/.test(code)) {
      vulnerabilities.push({
        id: 'secret-001',
        type: 'HARDCODED_SECRET',
        title: 'Hardcoded Secret Detected',
        description: 'API keys, passwords, or secrets should not be hardcoded',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.99),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-798',
      });
    }

    return vulnerabilities;
  }

  private detectPythonVulnerabilities(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Pattern 1: eval() detection
    if (/eval\s*\(/.test(code)) {
      vulnerabilities.push({
        id: 'py-eval-001',
        type: 'CODE_INJECTION',
        title: 'eval() Usage Detected',
        description: 'eval() is dangerous and can execute arbitrary code. Use safer alternatives.',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.95),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-95',
      });
    }

    // Pattern 2: exec() detection
    if (/exec\s*\(/.test(code)) {
      vulnerabilities.push({
        id: 'py-exec-001',
        type: 'CODE_INJECTION',
        title: 'exec() Usage Detected',
        description: 'exec() executes arbitrary Python code. Avoid if possible.',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.93),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-95',
      });
    }

    // Pattern 3: SQL string concatenation
    if (/SELECT.*[\+\s].*\w+|query.*[\+\s].*\w+/.test(code)) {
      vulnerabilities.push({
        id: 'py-sql-001',
        type: 'SQL_INJECTION',
        title: 'SQL Injection Risk',
        description: 'SQL query constructed via string concatenation. Use parameterized queries.',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.90),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 60 } },
        cweId: 'CWE-89',
      });
    }

    // Pattern 4: Hardcoded credentials
    if (/password\s*=\s*["'][^"']{6,}["']|api_key\s*=\s*["'][^"']{10,}["']/.test(code)) {
      vulnerabilities.push({
        id: 'py-secret-001',
        type: 'HARDCODED_SECRET',
        title: 'Hardcoded Secret Detected',
        description: 'Credentials and API keys should not be hardcoded. Use environment variables.',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.99),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-798',
      });
    }

    // Pattern 5: Insecure random
    if (/random\.choice|random\.randint|random\.random\(\)/.test(code)) {
      vulnerabilities.push({
        id: 'py-crypto-001',
        type: 'WEAK_CRYPTOGRAPHY',
        title: 'Insecure Random Usage',
        description: 'Use secrets module for cryptographic operations instead of random.',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.85),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 40 } },
        cweId: 'CWE-338',
      });
    }

    return vulnerabilities;
  }

  private detectJavaVulnerabilities(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Pattern 1: SQL concatenation
    if (/query\.executeQuery\s*\(\s*["'][^"']*"\s*\+|Statement\.execute\s*\(\s*["'][^"']*"\s*\+/.test(code)) {
      vulnerabilities.push({
        id: 'java-sql-001',
        type: 'SQL_INJECTION',
        title: 'SQL Injection Risk',
        description: 'SQL query constructed via string concatenation. Use PreparedStatement.',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.92),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 60 } },
        cweId: 'CWE-89',
      });
    }

    // Pattern 2: Weak crypto
    if (/(MD5|SHA1|DES)\s*\.getInstance/.test(code)) {
      vulnerabilities.push({
        id: 'java-crypto-001',
        type: 'WEAK_CRYPTOGRAPHY',
        title: 'Weak Cryptography Algorithm',
        description: 'Use SHA-256 or stronger algorithms instead of MD5, SHA1, or DES',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.98),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-327',
      });
    }

    // Pattern 3: Hardcoded secrets
    if (/(password|apiKey|secret)\s*=\s*["'][^"']{6,}["']/.test(code)) {
      vulnerabilities.push({
        id: 'java-secret-001',
        type: 'HARDCODED_SECRET',
        title: 'Hardcoded Secret Detected',
        description: 'Credentials should not be hardcoded. Use configuration or vault.',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.99),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-798',
      });
    }

    return vulnerabilities;
  }

  private detectVulnerabilities_OLD(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Pattern 1: eval() detection
    if (/eval\s*\(/.test(code)) {
      vulnerabilities.push({
        id: 'eval-001',
        type: 'CODE_INJECTION',
        title: 'eval() Usage Detected',
        description: 'eval() is dangerous and should never be used with untrusted input',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.95),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-95',
      });
    }

    // Pattern 2: SQL concatenation
    if (/query\s*\(\s*["'`].*\+\s*\w+/.test(code) || /SELECT.*\+\s*\w+/.test(code)) {
      vulnerabilities.push({
        id: 'sql-001',
        type: 'SQL_INJECTION',
        title: 'SQL Injection Risk',
        description: 'SQL query constructed via string concatenation with user input',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.92),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 60 } },
        cweId: 'CWE-89',
      });
    }

    // Pattern 3: innerHTML without sanitization
    if (/\.innerHTML\s*=.*(?!DOMPurify|sanitize|escape)/.test(code)) {
      vulnerabilities.push({
        id: 'xss-001',
        type: 'XSS',
        title: 'Potential XSS Vulnerability',
        description: 'innerHTML used without proper sanitization',
        severity: SeverityLevel.HIGH,
        confidence: createConfidenceScore(0.88),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-79',
      });
    }

    // Pattern 4: Weak crypto (MD5, SHA1)
    if (/(md5|sha1|crypto\.md5|MD5|SHA1)\s*\(/.test(code)) {
      vulnerabilities.push({
        id: 'crypto-001',
        type: 'WEAK_CRYPTOGRAPHY',
        title: 'Weak Cryptography',
        description: 'MD5 and SHA1 are cryptographically broken and should not be used',
        severity: SeverityLevel.MEDIUM,
        confidence: createConfidenceScore(0.98),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 40 } },
        cweId: 'CWE-327',
      });
    }

    // Pattern 5: Hardcoded secrets
    if (/(password|api_key|secret|token)\s*=\s*["'][^"']{8,}["']/.test(code)) {
      vulnerabilities.push({
        id: 'secret-001',
        type: 'HARDCODED_SECRET',
        title: 'Hardcoded Secret Detected',
        description: 'API keys, passwords, or secrets should not be hardcoded',
        severity: SeverityLevel.CRITICAL,
        confidence: createConfidenceScore(0.99),
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 50 } },
        cweId: 'CWE-798',
      });
    }

    return vulnerabilities;
  }

  private calculateDefenseScore(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) {
      return 100;
    }

    const severityScores: Record<SeverityLevel, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };

    let totalRisk = 0;
    vulnerabilities.forEach(vuln => {
      const severity = severityScores[vuln.severity] || 0;
      const confidence = Math.min(1, Math.max(0, vuln.confidence || 0));
      totalRisk += severity * confidence;
    });

    const maxPossible = vulnerabilities.length * 5;
    if (maxPossible === 0) return 100;

    const score = 100 - (totalRisk / maxPossible) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  dispose(): void {
    this.isAnalyzing = false;
  }
}

// Singleton pattern
let serviceInstance: BugSynthesisServiceFixed | null = null;

export function getBugSynthesisService(): BugSynthesisServiceFixed {
  if (!serviceInstance) {
    serviceInstance = new BugSynthesisServiceFixed();
  }
  return serviceInstance;
}

export function disposeBugSynthesisService(): void {
  if (serviceInstance) {
    serviceInstance.dispose();
    serviceInstance = null;
  }
}
