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

HARD_STOPS=' engineer|developer|software|full stack|frontend|front end|backend|data scientist|data engineer|analytics engineer|business intelligence|product manager|product designer|vice president|vp |chief |cmo|director of|java |python developer|ios|android|blockchain|crypto|recruiter|hr manager|salesforce admin|customer support|support specialist|support associate|technical support|customer care|help center|customer service representative|csr|call center|help desk|tier 1 support|technical support representative|inbound calls|account executive|inside sales|sales representative|business development|account manager|cold calling|sales development representative|bdr|emea|apac|latam|mena|- uk|- canada|- brazil|- africa|- turkey|- india|- australia|- germany|- france|- singapore|employee relations|time and attendance|time & attendance|payroll|people operations|hr business partner|contract management|machine learning|data analyst|bi analyst|growth hacker|tableau|looker|dbt |sql |paid media|paid search|sem|ppc|seo manager|head of |svp|hybrid|bilingual|travel based|travel-based|field-based|benefits |l&d business partner|compensation|database|marketo|facilities|it support|legal |finance |accounting|procurement|test automation|qa |scientist|designer|researcher|social media|devops|site reliability|hardware|accountant|bookkeeper|attorney|paralegal|financial|\btalent\b|\bpeople\b|human resources|\bhr\b|cold call|clinical|medical|patient|psychiatric|psychiatrist|therapist|credentialing|pharmaceutical|compounding|billing|administrative|data entry|supply chain|quality control|philippines|director|dental|dentist|german|italian|portuguese|relocation|tutor|\btax\b|\bcpu\b|cyber|security|infosys|supplier|\bp2p\b|early access|workplace business partner|\bindia\b|\baws\b|cloud|counsel|technical program manager|employee experience|jornada|it specialist|agriculture|treering|program worker|spanish|food operations|risk management|it operations|environmental monitoring|\bdays\b|\bnights\b|openai|\bnotion\b|data center|cnc |manufacturing|warehouse|logistics|inventory|machining|maintenance|astronaut|distribution|supply |phlebotomist|organ |autism|crisis intervention|pathology|aesthetic|accounts payable|accounts receivable|underwriter|collections |fraud |compliance |aml |treasury|culinary|food safety|store operations|real estate|retail |success manager|sales consultant|channel partner|sales executive|freelance|data labeling|assessment|curriculum|army|air force|marine corps|nf-03|ne-04|nf3|recruiting|candidate experience|ta operations|success advocate|professional services|implementation manager|delivery consultant|quality assurance|client partner|programmatic|measurement partner|confidential assistant|executive business partner|peer specialist|provider experience|trust & safety|law enforcement|critical harms|brand ambassador|parts advisor|service advisor|vehicle operations|fleet operations|move-out|hospitality|resident experience|trade specialist|graphics programmer|gameplay programmer|technical artist|subcontracts|tooling|guest relations|lathe|shipping|underwriting|collection|loans|test specialist|data specialist|operations specialist|technical writer|field implementation|arabic|\bux\b|\brisk\b|tech-operations|renewals|regulatory|netherlands|immigration|reconciliation|safeguarding|incident|investigation|delinquency|eviction|recovery|field support|programmer|construction|data science|french|receiving|quintoandar|\btravel\b|fulfillment|it service|deal desk|delivery operations|equipment|méxico|mexico|\bmex\b|rare disease|oncology|chief-of-staff|berlin|vehicle|delivery advisor|field operations|fleet|equity|data warehousing|data & analytics|insurance|on-the-ground|it systems|dietitian|claims|metrology|\bintern\b|cooling specialist|release of information|mental health group specialist|cash posting|payment operations|field enablement|kitchen operations|operations admin|netsuite|\bcx\b|ministry|order management|mechanical|technician|quality specialist|history program|military|tiktok|geospatial|policy advisor|zhengzhou|\bseo\b|prague|czechia|dubai|sign up for the|\bafrica\b|data governance|religion|disability|karnataka'

TARGETS='lifecycle|email marketing|campaign|marketing manager|marketing specialist|content marketing|content strateg|content writer|copywriter|enablement|enablement|customer marketing|onboarding|implementation specialist|marketing operations|crm marketing|customer education|customer adoption|b2b content|product marketing|field marketing|event marketing|marketing analytics|marketing strategy|go-to-market|gtm strategy|revenue operations|revops|sales strategy|sales operations|partnerships|customer strategy|engagement|creative strategist|media strategist|web strategy|digital experience|sales specialist|marketing lead|marketing assistant|marketing analyst|lead marketing|marketing automation|marketing ai|marketing associate|marketing executive|partner marketing|digital marketing|crm specialist|marketing proposal'

INOFFICE_COMPANIES='openai|\bnotion\b'

# In-page signals for in-office / hybrid
INOFFICE_CONTENT='\bhq\b|on-site|on site|in-office|in office|hybrid|commutable|local|relocation|travel|field|days per|openai|notion|canada|\bcan\b|ontario|british columbia|alberta|quebec|ireland|united kingdom|\buk\b|england|scotland|wales|japan|south korea|korea|australia|india|bengaluru|hyderabad|france|germany|poland|singapore|mexico|brazil|netherlands|spain|italy|sweden|denmark|norway|switzerland|belgium|china|philippines|taiwan|vietnam|thailand|indonesia|malaysia|pakistan|nigeria|south africa|kenya|egypt|israel|turkey|\buae\b|dubai|dublin|tokyo|seoul|sydney|melbourne|paris|munich|berlin|london|amsterdam|toronto|vancouver|lithuania|greece|kazakhstan|croatia|slovenia|slovakia|colombia|austria|bangalore|bulgaria|arabia|ny, sf, chicago|ny or sf|luxembourg|frankfurt|serbia|brasil|emea|apac|latam'
REMOTE_CONTENT='\bremote\b|virtual|home|anywhere|flexible|north america|\bUS\b|\bU.S.\b|\bUSA\b|\bU.S.A.\b|united states'

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
echo "  $unclear      unclear    — review manually"
echo "  $nurl       no URL     — can't verify"
echo "  ───────────────────────────────────────"
echo "  $confirmed_remote    confirmed remote ✅ → confirmed-remote-queue.txt"
echo "═══════════════════════════════════════════"
echo ""
echo "Next step: node batch-runner-custom.mjs --limit 10"
