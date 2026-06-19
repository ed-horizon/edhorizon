const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.step_index >= 4718 && step.step_index <= 4860) {
                console.log(`Step ${step.step_index} (Source: ${step.source}, Type: ${step.type}):`);
                if (step.content || step.output) {
                    console.log((step.content || step.output).substring(0, 1000));
                }
                if (step.tool_calls) {
                    console.log("Tool calls:", JSON.stringify(step.tool_calls, null, 2));
                }
                console.log("-----------------------------------------");
            }
        } catch (e) {}
    }
}

run();
