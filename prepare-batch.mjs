import fs from 'fs';
import path from 'path';

const PIPELINE_FILE = 'data/pipeline.md';
const INPUT_FILE = 'batch/batch-input.tsv';
const APPLICATIONS_FILE = 'data/applications.md';

function parsePipeline() {
    const content = fs.readFileSync(PIPELINE_FILE, 'utf-8');
    const lines = content.split('\n');
    const urls = [];
    
    // Pattern: - [ ] URL | Company | Role
    const regex = /- \[ \] (https?:\/\/\S+)\s*\|\s*([^|]+)\s*\|\s*(.+)/;
    
    lines.forEach(line => {
        const match = line.match(regex);
        if (match) {
            urls.push({
                url: match[1].trim(),
                company: match[2].trim(),
                role: match[3].trim()
            });
        }
    });
    return urls;
}

function getExistingUrls() {
    const content = fs.existsSync(APPLICATIONS_FILE) ? fs.readFileSync(APPLICATIONS_FILE, 'utf-8') : '';
    const urls = new Set();
    // Simple regex to find URLs in the tracker
    const regex = /https?:\/\/\S+/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        urls.add(match[0].replace(/[)]/g, '')); // clean up potential trailing parens in markdown links
    }
    return urls;
}

function main() {
    const pipelineUrls = parsePipeline();
    const existingUrls = getExistingUrls();
    
    console.log(`Found ${pipelineUrls.length} URLs in pipeline.`);
    
    const toProcess = pipelineUrls.filter(item => !existingUrls.has(item.url));
    console.log(`${toProcess.length} are new (not in tracker).`);
    
    let nextId = 1;
    if (fs.existsSync(INPUT_FILE)) {
        const existingInput = fs.readFileSync(INPUT_FILE, 'utf-8');
        const ids = existingInput.split('\n').slice(1).map(l => parseInt(l.split('\t')[0])).filter(id => !isNaN(id));
        if (ids.length > 0) {
            nextId = Math.max(...ids) + 1;
        }
    } else {
        fs.writeFileSync(INPUT_FILE, 'id\turl\tsource\tnotes\n');
    }
    
    const stream = fs.createWriteStream(INPUT_FILE, { flags: 'a' });
    toProcess.forEach(item => {
        stream.write(`${nextId}\t${item.url}\tPipeline\t${item.company} - ${item.role}\n`);
        nextId++;
    });
    stream.end();
    
    console.log(`Added ${toProcess.length} URLs to ${INPUT_FILE}.`);
}

main();
