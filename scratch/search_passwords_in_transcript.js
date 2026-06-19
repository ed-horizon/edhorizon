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
        if (line.includes('CommandLine') && line.includes('node scratch/')) {
            const parsed = JSON.parse(line);
            const toolCalls = parsed.tool_calls || [];
            toolCalls.forEach(tc => {
                if (tc.name === 'run_command' && tc.args && tc.args.CommandLine) {
                    console.log(`Line ${count} - CMD: ${tc.args.CommandLine}`);
                }
            });
        }
    }
}

run();
