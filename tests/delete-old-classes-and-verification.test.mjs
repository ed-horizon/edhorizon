import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulating Postgres RPC payroll recalculation on class deletion
function calculateNextBasicOnDeletion(currentBasic, classPayrollAmount) {
    const basic = Number(currentBasic || 0);
    const deduction = Number(classPayrollAmount || 0);
    return Math.max(0, basic - deduction);
}

// Helper simulating generated column net_amount = basic_amount + bonus_amount - deductions_amount
function calculateNetAmount(basic, bonus = 0, deductions = 0) {
    return Number(basic) + Number(bonus) - Number(deductions);
}

// Helper simulating preservation logic in completeLiveClass and finalizeClassSession
function resolveClassVerificationStatus(existingVerificationStatus) {
    if (existingVerificationStatus === 'verified' || existingVerificationStatus === 'rejected') {
        return existingVerificationStatus;
    }
    return 'pending';
}

// Helper simulating getPendingClassVerifications defensive filter
function filterPendingClasses(classes) {
    return classes.filter(c => 
        c.status === 'completed' &&
        c.verification_status !== 'verified' &&
        c.verification_status !== 'rejected' &&
        c.status !== 'rejected'
    );
}

test('calculateNextBasicOnDeletion correctly deducts class pay from payroll item', () => {
    assert.equal(calculateNextBasicOnDeletion(3000, 500), 2500);
    assert.equal(calculateNextBasicOnDeletion(4415, 450), 3965);
    assert.equal(calculateNextBasicOnDeletion(500, 500), 0);
});

test('calculateNextBasicOnDeletion floors at 0 to prevent negative basic pay', () => {
    assert.equal(calculateNextBasicOnDeletion(400, 1000), 0);
    assert.equal(calculateNextBasicOnDeletion(0, 500), 0);
});

test('calculateNetAmount automatically updates with deducted basic amount', () => {
    const initialBasic = 3000;
    const bonus = 200;
    const deductions = 100;
    const initialNet = calculateNetAmount(initialBasic, bonus, deductions);
    assert.equal(initialNet, 3100);

    const updatedBasic = calculateNextBasicOnDeletion(initialBasic, 500);
    const updatedNet = calculateNetAmount(updatedBasic, bonus, deductions);
    assert.equal(updatedNet, 2600);
});

test('resolveClassVerificationStatus strictly preserves verified status', () => {
    // If a class was already verified, subsequent logs or completions must not downgrade it to pending
    assert.equal(resolveClassVerificationStatus('verified'), 'verified');
    assert.equal(resolveClassVerificationStatus('rejected'), 'rejected');

    // If new or unverified, mark pending
    assert.equal(resolveClassVerificationStatus('pending'), 'pending');
    assert.equal(resolveClassVerificationStatus(null), 'pending');
    assert.equal(resolveClassVerificationStatus(undefined), 'pending');
});

test('filterPendingClasses excludes verified, rejected, or non-completed classes', () => {
    const rawClasses = [
        { id: '1', title: 'Session 1', status: 'completed', verification_status: 'pending' },
        { id: '2', title: 'Session 2', status: 'completed', verification_status: 'verified' },
        { id: '3', title: 'Session 3', status: 'completed', verification_status: 'rejected' },
        { id: '4', title: 'Session 4', status: 'scheduled', verification_status: 'pending' },
        { id: '5', title: 'Session 5', status: 'rejected', verification_status: 'rejected' },
        { id: '6', title: 'Session 6', status: 'completed', verification_status: 'pending' }
    ];

    const pending = filterPendingClasses(rawClasses);
    assert.equal(pending.length, 2);
    assert.deepEqual(pending.map(c => c.id), ['1', '6']);
});
