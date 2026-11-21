# ClaimKavach — Vercel Deployment & Production Operations Guide

This guide documents the production deployment of **ClaimKavach** on [Vercel](https://vercel.com).

---

## 1. Architecture & Vercel Runtime Profile

ClaimKavach follows a dual-zone architecture:
- **Client Trust Zone:** Runs entirely inside the patient's browser memory (Zustand store). Zero server-side database. Pure mathematical and deterministic statutory rule evaluation.
- **Serverless Extraction Zone (`/api/extract`):**
  - **Runtime:** `nodejs` (`export const runtime = 'nodejs';`)
  - **Max Duration:** `60` seconds (`export const maxDuration = 60;`)
  - **Dynamic Rendering:** `force-dynamic` (`export const dynamic = 'force-dynamic';`)
  - **Cache Policy:** `Cache-Control: no-store` on all API responses
  - **Payload Limit:** 4 MB maximum per request batch (enforced client-side and server-side)
  - **Rate Limiting:** In-memory sliding window per serverless lambda instance (configurable via `RATE_LIMIT_PER_MIN`)

---

## 2. Environment Variables

Configure these variables in your Vercel Project Settings (**Settings &rarr; Environment Variables**):

| Variable | Environment | Required | Default / Recommended | Description |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Production, Preview | Recommended | — | Server-wide Google Gemini API Key from Google AI Studio. If omitted, users can provide their personal key in the UI. |
| `GEMINI_MODEL` | Production, Preview | **Yes** | `gemini-1.5-pro` or `gemini-2.0-flash` | The specific Gemini model used for multimodal document extraction. Required outside mock mode. |
| `RATE_LIMIT_PER_MIN` | Production, Preview | No | `10` | Max extraction requests per IP per minute per serverless container instance. |
| `MAX_UPLOAD_MB` | Production, Preview | No | `4` | Maximum allowable upload payload in megabytes per request. |
| `EXTRACT_MOCK` | Local / Preview Only | No | `0` | Set to `1` only for local offline development. **Strictly ignored when `NODE_ENV === 'production'`.** |

> [!IMPORTANT]
> Never set `EXTRACT_MOCK=1` in Production. The API route explicitly blocks mock responses in production environments (`process.env.NODE_ENV === 'production'`).

---

## 3. Step-by-Step Vercel Deployment Procedure

### Step 3.1: Connect Repository
1. Navigate to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... &rarr; Project**.
2. Select your Git provider (GitHub / GitLab / Bitbucket) and import the `ClaimKavach` repository.
3. Select branch `feat/trust-zone-v2` or `main`.

### Step 3.2: Configure Build Settings
- **Framework Preset:** `Next.js`
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Step 3.3: Set Environment Variables
Add `GEMINI_API_KEY` and `GEMINI_MODEL` under **Environment Variables** for both Production and Preview environments.

### Step 3.4: Deploy
Click **Deploy**. Vercel will build the application, bundle static JSON regulatory assets, and deploy edge middleware and serverless functions.

---

## 4. Post-Deployment Verification (Smoke Test Checklist)

Run the automated smoke test script against your newly deployed Vercel domain:

```bash
node scripts/smoke.mjs https://claimkavach.yourdomain.vercel.app
```

The smoke test verifies:
1. `GET /` returns status `200`, `Cache-Control: no-store`, and strict Content Security Policy (`default-src 'self'`).
2. `GET /sources` returns status `200` with the 5 statutory `MANIFEST.json` entries rendered.
3. `GET /goal` and `GET /fix` issue `307/308` redirects pointing cleanly to `/`.
4. `POST /api/extract` with non-image/non-pdf bytes returns `400 BAD_TYPE` with `Cache-Control: no-store`.
5. `POST /api/extract` with > 4MB payload returns `413 TOO_LARGE`.

### Manual Browser Verification:
- [ ] Visit landing page and verify the 45-record status badge (`45 Statutory Reference Records Loaded`).
- [ ] Test **Sample 1 (Stent Overcharge)**: Verify R-NPPA-01 triggers with unverified reference badge (`DEMO DATA / UNVERIFIED`).
- [ ] Test **Sample 2 (Room Bundling & TPA)**: Verify R-BUNDLE-01 and R-ANX-01 trigger.
- [ ] Test **Sample 3 (Clean Bill)**: Verify zero overcharges and 100% fair amount.
- [ ] Verify Language Switcher: Toggle between English and हिंदी across all pages.
- [ ] Click **Print / Export Report**: Verify clean stylesheet rendering with the prominent disclaimer.

---

## 5. Rollback Procedure

If a deployed version experiences unexpected issues:
1. In the Vercel Dashboard, go to **Deployments**.
2. Locate the previous stable deployment.
3. Click the three dots menu (**...**) on that deployment and select **Instant Rollback**.
4. Traffic is immediately redirected to the previous build without a rebuild cycle.
