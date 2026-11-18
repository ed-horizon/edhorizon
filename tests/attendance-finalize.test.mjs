import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulating verification status preservation
function resolveTargetVerificationStatus(currentVerificationStatus) {
    if (currentVerificationStatus === 'verified' || currentVerificationStatus === 'rejected') {
        return currentVerificationStatus;
    }
    return 'pending';
}

// Helper simulating 24-hour lock check for teacher attendance
function checkAttendanceTimeLock(scheduledAtStr, role, currentTime = Date.now()) {
    if (role !== 'teacher') return { locked: false };
    if (!scheduledAtStr) return { locked: false };

    const scheduledTime = new Date(scheduledAtStr).getTime();
    const elapsed = currentTime - scheduledTime;
    const isLocked = elapsed > 24 * 60 * 60 * 1000;

    return {
        locked: isLocked,
        error: isLocked
            ? "This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session. Please contact HR or Operations to log this session."
            : null
    };
}

// Helper simulating server action skew error detection
function isServerActionSkewError(rawMessage) {
    const msg = String(rawMessage || "");
    return (
        msg.includes("was not found on the server") ||
        msg.includes("failed-to-find-server-action") ||
        msg.includes("Failed to find Server Action")
    );
}

test('Attendance Finalize: verification status strictly preserves verified or rejected state', () => {
    assert.equal(resolveTargetVerificationStatus('verified'), 'verified');
    assert.equal(resolveTargetVerificationStatus('rejected'), 'rejected');
    assert.equal(resolveTargetVerificationStatus('pending'), 'pending');
    assert.equal(resolveTargetVerificationStatus(null), 'pending');
    assert.equal(resolveTargetVerificationStatus(undefined), 'pending');
});

test('Attendance Finalize: 24h lock allows submission within 24h of scheduled class', () => {
    const now = Date.now();
    const scheduledOneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
    const res = checkAttendanceTimeLock(scheduledOneHourAgo, 'teacher', now);
    assert.equal(res.locked, false);
    assert.equal(res.error, null);
});

test('Attendance Finalize: 24h lock rejects submissions older than 24h for teachers', () => {
    const now = Date.now();
    const scheduledTwoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const res = checkAttendanceTimeLock(scheduledTwoDaysAgo, 'teacher', now);
    assert.equal(res.locked, true);
    assert.match(res.error, /locked because it was scheduled more than 24 hours ago/);
});

test('Attendance Finalize: non-teacher roles (admin, super_admin) bypass 24h lock', () => {
    const now = Date.now();
    const scheduledTwoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const resAdmin = checkAttendanceTimeLock(scheduledTwoDaysAgo, 'admin', now);
    assert.equal(resAdmin.locked, false);
});

test('Attendance Finalize: detects Next.js build-hash skew error strings correctly', () => {
    const error1 = 'Server Action "7ef40b934c6044eb26bfaed52d1a60b27dd3b67a8b" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action';
    assert.equal(isServerActionSkewError(error1), true);

    const error2 = 'Failed to find Server Action "abcdef123"';
    assert.equal(isServerActionSkewError(error2), true);

    const normalError = 'Unauthorized. Please log in again.';
    assert.equal(isServerActionSkewError(normalError), false);
});
