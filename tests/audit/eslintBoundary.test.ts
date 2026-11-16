import { describe, it, expect } from 'vitest';
// @ts-ignore -- eslint package does not bundle types in devDependencies
import { ESLint } from 'eslint';
import * as path from 'path';

interface LintMessage {
  ruleId: string;
  message: string;
}

interface LintResult {
  messages: LintMessage[];
}

describe('ESLint Programmatic Rule Enforcement on Trust Zone Fixture', () => {
  const eslint = new ESLint();

  it('asserts that all Trust Zone isolation rules fire on violating code', async () => {
    const violatingSnippet = `
// 1. Forbidden imports
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import React from 'react';
import { create } from 'zustand';

export function badFunction() {
  // 2. Forbidden clock and randomness
  const t1 = Date.now();
  const d = new Date();
  const r = Math.random();
  const p = performance.now();
  const u = crypto.randomUUID();
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);

  // 3. Forbidden network globals
  fetch('https://example.com');
  const xhr = new XMLHttpRequest();
  const ws = new WebSocket('wss://example.com');

  // 4. Forbidden environment access
  const env = process.env.NODE_ENV;

  return { t1, d, r, p, u, env };
}
`;

    // Simulated file path inside src/lib/audit to trigger the ESLint override
    const filePath = path.resolve(process.cwd(), 'src/lib/audit/violatingTestFixture.ts');

    const rawResults = await eslint.lintText(violatingSnippet, { filePath });
    const results = rawResults as unknown as LintResult[];
    const messages: LintMessage[] = results[0]?.messages || [];

    const ruleIds: string[] = messages.map((m: LintMessage) => m.ruleId);

    // Verify all 4 ESLint guardrail rules fire:
    expect(ruleIds).toContain('no-restricted-imports');
    expect(ruleIds).toContain('no-restricted-properties');
    expect(ruleIds).toContain('no-restricted-globals');
    expect(ruleIds).toContain('no-restricted-syntax');

    // Verify specific violations
    const descriptions: string[] = messages.map((m: LintMessage) => m.message);

    expect(descriptions.some((d: string) => d.includes('Date.now()'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('Math.random()'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('performance.now()'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('crypto.randomUUID()'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('new Date()'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('process.env'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('fetch'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('XMLHttpRequest'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('WebSocket'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('Node fs is forbidden'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('Trust Zone (src/lib/audit/**) must remain isolated'))).toBe(true);
  });
});
