const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = path.join(__dirname, 'search_results.txt');

async function run() {
    if (!fs.existsSync(logPath)) {
        console.error("Log file not found at:", logPath);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.toLowerCase().includes('pooler')) {
            console.log(`Line ${count}: ${line}`);
        }
    }
}

run();
