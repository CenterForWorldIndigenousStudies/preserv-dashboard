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
   - Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
   - Copy Client ID and Client Secret to `.env.local`
3. Generate a NEXTAUTH_SECRET: `openssl rand -base64 32`
4. Set `NEXTAUTH_URL` to your deployment URL
5. Run `npm run dev` and navigate to `http://localhost:3000`

### Auth Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
```

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
