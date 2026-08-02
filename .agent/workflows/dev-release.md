---
description: Verify feature code, apply Supabase dev migrations, merge feature branch into dev, and push to remote dev.
---

# Development Release Workflow (/dev-release)

Follow these steps whenever a developer requests to merge feature changes into the `dev` branch:

1. **Verify Prerequisites**:
   - Ensure the active branch is a feature branch (not `dev` or `main`).
   - Ensure the working tree is clean using `git status`.

2. **Automated Verification**:
   - Run focused type checks:
     ```bash
     npx tsc --noEmit
     ```
   - Run lint checks if configured:
     ```bash
     npm run lint
     ```
   - Do NOT proceed if verification checks fail.

3. **Supabase Database Migrations (Dev)**:
   - Check if there are any SQL migration files in `supabase/migrations/`.
   - If migrations exist, run Supabase migration against the development database:
     ```bash
     npx supabase db push --linked
     ```
   - Confirm migration output is successful before proceeding.

4. **Git Merge & Push**:
   - Fetch latest updates from remote:
     ```bash
     git fetch origin dev
     ```
   - Checkout the `dev` branch:
     ```bash
     git checkout dev
     git pull origin dev
     ```
   - Merge the feature branch into `dev`:
     ```bash
     git merge <feature-branch-name> --no-ff -m "Merge feature branch into dev"
     ```
   - Re-verify TypeScript compiler on `dev`:
     ```bash
     npx tsc --noEmit
     ```
   - Push `dev` to GitHub:
     ```bash
     git push origin dev
     ```

5. **Deployment & HTTP Health Check**:
   - Vercel development deployment (`edhorizon_dev`) will automatically build from `origin/dev`.
   - Verify deployment status using Vercel CLI or HTTP request:
     ```bash
     npx vercel ls
     ```
   - Report clean completion to the user.
