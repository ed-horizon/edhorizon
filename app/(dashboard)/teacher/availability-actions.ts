"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
    validateAvailabilityInput,
    TUTOR_AVAILABILITY_TIME_SLOTS,
    AvailabilityStatus,
    filterActiveTutors
} from "@/lib/tutor-availability";

export interface BookedSlotDetail {
    id: string;
    title: string;
    student_name: string;
    pattern_days: number[];
    time_of_day: string | null;
    day_timings: Record<string, string> | null;
    duration_hours: number;
}

/**
 * Fetch the authenticated tutor's availability and active booked class schedules
 * Strict privacy: guaranteed to only fetch data for the logged-in user.
 */
export async function getMyAvailability() {
    noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch tutor's declared availability
    const { data: availability, error: availErr } = await supabase
        .from('tutor_availability')
        .select('id, day_of_week, time_slot, status, updated_at')
        .eq('teacher_id', user.id);

    if (availErr) {
        console.error("Error fetching tutor availability:", availErr);
        return { success: false, error: availErr.message };
    }

    // 2. Fetch tutor's active recurring class schedules (with student name and subject/title)
    const { data: classSchedules, error: classErr } = await supabase
        .from('class_schedules')
        .select(`
            id,
            title,
            pattern_days,
            time_of_day,
            day_timings,
            duration_hours,
            status,
            student:profiles!student_id(full_name)
        `)
        .eq('teacher_id', user.id)
        .eq('status', 'active');

    if (classErr) {
        console.error("Error fetching tutor class schedules:", classErr);
    }

    const bookings: BookedSlotDetail[] = (classSchedules || []).map((cs: any) => {
        const studentRecord = Array.isArray(cs.student) ? cs.student[0] : cs.student;
        return {
            id: cs.id,
            title: cs.title || 'Class',
            student_name: studentRecord?.full_name || 'Student',
            pattern_days: Array.isArray(cs.pattern_days) ? cs.pattern_days : [],
            time_of_day: cs.time_of_day || null,
            day_timings: cs.day_timings || null,
            duration_hours: Number(cs.duration_hours) || 1.0
        };
    });

    return {
        success: true,
        teacherId: user.id,
        availability: availability || [],
        bookings
    };
}

/**
 * Update or insert a single slot's availability
 * Guaranteed to only update the authenticated teacher's own record.
 */
export async function updateSlotAvailability(
    day_of_week: number,
    time_slot: string,
    status: AvailabilityStatus
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    const validation = validateAvailabilityInput(day_of_week, time_slot, status);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const { error } = await supabase
        .from('tutor_availability')
        .upsert(
            {
                teacher_id: user.id,
                day_of_week,
                time_slot,
                status,
                updated_at: new Date().toISOString()
            },
            {
                onConflict: 'teacher_id,day_of_week,time_slot'
            }
        );

    if (error) {
        console.error("Failed to upsert slot availability:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/teacher/availability");
    revalidatePath("/tutors-schedule");

    return {
        success: true,
        day_of_week,
        time_slot,
        status
    };
}

/**
 * Bulk update multiple slots for the authenticated tutor (e.g., presets or whole day)
 */
export async function bulkUpdateAvailability(
    slots: Array<{ day_of_week: number; time_slot: string; status: AvailabilityStatus }>
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    if (!Array.isArray(slots) || slots.length === 0) {
        return { success: false, error: "No slots provided" };
    }

    // Validate every slot
    const validRows = [];
    for (const s of slots) {
        const val = validateAvailabilityInput(s.day_of_week, s.time_slot, s.status);
        if (val.valid) {
            validRows.push({
                teacher_id: user.id,
                day_of_week: s.day_of_week,
                time_slot: s.time_slot,
                status: s.status,
                updated_at: new Date().toISOString()
            });
        }
    }

    if (validRows.length === 0) {
        return { success: false, error: "No valid slots to update" };
    }

    const { error } = await supabase
        .from('tutor_availability')
        .upsert(validRows, {
            onConflict: 'teacher_id,day_of_week,time_slot'
        });

    if (error) {
        console.error("Failed to bulk upsert availability:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/teacher/availability");
    revalidatePath("/tutors-schedule");

    return {
        success: true,
        updatedCount: validRows.length
    };
}

/**
 * Fetch all tutor availability records for the master Tutor Schedules board (/tutors-schedule)
 * Accessible by staff roles (sales, hr, operations, admin, super_admin)
 */
export async function getAllTutorsAvailability() {
    noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from('tutor_availability')
        .select('teacher_id, day_of_week, time_slot, status');

    if (error) {
        console.error("Error fetching all tutors availability:", error);
        return [];
    }

    return data || [];
}

/**
 * Fetch only active tutors for the master Tutor Schedules board (/tutors-schedule)
 * Strictly excludes inactive and locked tutors.
 */
export async function getActiveTutorsForSchedule() {
    noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email,
            staff_details (
                status
            )
        `)
        .eq('role', 'teacher')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getActiveTutorsForSchedule error:", error);
        return [];
    }

    const activeTutors = filterActiveTutors(data || []);

    return activeTutors.map(t => ({
        id: t.id,
        full_name: t.full_name,
        email: t.email
    }));
}
