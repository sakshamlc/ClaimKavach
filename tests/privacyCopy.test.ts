import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

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

describe('Privacy Copy Verification', () => {
  const targetFiles = [
    path.resolve(process.cwd(), 'README.md'),
    ...getFilesRecursively(path.resolve(process.cwd(), 'src'), ['.ts', '.tsx', '.md']),
  ];

  const BANNED_PATTERNS = [
    { pattern: /purely in browser/i, description: 'purely in browser' },
    {
      pattern: /Nothing is stored, tracked, or sent to a database/i,
      description: 'Nothing is stored, tracked, or sent to a database',
    },
    { pattern: /\bstateless\b/i, description: 'stateless' },
    {
      pattern: /all computations run in browser memory/i,
      description: 'all computations run in browser memory',
    },
    {
      pattern: /पूरी तरह से ब्राउज़र मेमोरी में/i,
      description: 'Hindi: purely in browser memory',
    },
    {
      pattern: /कोई भी डेटा सर्वर या डेटाबेस में सहेजा नहीं जाता/i,
      description: 'Hindi: Nothing is stored in database',
    },
    {
      pattern: /सभी गणनाएँ ब्राउज़र मेमोरी में/i,
      description: 'Hindi: all computations run in browser memory',
    },
  ];

  it('1. None of the inaccurate privacy phrases return in src/ or README.md (English and Hindi)', () => {
    const violations: { file: string; line: number; text: string; matched: string }[] = [];

    for (const filePath of targetFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        for (const { pattern, description } of BANNED_PATTERNS) {
          if (pattern.test(lineText)) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              line: idx + 1,
              text: lineText.trim(),
              matched: description,
            });
          }
        }
      });
    }

    expect(
      violations,
      `Found inaccurate privacy copy violations:\n${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it('2. Accurate architecture privacy statement is present in claimI18n and README', () => {
    const readmeContent = fs.readFileSync(path.resolve(process.cwd(), 'README.md'), 'utf-8');
    const i18nContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/claimI18n.ts'),
      'utf-8'
    );

    // Verify English statement
    const expectedEnStatement =
      "ClaimKavach doesn't store your bill; the file is sent to Google Gemini for reading; the audit runs on your device";
    expect(readmeContent).toContain("ClaimKavach doesn't store your bill");
    expect(i18nContent).toContain(expectedEnStatement);

    // Verify key pass-through statement
    const keyPathEnStatement =
      "A Gemini key you type passes through the ClaimKavach server to Google and isn't stored or logged";
    expect(readmeContent).toContain(keyPathEnStatement);
    expect(i18nContent).toContain(keyPathEnStatement);

    // Verify Hindi statement
    const expectedHiStatement =
      'क्लेमकवच आपके बिल को संग्रहीत नहीं करता है; फ़ाइल पढ़ने के लिए Google Gemini को भेजी जाती है; ऑडिट आपके डिवाइस पर चलता है';
    expect(i18nContent).toContain(expectedHiStatement);
    const keyPathHiStatement =
      'आपके द्वारा दर्ज की गई Gemini कुंजी ClaimKavach सर्वर के माध्यम से Google को भेजी जाती है और इसे संग्रहीत या लॉग नहीं किया जाता है';
    expect(readmeContent).toContain(keyPathHiStatement);
    expect(i18nContent).toContain(keyPathHiStatement);

    // Verify shortened banner
    expect(i18nContent).toContain("We don't store your bill. Reading uses Google Gemini.");
    expect(i18nContent).toContain('हम आपका बिल सहेजते नहीं हैं। पढ़ने के लिए Google Gemini का उपयोग होता है।');
  });
});
