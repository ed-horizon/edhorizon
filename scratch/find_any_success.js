const fs = require('fs');
const readline = require('readline');

async function run() {
    const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.toLowerCase().includes('success') && line.toLowerCase().includes('password')) {
            console.log(`Line ${count} matches!`);
            const idx = line.toLowerCase().indexOf('success');
            console.log(`Snippet: ${line.substring(Math.max(0, idx - 40), Math.min(line.length, idx + 120))}`);
        }
    }
}
run();
