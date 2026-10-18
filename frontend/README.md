# React frontend

The runnable frontend uses React, TypeScript, Vite, and React Router.

## Component Folder Pattern

Give each public component a PascalCase folder and matching component file:

```text
components/Chatbot/
├── Chatbot.tsx
├── Chatbot.css
├── chatbot-history.ts
├── chatbot-session.ts
└── index.ts
```

`index.ts` exports the component and any associated public prop types:

```ts
export { Chatbot } from "./Chatbot";
```

Import the folder from another component, for example
`import { Chatbot } from "../Chatbot"`. Keep private helpers and owned styles
inside the folder. Add files only when they are needed; components without
separate styles do not need an empty stylesheet. Avoid a single barrel that
exports every component in the application.

- `app/router.tsx` defines the existing routes.
- `components/` contains reusable and workflow-specific UI components.
- `pages/` contains route screens and the staff entry screen.
- `layouts/` contains public and authenticated workspace shells.
- `contexts/AuthProvider/` owns staff authentication context and `useAuth`.
- `lib/api.ts` handles API transport.
- `types/` contains contracts shared by multiple components.
- `utils/` contains reusable non-UI functions.
- `styles/` contains global and workspace styles.

The public layout imports the customer styles in their established cascade
order. Component-owned CSS remains in the owning component's folder.
Unit tests remain in `tests/`, importing pure helpers directly.

## Appointment Settings

The admin page shows current settings with one Edit settings / Save changes
workflow. Apply immediately is the default; Schedule for later accepts a future
date/time in the displayed salon timezone. Scheduled changes remain visible,
and previous settings are grouped in collapsed Settings history. Unchanged
submissions are disabled, comparing against the settings effective at the chosen
activation time. Existing scheduled changes are retained and explicitly called
out in the editor. Cancel discards the draft; failed saves retain it for retry.

The UI continues to POST complete settings to `/configuration/policies` and
uses the returned record to refresh its view. Policy versions and existing appointments' original rules remain authoritative. No schema or
booking-rule change is required.

## Run and validate

Run these commands from `frontend/`:

```sh
npm install
npm run dev
npm run build
npm test
```

Vite proxies `/api` to the backend. Production hosting must serve `index.html`
for frontend deep links while routing `/api` to the backend.

## Shared UI: shadcn/ui

Buttons, text inputs, native selects, textareas, status badges, configuration
cards, and modal dialogs use source-owned shadcn/ui components. Import the
component folder, for example:

```tsx
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

<Button type="submit">Save changes</Button>
<Input name="firstName" required autoComplete="given-name" />
```

`components/ui/Button/Button.tsx` and its `index.ts` follow the same Component
Folder Pattern as feature components. `components.json` configures the official
shadcn registry for Vite, Tailwind v4, TypeScript, and Radix primitives. New CLI
generated files should be moved into matching PascalCase folders with an
`index.ts`, and their imports updated, before use. Review upstream changes
against our local adaptations rather than overwriting existing primitives.

- `lib/utils.ts` merges utility classes with `clsx` and `tailwind-merge`.
- `styles/tailwind.css` defines shared semantic colors, radii, public and staff
  themes, and reduced-motion behavior. Preflight stays disabled to preserve
  existing page layouts. Generic legacy control rules exclude `data-slot`
  elements; workflow-specific CSS continues to own layout and selected states.
- Buttons preserve native submit behavior unless `type="button"` is specified.
  Use `variant="outline"` for secondary actions; keep labels and form handlers.
- Native selects retain `name`, `required`, `value`, and native change events.
  Native checkbox/radio controls keep their existing form behavior.
- Service options, professional profiles, and receipt previews use Radix-backed
  dialogs for focus containment, Escape, outside-click dismissal, and focus
  restoration. Dialog portals stay inside the current salon theme root. Each
  dialog must have a `DialogTitle` and either a description or explicit
  `aria-describedby={undefined}`. The salon guide remains a persistent nonmodal
  panel with shared buttons and textarea.
- The booking calendar keeps the existing salon-time and server-availability
  logic and uses shared buttons. Receipt printing keeps its isolated print root.

Component source is adapted from the official shadcn/ui registry (New York /
Radix), under the MIT license in `src/components/ui/LICENSE.md`.

## Customer appointment management

Manage appointment opens a modal over the booking view. The modal contains the
booking reference, current visit, original policy limits, rescheduling/recovery
options and cancellation confirmation. Service/professional selection, date and
available-time search, and the updated visit preview share one scrollable body.
The header and close control remain visible on narrow screens. Keyboard focus
stays within the modal and returns to its entry button when closed. Pending
requests disable dismissal; successful changes update the booking and close the
modal. Existing eligibility checks and backend endpoints remain authoritative.
