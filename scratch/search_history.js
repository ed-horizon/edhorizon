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
        if (line.toLowerCase().includes('alter table') || line.toLowerCase().includes('database') || line.toLowerCase().includes('.sql')) {
            const parsed = JSON.parse(line);
            console.log(`Line ${count} - Type: ${parsed.type}, Source: ${parsed.source}`);
            if (parsed.tool_calls) {
                console.log("Tool calls:", JSON.stringify(parsed.tool_calls, null, 2));
            }
            if (parsed.content && parsed.content.length < 500) {
                console.log("Content:", parsed.content);
            } else if (parsed.content) {
                console.log("Content:", parsed.content.substring(0, 500) + "...[TRUNCATED]");
            }
            console.log("-----------------------------------------");
        }
    }
}

run();
