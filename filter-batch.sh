#!/usr/bin/env bash
# filter-batch.sh — Run the pipeline filter against batch-input.tsv
# instead of pipeline.md. Skips already-completed IDs in batch-state.tsv.
#
# Outputs:
#   confirmed-remote-queue.txt      — URLs that passed all filters
#   location-check-results.txt      — full annotated breakdown
#   uncertain-titles.txt            — no keyword match either way
#   batch-input-filtered.tsv        — new batch-input.tsv with skipped rows REMOVED
#
# Usage:
#   bash filter-batch.sh              # full run (fetches pages)
#   bash filter-batch.sh --dry-run    # title + label only, no URL fetching
#   bash filter-batch.sh --new-only   # only process IDs not in batch-state.tsv

set -euo pipefail

BATCH_INPUT="batch/batch-input.tsv"
STATE_FILE="batch/batch-state.tsv"
DRY_RUN=false
NEW_ONLY=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]]  && DRY_RUN=true
  [[ "$arg" == "--new-only" ]] && NEW_ONLY=true
done
   
# ─── Same keyword lists as filter-pipeline.sh ────────────────────────────────

HARD_STOPS=' engineer|developer|software|full stack|frontend|front end|backend|data scientist|data engineer|analytics engineer|business intelligence|product manager|product designer|vice president|vp |chief |cmo|director of|java |python developer|ios|android|blockchain|crypto|recruiter|hr manager|salesforce admin|customer support|support specialist|support associate|technical support|customer care|help center|customer service representative|csr|call center|help desk|tier 1 support|technical support representative|inbound calls|account executive|inside sales|sales representative|business development|account manager|cold calling|sales development representative|bdr|emea|apac|latam|mena|- uk|- canada|- brazil|- africa|- turkey|- india|- australia|- germany|- france|- singapore|employee relations|time and attendance|time & attendance|payroll|people operations|hr business partner|contract management|machine learning|data analyst|bi analyst|growth hacker|tableau|looker|dbt |sql |paid media|paid search|sem|ppc|seo manager|head of |svp|hybrid|bilingual|travel based|travel-based|field-based|benefits |l&d business partner|compensation|database|marketo|facilities|it support|legal |finance |accounting|procurement|test automation|qa |scientist|designer|researcher|social media|devops|site reliability|hardware|accountant|bookkeeper|attorney|paralegal|financial|\btalent\b|\bpeople\b|human resources|\bhr\b|cold call|clinical|medical|patient|psychiatric|psychiatrist|therapist|credentialing|pharmaceutical|compounding|billing|administrative|data entry|supply chain|quality control|philippines|director|dental|dentist|german|italian|portuguese|relocation|tutor|\btax\b|\bcpu\b|cyber|security|infosys|supplier|\bp2p\b|early access|workplace business partner|\bindia\b|\baws\b|cloud|counsel|technical program manager|employee experience|jornada|it specialist|agriculture|treering|program worker|spanish|food operations|risk management|it operations|environmental monitoring|\bdays\b|\bnights\b|openai|\bnotion\b|data center|cnc |manufacturing|warehouse|logistics|inventory|machining|maintenance|astronaut|distribution|supply |phlebotomist|organ |autism|crisis intervention|pathology|aesthetic|accounts payable|accounts receivable|underwriter|collections |fraud |compliance |aml |treasury|culinary|food safety|store operations|real estate|retail |success manager|sales consultant|channel partner|sales executive|freelance|data labeling|assessment|curriculum|army|air force|marine corps|nf-03|ne-04|nf3|recruiting|candidate experience|ta operations|success advocate|professional services|implementation manager|delivery consultant|quality assurance|client partner|programmatic|measurement partner|confidential assistant|executive business partner|peer specialist|provider experience|trust & safety|law enforcement|critical harms|brand ambassador|parts advisor|service advisor|vehicle operations|fleet operations|move-out|hospitality|resident experience|trade specialist|graphics programmer|gameplay programmer|technical artist|subcontracts|tooling|guest relations|lathe|shipping|underwriting|collection|loans|test specialist|data specialist|operations specialist|technical writer|field implementation|arabic|\bux\b|\brisk\b|tech-operations|renewals|regulatory|netherlands|immigration|reconciliation|safeguarding|incident|investigation|delinquency|eviction|recovery|field support|programmer|construction|data science|french|receiving|quintoandar|\btravel\b|fulfillment|it service|deal desk|delivery operations|equipment|méxico|mexico|\bmex\b|rare disease|oncology|chief-of-staff|berlin|vehicle|delivery advisor|field operations|fleet|equity|data warehousing|data & analytics|insurance|on-the-ground|it systems|dietitian|claims|metrology|\bintern\b|cooling specialist|release of information|mental health group specialist|cash posting|payment operations|field enablement|kitchen operations|operations admin|netsuite|\bcx\b|ministry|order management|mechanical|technician|quality specialist|history program|military|tiktok|geospatial|policy advisor|zhengzhou|\bseo\b|prague|czechia|dubai|sign up for the|\bafrica\b|data governance|religion|disability|karnataka'
TARGETS='lifecycle|email marketing|campaign|marketing manager|marketing specialist|content marketing|content strateg|content writer|copywriter|enablement|enablement|customer marketing|onboarding|implementation specialist|marketing operations|crm marketing|customer education|customer adoption|b2b content|product marketing|marketing analytics|marketing strategy|go-to-market|gtm strategy|revenue operations|revops|sales strategy|sales operations|partnerships|customer strategy|engagement|creative strategist|media strategist|web strategy|digital experience|sales specialist|marketing lead|marketing assistant|marketing analyst|lead marketing|marketing automation|marketing ai|marketing associate|marketing executive|partner marketing|digital marketing|crm specialist|marketing proposal'

