// Minimal Bug Synthesis Types
// Simplified for quick integration into SynCodex

export enum SeverityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export interface Range {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface Vulnerability {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  confidence: number; // 0-1
  range: Range;
  cweId?: string;
  owasp?: string;
  patches?: Patch[];
}

export interface Patch {
  id: string;
  title: string;
  level: 'minimal' | 'best' | 'architectural';
  code: string;
  confidence: number;
}

export interface AnalysisResult {
  vulnerabilities: Vulnerability[];
  defenseScore: number;
}

export interface CodeContext {
  fileId: string;
  fileName: string;
  language: string;
  code: string;
}

export type ConfidenceScore = number & { readonly __brand: 'ConfidenceScore' };

export function createConfidenceScore(value: number): ConfidenceScore {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped as ConfidenceScore;
}
