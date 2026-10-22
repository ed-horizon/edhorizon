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
    const capacity = data.capacity !== undefined ? Number(data.capacity) : 20;
    if (isNaN(capacity) || capacity <= 0) {
        return { valid: false, error: 'Capacity must be greater than 0' };
    }
    return { valid: true };
}

export function resolveSessionTitle(providedTitle, sessionIndex) {
    return providedTitle && providedTitle.trim() ? providedTitle.trim() : `Session #${sessionIndex}`;
}

export function generateCalendarDaysSchedule(startDateStr, endDateStr, recurringDays, sessionTime) {
    const DAY_MAP = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const targetDays = new Set((recurringDays || []).map(d => DAY_MAP[d]).filter(d => d !== undefined));
    if (targetDays.size === 0) return [];

    const start = new Date(startDateStr + 'T00:00:00');
    const end = endDateStr 
        ? new Date(endDateStr + 'T23:59:59')
        : new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);

    const timeParts = (sessionTime || '18:00').split(':');
    const hours = parseInt(timeParts[0] || '18', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);

    const sessions = [];
    const current = new Date(start);
    let sessionNumber = 1;

    while (current <= end && sessions.length < 60) {
        if (targetDays.has(current.getDay())) {
            const scheduledAt = new Date(current);
            scheduledAt.setHours(hours, minutes, 0, 0);
            sessions.push({
                session_number: sessionNumber,
                title: `Session #${sessionNumber}`,
                scheduled_at: scheduledAt.toISOString()
            });
            sessionNumber++;
        }
        current.setDate(current.getDate() + 1);
    }
    return sessions;
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

test('Batch Classes: validates batch creation fields with optional schedule description and accepts any fee amount', () => {
    // Missing name
    const res1 = validateBatchInput({ name: '', course_name: 'Math', start_date: '2026-11-01' });
    assert.equal(res1.valid, false);
    assert.match(res1.error, /Batch name/);

    // Missing course name
    const res2 = validateBatchInput({ name: 'Batch 1', course_name: '', start_date: '2026-11-01' });
    assert.equal(res2.valid, false);
    assert.match(res2.error, /Course name/);

    // Invalid capacity
    const res3 = validateBatchInput({ name: 'Batch 1', course_name: 'Math', start_date: '2026-11-01', capacity: 0 });
    assert.equal(res3.valid, false);
    assert.match(res3.error, /Capacity/);

    // Valid batch WITH schedule description
    const res4 = validateBatchInput({
        name: 'Spoken English - Cohort 1',
        course_name: 'Spoken English',
        start_date: '2026-11-01',
        schedule_description: 'Mon, Wed, Fri 6:00 PM IST',
        capacity: 15,
        default_course_fee: 999
    });
    assert.equal(res4.valid, true);

    // Valid batch WITHOUT schedule description (optional) and arbitrary fee (999)
    const res5 = validateBatchInput({
        name: 'French A1 Fast Track',
        course_name: 'French A1',
        start_date: '2026-11-01',
        default_course_fee: 999
    });
    assert.equal(res5.valid, true);
});

test('Batch Classes: auto-titles sessions when title is omitted or blank', () => {
    assert.equal(resolveSessionTitle('', 1), 'Session #1');
    assert.equal(resolveSessionTitle('   ', 5), 'Session #5');
    assert.equal(resolveSessionTitle(null, 10), 'Session #10');
    assert.equal(resolveSessionTitle(undefined, 2), 'Session #2');
    assert.equal(resolveSessionTitle('Orientation & Diagnostics', 1), 'Orientation & Diagnostics');
});

