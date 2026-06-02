// fix-portals.mjs — v2
import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const FILE = 'portals.yml';
copyFileSync(FILE, `${FILE}.bak`);
console.log(`✓ Backup saved to ${FILE}.bak`);

let yml = readFileSync(FILE, 'utf8');
let count = 0;

const replacements = [
  [
    `  - name: PowerSchool\n    careers_url: https://boards.greenhouse.io/powerschool\n    api: https://job-boards.greenhouse.io/powerschool/jobs\n    enabled: true`,
    `  - name: PowerSchool\n    careers_url: https://careers-powerschool.icims.com/jobs/search\n    scan_method: websearch\n    scan_query: site:careers-powerschool.icims.com marketing OR email OR enablement OR content remote\n    enabled: true`
  ],
  [
    `  - name: Curriculum Associates (i-Ready)\n    careers_url: https://boards.greenhouse.io/curriculumassociates\n    api: https://job-boards.greenhouse.io/curriculumassociates/jobs\n    enabled: true`,
    `  - name: Curriculum Associates (i-Ready)\n    careers_url: https://curriculumassociates.wd5.myworkdayjobs.com/External\n    scan_method: websearch\n    scan_query: site:curriculumassociates.wd5.myworkdayjobs.com marketing OR email OR content OR enablement remote\n    enabled: true`
  ],
  [
    `  - name: Imagine Learning\n    careers_url: https://boards.greenhouse.io/imaginelearning\n    api: https://job-boards.greenhouse.io/imaginelearning/jobs\n    enabled: true`,
    `  - name: Imagine Learning\n    careers_url: https://jobs.jobvite.com/imagine-learning\n    scan_method: websearch\n    scan_query: site:jobs.jobvite.com/imagine-learning marketing OR email OR content OR enablement remote\n    enabled: true`
  ],
  [
    `  - name: Waterford.org\n    careers_url: https://boards.greenhouse.io/waterford\n    api: https://job-boards.greenhouse.io/waterford/jobs\n    enabled: true`,
    `  - name: Waterford.org\n    careers_url: https://www.paycomonline.net/v4/ats/web.php/portal/331B479E8FD113A8751AEE3AC103ABFD/career-page\n    scan_method: websearch\n    scan_query: waterford.org OR waterford education marketing OR email OR content OR communications remote jobs\n    notes: Paycom has no public API. Websearch only.\n    enabled: true`
  ],
  [
    `  - name: Nearpod\n    careers_url: https://boards.greenhouse.io/nearpod\n    api: https://job-boards.greenhouse.io/nearpod/jobs\n    enabled: true`,
    `  - name: Nearpod\n    careers_url: https://job-boards.greenhouse.io/renaissancelearning-nam\n    api: https://boards-api.greenhouse.io/v1/boards/renaissancelearning-nam/jobs\n    notes: Acquired by Renaissance Learning. Add keyword filter — board covers full org.\n    enabled: true`
  ],
  [
    `  - name: Discovery Education\n    careers_url: https://boards.greenhouse.io/discoveryeducation\n    api: https://job-boards.greenhouse.io/discoveryeducation/jobs\n    enabled: true`,
    `  - name: Discovery Education\n    careers_url: https://jobs.dayforcehcm.com/en-US/discoveryed/CANDIDATEPORTAL\n    scan_method: websearch\n    scan_query: site:jobs.dayforcehcm.com/en-US/discoveryed marketing OR email OR content OR enablement remote\n    enabled: true`
  ],
  [
    `  - name: Achieve3000\n    careers_url: https://boards.greenhouse.io/achieve3000\n    api: https://job-boards.greenhouse.io/achieve3000/jobs\n    enabled: true`,
    `  - name: Achieve3000\n    careers_url: https://careers-mheducation.icims.com/jobs\n    scan_method: websearch\n    scan_query: site:careers-mheducation.icims.com achieve3000 OR "achieve 3000" marketing OR email OR content remote\n    notes: Acquired by McGraw-Hill. Keyword filter essential.\n    enabled: true`
  ],
  [
    `  - name: Environmental Defense Fund\n    careers_url: https://boards.greenhouse.io/edf\n    api: https://job-boards.greenhouse.io/edf/jobs\n    enabled: true`,
    `  - name: Environmental Defense Fund\n    careers_url: https://osv-edf.wd5.myworkdayjobs.com/en-US/EDF_External_Careers\n    scan_method: websearch\n    scan_query: site:osv-edf.wd5.myworkdayjobs.com marketing OR email OR communications OR content remote\n    enabled: true`
  ],
  [
    `  - name: National Audubon Society\n    careers_url: https://boards.greenhouse.io/audubon\n    api: https://job-boards.greenhouse.io/audubon/jobs\n    enabled: true`,
    `  - name: National Audubon Society\n    careers_url: https://audubon.wd503.myworkdayjobs.com/Audubon\n    scan_method: websearch\n    scan_query: site:audubon.wd503.myworkdayjobs.com marketing OR email OR content OR communications remote\n    enabled: true`
  ],
  [
    `  - name: World Wildlife Fund\n    careers_url: https://boards.greenhouse.io/wwf\n    api: https://job-boards.greenhouse.io/wwf/jobs\n    enabled: true`,
    `  - name: World Wildlife Fund\n    careers_url: https://careers-wwfus.icims.com/jobs\n    scan_method: websearch\n    scan_query: site:careers-wwfus.icims.com marketing OR email OR communications OR content remote\n    enabled: true`
  ],
  [
    `  - name: The Nature Conservancy\n    careers_url: https://boards.greenhouse.io/thenatureconservancy\n    api: https://job-boards.greenhouse.io/thenatureconservancy/jobs\n    enabled: true`,
    `  - name: The Nature Conservancy\n    careers_url: https://careers.tnc.org/us/en/job/\n    scan_method: websearch\n    scan_query: site:careers.tnc.org marketing OR email OR content OR communications remote\n    notes: Phenom-powered board, JS-heavy. Websearch only.\n    enabled: true`
  ],
  [
    `  - name: Feeding America\n    careers_url: https://boards.greenhouse.io/feedingamerica\n    api: https://job-boards.greenhouse.io/feedingamerica/jobs\n    enabled: true`,
    `  - name: Feeding America\n    careers_url: https://jobs.jobvite.com/feedingamerica\n    scan_method: websearch\n    scan_query: site:jobs.jobvite.com/feedingamerica marketing OR email OR communications OR content remote\n    enabled: true`
  ],
  [
    `  - name: Brevo (Sendinblue)\n    careers_url: https://boards.greenhouse.io/brevo\n    api: https://job-boards.greenhouse.io/brevo/jobs\n    enabled: true`,
    `  - name: Brevo (Sendinblue)\n    careers_url: https://jobs.lever.co/brevo\n    scan_method: websearch\n    scan_query: site:jobs.lever.co/brevo marketing OR email OR content OR enablement remote\n    enabled: true`
  ],
];

for (const [from, to] of replacements) {
  if (yml.includes(from)) {
    yml = yml.replace(from, to);
    count++;
  } else {
    console.warn(`⚠️  No match: ${from.split('\n')[0]}`);
  }
}

writeFileSync(FILE, yml, 'utf8');
console.log(`\n✓ ${count}/13 entries updated in ${FILE}`);
console.log(`\nNext: node scan.mjs --dry-run 2>&1 | grep -E "Errors|✗|✓"`);