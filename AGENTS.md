# Preservation Dashboard

## Project Overview

This is a Next.js dashboard application for the CWIS Digital Preservation system. It provides a web interface for managing and monitoring preservation workflows.

## Tech Stack

- **Framework:** Next.js 16 (App Router - see `package.json` for version)
- **Language:** TypeScript (see `package.json` for version)
- **Styling:** Tailwind CSS (see `package.json` for version)
- **Auth:** Auth.js (`next-auth` v5) with Google OAuth (see `.env.local.example`)
- **Runtime:** Node.js (see `.tool-versions` for version)

## Project Structure

```layout
app/              # Next.js App Router pages and layouts
components/       # React components
lib/              # Utility functions and shared logic
proxy.ts          # Auth proxy (redirects unauthenticated requests)
types/            # TypeScript type definitions
```

## Key Conventions

- Unauthenticated requests redirect to `/auth/signin`
- Use Auth.js v5 with Google OAuth for authentication
- Auth config lives in `auth.ts`; route handlers re-export from `app/api/auth/[...nextauth]/route.ts`
- Route protection lives in `proxy.ts`, not `middleware.ts`
- All API routes and pages behind auth via proxy

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
