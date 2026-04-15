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
middleware.ts     # Auth middleware (redirects unauthenticated requests)
types/            # TypeScript type definitions
```

## Key Conventions

- Unauthenticated requests redirect to `/auth/signin`
- Use Google OAuth for authentication (credentials via KeePass)
- All API routes and pages behind auth via middleware

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
npm run build  # Production build
```

Copy `.env.local.example` to `.env.local` and fill in credentials from KeePass (`Google` group for OAuth, `Vercel` group if needed).
