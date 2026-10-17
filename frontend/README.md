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
