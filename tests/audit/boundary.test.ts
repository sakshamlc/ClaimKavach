import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Trust Zone Boundary & Isolation Guardrails', () => {
  const auditDir = path.resolve(__dirname, '../../src/lib/audit');

  function getAuditFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAuditFiles(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const auditFiles = fs.existsSync(auditDir) ? getAuditFiles(auditDir) : [];

  it('ensures Trust Zone directory exists and contains source files', () => {
    expect(auditFiles.length).toBeGreaterThan(0);
  });

  it('guarantees zero imports of @google/genai, extract, ai, or api modules', () => {
    for (const file of auditFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('@google/genai');
      expect(content).not.toMatch(/from\s+['"].*\/extract\/.*['"]/);
      expect(content).not.toMatch(/from\s+['"].*\/ai\/.*['"]/);
      expect(content).not.toMatch(/from\s+['"].*\/api\/.*['"]/);
    }
  });

  it('guarantees zero imports of react, next, zustand, or store', () => {
    for (const file of auditFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/from\s+['"]react['"]/);
      expect(content).not.toMatch(/from\s+['"]next(\/.*)?['"]/);
      expect(content).not.toMatch(/from\s+['"]zustand['"]/);
      expect(content).not.toMatch(/from\s+['"].*store.*['"]/);
    }
  });

  it('guarantees zero external network, HTTP client, or WebSocket usage', () => {
    for (const file of auditFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // No fetch, axios, http, https, XMLHttpRequest, WebSocket
      expect(content).not.toMatch(/\bfetch\s*\(/);
      expect(content).not.toMatch(/\baxios\b/);
      expect(content).not.toMatch(/\bXMLHttpRequest\b/);
      expect(content).not.toMatch(/\bWebSocket\b/);
      expect(content).not.toMatch(/from\s+['"](http|https|net|ws)['"]/);
    }
  });

  it('guarantees zero non-deterministic clock or random calls (clocks must be injected)', () => {
    for (const file of auditFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // No Date.now(), new Date(), Math.random()
      expect(content).not.toMatch(/Date\.now\s*\(/);
      expect(content).not.toMatch(/new\s+Date\s*\(/);
      expect(content).not.toMatch(/Math\.random\s*\(/);
    }
  });

  it('guarantees zero file system I/O imports', () => {
    for (const file of auditFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/from\s+['"]fs['"]/);
      expect(content).not.toMatch(/from\s+['"]fs\/promises['"]/);
    }
  });
});
