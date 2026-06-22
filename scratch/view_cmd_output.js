const fs = require('fs');
const readline = require('readline');

async function run() {
    const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let found = false;
    let stepsToPrint = 0;

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            
            // Check if this step is running the command
            let isTarget = false;
            if (step.tool_calls) {
                step.tool_calls.forEach(tc => {
                    if (tc.name === 'run_command' && tc.args && tc.args.CommandLine && tc.args.CommandLine.includes('test_pooler_conn.js')) {
                        isTarget = true;
                    }
                });
            }

            if (isTarget) {
                found = true;
                stepsToPrint = 3; // Print this step and the next 2 steps (which will include the output)
            }

            if (found && stepsToPrint > 0) {
                console.log(`\n=== STEP INDEX ${step.step_index} (${step.type}) ===`);
                if (step.tool_calls) {
                    console.log("Tool Calls:", JSON.stringify(step.tool_calls, null, 2));
                }
                if (step.content) {
                    console.log("Content:", step.content.substring(0, 1000));
                }
                stepsToPrint--;
                if (stepsToPrint === 0) {
                    found = false;
                }
            }
        } catch (e) {}
    }
}

run();
