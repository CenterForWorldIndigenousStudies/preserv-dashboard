# Preservation Dashboard

## Project Overview

This is a Next.js dashboard application for the CWIS Digital Preservation system. It provides a web interface for managing and monitoring preservation workflows.

## Tech Stack

- **Framework:** Next.js 16 (App Router - see `package.json` for version)
- **Language:** TypeScript (see `package.json` for version)
- **Styling:** Tailwind CSS (see `package.json` for version)
- **Auth:** Auth.js (`next-auth` v5) with Google OAuth (see `.env.local.example`)
- **Runtime:** Node.js (see `.tool-versions` for version)
- **Icons:** Lucide React
- **Markdown:** react-markdown with remark-gfm
- **Diagrams:** Mermaid (rendered via mermaid library)

## Design System

### Color Palette (Tailwind custom colors)

| Token  | Hex       | Use                                |
| ------ | --------- | ---------------------------------- |
| ink    | `#231f20` | Primary text, near-black warm      |
| moss   | `#355834` | Links, accents, success states     |
| sand   | `#f4f1f0` | Light warm backgrounds             |
| clay   | `#e96954` | Buttons, highlights, active states |
| sky    | `#94d9f8` | Subtle accents, hover states       |
| accent | `#ff7637` | Hover/link emphasis                |

### Typography

- **Body:** Work Sans (400-700)
- **Headings:** Roboto (300-900)
- **Configured via:** Google Fonts CDN link in `app/layout.tsx`

### Card Style

Cards use `rounded-2xl border border-moss/15 bg-white shadow-panel`. Do not change this pattern.

## Component Architecture (Atomic Design)

All React components follow Atomic Design. When adding or modifying components, place them in the correct layer:

```layout
components/
  atoms/           # Indivisible UI primitives
  molecules/       # Composed atoms into functional units
  organisms/       # Complex composed components (page sections)
  LayoutBody.tsx   # Layout-level (template), stays at root
```

### Layers

**Atoms** - Smallest, reusable primitives. No internal state. Examples:
See [components/atoms](./components/atoms/)

**Molecules** - Composed from atoms. May have minimal state. Examples:
See [components/molecules](./components/molecules/)

**Organisms** - Complex components made of atoms and molecules. Own significant logic. Examples:
See [components/organisms](./components/organisms/)

### Adding Components

1. Determine the layer based on complexity and reusability
2. Create the file in the appropriate `atoms/`, `molecules/`, or `organisms/` folder
3. Export as named export: `export function MyComponent() ...`
4. Import using `@components/atoms/MyAtom`, `@components/molecules/MyMolecule`, `@components/organisms/MyOrganism`
5. Do NOT put new components at the `components/` root unless they are layout-level

### Component Rules

- **Atoms:** No side effects, no API calls, no hooks beyond useId/useCallback
- **Molecules:** May use hooks, local state, and data-fetching for simple cases
- **Organisms:** Own their data fetching and complex state; pages import organisms
- **Pages:** Compose organisms into full views; keep minimal logic

## Project Structure

```layout
app/                        # Next.js App Router pages and layouts
  api/                      # API route handlers
  auth/                     # Auth pages and route handlers
  db/                       # Database schema documentation (Mermaid diagrams)
  documents/[id]/            # Document detail page
  failures/                 # Pipeline failures view
  reviews/                  # Document review queue
components/
  atoms/                    # Atomic Design atoms
  molecules/                # Atomic Design molecules
  organisms/                # Atomic Design organisms
lib/
  format.ts                 # formatBytes, formatDateTime helpers
  queries.ts                # Database query functions
  types.ts                  # TypeScript type definitions
proxy.ts                   # Auth proxy (redirects unauthenticated requests)
documentation/db/
  PRESERVATION_DB.md        # Mermaid ER diagram source or truth for /db
```

## Key Conventions

- Unauthenticated requests redirect to `/auth/signin`
- Use Auth.js v5 with Google OAuth for authentication
- Auth config lives in `auth.ts`; route handlers re-export from `app/api/auth/[...nextauth]/route.ts`
- Route protection lives in `proxy.ts`, not `middleware.ts`
- All API routes and pages behind auth via proxy
- Component props always use explicit TypeScript interfaces
- Prefer `export function` named exports over `export default` for components
- Use `next/link` for internal navigation, never raw `<a>` tags for app routes

## Component Library (Storybook)

Storybook provides an interactive component library for development and documentation. The static build is served by Next.js at `/storybook` (output goes to `public/storybook/`).

### Running Storybook

```bash
npm run storybook       # Dev server on http://localhost:6006
npm run build-storybook # Production static build → public/storybook/
npm run storybook-preview  # Preview production build on port 6006
```

### Dev Workflow

Run `npm run dev` (Next.js on :3000) and `npm run storybook` (:6006) side by side. Storybook's dev server proxies to Next.js for component rendering.

### Story Files

Stories live alongside their components using the `*.stories.tsx` convention:

```layout
components/
  atoms/Badge.stories.tsx
  molecules/StatCard.stories.tsx
  organisms/PageHeader.stories.tsx
  organisms/NoDataState.stories.tsx
```

### Component Library Page

The `/developers/component-library` page (behind Google OAuth) is the entry point and developer hub. It links to `/storybook` where the static build is served.

### Architecture

- Storybook builds to `public/storybook/` so Next.js serves it as static files at `/storybook`
- No iframe needed in production -- the page links directly to `/storybook`
- In dev mode, the page shows the dev Storybook URL (`localhost:6006`)
- `staticDirs: ['../public']` in `.storybook/main.ts` ensures Storybook can access public assets

## Environment Notes

- Auth.js uses v5-style env names:
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`
  - `AUTH_URL`
  - `AUTH_SECRET`
- Local development DB uses the `cwis_preservation` schema name
- Copy `.env.local.example` to `.env.local` and keep local/dev values separate from DreamHost production values
- Google OAuth redirect URIs must exactly match the domains in use:
  - local: `http://localhost:3000/api/auth/callback/google`
  - production: `https://<your-domain>/api/auth/callback/google`
- Vercel preview deployments will not support Google OAuth unless their exact callback URL is registered or a redirect-proxy strategy is added

## Deployment

This project uses Vercel's native GitHub integration for automatic deployments:

- `develop` branch → Vercel staging preview
- `main` branch → Vercel production

No GitHub Actions deploy workflows needed - Vercel handles all deployments automatically.

## GitHub Actions

Only `code-quality.yml` runs on PRs to `develop`. It checks:

- Build succeeds
- No lint errors in changed files

## Local Development

```bash
npm install
npm run dev    # Start dev server on localhost:3000
npm run typecheck
npm run lint:project
npm run build  # Production build
```

Copy `.env.local.example` to `.env.local` and fill in credentials from KeePass (`Google` group for OAuth, `Vercel` group if needed).

## Validation

- Prefer validating changes with `npm run typecheck`
- Run `npm run lint:project` for TS/React linting and `npm run lint:markdown` for docs changes
- Run `npm run build` before finishing auth, routing, config, or deployment-related changes
