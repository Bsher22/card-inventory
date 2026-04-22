# =============================================================
# One-shot: fix the phantom submodule deploy failure AND push
# the eBay consignment module.
#
# Usage (from PowerShell, inside the IDGAS folder):
#     .\fix-deploy-and-push.ps1
#
# Safe to re-run: every step is idempotent.
# =============================================================

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# --- Sanity check ---
if (-not (Test-Path ".git")) {
    throw "Run this from the IDGAS repo root (no .git folder here)."
}

# -------------------------------------------------------------
# 1. Clear the stale git index lock, if any
# -------------------------------------------------------------
Step "Clearing stale .git\index.lock (if present)"
if (Test-Path ".git\index.lock") {
    try {
        Remove-Item -Force ".git\index.lock"
        Write-Host "   removed"
    } catch {
        Write-Host "   could not remove - close any git GUI / IDE git integration and rerun" -ForegroundColor Yellow
        throw
    }
} else {
    Write-Host "   (no lock present)"
}

# -------------------------------------------------------------
# 2. Remove the four phantom Claude Code worktree gitlinks
# -------------------------------------------------------------
Step "Removing phantom .claude/worktrees submodule entries"
$phantoms = @(
    ".claude/worktrees/bold-johnson",
    ".claude/worktrees/keen-swartz",
    ".claude/worktrees/modest-cannon",
    ".claude/worktrees/wizardly-borg"
)
foreach ($p in $phantoms) {
    & git ls-files --error-unmatch $p *> $null
    if ($LASTEXITCODE -eq 0) {
        & git rm --cached $p | Out-Null
        Write-Host "   removed from index: $p"
    } else {
        Write-Host "   (already gone) $p"
    }
}

# -------------------------------------------------------------
# 3. Ignore worktrees in the future
# -------------------------------------------------------------
Step "Ensuring .claude/worktrees/ is gitignored"
$ignoreLine = ".claude/worktrees/"
$gitignorePath = ".gitignore"
if (-not (Test-Path $gitignorePath)) { New-Item -ItemType File -Path $gitignorePath | Out-Null }
$existing = Get-Content $gitignorePath -Raw
if ($existing -notmatch [regex]::Escape($ignoreLine)) {
    Add-Content $gitignorePath "`n$ignoreLine"
    Write-Host "   appended to .gitignore"
} else {
    Write-Host "   already in .gitignore"
}

# -------------------------------------------------------------
# 4. Prune stale worktree metadata (they point at paths that may
#    no longer exist after previous Claude Code sessions)
# -------------------------------------------------------------
Step "Pruning stale worktree metadata"
try { & git worktree prune } catch { Write-Host "   (prune reported: $_)" }

# -------------------------------------------------------------
# 5. First commit: the submodule/.gitignore fix
# -------------------------------------------------------------
Step "Commit 1/2 - submodule deploy fix"
& git add .gitignore
$hasStaged = (& git diff --cached --name-only).Length -gt 0
if ($hasStaged) {
    & git commit -m "fix: remove phantom Claude Code worktree submodule entries

.claude/worktrees/{bold-johnson,keen-swartz,modest-cannon,wizardly-borg}
were tracked as gitlinks (mode 160000) without a .gitmodules entry, which
broke 'git submodule update' during deploy. Remove from index and ignore
the directory going forward."
    Write-Host "   committed"
} else {
    Write-Host "   (nothing staged - already fixed?)"
}

# -------------------------------------------------------------
# 6. Second commit: the eBay consignment module itself
# -------------------------------------------------------------
Step "Commit 2/2 - eBay consignment module"
$files = @(
    "backend/app/models/ebay_consignments.py",
    "backend/app/models/__init__.py",
    "backend/app/schemas/ebay_consignments.py",
    "backend/app/services/ebay_consignment_service.py",
    "backend/app/services/ebay_consignment_pdf.py",
    "backend/app/services/ebay_consignment_migrations.py",
    "backend/scripts/smoke_ebay_consignments.py",
    "backend/app/routes/ebay_consignments.py",
    "backend/app/main.py",
    "backend/app/assets/idgas_logo.png",
    "backend/migrations/add_ebay_consignments.sql",
    "backend/requirements.txt",
    "frontend/src/api/ebayConsignmentsApi.ts",
    "frontend/src/api/index.ts",
    "frontend/src/App.tsx",
    "frontend/src/pages/EbayConsigners.tsx",
    "frontend/src/pages/EbayConsignments.tsx",
    "frontend/src/pages/EbayConsignmentDetail.tsx",
    "frontend/src/pages/EbayConsignmentInventory.tsx",
    "frontend/src/pages/EbayPayouts.tsx",
    "frontend/src/pages/EbayHub.tsx",
    "frontend/src/pages/ConsignmentsHub.tsx"
)
foreach ($f in $files) {
    if (Test-Path $f) { & git add $f } else { Write-Host "   (missing, skipping) $f" -ForegroundColor Yellow }
}

$hasStaged = (& git diff --cached --name-only).Length -gt 0
if ($hasStaged) {
    & git commit -m "feat: eBay consignment module

Adds a new module for tracking items IDGAS sells on eBay on behalf of
third-party clients.

Backend (FastAPI + async SQLAlchemy):
  - models, pydantic schemas, service, routes under /api/ebay-*
  - ebay_consigners, ebay_consignment_agreements, ebay_consignment_items,
    ebay_consignment_payouts tables (see migration)
  - reportlab-based PDF generation for agreements and monthly statements
  - IDGAS logo embedded in both PDFs (backend/app/assets/idgas_logo.png)

Frontend (React + TS + TanStack Query):
  - Consigners, Agreements list + builder, Agreement detail (record sale,
    dual-sign, download PDF), Monthly Payouts (preview + generate + mark paid)
  - New 'eBay Consign' sidebar entry, Consignments Hub links"
    Write-Host "   committed"
} else {
    Write-Host "   (nothing new to commit)"
}

# -------------------------------------------------------------
# 7. Push
# -------------------------------------------------------------
Step "Pushing to origin"
& git push

Write-Host "`n[done] Railway should pick up the new commit within a minute or two." -ForegroundColor Green
