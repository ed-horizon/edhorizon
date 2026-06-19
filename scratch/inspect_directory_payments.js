const fs = require('fs');

const fileContent = fs.readFileSync('components/features/hr/StudentDirectoryClient.tsx', 'utf8');
const lines = fileContent.split('\n');

console.log("Searching for payment/receipt references in StudentDirectoryClient.tsx...");
lines.forEach((line, index) => {
    if (line.includes('payment') || line.includes('Payment') || line.includes('receipt') || line.includes('Receipt')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
