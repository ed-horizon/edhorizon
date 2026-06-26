const fs = require('fs');
const readline = require('readline');

async function run() {
    const filePath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';
    if (!fs.existsSync(filePath)) {
        console.log(`Log file does not exist: ${filePath}`);
        return;
    }
    const fileStream = fs.createReadStream(filePath);
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (count >= 10130 && count <= 10160) {
            console.log(`Line ${count}: ${line.substring(0, 1000)}`);
        }
    }
}

run();
