import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, config, buildCspHeader } from '../src/middleware';

describe('Middleware & CSP Security Headers', () => {
  it('1. Applies Cache-Control: no-store and strict CSP with worker-src blob: for pdf.js worker', () => {
    const req = new NextRequest('http://localhost:3000/report');
    const res = middleware(req);

    expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
    expect(res.headers.get('Pragma')).toBe('no-cache');
    expect(res.headers.get('Expires')).toBe('0');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('generativelanguage.googleapis.com');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('2. Excludes unsafe-eval in production and includes it in development', () => {
    const prodCsp = buildCspHeader('production');
    expect(prodCsp).toContain("script-src 'self' 'unsafe-inline'");
    expect(prodCsp).not.toContain("'unsafe-eval'");
    expect(prodCsp).toContain("connect-src 'self'");
    expect(prodCsp).not.toContain('generativelanguage.googleapis.com');

    const devCsp = buildCspHeader('development');
    expect(devCsp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    expect(devCsp).toContain("connect-src 'self'");
    expect(devCsp).not.toContain('generativelanguage.googleapis.com');
  });

  it('3. Matcher excludes _next/static, _next/image, favicon.ico and image assets', () => {
    // Next.js anchors matcher strings with ^ and $ internally
    const pattern = new RegExp(`^${config.matcher[0]}$`);

    // Included routes (must match)
    expect(pattern.test('/')).toBe(true);
    expect(pattern.test('/report')).toBe(true);
    expect(pattern.test('/api/extract')).toBe(true);

    // Excluded routes (must not match)
    expect(pattern.test('/_next/static/chunks/app/layout.js')).toBe(false);
    expect(pattern.test('/_next/image?url=%2Ftest.png&w=64&q=75')).toBe(false);
    expect(pattern.test('/favicon.ico')).toBe(false);
    expect(pattern.test('/images/hero.svg')).toBe(false);
    expect(pattern.test('/sample.png')).toBe(false);
    expect(pattern.test('/photo.jpg')).toBe(false);
    expect(pattern.test('/graphic.webp')).toBe(false);
  });
});
