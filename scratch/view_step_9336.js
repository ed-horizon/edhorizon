const fs = require('fs');
const readline = require('readline');

async function run() {
    const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.step_index >= 9330 && step.step_index <= 9340) {
                console.log(`=== STEP ${step.step_index} (${step.type}) ===`);
                if (step.tool_calls) console.log("Tool Calls:", JSON.stringify(step.tool_calls, null, 2));
                if (step.content) console.log("Content:", step.content.substring(0, 1000));
                if (step.output) console.log("Output:", step.output.substring(0, 1000));
            }
        } catch (e) {}
    }
}
run();
