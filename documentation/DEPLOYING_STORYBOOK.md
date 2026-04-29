# Deploying Storybook

Storybook is hosted as a separate static site, and the dashboard loads it through the authenticated proxy route. The deployment model is:

- build and host Storybook as a separate static site
- set `STORYBOOK_URL` in the dashboard deployment
- let the dashboard proxy Storybook through `/developers/storybook/*` after checking the user's
  Google-authenticated session

This keeps the dashboard behind the app's auth wall without making every app build depend on a
Storybook build.

## Recommended Vercel Setup

Use two Vercel projects pointed at the same repository root:

- `preserv-dashboard`: the Next.js app
- `preserv-dashboard-storybook`: the static Storybook build

The repository root keeps `vercel.json` out of the shared config surface, so each Vercel project can keep its own build and output settings in the Vercel dashboard.

### Dashboard Project Settings

- Framework Preset: `Next.js`
- Root Directory: repository root
- Build Command: `npm run build` or the default detected Next.js build
- Install Command: `npm ci` if you want explicit parity with CI, otherwise the
  default detected npm install step is acceptable

### Storybook Project Settings

- Framework Preset: `Other`
- Root Directory: repository root
- Build Command: `npm run storybook:build`
- Output Directory: `storybook-static`
- Install Command: `npm ci`

## Setting `STORYBOOK_URL`

The dashboard project should always point to the Storybook project for the same
environment.

### Production

Set this in the dashboard project's Production environment variables:

```env
STORYBOOK_URL=https://storybook.your-domain.example
```

### Preview

Set this in the dashboard project's Preview environment variables:

```env
STORYBOOK_URL=https://storybook-staging.your-domain.example
```

The cleanest version of preview uses a stable preview domain on the Storybook
project, typically mapped to a staging branch. If you want branch-for-branch
preview parity, create branch-specific preview domains on the Storybook project
and set matching branch-specific Preview environment variables on the dashboard
project.

You can also point Preview at a generated Vercel preview URL from the Storybook
project, but a stable branch domain is easier to maintain.

## Option 1: Chromatic

[Chromatic](https://www.chromatic.com/) is the easiest way to deploy Storybook. It connects to your GitHub repo, auto-builds your Storybook on each PR, and hosts it at a permanent URL.

1. Sign up at chromatic.com with your GitHub account
2. Create a new project for `preserv-dashboard`
3. Follow the setup instructions — it will add a `chromatic` script to `package.json`
4. Run `npx chromatic --project-token=<token>` to publish

Chromatic URL format: `https://<hash>.chromatic.com`

## Option 2: Separate Vercel Project

Use the Storybook project settings above, then let Vercel build `storybook-static`
from the repository on each deployment. Set `STORYBOOK_URL` in the dashboard
project to the Storybook project's production or preview URL, depending on the
environment.

## Option 3: Netlify

```bash
npm run storybook:build
netlify deploy --prod --dir=storybook-static
```

## CI/CD Integration

### GitHub Actions (Chromatic)

```yaml
# .github/workflows/chromatic.yml
name: Chromatic
on: push
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

### GitHub Actions (Static Deploy)

```yaml
name: Deploy Storybook
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm run storybook:build
      - run: vercel --prod ./storybook-static
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Setting the Storybook URL

Once deployed, set the `STORYBOOK_URL` environment variable in the Next.js Vercel project dashboard:

```env
STORYBOOK_URL=https://your-storybook-host.example.com
```

The `/developers/component-library` page will then load Storybook through the dashboard's
authenticated proxy route instead of linking directly to the external host.