INOFFICE_COMPANIES='openai|\bnotion\b'
INOFFICE_CONTENT='\bhq\b|onsite|on-site|on site|in-office|in office|in the office|in-person|in person|office-based|office based|hybrid|commutable|commuting distance|commute to|local|local candidates|relocation|relocate|must reside in|must live in|must be located in|\brto\b|return to office|back to office|on-premises|on-prem|colocated|co-located|physical presence|travel|travel required|willingness to travel|percent travel|% travel|field|road warrior|driver'"'"'s license|days per|days a week|days/week|days in office|days in the office|canada|\bcan\b|ontario|british columbia|alberta|quebec|toronto|vancouver|ireland|dublin|united kingdom|\buk\b|england|scotland|wales|london|japan|tokyo|south korea|korea|seoul|australia|sydney|melbourne|new zealand|india|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|france|paris|germany|munich|berlin|frankfurt|poland|singapore|mexico|brazil|brasil|argentina|buenos aires|colombia|bogota|costa rica|chile|peru|netherlands|amsterdam|spain|italy|portugal|sweden|denmark|norway|switzerland|belgium|austria|china|philippines|taiwan|vietnam|thailand|indonesia|malaysia|pakistan|nigeria|south africa|kenya|egypt|israel|turkey|\buae\b|dubai|arabia|lithuania|greece|kazakhstan|croatia|slovenia|slovakia|serbia|bulgaria|romania|hungary|czech republic|luxembourg|ny, sf, chicago|ny or sf|emea|apac|latam'
REMOTE_CONTENT='\bremote\b|virtual|anywhere|\bwfh\b|\bwfa\b|work from home|work from anywhere|telecommute|telecommuting|telework|teleworking|location independent|location agnostic|remote-first|fully remote|remote ok|remote-friendly|off-site|offsite|nationwide|home|distributed|flexible|north america|\bUS\b|\bU.S.\b|\bUSA\b|\bU.S.A.\b|united states'
# ─── Load completed IDs from state file ──────────────────────────────────────

# Extract completed IDs as a newline-separated list (bash 3.2 compatible)
COMPLETED_IDS_LIST=""
if [[ -f "$STATE_FILE" ]]; then
  COMPLETED_IDS_LIST=$(awk -F'\t' '$3 == "completed" {print $1}' "$STATE_FILE")
fi

is_completed() {
  echo "$COMPLETED_IDS_LIST" | grep -qx "$1"
}

# ─── Init output files ────────────────────────────────────────────────────────

RESULTS_FILE="location-check-results.txt"
QUEUE_FILE="confirmed-remote-queue.txt"
UNCERTAIN_FILE="uncertain-titles.txt"
FILTERED_TSV="batch/batch-input-filtered.tsv"

echo "# Location + Title Filter Results — $(date)" > "$RESULTS_FILE"
echo "# FORMAT: STATUS | BUCKET | Role" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
> "$QUEUE_FILE"
> "$UNCERTAIN_FILE"

# Write header for filtered TSV
echo -e "id\turl\tsource\tnotes" > "$FILTERED_TSV"

# ─── Main loop ────────────────────────────────────────────────────────────────

skip=0; confirmed_remote=0; inoffice=0; hybrid=0; unclear=0; nurl=0; uncertain_count=0; already_done=0

