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
        const paymentMode = document.getElementById('paymentMode').value;

        // Populate Receipt Preview
        document.getElementById('viewReceiptNo').innerText = receiptNo;
        document.getElementById('viewDate').innerText = formatDate(date);
        document.getElementById('viewStudentName').innerText = studentName;
        document.getElementById('viewCourse').innerText = course;
        document.getElementById('viewAmount').innerText = parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
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
