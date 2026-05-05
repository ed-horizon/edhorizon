document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const receiptForm = document.getElementById('receiptForm');
    const receiptPreview = document.getElementById('receiptPreview');
    const postActions = document.getElementById('postActions');

    // Default Date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Form Submission Handler
    receiptForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Values
        const receiptNo = document.getElementById('receiptNo').value;
        const date = document.getElementById('date').value;
        const studentName = document.getElementById('studentName').value;
        const course = document.getElementById('course').value;
        const amount = document.getElementById('amount').value;
        const remainingFees = document.getElementById('remainingFees').value;
        const paymentMode = document.getElementById('paymentMode').value;

        // Populate Receipt Preview
        document.getElementById('viewReceiptNo').innerText = receiptNo;
        document.getElementById('viewDate').innerText = formatDate(date);
        document.getElementById('viewStudentName').innerText = studentName;
        document.getElementById('viewCourse').innerText = course;
        document.getElementById('viewAmountWords').innerText = numberToWords(amount) + " Only";
        document.getElementById('viewAmount').innerText = parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        
        // Handle Remaining Fees
        const remFeesFloat = parseFloat(remainingFees) || 0;
        document.getElementById('viewRemainingFees').innerText = remFeesFloat.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        document.getElementById('remainingFeesRow').style.display = remFeesFloat > 0 ? 'flex' : 'none';

        document.getElementById('viewPaymentMode').innerText = paymentMode;

        // Show UI Elements
        receiptPreview.style.display = 'block';
        postActions.style.display = 'block';

        // Scroll to Receipt
        receiptPreview.scrollIntoView({ behavior: 'smooth' });
    });

    function formatDate(dateStr) {
        if (!dateStr) return "";
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    }

    function numberToWords(num) {
        const singleDigits = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const teenDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const doubleDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        
        const convert = (n) => {
            if (n < 10) return singleDigits[n];
            if (n < 20) return teenDigits[n - 10];
            if (n < 100) return doubleDigits[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + singleDigits[n % 10] : "");
            if (n < 1000) return singleDigits[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
            if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
            if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
            return n.toString(); // Fallback for very large numbers
        };
        
        try {
            return convert(parseInt(num));
        } catch (e) {
            return num.toString();
        }
    }
});

// Global Action Functions
function printReceipt() {
    window.print();
}

function downloadPDF() {
    const element = document.getElementById('printableArea');
    const receiptNo = document.getElementById('viewReceiptNo').innerText || 'Generated';
    
    const opt = {
        margin: 10,
        filename: `Receipt_${receiptNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}
