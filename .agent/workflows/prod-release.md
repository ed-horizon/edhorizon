---
description: Promote dev branch to production (main), apply Supabase prod migrations, push to origin/main, and update Vercel production alias.
---

# Production Release Workflow (/prod-release)

Follow these steps whenever promoting the `dev` branch to production (`main`):

1. **Pre-flight & Verification**:
   - Ensure you are on `dev` branch with a clean working tree:
     ```bash
     git checkout dev
     git pull origin dev
     ```
   - Run type checks:
     ```bash
     npx tsc --noEmit
     ```
   - Run full production build check:
     ```bash
     npm run build
     ```
   - Ensure all checks pass with 0 errors before proceeding.

2. **Supabase Production Migrations (Prod)**:
   - Check if any new migrations exist in `supabase/migrations/` between `main` and `dev`:
     ```bash
     git diff origin/main..dev -- supabase/migrations
     ```
   - If migrations exist, ask for explicit approval from the user before applying to production:
     ```bash
     npx supabase db push --project-ref <SUPABASE_PROD_PROJECT_ID>
     ```

3. **Promote `dev` to `main`**:
   - Checkout `main` and pull latest changes:
     ```bash
     git checkout main
     git pull origin main
     ```
   - Merge `dev` into `main`:
     ```bash
     git merge dev --no-ff -m "Release: Merge dev into main"
     ```
   - Re-verify type safety on `main`:
     ```bash
     npx tsc --noEmit
     ```
   - Push `main` to GitHub:
     ```bash
     git push origin main
     ```
   - Switch local workspace back to `dev`:
     ```bash
     git checkout dev
     ```

4. **Vercel Production Deployment & URL Alias**:
   - Inspect Vercel production build status:
     ```bash
     npx vercel inspect
     ```
   - Update production URL alias to ensure `https://edhorizon.vercel.app` points to the new production deployment:
     ```bash
     npx vercel alias set <DEPLOYMENT_URL> edhorizon.vercel.app
     ```
   - Perform HTTP health check:
     ```bash
     curl -Is https://edhorizon.vercel.app | head -n 10
     ```
   - Report clean deployment completion to the user.
