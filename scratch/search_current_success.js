const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.toLowerCase().includes('success') && (line.toLowerCase().includes('connect') || line.toLowerCase().includes('migrat') || line.toLowerCase().includes('sql') || line.toLowerCase().includes('ddl'))) {
            console.log(`Line ${count}: ${line.substring(0, 1000)}`);
        }
    }
}

run();
