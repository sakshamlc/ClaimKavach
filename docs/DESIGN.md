# ClaimKavach — Design System & Layout Specification (`DESIGN.md`)

This document defines the layout architecture, design tokens, typography scale, component contracts, and responsiveness rules for ClaimKavach.

---

## 1. Design Tokens

### 1.1 Spacing (8px Grid)
All padding, margin, gap, and dimension values follow a strict 8-point base grid:

| Token | Pixels | Tailwind Equivalent | Primary Usage |
|---|---|---|---|
| `space-1` | 4px | `p-1`, `gap-1`, `m-1` | Micro-spacing, badge padding, icon gap |
| `space-2` | 8px | `p-2`, `gap-2`, `m-2` | Compact component padding, chip spacing |
| `space-3` | 12px | `p-3`, `gap-3`, `m-3` | Card internal gap, input padding |
| `space-4` | 16px | `p-4`, `gap-4`, `m-4` | Card padding (mobile), section sub-spacing |
| `space-6` | 24px | `p-6`, `gap-6`, `m-6` | Panel padding, tablet horizontal gutter |
| `space-8` | 32px | `p-8`, `gap-8`, `m-8` | Desktop container horizontal gutter |
| `space-12` | 48px | `py-12`, `gap-12` | Mobile section rhythm separation |
| `space-16` | 64px | `py-16`, `gap-16` | Desktop section rhythm separation |

### 1.2 Border Radius
Strictly constrained to 3 functional radii:
- **8px (`rounded-chip` / `rounded-input`):** Form inputs, select dropdowns, chips, verdict badges, table cells.
- **12px (`rounded-card`):** Content cards, sample test cards, metric summary cards, alert callouts.
- **16px (`rounded-panel`):** Large sections, hero containers, multi-column feature panels, dialogs/bottom sheets.

### 1.3 Typography Scale
Base font: `Noto Sans` (Latin) and `Noto Sans Devanagari` (Devanagari). Line height is tuned for high clinical legibility:

| Role | Font Size / Line Height | Desktop Weight | Mobile Size / Line Height | Max Line Length |
|---|---|---|---|---|
| **Display** | 36px / 44px (`text-display`) | Extrabold (800) | 28px / 36px (`text-display-mobile`) | ~40ch |
| **Heading 1 (h1)** | 30px / 38px (`text-h1`) | Bold (700) | 24px / 32px (`text-h2`) | ~50ch |
| **Heading 2 (h2)** | 24px / 32px (`text-h2`) | Bold (700) | 20px / 28px | ~60ch |
| **Heading 3 (h3)** | 18px / 26px (`text-h3`) | Semibold (600) | 16px / 24px | ~60ch |
| **Body (p)** | 16px / 26px (`text-body`) | Regular (400) | 15px / 24px | **&le; 70ch (`max-w-prose`)** |
| **Small** | 14px / 22px (`text-small`) | Regular (400) / Medium (500) | 13px / 20px | — |
| **Caption / Mono** | 12px / 18px (`text-caption`) | Medium (500) / Semibold (600) | 11px / 16px | — |

### 1.4 Official Brand Palette & WCAG AA Contrast Tokens

All tokens maintain &ge; 4.5:1 contrast against their respective backgrounds (&ge; 3:1 for UI boundaries, focus rings, and disabled text):

