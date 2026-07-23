import assert from 'node:assert/strict';
import test from 'node:test';

import { canManageSchedule } from '../lib/schedule-authorization.ts';

test('teachers can manage only their own schedules', () => {
    const teacher = { id: 'teacher-a', role: 'teacher', isManager: false };

    assert.equal(canManageSchedule(teacher, 'teacher-a'), true);
    assert.equal(canManageSchedule(teacher, 'teacher-b'), false);
});

test('schedule managers can manage another tutor schedule', () => {
    const operations = { id: 'staff-a', role: 'operations', isManager: true };

    assert.equal(canManageSchedule(operations, 'teacher-b'), true);
});

test('ordinary authenticated users cannot manage schedules', () => {
    const student = { id: 'student-a', role: 'student', isManager: false };

    assert.equal(canManageSchedule(student, 'teacher-a'), false);
    assert.equal(canManageSchedule(null, 'teacher-a'), false);
});
