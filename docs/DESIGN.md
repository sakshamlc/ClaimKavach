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

### 1.4 Semantic Colour Tokens & WCAG AA Contrast

All tokens maintain &ge; 4.5:1 contrast against their respective backgrounds (&ge; 3:1 for UI boundaries and large text):

| Semantic Token | Hex Code | Background Hex | Contrast Ratio | Usage |
|---|---|---|---|---|
| `primary` | `#1B4B82` | `#FFFFFF` | 8.84:1 (Pass AAA) | Brand, primary CTAs, interactive highlights |
| `primary-soft` | `#EEF4FB` | `#1B4B82` (text) | 7.99:1 (Pass AAA) | Soft card tint, stepper backgrounds |
| `primary-contrast` | `#FFFFFF` | `#1B4B82` | 8.84:1 (Pass AAA) | Text on primary button |
| `accent-teal` | `#0F766E` | `#FFFFFF` | 5.47:1 (Pass AA) | Audio player controls & secondary actions |
| `ink` (`text`) | `#0F1B2D` | `#FFFFFF` | 17.28:1 (Pass AAA) | Primary headlines and high-contrast body text |
| `text-muted` | `#475569` | `#FFFFFF` | 7.58:1 (Pass AAA) | Subtitles, labels, timestamps |
| `surface` | `#FFFFFF` | — | — | White surface card background |
| `surface-muted` | `#F5F7FA` | — | — | App background & alternating section bands |
| `border` | `#D8DEE8` | `#FFFFFF` | 1.4:1 (Non-text) | Card borders and table grid lines |
| `tier-confirmed` | `#B42318` | `#FEF3F2` | 6.05:1 (Pass AA) | Confirmed overcharge chip & border |
| `tier-likely` | `#B54708` | `#FFF6ED` | 5.08:1 (Pass AA) | Likely issue chip & border |
| `tier-needs-review` | `#175CD3` | `#EFF8FF` | 5.57:1 (Pass AA) | Needs review chip & border |
| `tier-valid-exclusion`| `#067647` | `#ECFDF3` | 5.40:1 (Pass AA) | Valid insurer deduction chip & border |
| `tier-not-checked` | `#475467` | `#F2F4F7` | 6.98:1 (Pass AAA) | Not checked item chip & border |
| `unverified-data` | `#92400E` | `#FFFBEB` | 6.84:1 (Pass AAA) | Amber badge for unverified regulatory data |
| `disabled-text` | `#475569` | `#F2F4F7` | 6.88:1 (Pass AAA) | Disabled button text & accessible reason |
| `placeholder` | `#475569` | `#FFFFFF` | 7.58:1 (Pass AAA) | Form input placeholder text |
| `focus-ring` | `#1B4B82` | `#FFFFFF` | 8.84:1 (Pass AAA) | Global 2px focus ring with 2px offset |

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
