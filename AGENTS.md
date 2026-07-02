# EdHorizon Codex Instructions

These instructions apply to every Codex session working in this repository.

## Environments

- GitHub `dev` is the development branch.
- GitHub `main` is the production branch.
- Supabase `EdHorizon` is development.
- Supabase `EdHorizon_prod` is production.
- Vercel `edhorizon_dev` is development.
- Vercel `edhorizon` is production.
- Cloudflare R2 `edhorizon-homework` is development.
- Cloudflare R2 `edhorizon-prod` is production.

Never mix credentials, database projects, storage buckets, or deployments
between development and production.

## Platform Tools

- At the start of relevant work, discover deferred tools before assuming they
  are unavailable.
- Prefer the `supabase-dev` MCP entry for normal schema, migration, log,
  advisor, function, and database work.
- Treat production Supabase as read-only by default. Prefer the
  `supabase-prod` read-only MCP entry when it is available.
- Any production Supabase write requires explicit user approval describing
  the exact target and operation.
- Prefer the Vercel plugin/MCP for project configuration, environment
  variables, domains, deployments, and logs.
- Use `edhorizon_dev` for development and `edhorizon` for production.
- Any production deployment, promotion, rollback, domain change, protection
  change, or environment-variable write requires explicit user approval.
- Use the Cloudflare API integration for R2 bucket and CORS configuration when
  available.
- If a platform tool is unavailable, report that clearly. Use a CLI or direct
  API fallback only when necessary and authorized.

## Secrets

- Never print, commit, or paste service-role keys, database passwords, R2
  credentials, Vercel tokens, or other secrets.
- Never commit `.env`, `.env.local`, `.env.production.local`, or another file
  containing real credentials.
- Public Supabase URL and publishable/anon values may be documented only where
  appropriate; server credentials must remain server-side.
- Rotate any credential exposed in chat, logs, Git history, or committed files.

## Git Workflow

- Do not modify the user's dirty working tree unnecessarily.
- Start feature work from the latest `dev` using an isolated branch or
  worktree.
- Open feature pull requests into `dev`.
- Promote `dev` to `main` only through a release pull request and only after
  explicit user approval.
- Do not push directly to `dev` or `main` unless the user explicitly requests
  that exact operation.

## Verification

- Run focused type, build, and relevant test checks before publishing changes.
- Do not claim checks passed unless they were run successfully.
- Verify deployment status and basic HTTP health after Vercel changes.
- Do not perform destructive tests or create production data unless the user
  explicitly approves it.
