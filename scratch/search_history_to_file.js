const fs = require('fs');
const readline = require('readline');

async function run() {
    const fileStream = fs.createReadStream('C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl');
    const outStream = fs.createWriteStream('c:\\Users\\vinit\\Desktop\\edhorizon\\scratch\\search_results.txt');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        // Check for sql commands or migrations being run in commands
        if (line.includes('run_command') || line.includes('CommandLine') || line.includes('sql') || line.includes('migration')) {
            const parsed = JSON.parse(line);
            if (parsed.type === 'run_command' || parsed.type === 'RUN_COMMAND' || (parsed.tool_calls && JSON.stringify(parsed.tool_calls).includes('run_command'))) {
                outStream.write(`Line ${count} - Type: ${parsed.type}, Source: ${parsed.source}\n`);
                if (parsed.tool_calls) {
                    outStream.write(`Tool calls: ${JSON.stringify(parsed.tool_calls, null, 2)}\n`);
                }
                if (parsed.content) {
                    outStream.write(`Content: ${parsed.content.substring(0, 500)}\n`);
                }
                outStream.write("-----------------------------------------\n");
            }
        }
    }
    outStream.end();
    console.log("Done searching history! Results saved to scratch/search_results.txt");
}

run();
