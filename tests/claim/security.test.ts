import { describe, it, expect, beforeEach } from 'vitest';
import nextConfig from '../../next.config.mjs';
import { middleware } from '../../src/middleware';
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/extract/route';
import { useClaimStore } from '../../src/store/claimStore';

describe('Security & Privacy Verification', () => {
  describe('1. Security Headers in next.config.mjs & middleware', () => {
    it('verifies next.config.mjs defines CSP, nosniff, Referrer-Policy, and X-Frame-Options', async () => {
      const headersList = await nextConfig.headers();
      expect(headersList.length).toBeGreaterThan(0);

      const rootHeaders = headersList.find((h: any) => h.source === '/(.*)');
      expect(rootHeaders).toBeDefined();

      const headerMap = new Map(rootHeaders!.headers.map((h: any) => [h.key, h.value]));

      expect(headerMap.has('Content-Security-Policy')).toBe(true);
      expect(headerMap.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(headerMap.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");

      expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(headerMap.get('X-Frame-Options')).toBe('DENY');
    });

    it('verifies middleware sets Cache-Control: no-store on all application routes', () => {
      const routes = ['/', '/report', '/upload', '/verify', '/api/extract'];

      for (const route of routes) {
        const req = new NextRequest(`http://localhost:3000${route}`);
        const res = middleware(req);

        expect(res.headers.get('Cache-Control')).toContain('no-store');
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      }
    });

    it('verifies /api/extract returns Cache-Control: no-store on responses', async () => {
      // Test bad request returns Cache-Control: no-store
      const req = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: new FormData(),
      });
      const res = await POST(req);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });
  });

  describe('2. Memory-Only State & Zero Unintended LocalStorage Storage', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      useClaimStore.getState().clearAllData();
    });

    it('ensures loading samples, updating items, and running audits never writes bill data to localStorage', () => {
      useClaimStore.getState().loadSample('sample1');
      useClaimStore.getState().updateLineItem(useClaimStore.getState().bill!.items[0].id, {
        quantity: 5,
        brand: 'TestBrand',
      });
      useClaimStore.getState().executeAudit();

      if (typeof window !== 'undefined' && window.localStorage) {
        // Assert localStorage is completely empty or contains only optional api key
        const keys = Object.keys(window.localStorage);
        for (const k of keys) {
          expect(k).toBe('x-gemini-key');
        }
      }
    });
  });
});