| Semantic Token | Hex Code | Background Hex | Contrast Ratio | Usage |
|---|---|---|---|---|
| `navy` (brand text & headers) | `#102A43` | `#FFFFFF` (card) | 14.64:1 (Pass AAA) | Headings, key figures, header background |
| `navy` on `bg` | `#102A43` | `#F8FAFC` (bg) | 13.99:1 (Pass AAA) | Primary text on application background |
| `navy` on `bg-secondary` | `#102A43` | `#F1F5F9` (bg-sec) | 13.37:1 (Pass AAA) | Primary text on zebra rows |
| `white` on `navy` | `#FFFFFF` | `#102A43` (navy) | 14.64:1 (Pass AAA) | Header text and branding on navy |
| `soft-teal` on `navy` | `#E0F2F1` | `#102A43` (navy) | 12.65:1 (Pass AAA) | Header pill and focus ring on navy header |
| `teal-700` (primary button fill) | `#0F766E` | `#FFFFFF` (card) | 5.47:1 (Pass AA) | Primary CTAs, active links, audio controls |
| `white` on `teal-700` | `#FFFFFF` | `#0F766E` (teal-700) | 5.47:1 (Pass AA) | Button label text on primary button fill |
| `white` on `teal-800` | `#FFFFFF` | `#115E59` (teal-800) | 7.58:1 (Pass AAA) | Button label text on primary button hover |
| `text-secondary` | `#334155` | `#FFFFFF` (card) | 10.35:1 (Pass AAA) | Secondary labels, descriptions, table body |
| `text-secondary` on `bg` | `#334155` | `#F8FAFC` (bg) | 9.90:1 (Pass AAA) | Secondary text on base background |
| `text-secondary` on `bg-sec` | `#334155` | `#F1F5F9` (bg-sec) | 9.45:1 (Pass AAA) | Secondary text on zebra rows |
| `text-secondary` on `soft-teal` | `#334155` | `#E0F2F1` (soft-teal) | 8.94:1 (Pass AAA) | Secondary text on soft-teal cards |
| `text-muted` | `#57687C` | `#FFFFFF` (card) | 5.71:1 (Pass AA) | Timestamps, column subtitles, placeholders |
| `text-muted` on `bg` | `#57687C` | `#F8FAFC` (bg) | 5.46:1 (Pass AA) | Section descriptions on gray background |
| `text-muted` on `bg-sec` (Zebra) | `#57687C` | `#F1F5F9` (bg-sec) | 5.21:1 (Pass AA) | Muted text on table zebra rows |
| `text-muted` on `soft-teal` | `#57687C` | `#E0F2F1` (soft-teal) | 4.93:1 (Pass AA) | Muted text in dropzones and audio player |
| `confirmed` (Red-700) on tint | `#B91C1C` | `#FEF2F2` (red-50) | 5.91:1 (Pass AA) | Confirmed overcharges chip text |
| `confirmed` (Red-700) on card | `#B91C1C` | `#FFFFFF` (card) | 6.47:1 (Pass AA) | Confirmed overcharges on white card |
| `likely` (Amber-700) on tint | `#B45309` | `#FFFBEB` (amber-50) | 4.84:1 (Pass AA) | Likely issues chip text |
| `likely` (Amber-700) on card | `#B45309` | `#FFFFFF` (card) | 5.02:1 (Pass AA) | Likely issues on white card |
| `needs-review` (Sky-700) on tint | `#0369A1` | `#F0F9FF` (sky-50) | 5.57:1 (Pass AA) | Needs review informational tier |
| `needs-review` (Sky-700) on card | `#0369A1` | `#FFFFFF` (card) | 5.93:1 (Pass AA) | Needs review on white card |
| `valid-exclusion` (Emerald-700) | `#047857` | `#ECFDF5` (emerald-50) | 5.21:1 (Pass AA) | Valid insurer deductions chip text |
| `valid-exclusion` on card | `#047857` | `#FFFFFF` (card) | 5.48:1 (Pass AA) | Valid exclusion on white card |
| `not-checked` (Slate) | `#334155` | `#F1F5F9` (slate-100) | 9.45:1 (Pass AAA) | Unchecked line items |
| `link` (Teal-700 on card) | `#0F766E` | `#FFFFFF` (card) | 5.47:1 (Pass AA) | Interactive links on white surface |
| `link` (Teal-700 on bg-sec) | `#0F766E` | `#F1F5F9` (bg-sec) | 5.00:1 (Pass AA) | Interactive links on zebra rows |
| `link` (Soft-teal on navy) | `#E0F2F1` | `#102A43` (navy) | 12.65:1 (Pass AAA) | Interactive links on navy header |
| `disabled-text` on `bg-sec` | `#758699` | `#F1F5F9` (bg-sec) | 3.41:1 (Pass UI) | Disabled buttons on secondary bg |
| `disabled-text` on `card` | `#758699` | `#FFFFFF` (card) | 3.73:1 (Pass UI) | Disabled inputs/buttons on card |
| `focus-ring` (Teal on light) | `#0D9488` | `#FFFFFF` (card) | 3.74:1 (Pass UI) | 2px focus ring on light surfaces |
| `focus-ring` (Soft-teal on navy) | `#E0F2F1` | `#102A43` (navy) | 12.65:1 (Pass AAA) | 2px focus ring on navy header elements |

### 1.5 Elevation (3 Discrete Levels)
1. **`shadow-none`:** Flat inputs, nested table rows, sub-elements.
2. **`shadow-card`:** `0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.04)` for cards, metric blocks.
3. **`shadow-popover`:** `0 10px 15px -3px rgba(16, 24, 40, 0.1), 0 4px 6px -4px rgba(16, 24, 40, 0.06)` for modals, sticky action bars, dropdowns.

### 1.6 Focus Ring & Motion
- **Focus Ring:** Visible 2px solid primary ring with 2px offset (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden`) on all interactive buttons, links, inputs, and tabs.
- **Motion:** 150ms–200ms `cubic-bezier(0, 0, 0.2, 1)` for hover and expand transitions. Disabled under `@media (prefers-reduced-motion: reduce)`.

---

## 2. Layout Structure & Breakpoints

- **Mobile Baseline:** 360px & 375px (single column, full-width touch targets &ge;44px, sticky bottom action bar).
- **Tablet:** 768px (`sm:`, 24px container padding, 2-column or 3-column grids).
- **Desktop:** 1024px & 1120px max content width (`lg:max-w-content`, 32px container padding).
- **Section Spacing Rhythm:** 64px vertical between landing sections on desktop (`py-16`), 48px on mobile (`py-12`), with alternating white (`bg-surface`) and cool-gray (`bg-surface-muted`) backgrounds.

---

## 3. Shared Components Hierarchy

All visual elements reuse centralized components from `src/components/ui/`:
- **`Button`:** Primary, secondary, ghost, destructive with loading spinner and &ge;44px minimum tap area.
- **`Card`:** Uniform border, 12px radius, and standard card elevation.
- **`Badge` / `Chip`:** Semantic verdict tier badges with distinct icons and WCAG AA contrast.
- **`Alert`:** Unified info, warning, and error callouts.
- **`Stepper`:** Shared 3-step wizard progression (Upload &rarr; Verify &rarr; Report).
- **`Tabs`:** Accessible segmented tab bar with counts and horizontal scroll on small screens.
- **`Meter`:** Dual-mode coverage progress bar displaying numbers both as text and graphic fill.
- **`Dropzone`:** Accessible drag-and-drop file uploader with mobile camera capture button and filled removal state.
- **`StickyActionBar`:** Mobile fixed bottom bar ensuring primary actions are within thumb reach.
