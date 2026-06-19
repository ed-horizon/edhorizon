const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = path.join(__dirname, 'search_results.txt');

async function run() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        const lower = line.toLowerCase();
        if (lower.includes('success') || lower.includes('connected') || lower.includes('migrat')) {
            if (lower.includes('sivavini') || lower.includes('password') || lower.includes('db') || lower.includes('pooler')) {
                console.log(`Line ${count}: ${line}`);
            }
        }
    }
}

run();
