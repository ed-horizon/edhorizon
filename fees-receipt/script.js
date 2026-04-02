document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State & Elements
    const logoUpload = document.getElementById('logoUpload');
    const displayLogo = document.getElementById('displayLogo');
    const receiptForm = document.getElementById('receiptForm');
    const receiptNumberInput = document.getElementById('receiptNumber');
    const receiptDateInput = document.getElementById('receiptDate');
    const clearBtn = document.getElementById('clearBtn');
    
    const receiptOuter = document.querySelector('.receipt-outer-container');
    const postActions = document.getElementById('postActions');

    // Default Date
    const today = new Date().toISOString().split('T')[0];
    receiptDateInput.value = today;

    // 2. Receipt Number handling
    // (Starting from 300 only as a placeholder suggestion)
    let lastReceiptNum = localStorage.getItem('lastReceiptNum') || 299;
    receiptNumberInput.value = `EDH${parseInt(lastReceiptNum) + 1}`;

    // 3. Form Submission Handler
    receiptForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Values
        const name = document.getElementById('studentName').value;
        const course = document.getElementById('courseName').value;
        const amount = document.getElementById('feesAmount').value;
        const mode = document.getElementById('paymentMode').value;
        const date = document.getElementById('receiptDate').value;
        const receiptNo = receiptNumberInput.value;

        // Populate Receipt Preview
        document.getElementById('resReceiptNo').innerText = receiptNo;
        document.getElementById('resDate').innerText = formatDate(date);
        document.getElementById('resStudentName').innerText = name;
        document.getElementById('resAmountWords').innerText = numberToWords(amount) + " Rupees Only";
        document.getElementById('resCourseName').innerText = course;
        document.getElementById('resAmount').innerText = "₹ " + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        document.getElementById('resMode').innerText = mode;

        // Show UI Elements
        receiptOuter.style.display = 'block';
        postActions.style.display = 'block';

        // NOTE: Auto-increment removed as per user request to allow manual entry.

        // Clear Form (Optional, but requested)
        receiptForm.reset();
        receiptDateInput.value = today;
        
        // Mantain the manual input or clear it? 
        // User said manual. Resetting the form will clear it.
        
        // Scroll to Receipt
        receiptOuter.scrollIntoView({ behavior: 'smooth' });
    });

    // 6. Clear Form Handler
    clearBtn.addEventListener('click', () => {
        receiptForm.reset();
        receiptDateInput.value = today;
        receiptOuter.style.display = 'none';
        postActions.style.display = 'none';
    });

    // Helper Functions
    function updateReceiptNumberDisplay(num) {
        const paddedNum = num.toString().padStart(3, '0');
        receiptNumberInput.value = `EDH${paddedNum}`;
    }

    function incrementReceiptSequence() {
        let currentNum = parseInt(localStorage.getItem('lastReceiptNum') || 0);
        let nextNum = currentNum + 1;
        localStorage.setItem('lastReceiptNum', nextNum);
        updateReceiptNumberDisplay(nextNum + 1);
    }

    function formatDate(dateStr) {
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
    const element = document.getElementById('receiptBox');
    const receiptNo = document.getElementById('resReceiptNo').innerText;
    
    const opt = {
        margin: 10,
        filename: `Receipt_${receiptNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Show loading or something if needed
    html2pdf().set(opt).from(element).save();
}
