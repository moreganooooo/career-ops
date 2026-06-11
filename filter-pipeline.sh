#!/usr/bin/env bash
# filter-pipeline.sh — Pre-filter pipeline.md before batch evaluation
#
# Runs three passes in sequence:
#   1. Title hard-stop filter  (zero network calls)
#   2. Location label check    (zero network calls)
#   3. URL content check       (fetches pages, checks remote/hybrid/in-office)
#
# Outputs:
#   confirmed-remote-queue.txt   — clean remote URLs ready for evaluation
#   location-check-results.txt   — full annotated breakdown of all items
#   uncertain-titles.txt         — titles with no keyword match either way
#
# Usage:
#   bash filter-pipeline.sh              # full run
#   bash filter-pipeline.sh --dry-run    # title + label only, no URL fetching

set -euo pipefail
PIPELINE="data/pipeline.md"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# ─── Keyword lists ────────────────────────────────────────────────────────────

HARD_STOPS='engineer|developer|scientist|designer|researcher|social media|devops|site reliability|hardware|accountant|bookkeeper|payroll|attorney|paralegal|legal|financial|\bfp.a\b|recruiter|recruiting|\btalent\b|\bpeople\b|human resources|\bhr\b|benefits|cold call|clinical|medical|patient|psychiatric|psychiatrist|therapist|credentialing|pharmaceutical|compounding|billing|administrative|data entry|supply chain|quality control|hybrid|travel|philippines|director|dental|dentist|german|italian|portuguese|relocation|tutor|\btax\b|\bcpu\b|cyber|security|infosys|supplier|\bp2p\b|early access|workplace business partner|\bindia\b|\baws\b|cloud|counsel|technical program manager|employee experience|jornada|it specialist|agriculture|treering|program worker|spanish|brazil|food operations|risk management|it operations|environmental monitoring|\bdays\b|\bnights\b|openai|\bnotion\b'

TARGETS='lifecycle marketing|email marketing|campaign manager|campaign specialist|marketing manager|marketing specialist|content marketing|content strateg|content writer|copywriter|sales enablement|revenue enablement|customer marketing|customer onboarding|onboarding specialist|implementation specialist|marketing operations|crm marketing|customer education|customer adoption|b2b content|lifecycle manager|lifecycle specialist|enablement manager|enablement specialist'

INOFFICE_COMPANIES='openai|\bnotion\b'

# In-page signals for in-office / hybrid
INOFFICE_CONTENT='\bin.office\b|on.?site|onsite|\bhybrid\b|days.?per.?week.*(office|sf|san francisco|new york|nyc)|office.?required'
REMOTE_CONTENT='\bremote\b|work from (home|anywhere)|fully remote|100% remote'

# ─── Init output files ────────────────────────────────────────────────────────

RESULTS_FILE="location-check-results.txt"
QUEUE_FILE="confirmed-remote-queue.txt"
UNCERTAIN_FILE="uncertain-titles.txt"

echo "# Location + Title Filter Results — $(date)" > "$RESULTS_FILE"
echo "# FORMAT: STATUS | BUCKET | Role" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
> "$QUEUE_FILE"
> "$UNCERTAIN_FILE"

# ─── Main loop ────────────────────────────────────────────────────────────────

skip=0; confirmed_remote=0; inoffice=0; hybrid=0; unclear=0; nurl=0; uncertain_count=0

