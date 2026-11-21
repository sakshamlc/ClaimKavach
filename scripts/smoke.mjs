#!/usr/bin/env node
/**
 * ClaimKavach — Production Smoke Test Script
 *
 * Runs non-destructive health checks against a live Next.js instance (local dev, next start, or deployed Vercel URL).
 * Usage:
 *   node scripts/smoke.mjs [baseUrl]
 *   Example: node scripts/smoke.mjs http://localhost:3000
 *
 * Checks:
 *   1. GET / -> 200, Cache-Control: no-store, CSP header present
 *   2. GET /sources -> 200
 *   3. GET /goal -> redirect to /
 *   4. GET /fix -> redirect to /
 *   5. POST /api/extract with invalid file -> 400 BAD_TYPE, Cache-Control: no-store
 *   6. POST /api/extract with >4MB payload -> 413 TOO_LARGE
 */

const baseUrl = (process.argv[2] || process.env.SMOKE_URL || 'http://localhost:3000').replace(/\/+$/, '');

console.log(`\n========================================`);
console.log(` ClaimKavach Smoke Test Suite`);
console.log(` Target: ${baseUrl}`);
console.log(`========================================\n`);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

async function runSmokeTests() {
  // Test 1: Landing Page GET /
  try {
    const res = await fetch(`${baseUrl}/`, { method: 'GET' });
    assert(res.status === 200, `GET / returned 200 (status: ${res.status})`);
    
    const csp = res.headers.get('content-security-policy');
    assert(!!csp && csp.includes("default-src 'self'"), `GET / has Content-Security-Policy header`);
    
    const cc = res.headers.get('cache-control');
    assert(!!cc && cc.includes('no-store'), `GET / has Cache-Control: no-store (${cc})`);
  } catch (err) {
    assert(false, `GET / connection failed: ${err.message}`);
  }

  // Test 2: Regulatory Sources Page GET /sources
  try {
    const res = await fetch(`${baseUrl}/sources`, { method: 'GET' });
    assert(res.status === 200, `GET /sources returned 200 (status: ${res.status})`);
    const text = await res.text();
    assert(text.includes('Drugceiling1.pdf') || text.includes('S.O. 5975(E)'), `GET /sources renders regulatory manifest entries`);
  } catch (err) {
    assert(false, `GET /sources connection failed: ${err.message}`);
  }

  // Test 3: Legacy Redirect GET /goal
  try {
    const res = await fetch(`${baseUrl}/goal`, { method: 'GET', redirect: 'manual' });
    const isRedirect = res.status === 307 || res.status === 308 || res.status === 302 || res.status === 301;
    const loc = res.headers.get('location') || '';
    assert(isRedirect && (loc === '/' || loc.endsWith('/')), `GET /goal redirects to / (status: ${res.status}, location: ${loc})`);
  } catch (err) {
    assert(false, `GET /goal redirect failed: ${err.message}`);
  }

  // Test 4: Legacy Redirect GET /fix
  try {
    const res = await fetch(`${baseUrl}/fix`, { method: 'GET', redirect: 'manual' });
    const isRedirect = res.status === 307 || res.status === 308 || res.status === 302 || res.status === 301;
    const loc = res.headers.get('location') || '';
    assert(isRedirect && (loc === '/' || loc.endsWith('/')), `GET /fix redirects to / (status: ${res.status}, location: ${loc})`);
  } catch (err) {
    assert(false, `GET /fix redirect failed: ${err.message}`);
  }

  // Test 5: POST /api/extract with invalid magic bytes
  try {
    const form = new FormData();
    const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    form.append('file', new Blob([invalidBuffer], { type: 'application/octet-stream' }), 'corrupt.bin');
    form.append('docType', 'hospital_bill');

    const res = await fetch(`${baseUrl}/api/extract`, {
      method: 'POST',
      body: form,
    });

    assert(res.status === 400, `POST /api/extract invalid file returns 400 (status: ${res.status})`);
    const json = await res.json().catch(() => ({}));
    assert(json.error?.code === 'BAD_TYPE', `POST /api/extract error code is BAD_TYPE (${json.error?.code})`);
    
    const cc = res.headers.get('cache-control');
    assert(!!cc && cc.includes('no-store'), `POST /api/extract has Cache-Control: no-store (${cc})`);
  } catch (err) {
    assert(false, `POST /api/extract invalid file check failed: ${err.message}`);
  }

  // Test 6: POST /api/extract with payload > 4 MB
  try {
    const form = new FormData();
    // 4.5 MB of dummy data
    const oversized = new Uint8Array(4.5 * 1024 * 1024);
    // Set PNG magic bytes to verify size check triggers first
    oversized[0] = 0x89;
    oversized[1] = 0x50;
    oversized[2] = 0x4e;
    oversized[3] = 0x47;

    form.append('file', new Blob([oversized], { type: 'image/png' }), 'oversized.png');
    form.append('docType', 'hospital_bill');

    const res = await fetch(`${baseUrl}/api/extract`, {
      method: 'POST',
      body: form,
    });

    assert(res.status === 413, `POST /api/extract oversized payload returns 413 (status: ${res.status})`);
    const json = await res.json().catch(() => ({}));
    assert(json.error?.code === 'TOO_LARGE', `POST /api/extract error code is TOO_LARGE (${json.error?.code})`);
  } catch (err) {
    assert(false, `POST /api/extract oversized check failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(` Smoke Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
