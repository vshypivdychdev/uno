# Development Workflow

This document describes how Claude Code and the developer collaborate on this project.

## How to trigger Claude

Send a message in the Claude Code session:

```
fix issue #12
feat issue #7
review issue #3
```

Claude reads the issue from GitHub, creates a branch, implements the fix, and opens a PR.

## Step-by-step flow

1. **Issue created** — Open a GitHub Issue describing the bug or feature.
2. **Trigger Claude** — Send `fix issue #N` (or `feat issue #N`) in the Claude Code session.
3. **Branch** — Claude creates `fix/N-short-description` or `feat/N-short-description`.
4. **Changes** — Claude implements the fix or feature.
5. **Pre-commit hook** — `lint-staged` runs ESLint on changed `.ts`/`.tsx` files automatically.
6. **Pre-push hook** — Full `npm run build` runs before the push goes out.
7. **Commit + push** — Claude commits and pushes the branch.
8. **PR created** — Claude opens a PR to `main` via `gh pr create`.
9. **CI runs** (`pr-check.yml`) — GitHub Actions runs lint + build.
10. **Telegram notification** — You receive a Telegram message with the PR link once all checks pass.
11. **Review + merge** — You review the PR on GitHub and merge when happy.
12. **Auto-deploy** — `deploy.yml` triggers on merge to `main`, builds and deploys to GitHub Pages.

## Branch naming

| Type    | Pattern                        | Example                    |
|---------|-------------------------------|----------------------------|
| Bug fix | `fix/{issue-number}-{slug}`   | `fix/12-card-play-crash`   |
| Feature | `feat/{issue-number}-{slug}`  | `feat/7-spectator-mode`    |
| Chore   | `chore/{description}`         | `chore/update-deps`        |

## Commit message format

```
fix: short description (#12)
feat: short description (#7)
```

## GitHub Actions

| Workflow          | Trigger              | Does                                |
|-------------------|----------------------|-------------------------------------|
| `pr-check.yml`    | PR opened/updated    | Lint + build + Telegram notify      |
| `deploy.yml`      | Push to `main`       | Build with `/uno/` base + deploy to GitHub Pages |

## Git hooks (Husky)

| Hook         | Runs                | Command             |
|--------------|---------------------|---------------------|
| pre-commit   | Before every commit | `npx lint-staged`   |
| pre-push     | Before every push   | `npm run build`     |

## Telegram setup (one-time)

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **token**
2. Message [@userinfobot](https://t.me/userinfobot) → copy your **chat ID**
3. In GitHub repo → **Settings → Secrets → Actions**, add:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `TELEGRAM_CHAT_ID` = your chat ID

## Adding unit tests (future)

When Vitest is set up:
- Uncomment the `npm test` step in `pr-check.yml`
- Add a `pre-push` hook entry for tests

## Live app

**Production:** https://vshypivdychdev.github.io/uno/

## Local dev commands

```bash
npm run dev          # start dev server (no SW)
npm run build        # production build
npm run lint         # lint check
npx serve dist       # serve production build locally
```