while IFS= read -r line; do
  [[ "$line" =~ ^[-\ ]*\[\ \] ]] || continue

  url=$(echo "$line" | grep -oE 'https?://[^ |]+' | head -1) || true
  role=$(echo "$line" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  title=$(echo "$role" | tr '[:upper:]' '[:lower:]')
  fullline=$(echo "$line" | tr '[:upper:]' '[:lower:]')

  bucket="uncertain"
  echo "$title" | grep -qiE "$TARGETS" && bucket="pass"

  # Pass 1: title hard-stop or known in-office company
  if echo "$title" | grep -qiE "$HARD_STOPS" || echo "$fullline" | grep -qiE "$INOFFICE_COMPANIES"; then
    ((skip += 1))
    echo "SKIP       | $bucket | $role" >> "$RESULTS_FILE"
    continue
  fi

  # Pass 2: uncertain bucket — record but don't queue
  if [[ "$bucket" == "uncertain" ]]; then
    ((uncertain_count += 1))
    echo "$role" >> "$UNCERTAIN_FILE"
    echo "UNCERTAIN  | uncertain | $role" >> "$RESULTS_FILE"
    continue
  fi

  # Pass 3: confirmed pass — check location
  # Label says remote → confirmed without fetch
  if echo "$fullline" | grep -qiE 'remote'; then
    if [[ -n "$url" ]]; then
      if $DRY_RUN; then
        ((confirmed_remote += 1))
        echo "✅ REMOTE   | pass | $role" >> "$RESULTS_FILE"
        echo "$url" >> "$QUEUE_FILE"
        continue
      fi
      # Still verify hybrid isn't hiding in the page
      content=$(curl -s --max-time 10 -L "$url" 2>/dev/null | tr '[:upper:]' '[:lower:]') || true
      if echo "$content" | grep -qiE '\bhybrid\b'; then
        ((hybrid += 1))
        echo "⚠️  HYBRID   | pass | $role" >> "$RESULTS_FILE"
        continue
      fi
    fi
    ((confirmed_remote += 1))
    echo "✅ REMOTE   | pass | $role" >> "$RESULTS_FILE"
    [[ -n "$url" ]] && echo "$url" >> "$QUEUE_FILE"
    continue
  fi

  # No URL — can't verify
  if [[ -z "$url" ]]; then
    ((nurl += 1))
    echo "⚠️  NO URL   | pass | $role" >> "$RESULTS_FILE"
    continue
  fi

  # Dry run — mark unknown
  if $DRY_RUN; then
    ((unclear += 1))
    echo "❓ UNCLEAR  | pass | $role | $url" >> "$RESULTS_FILE"
    continue
  fi

  # Fetch and check
  content=$(curl -s --max-time 10 -L "$url" 2>/dev/null | tr '[:upper:]' '[:lower:]') || true
  if echo "$content" | grep -qiE "$INOFFICE_CONTENT"; then
    ((inoffice += 1))
    echo "🏢 IN-OFFICE | pass | $role" >> "$RESULTS_FILE"
  elif echo "$content" | grep -qiE "$REMOTE_CONTENT"; then
    ((confirmed_remote += 1))
    echo "✅ REMOTE   | pass | $role" >> "$RESULTS_FILE"
    echo "$url" >> "$QUEUE_FILE"
  else
    ((unclear += 1))
    echo "❓ UNCLEAR  | pass | $role | $url" >> "$RESULTS_FILE"
  fi

done < "$PIPELINE"

# ─── Summary ──────────────────────────────────────────────────────────────────

echo "" >> "$RESULTS_FILE"
echo "# SUMMARY" >> "$RESULTS_FILE"
echo "# $skip hard-stopped | $confirmed_remote confirmed remote | $inoffice in-office | $hybrid hybrid | $unclear unclear | $nurl no url | $uncertain_count uncertain" >> "$RESULTS_FILE"

echo ""
echo "═══════════════════════════════════════════"
echo "  FILTER PIPELINE RESULTS"
echo "═══════════════════════════════════════════"
echo "  $skip      hard-stopped (title/company filter)"
echo "  $uncertain_count   uncertain (no keyword match)"
echo "  $inoffice      in-office  — dropped"
echo "  $hybrid      hybrid     — dropped"
echo "  $unclear      unclear    — review manually"
echo "  $nurl       no URL     — can't verify"
echo "  ───────────────────────────────────────"
echo "  $confirmed_remote    confirmed remote ✅ → confirmed-remote-queue.txt"
echo "═══════════════════════════════════════════"
echo ""
echo "Next step: node batch-runner-custom.mjs --limit 10"
