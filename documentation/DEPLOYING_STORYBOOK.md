# Deploying Storybook

Storybook does not run inside the Next.js app — it builds to a separate static output and deploys independently.

## Option 1: Chromatic (Recommended)

[Chromatic](https://www.chromatic.com/) is the easiest way to deploy Storybook. It connects to your GitHub repo, auto-builds your Storybook on each PR, and hosts it at a permanent URL.

1. Sign up at chromatic.com with your GitHub account
2. Create a new project for `preserv-dashboard`
3. Follow the setup instructions — it will add a `chromatic` script to `package.json`
4. Run `npx chromatic --project-token=<token>` to publish

Chromatic URL format: `https://<hash>.chromatic.com`

## Option 2: Separate Vercel Project

Deploy the `storybook-static/` output to its own Vercel project:

```bash
cd preserv-dashboard
npm run build-storybook
vercel --prod ./storybook-static
```

Set `STORYBOOK_URL=https://<your-vercel-deployment-url>` in the Next.js app's environment variables.

## Option 3: Netlify

```bash
npm run build-storybook
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
      - run: npm run build-storybook
      - run: vercel --prod ./storybook-static
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Setting the Storybook URL

Once deployed, set the `STORYBOOK_URL` environment variable in the Next.js Vercel project dashboard:

```env
STORYBOOK_URL=https://your-storybook-chromatic-url.chromatic.com
```

The `/developers/component-library` page will then embed the deployed Storybook in an iframe.
