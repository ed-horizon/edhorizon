const fs = require('fs');
const readline = require('readline');

async function run() {
    const fileStream = fs.createReadStream('C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.includes('Connected successfully!') || line.includes('FOUND DATABASE PASSWORD') || line.includes('SUCCESS! Connected with password') || line.includes('SUCCESS connected to pooler') || line.includes('SUCCESS connected with password')) {
            const parsed = JSON.parse(line);
            console.log(`Line ${count} - Type: ${parsed.type}, Source: ${parsed.source}`);
            if (parsed.content) {
                console.log("Content:", parsed.content.substring(0, 1000));
            }
            console.log("-----------------------------------------");
        }
    }
}

run();
