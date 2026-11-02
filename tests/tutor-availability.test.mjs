import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TUTOR_AVAILABILITY_DAYS,
    TUTOR_AVAILABILITY_TIME_SLOTS,
    validateAvailabilityInput,
    resolveSlotDisplayState,
    generateAvailabilityPreset,
    buildSlotKey,
    buildTeacherSlotKey
} from '../lib/tutor-availability.ts';

test('Tutor Availability: validates hourly slots from 5:00 AM to 10:00 PM (05:00 to 22:00)', () => {
    // Exactly 18 hourly slots
    assert.equal(TUTOR_AVAILABILITY_TIME_SLOTS.length, 18);
    assert.equal(TUTOR_AVAILABILITY_TIME_SLOTS[0], '05:00');
    assert.equal(TUTOR_AVAILABILITY_TIME_SLOTS[TUTOR_AVAILABILITY_TIME_SLOTS.length - 1], '22:00');

    // Valid inputs
    const valid1 = validateAvailabilityInput(1, '05:00', 'available');
    assert.equal(valid1.valid, true);

    const valid2 = validateAvailabilityInput(0, '22:00', 'unavailable');
    assert.equal(valid2.valid, true);

    // Invalid day of week (< 0 or > 6)
    const invalidDay1 = validateAvailabilityInput(-1, '09:00', 'available');
    assert.equal(invalidDay1.valid, false);
    assert.match(invalidDay1.error, /Invalid day of week/);

    const invalidDay2 = validateAvailabilityInput(7, '09:00', 'available');
    assert.equal(invalidDay2.valid, false);

    // Invalid time slot (outside 05:00 - 22:00 window or fractional)
    const invalidSlotBefore = validateAvailabilityInput(1, '04:00', 'available');
    assert.equal(invalidSlotBefore.valid, false);
    assert.match(invalidSlotBefore.error, /Invalid time slot/);

    const invalidSlotAfter = validateAvailabilityInput(1, '23:00', 'available');
    assert.equal(invalidSlotAfter.valid, false);

    const invalidSlotFraction = validateAvailabilityInput(1, '09:30', 'available');
    assert.equal(invalidSlotFraction.valid, false);

    // Invalid status (must be 'available' or 'unavailable')
    const invalidStatus = validateAvailabilityInput(1, '10:00', 'tentative');
    assert.equal(invalidStatus.valid, false);
    assert.match(invalidStatus.error, /Invalid status/);
});

test('Tutor Availability: slot resolution displays booked class in red with subject and student name', () => {
    // 1. Slot with active booked class
    const booking = {
        title: 'Spoken English - Intermediate',
        student_name: 'Sara Khan'
    };
    const bookedState = resolveSlotDisplayState(booking, 'available');
    assert.equal(bookedState.type, 'booked');
    assert.equal(bookedState.title, 'Spoken English - Intermediate');
    assert.equal(bookedState.studentName, 'Sara Khan');

    // 2. Slot with booked class even if tutor declared unavailable (class overrides to show active commitment)
    const bookedState2 = resolveSlotDisplayState(booking, 'unavailable');
    assert.equal(bookedState2.type, 'booked');
    assert.equal(bookedState2.title, 'Spoken English - Intermediate');
    assert.equal(bookedState2.studentName, 'Sara Khan');

    // 3. Unbooked slot marked as 'unavailable' by tutor
    const unavailableState = resolveSlotDisplayState(null, 'unavailable');
    assert.equal(unavailableState.type, 'unavailable');
    assert.equal(unavailableState.label, 'Unavailable');

    // 4. Unbooked slot marked as 'available' by tutor
    const availableState = resolveSlotDisplayState(null, 'available');
    assert.equal(availableState.type, 'available');
    assert.equal(availableState.label, 'Available');

    // 5. Unbooked slot with no declaration yet
    const notSetState = resolveSlotDisplayState(null, null);
    assert.equal(notSetState.type, 'not_set');
    assert.equal(notSetState.label, 'Available');
});

test('Tutor Availability: preset generation builds full 126 slots and preserves booked slots', () => {
    // Total slots: 7 days * 18 slots = 126 slots
    const allAvailable = generateAvailabilityPreset('all_available');
    assert.equal(allAvailable.length, 126);
    assert.ok(allAvailable.every(s => s.status === 'available'));

    const allUnavailable = generateAvailabilityPreset('all_unavailable');
    assert.equal(allUnavailable.length, 126);
    assert.ok(allUnavailable.every(s => s.status === 'unavailable'));

    // Preset with existing booked classes should skip booked slots
    const bookedKeys = new Set([
        buildSlotKey(1, '10:00'), // Mon 10 AM
        buildSlotKey(3, '14:00'), // Wed 2 PM
        buildSlotKey(5, '18:00')  // Fri 6 PM
    ]);
    const presetWithBookings = generateAvailabilityPreset('all_unavailable', bookedKeys);
    assert.equal(presetWithBookings.length, 126 - 3);
    assert.ok(!presetWithBookings.some(s => s.day_of_week === 1 && s.time_slot === '10:00'));

    // Weekdays work hours (9 AM - 6 PM)
    const workhoursPreset = generateAvailabilityPreset('weekdays_workhours');
    assert.equal(workhoursPreset.length, 126);
    // Monday at 11:00 AM should be available
    const mon11 = workhoursPreset.find(s => s.day_of_week === 1 && s.time_slot === '11:00');
    assert.equal(mon11?.status, 'available');
    // Monday at 06:00 AM should be unavailable
    const mon06 = workhoursPreset.find(s => s.day_of_week === 1 && s.time_slot === '06:00');
    assert.equal(mon06?.status, 'unavailable');
    // Sunday at 11:00 AM should be unavailable (weekend)
    const sun11 = workhoursPreset.find(s => s.day_of_week === 0 && s.time_slot === '11:00');
    assert.equal(sun11?.status, 'unavailable');
});

test('Tutor Availability: keys isolate each tutor across days and time slots', () => {
    const keyTutor1 = buildTeacherSlotKey('tutor-uuid-1', 1, '09:00');
    const keyTutor2 = buildTeacherSlotKey('tutor-uuid-2', 1, '09:00');

    assert.equal(keyTutor1, 'tutor-uuid-1_1_09:00');
    assert.equal(keyTutor2, 'tutor-uuid-2_1_09:00');
    assert.notEqual(keyTutor1, keyTutor2, 'Tutor availability slots must remain strictly partitioned by tutor ID');
});
