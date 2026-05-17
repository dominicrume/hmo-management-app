# Contributing to Matty's Place

## Branch Strategy

```
main                        ← production (Vercel auto-deploys from here)
│
├── develop                 ← integration branch (all features merge here first)
│   ├── feature/INT-001-tenant-portal
│   ├── feature/INT-002-ai-brain-upgrade
│   └── fix/BUG-007-rls-policy
│
└── release/v1.x.x         ← release candidate (QA + final review before main)
```

### Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/[ref]-[slug]` | `feature/INT-001-tenant-portal` |
| Bug fix | `fix/[ref]-[slug]` | `fix/BUG-007-save-permission` |
| Hotfix (prod) | `hotfix/[slug]` | `hotfix/login-loop` |
| Release | `release/v[semver]` | `release/v1.2.0` |
| Chore | `chore/[slug]` | `chore/upgrade-supabase-sdk` |

---

## Commit Convention (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body — WHY, not what]

[optional footer — breaking changes, references]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace (no logic change) |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build scripts, deps, CI, config |
| `security` | Security patch or hardening |

### Scope (optional but encouraged)

`auth` · `intake` · `forms` · `sessions` · `ledger` · `audit` · `ai` · `db` · `ui` · `api`

### Examples

```bash
feat(intake): add OCR auto-fill for Form03 personal details

fix(auth): prevent redirect loop when session token expires

security(rls): enforce service role key on all tenant writes

refactor(sidebar): extract nav items into typed constant array

docs(schema): add column comments to service_charges table
```

---

## Versioning (Semantic Versioning)

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1   patch  — bug fix, no new features
1.0.1 → 1.1.0   minor  — new feature, backwards compatible
1.1.0 → 2.0.0   major  — breaking change
```

### Release checklist before bumping version

- [ ] TypeScript: `npx tsc --noEmit` — zero errors
- [ ] All new routes tested on live Vercel URL
- [ ] CHANGELOG.md updated
- [ ] `package.json` version bumped
- [ ] Git tag created: `git tag v1.x.x && git push origin v1.x.x`

---

## Pull Request Rules

- **Never push directly to `main`** — always open a PR from `develop` or `hotfix/`
- PR title must follow commit convention: `feat(scope): description`
- Every PR must include: what changed, why, and how to test
- Minimum 1 review before merge (Manager or Lead Engineer)
- Squash merge into `main` to keep history clean

---

## Protected Branches (set in GitHub → Settings → Branches)

| Branch | Rule |
|---|---|
| `main` | No direct push · Require PR · Require status checks |
| `develop` | Require PR from feature branches |

---

## Daily Workflow

```bash
# 1. Always start from develop
git checkout develop && git pull origin develop

# 2. Create your branch
git checkout -b feature/INT-005-weekly-session-reports

# 3. Work. Commit often with good messages.
git add src/components/views/SessionsView.tsx
git commit -m "feat(sessions): add weekly summary export to PDF"

# 4. Push your branch
git push origin feature/INT-005-weekly-session-reports

# 5. Open PR → develop on GitHub
# 6. After review, merge → develop
# 7. When develop is stable → PR develop → main → tag release
```
