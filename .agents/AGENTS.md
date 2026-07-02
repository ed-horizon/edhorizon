# Ed Horizon LMS Agent Instructions

## Purpose

These instructions must be followed by any AI coding agent working on the Ed Horizon LMS codebase.
The goal is to keep the codebase safe, clean, reviewable, and production-ready.
The agent must never directly modify or push production code without following the workflow below.

---

## Project Context

Ed Horizon LMS is a company web application used by Ed Horizon for managing students, classes, attendance, fees, teachers, and learning-related workflows.

The application uses:
- GitHub for version control
- Supabase for authentication and database
- Vercel for deployment
- `main` branch for production
- `dev` branch for development and testing

---

## Branch Rules

### Production Branch
`main` is the production branch.
Strict rules:
- Never push directly to `main`
- Never commit directly to `main`
- Never create experimental changes on `main`
- Never merge anything into `main`
- Only the reviewer/admin is allowed to merge `dev` into `main`

### Development Branch
`dev` is the development branch.
Strict rules:
- All new work must start from the latest `dev`
- All feature branches must be created from `dev`
- Pull requests must be created into `dev`
- Code should only reach `main` after review and testing

---

## Required Workflow Before Making Any Code Change

Before making any code change, the agent must do the following:
```bash
git checkout dev
git pull origin dev
```
Then create a new feature branch:
```bash
git checkout -b feature/short-description
```
Example:
```bash
git checkout -b feature/add-student-attendance-status
```
Do not work directly on `dev`.
Do not work directly on `main`.

---

## Feature Branch Naming Rules

Use clear branch names.
Good examples:
- feature/add-fee-status
- feature/fix-login-error
- feature/update-attendance-page
- feature/improve-student-dashboard
- feature/add-teacher-class-view

Bad examples:
- test
- changes
- new
- final
- update
- bro-code

---

## Before Editing Code

Before changing any file, the agent must first understand:
1. What feature or bug is being changed
2. Which files are related
3. Whether the change affects Supabase
4. Whether the change affects authentication
5. Whether the change affects production data
6. Whether environment variables are needed
7. Whether the change may break existing pages

The agent must not randomly rewrite unrelated files.

---

## Code Change Rules

The agent must follow these rules:
- Make the smallest safe change possible
- Do not rewrite the whole project unless clearly requested
- Do not change unrelated files
- Do not remove existing features without approval
- Do not rename important files or folders without approval
- Do not change Supabase table logic without clearly explaining it
- Do not expose secret keys
- Do not hardcode passwords, API keys, tokens, or Supabase service role keys
- Do not commit `.env`, `.env.local`, or any secret file
- Do not install unnecessary packages
- Do not change deployment configuration unless requested
- Do not change GitHub workflow files unless requested
- Do not change Vercel configuration unless requested

---

## Supabase Safety Rules

Supabase is used for authentication and database.
The agent must be careful with Supabase-related changes.
Strict rules:
- Never expose the Supabase service role key in frontend code
- Never commit Supabase secret keys
- Never write destructive SQL without approval
- Never delete tables, columns, policies, or user data without approval
- Never disable Row Level Security without approval
- Never change authentication flow without explaining the impact
- Always explain any database schema change clearly

If a Supabase change is needed, the agent must mention:
1. What table is affected
2. What column is affected
3. What policy is affected, if any
4. Whether existing data may be affected
5. Whether manual Supabase dashboard changes are required

---

## Environment Variable Rules

The agent must not create or expose real secret values.
Allowed:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Not allowed in committed code:
```env
SUPABASE_SERVICE_ROLE_KEY=real_value_here
DATABASE_URL=real_value_here
API_SECRET=real_value_here
```
If environment variables are needed, update only `.env.example`.
Never commit:
- .env
- .env.local
- .env.production
- .env.development

---

## Testing Before Commit

Before committing, the agent must run available checks.
Use the correct commands based on the project.
Common commands:
```bash
npm install
npm run lint
npm run build
npm run test
```
If a command does not exist, the agent must say clearly:
"This command is not available in package.json."

The agent must not pretend tests passed if they were not run.

---

## Required Self-Review Before Commit

Before committing, the agent must review the change and answer these questions:
1. What files were changed?
2. Why were they changed?
3. Did I change only what was requested?
4. Did I accidentally change unrelated files?
5. Did I expose any secrets?
6. Does the project still build?
7. Does this affect Supabase?
8. Does this affect authentication?
9. Does this affect production data?
10. Is this ready for human review?

If any answer is unclear, stop and ask the human reviewer.

---

## Commit Rules

Use clear commit messages.
Good examples:
- `git commit -m "Fix student attendance status update"`
- `git commit -m "Add fee payment status display"`
- `git commit -m "Update teacher dashboard class list"`

Bad examples:
- `git commit -m "changes"`
- `git commit -m "final"`
- `git commit -m "done"`
- `git commit -m "fix"`

---

## Push Rules

Push only the feature branch.
Example:
```bash
git push -u origin feature/add-fee-status
```
Never push directly to `main` or `dev` unless the reviewer/admin explicitly allows it.

---

## Pull Request Rules

The pull request must be created like this:
- Base branch: dev
- Compare branch: feature/your-branch-name

Never create a pull request directly into `main`.
The PR description must include:
```md
## What changed?
Briefly explain the change.

## Why was this needed?
Briefly explain the reason.

## Files changed
List the main files changed.

## Supabase impact
Mention if Supabase tables, auth, policies, or queries were affected.

## Testing done
Mention the commands run, for example:
- npm run lint
- npm run build

## Notes for reviewer
Mention anything the reviewer should carefully check.
```

---

## Forbidden Actions

The agent must never do these unless the human reviewer explicitly approves:
- Push directly to `main`
- Push directly to `dev`
- Delete branches
- Delete files unrelated to the task
- Rewrite the whole project structure
- Change authentication logic without explanation
- Change Supabase schema without explanation
- Disable Row Level Security
- Commit real secrets
- Change deployment settings
- Change GitHub Actions
- Change Vercel settings
- Install large or unnecessary packages
- Replace working code with untested generated code
- Ignore build errors
- Hide errors from the human reviewer

---

## Final Rule

The agent's job is not only to write code.
The agent must protect the Ed Horizon LMS codebase.
Every change must be:
- Small
- Clear
- Safe
- Reviewable
- Tested where possible
- Created in a feature branch
- Submitted as a pull request into `dev`
- Production code in `main` must only be updated by the reviewer/admin after review.
