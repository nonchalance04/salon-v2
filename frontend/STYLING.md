# Frontend styling

Layout, spacing, typography, colors and ordinary states live in JSX as Tailwind
utilities. About 74.7% of the original 6,503 authored CSS declarations were moved
to utilities; the remaining 25.3% supports inherited defaults, dynamic variables,
gradients/shadows, animations, pseudo-elements, printing and selectors whose
cascade would be fragile when expressed as utilities.

## Utility entry points

- `src/styles/tailwind.css` retains the existing shared UI component layer and
  tokens. Its unprefixed classes continue to style `components/ui`.
- `src/styles/feature-utilities.css` supplies `tw:` utilities for feature markup.
  The `customer:`, `workspace:`, `workspace-main:` and `receipt:` variants retain
  the specificity of the original theme selectors.
- `src/styles/public-utilities.css` supplies `public:` utilities inside the
  existing native `@scope (.customer-site)`. Keeping this scope preserves the
  original typography and scoping proximity when declarations compete.

Neither new entry imports Preflight. Adding another reset would change existing
form controls, margins and border behavior.

The `down-N:` variants use the original inclusive `max-width: Npx` conditions.
They preserve the existing breakpoints rather than rounding them to Tailwind's
default `sm`/`md` boundaries. Definitions run from larger to smaller widths;
declarations masked by a later, broader original media rule were consolidated
before migration.

Keep existing semantic/state classes used by selectors and DOM queries. Keep
complete utility names separated from `${...}` expressions in template strings
so Tailwind can discover them. For shared controls using `cn`, put explicit
`leading-*` utilities after font-size utilities so class merging preserves the
intended line height.

## Verification — 2026-10-22

- `npm run build`: TypeScript and production bundling passed.
- `npm test`: all 50 existing frontend tests passed.
- Headless Microsoft Edge: 27 page/dialog states at 1440px, 768px and 390px,
  totaling 81 paired comparisons and 8,778 inspected elements. No differences
  were found in the compared computed styles, and no page errors occurred.
- The paired checks used deterministic API fixtures and switched between the
  migrated styles and the original styles on the same DOM. They included public
  pages, booking selection/professionals/calendar, appointment access, login,
  admin pages, configuration editors, reports and the cashier workspace. The
  mobile navigation toggle was exercised as well.
- Every migrated utility candidate was confirmed present in the generated CSS.

The browser checks verify the refactor against fixture-backed UI states; they
do not replace live backend/payment integration testing.
