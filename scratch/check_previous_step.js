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
            if (step.step_index === 4887) {
                console.log(`Step ${step.step_index}: Type: ${step.type}`);
                if (step.content) {
                    console.log(`Content:\n${step.content}\n`);
                }
                if (step.tool_calls) {
                    console.log("Tool calls:", JSON.stringify(step.tool_calls));
                }
            }
        } catch (e) {}
    }
}

run();
