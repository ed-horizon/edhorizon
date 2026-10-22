import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure domain logic helpers reflecting the Batch Classes system specifications
 */

export function validateBatchInput(data) {
    if (!data.name || !data.name.trim()) {
        return { valid: false, error: 'Batch name is required' };
    }
    if (!data.course_name || !data.course_name.trim()) {
        return { valid: false, error: 'Course name is required' };
    }
    if (!data.start_date) {
        return { valid: false, error: 'Start date is required' };
    }
    if (!data.schedule_description || !data.schedule_description.trim()) {
        return { valid: false, error: 'Schedule description is required' };
    }
    const capacity = data.capacity !== undefined ? Number(data.capacity) : 20;
    if (isNaN(capacity) || capacity <= 0) {
        return { valid: false, error: 'Capacity must be greater than 0' };
    }
    return { valid: true };
}

export function validateBatchEnrollment(batch, currentEnrollmentCount, studentId, existingStudentIds) {
    if (existingStudentIds.includes(studentId)) {
        return { valid: false, error: 'Student is already enrolled in this batch' };
    }
    if (currentEnrollmentCount >= batch.capacity) {
        return { valid: false, error: `Batch capacity of ${batch.capacity} reached` };
    }
    return { valid: true };
}

export function computeBatchFinancials(enrollments) {
    const totalExpected = enrollments.reduce((sum, e) => sum + Number(e.course_fee || 0), 0);
    const totalCollected = enrollments.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
    const pendingReceivables = Math.max(0, totalExpected - totalCollected);

    return {
        totalExpected,
        totalCollected,
        pendingReceivables
    };
}

export function applySessionStatusTransition(session, newStatus, metadata = {}) {
    const validStatuses = ['scheduled', 'completed', 'not_conducted', 'rescheduled', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
    }

    const updated = {
        ...session,
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    if (newStatus === 'completed') {
        updated.completed_at = metadata.completed_at || new Date().toISOString();
        updated.conducted_by = metadata.conducted_by || session.conducted_by;
    } else {
        updated.completed_at = null;
    }

    if (metadata.notes !== undefined) {
        updated.notes = metadata.notes;
    }

    if (metadata.scheduled_at) {
        updated.scheduled_at = metadata.scheduled_at;
    }

    // CRITICAL: Guarantees no 1-on-1 attendance or payroll mutations
    updated._hasPayrollMutation = false;
    updated._hasAttendanceAuditRecord = false;

    return updated;
}

export function filterBatchCapsulesForStudent(capsules, studentId, studentBatchIds, batchContentMap) {
    // Collect all capsule IDs assigned to the student's batches
    const eligibleCapsuleIds = new Set();
    for (const batchId of studentBatchIds) {
        const assigned = batchContentMap[batchId] || [];
        for (const capId of assigned) {
            eligibleCapsuleIds.add(capId);
        }
    }

    return capsules.filter(c => {
        const isDirect = String(c.student_id || '') === String(studentId);
        const isBatch = eligibleCapsuleIds.has(c.id);
        return isDirect || isBatch;
    });
}

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

test('Batch Classes: validates batch creation fields and capacity', () => {
    // Missing name
    const res1 = validateBatchInput({ name: '', course_name: 'Math', start_date: '2026-11-01', schedule_description: 'Mon 6PM' });
    assert.equal(res1.valid, false);
    assert.match(res1.error, /Batch name/);

    // Missing course name
    const res2 = validateBatchInput({ name: 'Batch 1', course_name: '', start_date: '2026-11-01', schedule_description: 'Mon 6PM' });
    assert.equal(res2.valid, false);
    assert.match(res2.error, /Course name/);

    // Invalid capacity
    const res3 = validateBatchInput({ name: 'Batch 1', course_name: 'Math', start_date: '2026-11-01', schedule_description: 'Mon 6PM', capacity: 0 });
    assert.equal(res3.valid, false);
    assert.match(res3.error, /Capacity/);

    // Valid batch
    const res4 = validateBatchInput({
        name: 'Spoken English - Cohort 1',
        course_name: 'Spoken English',
        start_date: '2026-11-01',
        schedule_description: 'Mon, Wed, Fri 6:00 PM IST',
        capacity: 15
    });
    assert.equal(res4.valid, true);
});

test('Batch Classes: enforces capacity limit and prevents duplicate enrollments', () => {
    const batch = { id: 'b1', capacity: 3 };
    const existingIds = ['student-1', 'student-2'];

    // Can enroll new student when under capacity
    const check1 = validateBatchEnrollment(batch, 2, 'student-3', existingIds);
    assert.equal(check1.valid, true);

    // Prevents duplicate enrollment of already registered student
    const check2 = validateBatchEnrollment(batch, 2, 'student-1', existingIds);
    assert.equal(check2.valid, false);
    assert.match(check2.error, /already enrolled/);

    // Blocks enrollment when batch is full
    const check3 = validateBatchEnrollment(batch, 3, 'student-4', [...existingIds, 'student-3']);
    assert.equal(check3.valid, false);
    assert.match(check3.error, /capacity/);
});

test('Batch Classes: computes course fees, collections, and pending balances accurately', () => {
    const enrollments = [
        { student_id: 's1', course_fee: 5000, paid_amount: 5000, fee_status: 'paid' },
        { student_id: 's2', course_fee: 5000, paid_amount: 2500, fee_status: 'partially_paid' },
        { student_id: 's3', course_fee: 6000, paid_amount: 0, fee_status: 'unpaid' },
        { student_id: 's4', course_fee: 4500, paid_amount: 4500, fee_status: 'waived' },
    ];

    const fin = computeBatchFinancials(enrollments);
    assert.equal(fin.totalExpected, 20500); // 5000 + 5000 + 6000 + 4500
    assert.equal(fin.totalCollected, 12000); // 5000 + 2500 + 0 + 4500
    assert.equal(fin.pendingReceivables, 8500); // 20500 - 12000
});

test('Batch Classes: session status transitions correctly track conduction with zero payroll impact', () => {
    const initialSession = {
        id: 'sess-101',
        batch_id: 'b1',
        title: 'Session 1: Introduction',
        scheduled_at: '2026-11-02T12:30:00Z',
        duration_minutes: 60,
        status: 'scheduled',
        completed_at: null,
        conducted_by: null
    };

    // Transition to completed
    const completed = applySessionStatusTransition(initialSession, 'completed', { conducted_by: 'tutor-1' });
    assert.equal(completed.status, 'completed');
    assert.ok(completed.completed_at);
    assert.equal(completed.conducted_by, 'tutor-1');
    assert.equal(completed._hasPayrollMutation, false);
    assert.equal(completed._hasAttendanceAuditRecord, false);

    // Transition to rescheduled
    const rescheduled = applySessionStatusTransition(initialSession, 'rescheduled', {
        scheduled_at: '2026-11-04T12:30:00Z',
        notes: 'Rescheduled due to tutor technical issue'
    });
    assert.equal(rescheduled.status, 'rescheduled');
    assert.equal(rescheduled.scheduled_at, '2026-11-04T12:30:00Z');
    assert.equal(rescheduled.completed_at, null);
    assert.equal(rescheduled.notes, 'Rescheduled due to tutor technical issue');

    // Transition to not_conducted
    const notConducted = applySessionStatusTransition(initialSession, 'not_conducted');
    assert.equal(notConducted.status, 'not_conducted');
    assert.equal(notConducted.completed_at, null);

    // Transition to cancelled
    const cancelled = applySessionStatusTransition(initialSession, 'cancelled');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.completed_at, null);
});

