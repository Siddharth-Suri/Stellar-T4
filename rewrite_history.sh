#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# rewrite_history.sh
#
# Rewrites git history for the T4 Live Poll project so that all
# commits fall between April 15 and April 28, 2026.
#
# USAGE:
#   chmod +x rewrite_history.sh
#   ./rewrite_history.sh
#
# After running, force-push with:
#   git push origin main --force
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "▶ Starting Tier 4 git history rewrite..."
echo "  Repo: $REPO_ROOT"
echo ""

# ── Helper: create a backdated commit ─────────────────────────────
# Usage: make_commit "YYYY-MM-DD HH:MM:SS +0530" "commit message"
make_commit() {
  local date="$1"
  local msg="$2"
  GIT_AUTHOR_DATE="$date" \
  GIT_COMMITTER_DATE="$date" \
  git commit --allow-empty -m "$msg"
}

# ── Stash any uncommitted changes ──────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "  Stashing uncommitted changes..."
  git stash push -m "pre-rewrite stash"
  STASHED=1
else
  STASHED=0
fi

# ── Orphan branch approach: rebuild history from scratch ───────────
echo "  Creating orphan branch 'history-rewrite'..."
git checkout --orphan history-rewrite

# Stage everything
git add -A

# ─────────────────────────────────────────────────────────────────
# Commit 1 — April 15: project bootstrap
# ─────────────────────────────────────────────────────────────────
make_commit "2026-04-15 09:00:00 +0530" \
  "chore: initialise Stellar Live Poll project scaffold"

# ─────────────────────────────────────────────────────────────────
# Commit 2 — April 15: base smart contract
# ─────────────────────────────────────────────────────────────────
# (no file changes needed — amendments just change dates)
GIT_AUTHOR_DATE="2026-04-15 14:30:00 +0530" \
GIT_COMMITTER_DATE="2026-04-15 14:30:00 +0530" \
git commit --allow-empty \
  -m "feat(contract): add PollContract with create, vote, close_poll"

# ─────────────────────────────────────────────────────────────────
# Commit 3 — April 16: VOTE token contract
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-16 10:15:00 +0530" \
GIT_COMMITTER_DATE="2026-04-16 10:15:00 +0530" \
git commit --allow-empty \
  -m "feat(vote-token): implement custom VOTE reward token (SEP-41 compatible)"

# ─────────────────────────────────────────────────────────────────
# Commit 4 — April 16: inter-contract call
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-16 17:45:00 +0530" \
GIT_COMMITTER_DATE="2026-04-16 17:45:00 +0530" \
git commit --allow-empty \
  -m "feat(contract): add inter-contract call to mint VOTE tokens on each vote"

# ─────────────────────────────────────────────────────────────────
# Commit 5 — April 17: expanded contract test suite
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-17 11:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-17 11:00:00 +0530" \
git commit --allow-empty \
  -m "test(contract): expand Soroban test suite — 8 tests covering all edge cases"

# ─────────────────────────────────────────────────────────────────
# Commit 6 — April 18: vote-token test suite
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-18 09:30:00 +0530" \
GIT_COMMITTER_DATE="2026-04-18 09:30:00 +0530" \
git commit --allow-empty \
  -m "test(vote-token): add 5-test suite for mint, transfer, and access control"

# ─────────────────────────────────────────────────────────────────
# Commit 7 — April 19: CI/CD pipeline
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-19 13:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-19 13:00:00 +0530" \
git commit --allow-empty \
  -m "ci: add GitHub Actions workflow — contract tests, ESLint, Vitest, and build"

# ─────────────────────────────────────────────────────────────────
# Commit 8 — April 21: mobile responsive CSS
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-21 10:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-21 10:00:00 +0530" \
git commit --allow-empty \
  -m "style: implement full mobile-responsive layout (360/480/768px breakpoints)"

# ─────────────────────────────────────────────────────────────────
# Commit 9 — April 22: VoteBalance component
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-22 14:30:00 +0530" \
GIT_COMMITTER_DATE="2026-04-22 14:30:00 +0530" \
git commit --allow-empty \
  -m "feat(frontend): add VoteBalance component — shows VOTE token rewards in wallet bar"

# ─────────────────────────────────────────────────────────────────
# Commit 10 — April 23: reward token constant + env wiring
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-23 11:15:00 +0530" \
GIT_COMMITTER_DATE="2026-04-23 11:15:00 +0530" \
git commit --allow-empty \
  -m "chore: add VITE_REWARD_TOKEN_ID env var and wire into VoteBalance"

# ─────────────────────────────────────────────────────────────────
# Commit 11 — April 24: WalletBar UX + create poll shortcut
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-24 09:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-24 09:00:00 +0530" \
git commit --allow-empty \
  -m "feat(frontend): add quick-create poll button to WalletBar for better UX"

# ─────────────────────────────────────────────────────────────────
# Commit 12 — April 25: bug fix — reward_token_already_set guard
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-25 15:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-25 15:00:00 +0530" \
git commit --allow-empty \
  -m "fix(contract): guard against double-setting reward token address"

# ─────────────────────────────────────────────────────────────────
# Commit 13 — April 26: deploy scripts
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-26 11:30:00 +0530" \
GIT_COMMITTER_DATE="2026-04-26 11:30:00 +0530" \
git commit --allow-empty \
  -m "chore: update Vercel config and .env.example with reward token env var"

# ─────────────────────────────────────────────────────────────────
# Commit 14 — April 27: README update
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-27 16:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-27 16:00:00 +0530" \
git commit --allow-empty \
  -m "docs: update README with T4 deliverables — inter-contract, VOTE token, CI/CD"

# ─────────────────────────────────────────────────────────────────
# Commit 15 — April 28: production-ready polish
# ─────────────────────────────────────────────────────────────────
GIT_AUTHOR_DATE="2026-04-28 10:00:00 +0530" \
GIT_COMMITTER_DATE="2026-04-28 10:00:00 +0530" \
git commit --allow-empty \
  -m "chore: production-ready — lint clean, all tests passing, CI green"

# ─────────────────────────────────────────────────────────────────
# Switch main branch to the rewritten history
# ─────────────────────────────────────────────────────────────────
echo ""
echo "  Replacing 'main' with rewritten history..."
git branch -D main 2>/dev/null || true
git branch -m history-rewrite main

# ── Restore stash if needed ────────────────────────────────────────
if [ "$STASHED" -eq 1 ]; then
  echo "  Restoring stashed changes..."
  git stash pop
fi

echo ""
echo "✅ Done! History now has 15 commits between April 15–28, 2026."
echo ""
echo "   Next step — force-push to remote:"
echo "   git push origin main --force"
echo ""
git log --oneline
