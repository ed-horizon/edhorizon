import test from 'node:test';
import assert from 'node:assert/strict';

function validateRejectionRequest({ status, rejectionReason }) {
    if (status === 'rejected') {
        const cleanReason = (rejectionReason || '').trim();
        if (!cleanReason || cleanReason.length < 3) {
            return { valid: false, error: "A detailed reason (at least 3 characters) is required when rejecting class verification." };
        }
        return { valid: true, cleanReason };
    }
    return { valid: true };
}

function checkRejectedClassesAccess(role) {
    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(role || '');
    return isAuthorized;
}

function computeTeacherStats(classes) {
    let monthlyClassCount = 0;
    let hours = 0;

    classes.forEach(c => {
        // Exclude rejected classes and student no-show sessions
        const isRejected = c.status === 'rejected' || c.verification_status === 'rejected';
        const isStudentAbsent = c.student_attendance?.[0]?.status === 'absent';

        if (c.status === 'completed' && !isRejected && !isStudentAbsent) {
            monthlyClassCount += 1;
            hours += Number(c.duration_hours || 1);
        }
    });

    return { monthlyClassCount, hours };
}

function filterStudentClasses(classes) {
    return classes.filter(c => c.status !== 'rejected' && c.verification_status !== 'rejected');
}

test('validateRejectionRequest enforces mandatory rejection reason', () => {
    assert.equal(validateRejectionRequest({ status: 'rejected', rejectionReason: '' }).valid, false);
    assert.equal(validateRejectionRequest({ status: 'rejected', rejectionReason: '  ' }).valid, false);
    assert.equal(validateRejectionRequest({ status: 'rejected', rejectionReason: 'ab' }).valid, false);
    assert.equal(validateRejectionRequest({ status: 'rejected', rejectionReason: undefined }).valid, false);

    const valid = validateRejectionRequest({ status: 'rejected', rejectionReason: 'Student absent / no show' });
    assert.equal(valid.valid, true);
    assert.equal(valid.cleanReason, 'Student absent / no show');
});

test('validateRejectionRequest does not require reason for approved status', () => {
    const res = validateRejectionRequest({ status: 'approved', rejectionReason: '' });
    assert.equal(res.valid, true);
});

test('checkRejectedClassesAccess only allows staff roles', () => {
    assert.equal(checkRejectedClassesAccess('admin'), true);
    assert.equal(checkRejectedClassesAccess('super_admin'), true);
    assert.equal(checkRejectedClassesAccess('hr'), true);
    assert.equal(checkRejectedClassesAccess('operations'), true);

    // Tutors and students strictly denied
    assert.equal(checkRejectedClassesAccess('teacher'), false);
    assert.equal(checkRejectedClassesAccess('student'), false);
    assert.equal(checkRejectedClassesAccess('parent'), false);
    assert.equal(checkRejectedClassesAccess(null), false);
});

test('computeTeacherStats strictly excludes rejected classes and student no-show sessions', () => {
    const sampleClasses = [
        // 1. Valid completed class
        { id: '1', status: 'completed', verification_status: 'verified', duration_hours: 1, student_attendance: [{ status: 'present' }] },
        // 2. Another valid completed class (duration 1.5)
        { id: '2', status: 'completed', verification_status: 'pending', duration_hours: 1.5, student_attendance: [{ status: 'present' }] },
        // 3. Rejected class (was completed, but rejected by HR)
        { id: '3', status: 'rejected', verification_status: 'rejected', duration_hours: 1, student_attendance: [{ status: 'present' }] },
        // 4. Completed class with verification_status rejected
        { id: '4', status: 'completed', verification_status: 'rejected', duration_hours: 1, student_attendance: [{ status: 'present' }] },
        // 5. Student absent / no-show session
        { id: '5', status: 'completed', verification_status: 'verified', duration_hours: 1, student_attendance: [{ status: 'absent' }] },
        // 6. Scheduled future class
        { id: '6', status: 'scheduled', verification_status: 'pending', duration_hours: 1, student_attendance: [] },
        // 7. Cancelled class
        { id: '7', status: 'cancelled', verification_status: 'pending', duration_hours: 1, student_attendance: [] }
    ];

    const stats = computeTeacherStats(sampleClasses);
    assert.equal(stats.monthlyClassCount, 2); // only classes 1 & 2
    assert.equal(stats.hours, 2.5); // 1 + 1.5
});

test('filterStudentClasses strictly removes rejected classes from student dashboard', () => {
    const sampleClasses = [
        { id: '1', title: 'Math 101', status: 'completed', verification_status: 'verified' },
        { id: '2', title: 'English 101', status: 'rejected', verification_status: 'rejected' },
        { id: '3', title: 'Science 101', status: 'scheduled', verification_status: 'pending' },
        { id: '4', title: 'History 101', status: 'completed', verification_status: 'rejected' }
    ];

    const filtered = filterStudentClasses(sampleClasses);
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map(c => c.id), ['1', '3']);
});
