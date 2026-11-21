import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { Verdict } from '../src/lib/audit/types';
import { Badge, type BadgeVariant } from '../src/components/ui/Badge';
import { renderToString } from 'react-dom/server';
import React from 'react';

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFilesRecursively(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Design System Integrity & Palette Verification', () => {
  it('1. No hardcoded hex color codes exist outside token files', () => {
    const srcAppDir = path.resolve(process.cwd(), 'src/app');
    const srcComponentsDir = path.resolve(process.cwd(), 'src/components');

    const files = [
      ...getFilesRecursively(srcAppDir, ['.ts', '.tsx']),
      ...getFilesRecursively(srcComponentsDir, ['.ts', '.tsx']),
    ];

    const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
    const violations: { file: string; match: string; line: number }[] = [];

    for (const file of files) {
      if (file.endsWith('globals.css')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((lineText, idx) => {
        const matches = lineText.match(hexRegex);
        if (matches) {
          for (const m of matches) {
            violations.push({ file: path.relative(process.cwd(), file), match: m, line: idx + 1 });
          }
        }
      });
    }

    expect(
      violations,
      `Found hardcoded hex codes in component/page files: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it('2. Verdict tiers have distinct token, icon, and label; only VALID_EXCLUSION uses success token', () => {
    const verdictTiers: {
      verdict: Verdict;
      variant: BadgeVariant;
      label: string;
      expectedIconSnippet: string;
      expectedBgToken: string;
      isSuccess: boolean;
    }[] = [
      {
        verdict: 'CONFIRMED_OVERCHARGE',
        variant: 'confirmed',
        label: 'Confirmed Overcharge',
        expectedIconSnippet: 'octagon',
        expectedBgToken: 'bg-tier-confirmed-bg',
        isSuccess: false,
      },
      {
        verdict: 'LIKELY_ISSUE',
        variant: 'likely',
        label: 'Likely Issue',
        expectedIconSnippet: 'triangle',
        expectedBgToken: 'bg-tier-likely-bg',
        isSuccess: false,
      },
      {
        verdict: 'NEEDS_REVIEW',
        variant: 'needs-review',
        label: 'Needs Review',
        expectedIconSnippet: 'help',
        expectedBgToken: 'bg-tier-needs-review-bg',
        isSuccess: false,
      },
      {
        verdict: 'VALID_EXCLUSION',
        variant: 'valid-exclusion',
        label: 'Valid Exclusion',
        expectedIconSnippet: 'check',
        expectedBgToken: 'bg-tier-valid-exclusion-bg',
        isSuccess: true,
      },
      {
        verdict: 'NOT_CHECKED',
        variant: 'not-checked',
        label: 'Not Checked',
        expectedIconSnippet: 'minus',
        expectedBgToken: 'bg-tier-not-checked-bg',
        isSuccess: false,
      },
    ];

    const renderedIcons = new Set<string>();
    const renderedVariants = new Set<string>();
    const renderedBgs = new Set<string>();

    for (const tier of verdictTiers) {
      const rendered = renderToString(
        React.createElement(Badge, { variant: tier.variant }, tier.label)
      );

      // Verify label is present
      expect(rendered).toContain(tier.label);

      // Verify distinct background token
      expect(rendered).toContain(tier.expectedBgToken);
      renderedBgs.add(tier.expectedBgToken);
      renderedVariants.add(tier.variant);

      // Verify distinct icon
      expect(rendered.toLowerCase()).toContain(tier.expectedIconSnippet);
      renderedIcons.add(tier.expectedIconSnippet);

      // Verify only VALID_EXCLUSION uses success/valid-exclusion token
      if (tier.isSuccess) {
        expect(rendered).toContain('tier-valid-exclusion');
      } else {
        expect(rendered).not.toContain('tier-valid-exclusion');
        expect(rendered).not.toContain('bg-emerald');
        expect(rendered).not.toContain('text-emerald');
      }
    }

    // All 5 tiers must have distinct background tokens and distinct icons
    expect(renderedVariants.size).toBe(5);
    expect(renderedBgs.size).toBe(5);
    expect(renderedIcons.size).toBe(5);
  });

  it('3. MetricCards contains no success-token or emerald styling on cards or money figures', () => {
    const metricCardsPath = path.resolve(process.cwd(), 'src/components/claim/MetricCards.tsx');
    const content = fs.readFileSync(metricCardsPath, 'utf-8');

    // Filter out comments
    const linesWithoutComments = content
      .split('\n')
      .map((l) => l.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, ''))
      .join('\n');

    expect(linesWithoutComments).not.toContain('tier-valid-exclusion');
    expect(linesWithoutComments).not.toContain('bg-emerald');
    expect(linesWithoutComments).not.toContain('text-emerald');
    expect(linesWithoutComments).not.toContain('border-emerald');
    expect(linesWithoutComments).not.toContain('bg-success');
    expect(linesWithoutComments).not.toContain('text-success');

    // Verify all 5 cards use neutral bg-card
    const cardMatches = content.match(/bg-card rounded-card p-4/g);
    expect(cardMatches?.length).toBe(5);

    // Verify money figures use text-navy
    expect(content).toContain('text-h2 font-extrabold text-navy font-mono');
  });
});
