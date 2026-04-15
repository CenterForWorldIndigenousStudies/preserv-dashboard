# CWIS Preservation Pipeline Dashboard

MVP dashboard for the CWIS Preservation Pipeline, built with Next.js + TailwindCSS.

## Pages

- `/` - Pipeline overview with document counts per state (ingested, normalized, under_review, completed, failed)
- `/reviews` - Human review queue for conflict resolution, with filters by status and field
- `/documents` - Paginated list of all documents, filterable by state
- `/documents/[id]` - Full document detail: fields, metadata, audit trail, review items, duplicates
- `/failures` - List of documents in failed state

## Setup

```bash
cd dashboard
npm install
cp .env.local.example .env.local
# Edit .env.local with your MySQL credentials
npm run dev
```

Open <http://localhost:3000>

## Environment Variables

```.env
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_DATABASE=cwis_preservation
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
```

## What Is Included

- Pipeline stage overview with counts
- Human review queue with filtering and pagination
- Document detail view with full metadata, audit history, and review items
- Processing failures view
- MySQL connection via mysql2 with connection pooling
- API routes for all data fetching
- Google OAuth via Auth.js (`next-auth` v5, sign in required)

## Authentication

The dashboard uses Auth.js (`next-auth` v5) with Google OAuth. Only CWIS team members with Google accounts can sign in.

### Auth Setup

1. Copy `.env.local.example` to `.env.local`
2. Create a Google OAuth 2.0 Client ID:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create an OAuth 2.0 Client ID (Web application type)
   - Add local authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Add production authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
   - Copy Client ID and Client Secret to `.env.local`
3. Generate an Auth.js secret: `openssl rand -base64 32`
4. Set `AUTH_URL` to your deployment URL
5. Run `npm run dev` and navigate to `http://localhost:3000`

### Auth Environment Variables

```env
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
AUTH_URL=http://localhost:3000
AUTH_SECRET=your-secret
```

### Vercel Deployment Environment Variables

Set these in Vercel for the environments you deploy:

```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_SECRET=your-auth-secret
AUTH_URL=https://your-domain.com
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_DATABASE=cwis_preservation
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
```

Notes:

- Set `AUTH_URL` to the exact production domain users will visit.
- If you use the Vercel default domain instead of a custom domain, use `https://your-project.vercel.app`.
- If you want OAuth to work on any additional domains, those domains must also be configured in Google Cloud.

### Google OAuth Redirect URIs

In Google Cloud Console, add an authorized redirect URI for each domain that should support sign-in:

- `http://localhost:3000/api/auth/callback/google`
- `https://your-domain.com/api/auth/callback/google`
- `https://your-project.vercel.app/api/auth/callback/google` if you use the Vercel default domain directly

If you use Vercel preview deployments, Google OAuth will not work on arbitrary preview URLs unless each preview URL is explicitly registered or you add an OAuth redirect proxy strategy.

## CI/CD

See `.github/workflows/` for automated testing and deployment to Vercel.

### Branch Strategy

- `develop` - All PRs target `develop`. Quality gate (build + lint) runs on every PR.
- `main` - Production. Auto-deploys to Vercel production on merge.
- Staging is managed via Vercel's preview environments.

### GitHub Actions Secrets (set in repo Settings > Secrets)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token from <https://vercel.com/account/tokens> |
| `VERCEL_ORG_ID` | Found in Vercel project settings |
| `VERCEL_PROJECT_ID` | Found in Vercel project settings |

## What Is NOT Included (deferred to v2)

- Real-time updates (refresh to see new data)
- Historical trends and charts
- Slack notifications
- Multi-batch tracking
- Validator self-service portal
- OCR preview and metadata diff views
- Role-based views (admin vs viewer)
