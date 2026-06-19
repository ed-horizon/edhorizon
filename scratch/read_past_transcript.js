const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    if (!fs.existsSync(logPath)) {
        console.error("Log file not found at:", logPath);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        try {
            const step = JSON.parse(line);
            
            // Check for tool calls related to running commands
            if (step.tool_calls) {
                for (const call of step.tool_calls) {
                    if (call.name === 'run_command' && call.args) {
                        const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                        if (args.CommandLine && (args.CommandLine.includes('password') || args.CommandLine.includes('postgres') || args.CommandLine.includes('scratch'))) {
                            console.log(`Step ${step.step_index}: run_command -> ${args.CommandLine}`);
                        }
                    }
                }
            }

            // Check content for user inputs
            if (step.type === 'USER_INPUT' && step.content) {
                if (step.content.toLowerCase().includes('password') || step.content.toLowerCase().includes('database') || step.content.toLowerCase().includes('sivavini')) {
                    console.log(`Step ${step.step_index}: USER_INPUT -> ${step.content.substring(0, 300)}...`);
                }
            }
            
            // Check general step content
            if (step.content && step.content.includes('SUCCESS connected with password')) {
                console.log(`Step ${step.step_index}: Found success message -> ${step.content.substring(0, 300)}...`);
            }
        } catch (e) {
            // ignore JSON parse errors for incomplete lines
        }
    }
    console.log(`Finished scanning ${count} lines.`);
}

run();
