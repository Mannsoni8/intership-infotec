$ErrorActionPreference = "Stop"

# ==========================================
# FleetDash Daily Claude Code Automation
# ==========================================

$Repo = Split-Path -Parent $PSScriptRoot

Set-Location $Repo

Write-Host ""
Write-Host "==========================================" 
Write-Host "        FleetDash Daily Automation"
Write-Host "=========================================="
Write-Host ""

# ------------------------------------------
# 1. Verify repository
# ------------------------------------------

if (-not (Test-Path ".git")) {
    Write-Error "Git repository not found."
    exit 1
}

# ------------------------------------------
# 2. Always use branch: mann
# ------------------------------------------

git checkout mann

if ($LASTEXITCODE -ne 0) {
    Write-Error "Could not checkout branch mann."
    exit 1
}

# ------------------------------------------
# 3. Pull latest code
# ------------------------------------------

git pull origin mann

if ($LASTEXITCODE -ne 0) {
    Write-Error "git pull failed."
    exit 1
}

# ------------------------------------------
# 4. Show repository state
# ------------------------------------------

Write-Host ""
Write-Host "Current branch:"
git branch --show-current

Write-Host ""
Write-Host "Recent commits:"
git log -5 --oneline

Write-Host ""
Write-Host "Current status:"
git status --short

# ------------------------------------------
# 5. Security check BEFORE Claude
# ------------------------------------------

Write-Host ""
Write-Host "Running security checks..."

$TrackedFiles = git ls-files

$ForbiddenPatterns = @(
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "node_modules/",
    "id_rsa",
    ".pem",
    ".key"
)

foreach ($Pattern in $ForbiddenPatterns) {

    $Matches = $TrackedFiles | Where-Object {
        $_ -like "*$Pattern*"
    }

    if ($Matches) {
        Write-Error "SECURITY FAILURE: Forbidden tracked file detected: $Pattern"
        Write-Host $Matches
        exit 1
    }
}

Write-Host "Security check passed."

# ------------------------------------------
# 6. Run Claude Code
# ------------------------------------------

Write-Host ""
Write-Host "Starting Claude Code..."
Write-Host ""

$Prompt = @"
Work on the FleetDash internship project.

IMPORTANT RULES:

- Read .claude/CLAUDE.md first.
- Work ONLY on branch mann.
- NEVER create or use mann-daily.
- Inspect the repository before changing anything.
- Inspect recent commits.
- Determine the logical next meaningful development task.
- Implement exactly ONE meaningful production-quality functionality.
- Do not create fake functionality.
- Do not create no-op commits.
- Use strict TypeScript.
- Never use any.
- Preserve existing working functionality.
- Run appropriate tests/typechecks/lint.

SECURITY IS CRITICAL:

Never commit or push:

node_modules/
.env
.env.local
.env.production
.env.development
API keys
database credentials
Redis credentials
JWT secrets
passwords
tokens
private keys
certificates
or any other sensitive information.

Before committing:

1. Run git status.
2. Inspect git diff.
3. Stage only intended files.
4. Run git diff --cached.
5. Verify no secrets are staged.
6. If anything suspicious is found, STOP.
7. Never push sensitive information.

After successful implementation:

- Run relevant checks.
- Create a meaningful Conventional Commit.
- Push ONLY to origin/mann.
- Do not push anywhere else.

Create a daily development log at:

docs/daily-logs/

The log should contain:

# FleetDash Daily Development Log

Date:
Task:
Why this task:
Files changed:
Implementation summary:
Tests/checks:
Security check:
Commit:
Push result:
Blockers:
Next step:

Do not claim tests passed unless they actually passed.

Do not claim the push succeeded unless git push actually succeeded.

At the end report:

- Task implemented
- Files changed
- Tests/checks
- Security result
- Commit hash
- Commit message
- Push result
- Blockers
- Next step
"@

claude --dangerously-skip-permissions $Prompt

if ($LASTEXITCODE -ne 0) {
    Write-Error "Claude Code execution failed."
    exit 1
}

# ------------------------------------------
# 7. Final security verification
# ------------------------------------------

Write-Host ""
Write-Host "Running FINAL security verification..."

$StagedFiles = git diff --cached --name-only

foreach ($Pattern in $ForbiddenPatterns) {

    $Matches = $StagedFiles | Where-Object {
        $_ -like "*$Pattern*"
    }

    if ($Matches) {
        Write-Error "SECURITY FAILURE: Forbidden file staged: $Pattern"
        Write-Host $Matches
        exit 1
    }
}

Write-Host "Final security verification passed."

# ------------------------------------------
# 8. Final repository status
# ------------------------------------------

Write-Host ""
Write-Host "Final branch:"
git branch --show-current

Write-Host ""
Write-Host "Latest commit:"
git log -1 --oneline

Write-Host ""
Write-Host "Final status:"
git status --short

Write-Host ""
Write-Host "=========================================="
Write-Host "       FleetDash Automation Finished"
Write-Host "=========================================="