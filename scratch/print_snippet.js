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
        if (count >= 960 && count <= 1020) {
            console.log(`Line ${count}: ${line}`);
        }
    }
}

run();
