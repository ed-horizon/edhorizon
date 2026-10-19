import test from 'node:test';
import assert from 'node:assert/strict';

// Helper: Calculate monthly report financial totals
function computeFinancialTotals({ revenueCollected, totalSalaries, manualExpenses, legacyOverhead = 0 }) {
    const manualExpensesTotal = (manualExpenses || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const otherExpensesTotal = manualExpensesTotal + Number(legacyOverhead || 0);
    const totalExpenses = Number(totalSalaries || 0) + otherExpensesTotal;
    const netProfit = Number(revenueCollected || 0) - totalExpenses;

    return {
        otherExpensesTotal,
        totalExpenses,
        netProfit
    };
}

// Helper: Compute pending payments (explicit submissions + unpaid student fee dues)
function computePendingReceivables({ pendingSubmissions, activeStudents, paidStudentIds, endOfMonthDate }) {
    const pendingList = (pendingSubmissions || []).map(p => ({
        ...p,
        is_payment_submission: true,
        type: 'Pending Offline Confirm'
    }));

    let pendingDuesTotal = 0;

    (activeStudents || []).forEach(s => {
        if (paidStudentIds.has(s.id)) return;
        if (pendingList.some(p => p.student_id === s.id)) return;

        if (s.enrollment_date && new Date(s.enrollment_date) > endOfMonthDate) return;

        const totalStudentMonthlyFee = (Number(s.monthly_fee) || 0) +
                                       (Number(s.monthly_fee_2) || 0) +
                                       (Number(s.monthly_fee_3) || 0) +
                                       (Number(s.monthly_fee_4) || 0) +
                                       (Number(s.monthly_fee_5) || 0);

        if (totalStudentMonthlyFee > 0) {
            pendingDuesTotal += totalStudentMonthlyFee;
            pendingList.push({
                id: `due-${s.id}`,
                student_id: s.id,
                amount: totalStudentMonthlyFee,
                type: 'Fee Due / Unpaid',
                is_payment_submission: false
            });
        }
    });

    const pendingSubmissionsTotal = (pendingSubmissions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalPending = pendingSubmissionsTotal + pendingDuesTotal;

    return {
        totalPending,
        pendingList
    };
}

// Helper: Validate manual expense payload
function validateExpensePayload(payload) {
    if (!payload.title || !payload.title.trim()) {
        return { valid: false, error: "Expense title is required." };
    }
    const amount = Number(payload.amount);
    if (isNaN(amount) || amount <= 0) {
        return { valid: false, error: "A valid positive expense amount is required." };
    }
    if (!payload.month || payload.month < 1 || payload.month > 12) {
        return { valid: false, error: "Invalid month." };
    }
    if (!payload.year || payload.year < 2000) {
        return { valid: false, error: "Invalid year." };
    }
    return { valid: true, cleanTitle: payload.title.trim(), amount };
}

test('computeFinancialTotals accurately calculates total expenses and net profit with manual expenses', () => {
    const res = computeFinancialTotals({
        revenueCollected: 100000,
        totalSalaries: 40000,
        manualExpenses: [
            { id: '1', title: 'Zoom Subscription', amount: 5000 },
            { id: '2', title: 'Office Rent', amount: 15000 },
            { id: '3', title: 'Google Workspace', amount: 2500 }
        ]
    });

    assert.equal(res.otherExpensesTotal, 22500);
    assert.equal(res.totalExpenses, 62500);
    assert.equal(res.netProfit, 37500);
});

test('computeFinancialTotals handles negative net profit when expenses exceed revenue', () => {
    const res = computeFinancialTotals({
        revenueCollected: 20000,
        totalSalaries: 30000,
        manualExpenses: [
            { id: '1', title: 'Server Hosting', amount: 10000 }
        ]
    });

    assert.equal(res.otherExpensesTotal, 10000);
    assert.equal(res.totalExpenses, 40000);
    assert.equal(res.netProfit, -20000);
});

test('computePendingReceivables includes both explicit pending submissions and unpaid student dues', () => {
    const paidStudentIds = new Set(['student-1']);
    const endOfMonth = new Date(Date.UTC(2026, 10, 1));

    const pendingSubmissions = [
        { id: 'pay-1', student_id: 'student-2', amount: 3000 }
    ];

    const activeStudents = [
        { id: 'student-1', monthly_fee: 4500, enrollment_date: '2026-06-01' }, // Already paid
        { id: 'student-2', monthly_fee: 3000, enrollment_date: '2026-06-01' }, // Has pending submission
        { id: 'student-3', monthly_fee: 2000, monthly_fee_2: 1500, enrollment_date: '2026-06-01' }, // Unpaid due = 3500
        { id: 'student-4', monthly_fee: 5000, enrollment_date: '2026-11-15' }  // Enrolled in future, skip
    ];

    const res = computePendingReceivables({
        pendingSubmissions,
        activeStudents,
        paidStudentIds,
        endOfMonthDate: endOfMonth
    });

    assert.equal(res.totalPending, 6500); // 3000 + 3500
    assert.equal(res.pendingList.length, 2);

    const submission = res.pendingList.find(p => p.student_id === 'student-2');
    assert.equal(submission.type, 'Pending Offline Confirm');
    assert.equal(submission.is_payment_submission, true);

    const due = res.pendingList.find(p => p.student_id === 'student-3');
    assert.equal(due.type, 'Fee Due / Unpaid');
    assert.equal(due.amount, 3500);
    assert.equal(due.is_payment_submission, false);
});

test('validateExpensePayload requires positive amount and non-empty title', () => {
    assert.equal(validateExpensePayload({ title: '', amount: 100, month: 10, year: 2026 }).valid, false);
    assert.equal(validateExpensePayload({ title: '   ', amount: 100, month: 10, year: 2026 }).valid, false);
    assert.equal(validateExpensePayload({ title: 'Rent', amount: 0, month: 10, year: 2026 }).valid, false);
    assert.equal(validateExpensePayload({ title: 'Rent', amount: -50, month: 10, year: 2026 }).valid, false);
    assert.equal(validateExpensePayload({ title: 'Rent', amount: 'abc', month: 10, year: 2026 }).valid, false);

    const valid = validateExpensePayload({ title: '  Office Rent  ', amount: 15000, month: 10, year: 2026 });
    assert.equal(valid.valid, true);
    assert.equal(valid.cleanTitle, 'Office Rent');
    assert.equal(valid.amount, 15000);
});
