/**
 * Tutor Availability Constants and Helpers
 * Standardized 5:00 AM to 10:00 PM IST slot tracking across the academy
 */

export const TUTOR_AVAILABILITY_DAYS = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
    { value: 0, label: 'Sunday', short: 'Sun' },
] as const;

export const TUTOR_AVAILABILITY_TIME_SLOTS = [
    "05:00", "06:00", "07:00", "08:00", "09:00", "10:00",
    "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
    "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
] as const;

export type AvailabilityStatus = 'available' | 'unavailable';

export interface TutorAvailabilityRecord {
    id?: string;
    teacher_id: string;
    day_of_week: number;
    time_slot: string;
    status: AvailabilityStatus;
    updated_at?: string;
}

export interface BookedClassSlot {
    schedule_id?: string;
    title: string;
    student_name: string;
    time_of_day?: string;
    duration_hours?: number;
    day_timings?: Record<string, string> | null;
}

export type SlotDisplayState =
    | { type: 'booked'; title: string; studentName: string }
    | { type: 'unavailable'; label: string }
    | { type: 'available'; label: string }
    | { type: 'not_set'; label: string };

/**
 * Key helper for quick O(1) hash map lookups
 */
export function buildSlotKey(dayOfWeek: number, timeSlot: string): string {
    return `${dayOfWeek}_${timeSlot}`;
}

export function buildTeacherSlotKey(teacherId: string, dayOfWeek: number, timeSlot: string): string {
    return `${teacherId}_${dayOfWeek}_${timeSlot}`;
}

/**
 * Validates input parameters for availability mutations
 */
export function validateAvailabilityInput(
    dayOfWeek: number,
    timeSlot: string,
    status: string
): { valid: boolean; error?: string } {
    if (typeof dayOfWeek !== 'number' || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return { valid: false, error: 'Invalid day of week. Must be between 0 (Sunday) and 6 (Saturday).' };
    }

    if (!TUTOR_AVAILABILITY_TIME_SLOTS.includes(timeSlot as any)) {
        return { valid: false, error: `Invalid time slot: ${timeSlot}. Must be an hourly slot between 05:00 and 22:00.` };
    }

    if (status !== 'available' && status !== 'unavailable') {
        return { valid: false, error: `Invalid status: ${status}. Must be 'available' or 'unavailable'.` };
    }

    return { valid: true };
}

/**
 * Pure resolution logic for a slot:
 * 1. Booked Class -> Red/Rose with Subject Title and Student Name
 * 2. Explicit Unavailable -> Muted / Slate with 'Unavailable'
 * 3. Explicit Available -> Green with 'Available'
 * 4. Not set -> 'not_set' (defaults to available in display)
 */
export function resolveSlotDisplayState(
    booking: { title?: string | null; student_name?: string | null } | null | undefined,
    availabilityStatus?: AvailabilityStatus | null
): SlotDisplayState {
    if (booking) {
        return {
            type: 'booked',
            title: booking.title || 'Class',
            studentName: booking.student_name || 'Student'
        };
    }

    if (availabilityStatus === 'unavailable') {
        return {
            type: 'unavailable',
            label: 'Unavailable'
        };
    }

    if (availabilityStatus === 'available') {
        return {
            type: 'available',
            label: 'Available'
        };
    }

    return {
        type: 'not_set',
        label: 'Available'
    };
}

/**
 * Presets builder for bulk marking
 */
export function generateAvailabilityPreset(
    preset: 'all_available' | 'all_unavailable' | 'weekdays_workhours' | 'evenings' | 'early_mornings',
    existingBookedKeys: Set<string> = new Set()
): Array<{ day_of_week: number; time_slot: string; status: AvailabilityStatus }> {
    const slots: Array<{ day_of_week: number; time_slot: string; status: AvailabilityStatus }> = [];

    const weekdays = [1, 2, 3, 4, 5]; // Mon - Fri

    for (const day of TUTOR_AVAILABILITY_DAYS) {
        const isWeekday = weekdays.includes(day.value);

        for (const slot of TUTOR_AVAILABILITY_TIME_SLOTS) {
            const key = buildSlotKey(day.value, slot);
            // Skip slots that are already booked by active student classes
            if (existingBookedKeys.has(key)) continue;

            const hour = parseInt(slot.split(':')[0], 10);

            if (preset === 'all_available') {
                slots.push({ day_of_week: day.value, time_slot: slot, status: 'available' });
            } else if (preset === 'all_unavailable') {
                slots.push({ day_of_week: day.value, time_slot: slot, status: 'unavailable' });
            } else if (preset === 'weekdays_workhours') {
                // 09:00 to 18:00 on weekdays = available; all others unavailable
                const isWorkHour = isWeekday && hour >= 9 && hour <= 18;
                slots.push({
                    day_of_week: day.value,
                    time_slot: slot,
                    status: isWorkHour ? 'available' : 'unavailable'
                });
            } else if (preset === 'evenings') {
                // 16:00 to 22:00 = available; all others unavailable
                const isEvening = hour >= 16 && hour <= 22;
                slots.push({
                    day_of_week: day.value,
                    time_slot: slot,
                    status: isEvening ? 'available' : 'unavailable'
                });
            } else if (preset === 'early_mornings') {
                // 05:00 to 09:00 = available
                const isMorning = hour >= 5 && hour <= 9;
                slots.push({
                    day_of_week: day.value,
                    time_slot: slot,
                    status: isMorning ? 'available' : 'unavailable'
                });
            }
        }
    }

    return slots;
}