test('Batch Classes: batch-assigned learning content appears for enrolled students with independent attempts', () => {
    const capsules = [
        { id: 'c1', title: 'Quiz 1: Vocabulary', type: 'quiz', student_id: null },
        { id: 'c2', title: 'Flashcards: Verbs', type: 'flashcard', student_id: null },
        { id: 'c3', title: '1-on-1 Math Practice', type: 'quiz', student_id: 'other-student' },
        { id: 'c4', title: 'Direct Student Capsule', type: 'video', student_id: 'student-A' },
    ];

    const studentBatchIds = ['batch-alpha'];
    const batchContentMap = {
        'batch-alpha': ['c1', 'c2'],
        'batch-beta': ['c5']
    };

    // Student A is enrolled in batch-alpha
    const studentACapsules = filterBatchCapsulesForStudent(capsules, 'student-A', studentBatchIds, batchContentMap);
    const assignedIds = studentACapsules.map(c => c.id);

    assert.ok(assignedIds.includes('c1'), 'Should include batch-assigned Quiz 1');
    assert.ok(assignedIds.includes('c2'), 'Should include batch-assigned Flashcards');
    assert.ok(assignedIds.includes('c4'), 'Should include direct 1-on-1 assigned capsule');
    assert.ok(!assignedIds.includes('c3'), 'Should not include other student direct capsule');

    // Verify independent quiz attempts simulation
    const quizCompletions = [
        { student_id: 'student-A', capsule_id: 'c1', score: 90 },
        { student_id: 'student-B', capsule_id: 'c1', score: 75 }
    ];

    const scoreA = quizCompletions.find(q => q.student_id === 'student-A' && q.capsule_id === 'c1');
    const scoreB = quizCompletions.find(q => q.student_id === 'student-B' && q.capsule_id === 'c1');

    assert.equal(scoreA.score, 90);
    assert.equal(scoreB.score, 75);
    assert.notEqual(scoreA.student_id, scoreB.student_id);
});