while IFS=$'\t' read -r id url source notes; do
  [[ "$id" == "id" ]] && continue  # skip header
  [[ -z "$id" || -z "$url" ]] && continue

  # Skip already-completed IDs if --new-only
  if $NEW_ONLY && is_completed "$id"; then
    ((already_done += 1))
    # Keep completed rows in filtered TSV as-is
    printf '%s\t%s\t%s\t%s\n' "$id" "$url" "$source" "$notes" >> "$FILTERED_TSV"
    continue
  fi

  # Build check strings — check HARD_STOPS against notes AND url so role
  # titles embedded in URLs (e.g. "jornada", "pleno") are also caught
  title=$(echo "$notes" | tr '[:upper:]' '[:lower:]')
  fullline=$(echo "$notes $url" | tr '[:upper:]' '[:lower:]')

  bucket="uncertain"
  echo "$title" | grep -qiE "$TARGETS" && bucket="pass"

  # Pass 1: hard-stop on BOTH title (notes) AND fullline (notes+url)
  # This catches non-English role names embedded in the URL or notes field
  if echo "$fullline" | grep -qiE "$HARD_STOPS" || echo "$fullline" | grep -qiE "$INOFFICE_COMPANIES"; then
    ((skip += 1))
    echo "SKIP       | $bucket | $notes" >> "$RESULTS_FILE"
    continue  # omit from filtered TSV
  fi

  # Pass 2: uncertain — no keyword match either way
    if [[ "$bucket" == "uncertain" ]]; then
    ((uncertain_count += 1))
    echo "$notes" >> "$UNCERTAIN_FILE"
    echo "UNCERTAIN  | uncertain | $notes" >> "$RESULTS_FILE"
    # Fall through to location check instead of dropping
    fi

  # Pass 3: confirmed pass — check location
  if echo "$fullline" | grep -qiE 'remote'; then
    if ! $DRY_RUN && [[ -n "$url" ]]; then
      content=$(curl -s --max-time 10 -L "$url" 2>/dev/null | tr '[:upper:]' '[:lower:]') || true
      if echo "$content" | grep -qiE '\bhybrid\b'; then
        ((hybrid += 1))
        echo "⚠️  HYBRID   | pass | $notes" >> "$RESULTS_FILE"
        continue
      fi
    fi
    ((confirmed_remote += 1))
    echo "✅ REMOTE   | pass | $notes" >> "$RESULTS_FILE"
    [[ -n "$url" ]] && echo "$url" >> "$QUEUE_FILE"
    printf '%s\t%s\t%s\t%s\n' "$id" "$url" "$source" "$notes" >> "$FILTERED_TSV"
    continue
  fi

  # No URL
  if [[ -z "$url" ]]; then
    ((nurl += 1))
    echo "⚠️  NO URL   | pass | $notes" >> "$RESULTS_FILE"
    continue
  fi

  # Dry run — mark unclear but keep
  if $DRY_RUN; then
    ((unclear += 1))
    echo "❓ UNCLEAR  | pass | $notes | $url" >> "$RESULTS_FILE"
    printf '%s\t%s\t%s\t%s\n' "$id" "$url" "$source" "$notes" >> "$FILTERED_TSV"
    continue
  fi

  # Fetch and check
  content=$(curl -s --max-time 10 -L "$url" 2>/dev/null | tr '[:upper:]' '[:lower:]') || true
  if echo "$content" | grep -qiE "$INOFFICE_CONTENT"; then
    ((inoffice += 1))
    echo "🏢 IN-OFFICE | pass | $notes" >> "$RESULTS_FILE"
  elif echo "$content" | grep -qiE "$REMOTE_CONTENT"; then
    ((confirmed_remote += 1))
    echo "✅ REMOTE   | pass | $notes" >> "$RESULTS_FILE"
    echo "$url" >> "$QUEUE_FILE"
    printf '%s\t%s\t%s\t%s\n' "$id" "$url" "$source" "$notes" >> "$FILTERED_TSV"
  else
    ((unclear += 1))
    echo "❓ UNCLEAR  | pass | $notes | $url" >> "$RESULTS_FILE"
    printf '%s\t%s\t%s\t%s\n' "$id" "$url" "$source" "$notes" >> "$FILTERED_TSV"
  fi

done < "$BATCH_INPUT"

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════"
echo "  FILTER BATCH RESULTS"
echo "═══════════════════════════════════════════"
echo "  $already_done   already completed (kept as-is)"
echo "  $skip      hard-stopped (title/company filter)"
echo "  $uncertain_count   uncertain (no keyword match)"
echo "  $inoffice      in-office  — dropped"
echo "  $unclear      unclear    — kept for manual review"
echo "  $nurl       no URL     — can't verify"
echo "  ───────────────────────────────────────"
echo "  $confirmed_remote    confirmed remote ✅"
echo "═══════════════════════════════════════════"
echo ""
echo "✅ Filtered TSV written to: $FILTERED_TSV"
echo "   (swap it in: cp $FILTERED_TSV batch/batch-input.tsv)"
echo ""
echo "Next: node batch-runner-gemini.mjs"
