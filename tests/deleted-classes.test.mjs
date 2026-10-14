import test from 'node:test';
import assert from 'node:assert/strict';

function validateDeletionRequest({ action, deletionReason, role }) {
    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(role);
    if (!isAuthorized) {
        return { valid: false, error: "Unauthorized: Only admins, HR, and Operations can perform this action." };
    }

    if (action === 'delete') {
        const cleanReason = (deletionReason || '').trim();
        if (!cleanReason) {
            return { valid: false, error: "A reason for deleting the class session is mandatory." };
        }
        return { valid: true, cleanReason };
    }

    return { valid: true };
}

test('validateDeletionRequest blocks unauthorized roles from deleting classes', () => {
    assert.equal(validateDeletionRequest({ action: 'delete', deletionReason: 'Error', role: 'teacher' }).valid, false);
    assert.equal(validateDeletionRequest({ action: 'delete', deletionReason: 'Error', role: 'student' }).valid, false);
    assert.equal(validateDeletionRequest({ action: 'delete', deletionReason: 'Error', role: 'sales' }).valid, false);
});

test('validateDeletionRequest allows authorized managers with valid reason', () => {
    for (const role of ['admin', 'super_admin', 'hr', 'operations']) {
        const res = validateDeletionRequest({ action: 'delete', deletionReason: 'Duplicate class session', role });
        assert.equal(res.valid, true);
        assert.equal(res.cleanReason, 'Duplicate class session');
    }
});

test('validateDeletionRequest rejects empty or whitespace-only deletion reason', () => {
    assert.equal(validateDeletionRequest({ action: 'delete', deletionReason: '', role: 'admin' }).valid, false);
    assert.equal(validateDeletionRequest({ action: 'delete', deletionReason: '   ', role: 'operations' }).valid, false);
    assert.equal(validateDeletionRequest({ action: 'delete', deletionReason: undefined, role: 'hr' }).valid, false);
});