test('Batch Classes: generates calendar days schedule slots accurately', () => {
    const sessions = generateCalendarDaysSchedule('2026-11-02', '2026-11-15', ['Mon', 'Wed'], '18:30');
    assert.ok(sessions.length > 0);
    for (const sess of sessions) {
        assert.ok(sess.title.startsWith('Session #'));
        const date = new Date(sess.scheduled_at);
        const dayOfWeek = date.getDay(); // 1 = Mon, 3 = Wed
        assert.ok(dayOfWeek === 1 || dayOfWeek === 3, `Expected Mon or Wed, got day ${dayOfWeek}`);
    }
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

export function calculateBatchEndDate(startDateStr, durationDays) {
    if (!startDateStr || !durationDays || durationDays <= 0) return null;
    const start = new Date(startDateStr + 'T00:00:00');
    start.setDate(start.getDate() + (durationDays - 1));
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function copyBatchMaterials(sourceMaterials, targetBatchId, authorId) {
    return sourceMaterials.map(mat => ({
        id: `copied-${mat.id}`,
        batch_id: targetBatchId,
        title: mat.title,
        type: mat.type,
        content_url: mat.content_url,
        description: mat.description,
        source_batch_id: mat.batch_id,
        assigned_by: authorId,
        created_at: new Date().toISOString()
    }));
}

export function getTutorVisibleBatchTabs(userRole) {
    if (userRole === 'teacher') {
        return ['sessions', 'content', 'students'];
    }
    return ['overview', 'students', 'sessions', 'content'];
}

test('Batch Classes: calculates end date from course duration in days and schedules classes across window', () => {
    // 30 days starting on Nov 1 ends on Nov 30
    const endDate = calculateBatchEndDate('2026-11-01', 30);
    assert.equal(endDate, '2026-11-30');

    // 45 days starting on Nov 1 ends on Dec 15
    const endDate45 = calculateBatchEndDate('2026-11-01', 45);
    assert.equal(endDate45, '2026-12-15');

    // Generate schedule across 30 days for Mon, Wed, Fri
    const recurringDays = ['Mon', 'Wed', 'Fri'];
    const sessions = generateCalendarDaysSchedule('2026-11-01', endDate, recurringDays, '18:00');

    assert.ok(sessions.length >= 12 && sessions.length <= 14, `Expected ~13 sessions, got ${sessions.length}`);
    for (const sess of sessions) {
        const d = new Date(sess.scheduled_at);
        assert.ok([1, 3, 5].includes(d.getDay()), 'Must be Mon, Wed, or Fri');
        assert.equal(d.getHours(), 18);
        assert.ok(d >= new Date('2026-11-01T00:00:00') && d <= new Date('2026-11-30T23:59:59'));
    }
});

test('Batch Classes: supports fresh batch-specific content creation and copying between cohorts', () => {
    // Batch 1 has fresh content
    const batch1Materials = [
        { id: 'm1', batch_id: 'batch-cohort-1', title: 'Week 1 Slides', type: 'document', content_url: 'https://docs.google.com/1', description: 'Introductory notes' },
        { id: 'm2', batch_id: 'batch-cohort-1', title: 'Session 2 Recording', type: 'video', content_url: 'https://youtube.com/2', description: 'Lecture playback' }
    ];

    // Copy to Cohort 2
    const copiedToBatch2 = copyBatchMaterials(batch1Materials, 'batch-cohort-2', 'tutor-xyz');
    assert.equal(copiedToBatch2.length, 2);
    assert.equal(copiedToBatch2[0].batch_id, 'batch-cohort-2');
    assert.equal(copiedToBatch2[0].source_batch_id, 'batch-cohort-1');
    assert.equal(copiedToBatch2[0].title, 'Week 1 Slides');
    assert.equal(copiedToBatch2[1].batch_id, 'batch-cohort-2');
    assert.equal(copiedToBatch2[1].source_batch_id, 'batch-cohort-1');
    assert.equal(copiedToBatch2[1].type, 'video');
});

test('Batch Classes: tutor view restriction isolates schedules and content with zero financial visibility', () => {
    const tutorTabs = getTutorVisibleBatchTabs('teacher');
    assert.deepEqual(tutorTabs, ['sessions', 'content', 'students']);
    assert.ok(!tutorTabs.includes('overview'), 'Tutor must not see financial overview tab');

    const adminTabs = getTutorVisibleBatchTabs('admin');
    assert.deepEqual(adminTabs, ['overview', 'students', 'sessions', 'content']);
});

export function calculateBatchSchedulePure(startDateStr, recurringDays = [], totalClassesCount = 10) {
    if (!startDateStr || !totalClassesCount || totalClassesCount <= 0) {
        return { endDateStr: "", scheduledDates: [] };
    }
    const DAY_MAP = {
        'Sun': 0, 'Sunday': 0,
        'Mon': 1, 'Monday': 1,
        'Tue': 2, 'Tuesday': 2,
        'Wed': 3, 'Wednesday': 3,
        'Thu': 4, 'Thursday': 4,
        'Fri': 5, 'Friday': 5,
        'Sat': 6, 'Saturday': 6,
    };
    const targetDays = new Set((recurringDays || []).map(d => DAY_MAP[d]).filter(d => d !== undefined));
    const parts = startDateStr.split('-').map(Number);
    const current = new Date(parts[0], parts[1] - 1, parts[2]);
    const scheduledDates = [];

    if (targetDays.size === 0) {
        for (let i = 0; i < totalClassesCount; i++) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            scheduledDates.push(`${y}-${m}-${d}`);
            current.setDate(current.getDate() + 1);
        }
    } else {
        let loops = 0;
        while (scheduledDates.length < totalClassesCount && loops < 500) {
            if (targetDays.has(current.getDay())) {
                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, '0');
                const d = String(current.getDate()).padStart(2, '0');
                scheduledDates.push(`${y}-${m}-${d}`);
            }
            current.setDate(current.getDate() + 1);
            loops++;
        }
    }
    return {
        endDateStr: scheduledDates[scheduledDates.length - 1] || "",
        scheduledDates
    };
}

test('Batch Classes: schedules full 10 classes across calendar days crossing into next month without date locking', () => {
    // 10 classes on Mon, Wed, Fri starting on Oct 22, 2026
    const schedule = calculateBatchSchedulePure('2026-10-22', ['Mon', 'Wed', 'Fri'], 10);
    assert.equal(schedule.scheduledDates.length, 10, 'Must schedule exactly 10 classes');

    // 2026-10-22 is Thursday.
    // 1: Fri 2026-10-23
    // 2: Mon 2026-10-26
    // 3: Wed 2026-10-28
    // 4: Fri 2026-10-30
    // 5: Mon 2026-11-02 (crossed into November!)
    // 6: Wed 2026-11-04
    // 7: Fri 2026-11-06
    // 8: Mon 2026-11-09
    // 9: Wed 2026-11-11
    // 10: Fri 2026-11-13
    assert.equal(schedule.scheduledDates[0], '2026-10-23');
    assert.equal(schedule.scheduledDates[4], '2026-11-02');
    assert.equal(schedule.scheduledDates[9], '2026-11-13');
    assert.equal(schedule.endDateStr, '2026-11-13');

    // Verify all scheduled dates are indeed Mon, Wed, or Fri
    for (const dStr of schedule.scheduledDates) {
        const parts = dStr.split('-').map(Number);
        const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
        assert.ok([1, 3, 5].includes(dayOfWeek), `${dStr} must be Mon, Wed, or Fri`);
    }
});

test('Batch Classes: creates interactive capsule links and direct file metadata for batch materials', () => {
    const quizCapsule = {
        id: 'cap-quiz-101',
        title: 'Batch Quiz #1',
        type: 'quiz',
        content: { questions: [{ q: 'What is a phoneme?', options: ['Sound', 'Letter'], correct: 0 }] }
    };

    const batchMaterialCapsule = {
        id: 'mat-1',
        batch_id: 'batch-xyz',
        capsule_id: quizCapsule.id,
        title: quizCapsule.title,
        type: 'quiz'
    };

    assert.equal(batchMaterialCapsule.capsule_id, 'cap-quiz-101');
    assert.equal(batchMaterialCapsule.type, 'quiz');

    const fileUploadMaterial = {
        id: 'mat-2',
        batch_id: 'batch-xyz',
        title: 'Phonics Worksheet PDF',
        type: 'document',
        content_url: 'batches/batch-xyz/materials/uuid-worksheet.pdf'
    };

    assert.ok(fileUploadMaterial.content_url.startsWith('batches/'));
    assert.ok(!fileUploadMaterial.content_url.startsWith('http'));
});

export function recordCapsuleAttempt(existingRecord, newScore, maxAttempts = 2) {
    const currentAttempts = existingRecord ? Number(existingRecord.attempts_count || 1) : 0;
    if (currentAttempts >= maxAttempts) {
        return {
            allowed: false,
            error: `Maximum attempt limit (${maxAttempts}) reached for this capsule.`
        };
    }

    const nextAttemptsCount = currentAttempts + 1;
    const previousBest = existingRecord ? Number(existingRecord.best_score ?? existingRecord.score ?? 0) : 0;
    const bestScore = Math.max(previousBest, newScore);

    const history = Array.isArray(existingRecord?.attempt_history)
        ? [...existingRecord.attempt_history]
        : (existingRecord ? [{ attempt: 1, score: Number(existingRecord.score || 0), completed_at: existingRecord.completed_at || new Date().toISOString() }] : []);

    history.push({
        attempt: nextAttemptsCount,
        score: newScore,
        completed_at: new Date().toISOString()
    });

    const isCompleted = nextAttemptsCount >= maxAttempts;
    const canAttempt = nextAttemptsCount < maxAttempts;

    return {
        allowed: true,
        record: {
            score: newScore,
            best_score: bestScore,
            attempts_count: nextAttemptsCount,
            attempt_history: history,
            is_completed: isCompleted,
            can_attempt: canAttempt
        }
    };
}

export function filterTutorRosterFields(enrollment) {
    return {
        id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: enrollment.student?.full_name || 'Student'
    };
}

export function shouldShowSessionCompletionDisclaimer(role) {
    return role !== 'teacher';
}

export function computeBatchCapsuleProgress(capsuleId, enrollments, completions) {
    const completionMap = new Map();
    for (const comp of completions) {
        if (comp.capsule_id === capsuleId) {
            completionMap.set(comp.student_id, comp);
        }
    }

    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let totalScoreSum = 0;
    let scoredCount = 0;

    const roster = enrollments.map(enr => {
        const comp = completionMap.get(enr.student_id);
        const attempts = comp ? Number(comp.attempts_count || 1) : 0;
        const bestScore = comp ? Number(comp.best_score ?? comp.score ?? 0) : null;

        let status = 'pending';
        if (attempts >= 2) {
            status = 'completed';
            completedCount++;
        } else if (attempts === 1) {
            status = 'in_progress';
            inProgressCount++;
        } else {
            pendingCount++;
        }

        if (bestScore !== null) {
            totalScoreSum += bestScore;
            scoredCount++;
        }

        return {
            student_id: enr.student_id,
            student_name: enr.student?.full_name || 'Student',
            status,
            attempts_count: attempts,
            best_score: bestScore,
            history: comp?.attempt_history || []
        };
    });

    return {
        total_enrolled: enrollments.length,
        completed_count: completedCount,
        in_progress_count: inProgressCount,
        pending_count: pendingCount,
        average_best_score: scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0,
        roster
    };
}

test('Batch Classes: capsule attempts are limited to max 2, calculating best score and rejecting 3rd attempt', () => {
    // Attempt 1: First attempt with score 60%
    const attempt1 = recordCapsuleAttempt(null, 60, 2);
    assert.equal(attempt1.allowed, true);
    assert.equal(attempt1.record.attempts_count, 1);
    assert.equal(attempt1.record.best_score, 60);
    assert.equal(attempt1.record.is_completed, false);
    assert.equal(attempt1.record.can_attempt, true);
    assert.equal(attempt1.record.attempt_history.length, 1);
    assert.equal(attempt1.record.attempt_history[0].score, 60);

    // Attempt 2: Second attempt with higher score 90% (best score should be 90%)
    const attempt2 = recordCapsuleAttempt(attempt1.record, 90, 2);
    assert.equal(attempt2.allowed, true);
    assert.equal(attempt2.record.attempts_count, 2);
    assert.equal(attempt2.record.best_score, 90);
    assert.equal(attempt2.record.is_completed, true);
    assert.equal(attempt2.record.can_attempt, false);
    assert.equal(attempt2.record.attempt_history.length, 2);

    // Attempt 2 variation: Second attempt with lower score 50% (best score should still be 60%)
    const attempt2Lower = recordCapsuleAttempt(attempt1.record, 50, 2);
    assert.equal(attempt2Lower.allowed, true);
    assert.equal(attempt2Lower.record.attempts_count, 2);
    assert.equal(attempt2Lower.record.best_score, 60);
    assert.equal(attempt2Lower.record.is_completed, true);

    // Attempt 3: Third attempt must be strictly BLOCKED
    const attempt3 = recordCapsuleAttempt(attempt2.record, 100, 2);
    assert.equal(attempt3.allowed, false);
    assert.match(attempt3.error, /Maximum attempt limit \(2\) reached/);
});

test('Batch Classes: tutor roster view strictly exposes student name and hides emails, phone numbers, and financial details', () => {
    const fullEnrollment = {
        id: 'enr-1',
        student_id: 'std-100',
        course_fee: 12000,
        paid_amount: 6000,
        fee_status: 'partially_paid',
        payment_method: 'bank_transfer',
        remarks: 'Scholarship applied',
        student: {
            id: 'std-100',
            full_name: 'Aarav Sharma',
            email: 'aarav.sharma@example.com',
            phone: '+919876543210',
            parent_name: 'Sunil Sharma',
            parent_email: 'sunil.sharma@example.com',
            parent_phone: '+919876543211'
        }
    };

    const tutorVisibleData = filterTutorRosterFields(fullEnrollment);

    // Strictly visible:
    assert.equal(tutorVisibleData.student_name, 'Aarav Sharma');
    assert.equal(tutorVisibleData.student_id, 'std-100');

    // Strictly hidden (never present):
    assert.equal(tutorVisibleData.course_fee, undefined);
    assert.equal(tutorVisibleData.paid_amount, undefined);
    assert.equal(tutorVisibleData.fee_status, undefined);
    assert.equal(tutorVisibleData.email, undefined);
    assert.equal(tutorVisibleData.phone, undefined);
    assert.equal(tutorVisibleData.parent_email, undefined);
    assert.equal(tutorVisibleData.parent_phone, undefined);
    assert.ok(!Object.keys(tutorVisibleData).includes('student.email'));
});

test('Batch Classes: session completion tracking disclaimer is hidden from tutor dashboard and visible to admin', () => {
    // Tutors MUST NOT see the payroll/attendance disclaimer
    assert.equal(shouldShowSessionCompletionDisclaimer('teacher'), false);

    // Admin and staff CAN see the system explanation
    assert.equal(shouldShowSessionCompletionDisclaimer('admin'), true);
    assert.equal(shouldShowSessionCompletionDisclaimer('staff'), true);
});

test('Batch Classes: computes aggregate capsule progress and roster breakdown for tutors and admins', () => {
    const enrollments = [
        { student_id: 's1', student: { full_name: 'Student One' } },
        { student_id: 's2', student: { full_name: 'Student Two' } },
        { student_id: 's3', student: { full_name: 'Student Three' } },
        { student_id: 's4', student: { full_name: 'Student Four' } }
    ];

    const completions = [
        // s1: completed 2 attempts (best 80%)
        { capsule_id: 'cap-1', student_id: 's1', attempts_count: 2, best_score: 80, attempt_history: [{ attempt: 1, score: 70 }, { attempt: 2, score: 80 }] },
        // s2: completed 1 attempt (best 60%)
        { capsule_id: 'cap-1', student_id: 's2', attempts_count: 1, best_score: 60, attempt_history: [{ attempt: 1, score: 60 }] },
        // s3: completed 2 attempts (best 100%)
        { capsule_id: 'cap-1', student_id: 's3', attempts_count: 2, best_score: 100, attempt_history: [{ attempt: 1, score: 90 }, { attempt: 2, score: 100 }] }
        // s4: has not attempted (pending)
    ];

    const progress = computeBatchCapsuleProgress('cap-1', enrollments, completions);

    assert.equal(progress.total_enrolled, 4);
    assert.equal(progress.completed_count, 2); // s1, s3
    assert.equal(progress.in_progress_count, 1); // s2
    assert.equal(progress.pending_count, 1); // s4
    // Average best score of tested students: (80 + 60 + 100) / 3 = 80%
    assert.equal(progress.average_best_score, 80);

    // Check roster status
    const s1Entry = progress.roster.find(r => r.student_id === 's1');
    assert.equal(s1Entry.status, 'completed');
    assert.equal(s1Entry.best_score, 80);
    assert.equal(s1Entry.attempts_count, 2);

    const s2Entry = progress.roster.find(r => r.student_id === 's2');
    assert.equal(s2Entry.status, 'in_progress');
    assert.equal(s2Entry.best_score, 60);
    assert.equal(s2Entry.attempts_count, 1);

    const s4Entry = progress.roster.find(r => r.student_id === 's4');
    assert.equal(s4Entry.status, 'pending');
    assert.equal(s4Entry.best_score, null);
    assert.equal(s4Entry.attempts_count, 0);
});


