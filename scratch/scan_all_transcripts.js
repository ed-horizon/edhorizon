const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain';

async function scanFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.includes('Connected successfully!') || line.includes('SUCCESS!') || line.includes('Migration applied successfully!') || line.includes('FOUND DATABASE PASSWORD') || line.includes('SUCCESS connected')) {
            console.log(`Match in ${filePath} at line ${count}:`);
            console.log(line.substring(0, 500));
            console.log("-----------------------------------------");
        }
    }
}

async function run() {
    if (!fs.existsSync(brainDir)) {
        console.error("Brain directory not found");
        return;
    }
    const folders = fs.readdirSync(brainDir);
    for (const f of folders) {
        const fullPath = path.join(brainDir, f, '.system_generated', 'logs', 'transcript.jsonl');
        if (fs.existsSync(fullPath)) {
            console.log(`Scanning ${fullPath}...`);
            await scanFile(fullPath);
        }
    }
    console.log("Scan complete.");
}

run();
