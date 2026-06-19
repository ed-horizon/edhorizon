const fs = require('fs');

const fileContent = fs.readFileSync('app/(dashboard)/operations/page.tsx', 'utf8');
const lines = fileContent.split('\n');

console.log("Searching for payment/receipt references in operations/page.tsx...");
lines.forEach((line, index) => {
    if (line.includes('payment') || line.includes('Payment') || line.includes('receipt') || line.includes('Receipt') || line.includes('recordManual') || line.includes('processPayment')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
