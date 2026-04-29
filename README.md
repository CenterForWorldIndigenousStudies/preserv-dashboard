# CWIS Preservation Dashboard

Next.js dashboard for browsing and reviewing preservation data written by `preserv-data-combiner`.

The app uses:

- Next.js App Router
- Prisma with the MariaDB adapter
- Auth.js with Google OAuth
- Storybook for component development

## Documentation

- [documentation/db/CONNECTING_TO_DB.md](./documentation/db/CONNECTING_TO_DB.md)
- [documentation/db/PRESERVATION_DB.md](./documentation/db/PRESERVATION_DB.md)
- [documentation/testing/TESTING.md](./documentation/testing/TESTING.md)
- [documentation/DEPLOYING_STORYBOOK.md](./documentation/DEPLOYING_STORYBOOK.md)

## Pages

- `/` - overview dashboard
- `/documents` - paginated document list
- `/documents/[id]` - document detail, metadata, and history
- `/reviews` - review queue
- `/failures` - failure-oriented views

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open <http://localhost:3000>.

Notes:

- `npm run dev` runs the Next.js app and the Storybook dev server together.
- The app connects directly to MariaDB from the server runtime through Prisma.

## Environment Variables

For dashboard-specific database connection guidance, including remote DB caveats, pool tuning, and troubleshooting, see [documentation/db/CONNECTING_TO_DB.md](./documentation/db/CONNECTING_TO_DB.md).

Database connection:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cwis_preservation
DB_USER=mariadb
DB_PASS=docker
```

Auth.js / Google OAuth:

```env
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
AUTH_URL=http://localhost:3000
AUTH_SECRET=replace-this-with-a-long-random-secret
```

Storybook integration:

```env
STORYBOOK_URL=https://your-storybook-host.example.com
```

`STORYBOOK_URL` is required. The dashboard proxies Storybook through
`/developers/storybook/*` after checking the user's session.

For local development, point `STORYBOOK_URL` at the local Storybook server:

```env
STORYBOOK_URL=http://127.0.0.1:6006
```

In Vercel, set `STORYBOOK_URL` per environment so the dashboard points at the
matching Storybook deployment:

- Production: `https://storybook.your-domain.example`
- Preview: the Storybook preview URL or branch-specific preview domain for the
  same branch/environment

For deployed environments, use the host, schema, user, and password for the target MariaDB instance.

## Database

The dashboard reads from MariaDB using Prisma and the generated client in [lib/prisma/generated](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/prisma/generated).

Useful Prisma commands:

```bash
npm run db:prisma:generate
npm run db:prisma:pull
npm run db:prisma:studio
```

Current Prisma schema:

- [lib/prisma/schema.prisma](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/prisma/schema.prisma)

Database client setup:

- [lib/db.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/db.ts)

## Authentication

The dashboard uses Auth.js (`next-auth` v5 beta) with Google OAuth.

Google OAuth setup:

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Add `http://localhost:3000/api/auth/callback/google` for local development.
3. Add the deployed callback URL for the active environment.
4. Set `AUTH_SECRET` to a strong random value.

## Scripts

- `npm run dev` - start the Next.js app and Storybook together for local development
- `npm run dev:next` - start only the Next.js development server
- `npm run build` - generate the Prisma client and build the app
- `npm run start` - start the production server
- `npm run storybook` - run Storybook locally
- `npm run storybook:build` - build Storybook as a standalone static site
- `npm run storybook:clean` - remove generated Storybook output
- `npm run lint` - run project linting and Markdown linting
- `npm run lint:project` - run ESLint
- `npm run lint:markdown` - lint Markdown files
- `npm run test` - run unit tests and DB-backed integration tests
- `npm run test:all` - alias for `npm run test`
- `npm run test:unit` - run unit tests
- `npm run test:integration` - run integration tests
- `npm run typecheck` - run TypeScript without emitting files

## Code Quality

GitHub Actions currently runs:

- [code-quality.yml](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/.github/workflows/code-quality.yml)

That workflow:

- runs on pull requests to `main`
- installs dependencies with `npm ci`
- builds the app when relevant files change
- lints project files and Markdown when relevant files change
- runs unit tests when relevant files change

## Deployment

This repository is currently documented for the deployed app/runtime model rather than the earlier Docker/Caddy VPS experiment.

Operationally:

- the dashboard is a standard Next.js app
- it reads directly from MariaDB
- deployed environments should provide the same `DB_*` and `AUTH_*` variables described above
- the dashboard proxies a separately hosted Storybook through `/developers/storybook/*`
- `STORYBOOK_URL` is required in every environment
- Vercel project settings now own build/install/output configuration; the repo
  root intentionally does not carry a shared `vercel.json`

If deployment architecture changes again, update this README to match the active production path rather than keeping multiple stale options here.
