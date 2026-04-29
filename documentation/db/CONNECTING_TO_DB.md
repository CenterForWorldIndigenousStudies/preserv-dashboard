# Connecting To The Dashboard Database

This document is only about how `preserv-dashboard` connects to MariaDB/MySQL.

It does not describe `preserv-data-combiner` connection behavior. The dashboard uses a Node.js runtime, Prisma, and `@prisma/adapter-mariadb`, so its connection behavior is different from the CLI- and Python-driven pipeline services.

## What The Dashboard Uses

The dashboard reads directly from MariaDB through Prisma and the MariaDB adapter.

Relevant files:

- [lib/db.ts](../../lib/db.ts)
- [lib/prisma/schema.prisma](../../lib/prisma/schema.prisma)
- [prisma.config.ts](../../prisma.config.ts)

The active connection path is:

1. Next.js server code imports `db` from `lib/db.ts`
2. `lib/db.ts` creates a `PrismaMariaDb` adapter
3. Prisma uses that adapter to open MariaDB connections from the Node.js runtime

## Required Environment Variables

The dashboard uses these `DB_*` environment variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cwis_preservation
DB_USER=mariadb
DB_PASS=docker
```

The dashboard also supports optional pool tuning variables:

```env
DB_CONNECTION_LIMIT=2
DB_ACQUIRE_TIMEOUT_MS=30000
DB_IDLE_TIMEOUT_MS=60000
```

Notes:

- `DB_CONNECTION_LIMIT` defaults to `2` in local development and `10` in production runtime.
- `DB_ACQUIRE_TIMEOUT_MS` defaults to `30000`.
- `DB_IDLE_TIMEOUT_MS` defaults to `60000`.
- If you change `.env`, fully restart the Next.js dev server. Hot reload is not a reliable way to pick up DB environment changes.

## Local Development Modes

### Local dashboard against local MariaDB

This is the simplest setup.

Typical values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cwis_preservation
DB_USER=mariadb
DB_PASS=docker
```

### Local dashboard against DreamHost or another remote DB

This is supported, but local Next.js development can behave differently from CLI tools because the dashboard uses a pooled Node.js connection model.

Recommended starting point for remote DB use in local development:

```env
DB_CONNECTION_LIMIT=1
DB_ACQUIRE_TIMEOUT_MS=30000
DB_IDLE_TIMEOUT_MS=60000
```

If that works reliably, you can increase `DB_CONNECTION_LIMIT` carefully.

## Why Dashboard Connection Behavior Can Differ From Other Apps

A common source of confusion is that another app can connect successfully with the same credentials while the dashboard times out.

That does not necessarily mean the credentials are wrong.

The dashboard differs because:

- it runs inside Next.js
- it uses Prisma plus `@prisma/adapter-mariadb`
- it uses a pooled Node.js connection model
- local development can involve repeated renders, module reloads, and more concurrency than a single CLI process

By contrast, a CLI tool or Python script often uses one-shot or shorter-lived connections.

## Known Failure Mode: Pool Timeout

Example error:

```text
PrismaClientKnownRequestError
Raw query failed. Code: `45028`. Message: `pool timeout: failed to retrieve a connection from pool after 10001ms
    (pool connections: active=0 idle=0 limit=10)`
```

What this usually means in the dashboard context:

- the app can likely resolve the DB host and open TCP connections
- the failure is usually in the runtime pool path rather than basic credentials alone
- the current Next.js server process may be stale
- the pool size may be too aggressive for the environment

## Recommended Debug Sequence

When the local dashboard fails to connect to a remote DB, use this order:

1. Confirm the active `.env` values are correct.
1. Stop the running `next dev` process completely.
1. Restart the dev server.
1. Set conservative pool settings:

```env
DB_CONNECTION_LIMIT=1
DB_ACQUIRE_TIMEOUT_MS=30000
DB_IDLE_TIMEOUT_MS=60000
```

1. Retry the dashboard.

If it still fails, check whether the issue is in the dashboard runtime or in basic connectivity.

## Connection Diagnostics

### Raw MariaDB CLI check

This verifies that the credentials themselves work from your machine:

```bash
mariadb --protocol=TCP \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  "$DB_NAME"
```

### Raw Node TCP check

This verifies that Node can resolve the hostname and open the socket:

```bash
node --env-file=.env - <<'EOF'
const net = require('node:net');
const socket = net.connect({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT) });
socket.setTimeout(10000);
socket.on('connect', () => { console.log('connected'); socket.end(); });
socket.on('timeout', () => { console.error('timeout'); process.exit(1); });
socket.on('error', (err) => { console.error(err); process.exit(1); });
EOF
```

### Raw Node MariaDB check

This verifies that the Node MariaDB driver can authenticate and run a query:

```bash
node --env-file=.env - <<'EOF'
const mariadb = require('mariadb');
(async () => {
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
  });
  const rows = await conn.query('SELECT 1 AS ok');
  console.log(rows[0].ok.toString());
  await conn.end();
})();
EOF
```

### Prisma adapter check

This verifies that Prisma plus `PrismaMariaDb` can run outside the full Next.js runtime:

```bash
node --env-file=.env - <<'EOF'
const { PrismaClient } = require('./lib/prisma/generated/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
(async () => {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  const prisma = new PrismaClient({ adapter });
  const rows = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log(rows[0].ok.toString());
  await prisma.$disconnect();
})();
EOF
```

Interpretation:

- if the CLI, raw Node, and Prisma adapter checks all work, but the live dashboard still times out, the issue is likely the live Next.js runtime process or pool sizing
- in that case, restart the dev server and reduce `DB_CONNECTION_LIMIT`

## Dashboard-Specific Practical Guidance

- Use `DB_*` variables, not a single `DATABASE_URL`, for the current dashboard setup.
- Restart `npm run dev` after changing `.env`.
- Prefer a small pool when connecting local dev to a remote DB.
- Check [PRESERVATION_DB.md](./PRESERVATION_DB.md) for schema understanding, but use this document for connection behavior.
