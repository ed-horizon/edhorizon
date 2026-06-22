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
        if (line.includes("SUCCESS! Connected with password:") || line.includes("SUCCESS connected! Password:") || line.includes("SUCCESS connected!")) {
            console.log(`Line ${count}: ${line.substring(0, 500)}...`);
        }
    }
}

run();
