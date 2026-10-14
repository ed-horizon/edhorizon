'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

const HOLIDAY_MANAGER_ROLES = new Set(['admin', 'super_admin', 'hr', 'operations']);

export interface AcademyHoliday {
    id: string;
    title: string;
    holiday_date: string; // "YYYY-MM-DD"
    description?: string | null;
    cancelled_classes_count?: number;
    created_by?: string | null;
    created_at?: string;
}

export interface HolidayImpactPreview {
    date: string;
    classesCount: number;
    teachersCount: number;
    studentsCount: number;
    classes: Array<{
        id: string;
        title: string;
        scheduled_at: string;
        teacher_name: string;
        student_name: string;
    }>;
}

import { getIstDayUtcBounds } from "@/lib/holidays"
export { getIstDayUtcBounds }

/**
 * Fetch all academy holidays, optionally filtered by month/year.
 */
export async function getAcademyHolidays(year?: number, month?: number): Promise<AcademyHoliday[]> {
    noStore();
    try {
        const adminClient = createAdminClient();
        let query = adminClient
            .from('academy_holidays')
            .select('*')
            .order('holiday_date', { ascending: true });

        if (year && month) {
            const startMonth = `${year}-${String(month).padStart(2, '0')}-01`;
            // Calculate end of month date
            const lastDay = new Date(year, month, 0).getDate();
            const endMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            query = query.gte('holiday_date', startMonth).lte('holiday_date', endMonth);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching academy holidays:", error.message);
            return [];
        }
        return (data || []) as AcademyHoliday[];
    } catch (err: unknown) {
        console.error("Unexpected error in getAcademyHolidays:", err);
        return [];
    }
}

/**
 * Get preview of classes that will be impacted by declaring a holiday on a specific date.
 */
export async function getHolidayClassImpactPreview(dateStr: string): Promise<HolidayImpactPreview> {
    noStore();
    try {
        const adminClient = createAdminClient();
        const { startUtcIso, endUtcIso } = getIstDayUtcBounds(dateStr);

        const { data: classes, error } = await adminClient
            .from('live_classes')
            .select(`
                id,
                title,
                scheduled_at,
                teacher_id,
                student_id,
                teacher:profiles!teacher_id(full_name),
                student:profiles!student_id(full_name)
            `)
            .gte('scheduled_at', startUtcIso)
            .lte('scheduled_at', endUtcIso)
            .in('status', ['scheduled', 'ongoing']);

        if (error || !classes) {
            return {
                date: dateStr,
                classesCount: 0,
                teachersCount: 0,
                studentsCount: 0,
                classes: []
            };
        }

        const teacherIds = new Set<string>();
        const studentIds = new Set<string>();

        const formatted = (classes as Array<{
            id: string;
            title: string;
            scheduled_at: string;
            teacher_id?: string | null;
            student_id?: string | null;
            teacher?: { full_name?: string | null } | null;
            student?: { full_name?: string | null } | null;
        }>).map((c) => {
            if (c.teacher_id) teacherIds.add(c.teacher_id);
            if (c.student_id) studentIds.add(c.student_id);
            return {
                id: c.id,
                title: c.title,
                scheduled_at: c.scheduled_at,
                teacher_name: c.teacher?.full_name || 'Unassigned',
                student_name: c.student?.full_name || 'Unassigned'
            };
        });

        return {
            date: dateStr,
            classesCount: formatted.length,
            teachersCount: teacherIds.size,
            studentsCount: studentIds.size,
            classes: formatted
        };
    } catch (err) {
        console.error("Error in getHolidayClassImpactPreview:", err);
        return {
            date: dateStr,
            classesCount: 0,
            teachersCount: 0,
            studentsCount: 0,
            classes: []
        };
    }
}

/**
 * Declare an academy holiday:
 * 1. Inserts into academy_holidays
 * 2. Cancels all scheduled/ongoing classes on that IST date
 * 3. Sets cancellation_reason and holiday_id
 */
export async function declareAcademyHoliday(payload: {
    title: string;
    holiday_date: string; // "YYYY-MM-DD"
    description?: string;
}): Promise<{ success: boolean; error?: string; cancelledCount?: number; holiday?: AcademyHoliday }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !HOLIDAY_MANAGER_ROLES.has(String(profile.role))) {
        return { success: false, error: "Unauthorized. Only Admins, Operations, and HR can declare academy holidays." };
    }

    const trimmedTitle = (payload.title || "").trim();
    const dateStr = (payload.holiday_date || "").trim();

    if (!trimmedTitle) {
        return { success: false, error: "Holiday title is required." };
    }
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { success: false, error: "A valid date (YYYY-MM-DD) is required." };
    }

    try {
        const adminClient = createAdminClient();

        // Check if a holiday already exists for this date
        const { data: existingHoliday } = await adminClient
            .from('academy_holidays')
            .select('id, title')
            .eq('holiday_date', dateStr)
            .maybeSingle();

        if (existingHoliday) {
            return {
                success: false,
                error: `A holiday ("${existingHoliday.title}") is already declared for ${dateStr}. Please delete or edit it first.`
            };
        }

        const { startUtcIso, endUtcIso } = getIstDayUtcBounds(dateStr);

        // Fetch all classes to be cancelled
        const { data: classesToCancel, error: fetchError } = await adminClient
            .from('live_classes')
            .select('id')
            .gte('scheduled_at', startUtcIso)
            .lte('scheduled_at', endUtcIso)
            .in('status', ['scheduled', 'ongoing']);

        if (fetchError) {
            console.error("Error querying classes for holiday:", fetchError);
            return { success: false, error: "Failed to query scheduled classes for this date." };
        }

        const classIdsToCancel = (classesToCancel || []).map(c => c.id);

        // 1. Insert the holiday record
        const { data: insertedHoliday, error: holidayInsertError } = await adminClient
            .from('academy_holidays')
            .insert({
                title: trimmedTitle,
                holiday_date: dateStr,
                description: payload.description?.trim() || null,
                cancelled_classes_count: classIdsToCancel.length,
                created_by: user.id
            })
            .select()
            .single();

        if (holidayInsertError || !insertedHoliday) {
            console.error("Error creating holiday record:", holidayInsertError);
            return { success: false, error: holidayInsertError?.message || "Failed to declare holiday." };
        }

        // 2. Batch update live_classes to cancelled
        if (classIdsToCancel.length > 0) {
            const updatePayload: Record<string, string | null> = {
                status: 'cancelled',
                cancellation_reason: `Academy Holiday: ${trimmedTitle}`,
                holiday_id: insertedHoliday.id
            };

            const { error: cancelError } = await adminClient
                .from('live_classes')
                .update(updatePayload)
                .in('id', classIdsToCancel);

            if (cancelError) {
                console.error("Error updating live_classes to cancelled:", cancelError);
                // Try fallback without new columns if schema migration hasn't populated them yet
                const { error: fallbackError } = await adminClient
                    .from('live_classes')
                    .update({ status: 'cancelled' })
                    .in('id', classIdsToCancel);

                if (fallbackError) {
                    console.error("Fallback class cancellation error:", fallbackError);
                }
            }
        }

        revalidatePath('/(dashboard)', 'layout');
        revalidatePath('/class-logs');
        revalidatePath('/admin/schedules');

        return {
            success: true,
            cancelledCount: classIdsToCancel.length,
            holiday: insertedHoliday as AcademyHoliday
        };
    } catch (err: unknown) {
        console.error("Unexpected error in declareAcademyHoliday:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to declare holiday."
        };
    }
}

/**
 * Delete an academy holiday with optional class restoration.
 */
export async function deleteAcademyHoliday(
    holidayId: string, 
    restoreClasses: boolean = false
): Promise<{ success: boolean; error?: string; restoredCount?: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !HOLIDAY_MANAGER_ROLES.has(String(profile.role))) {
        return { success: false, error: "Unauthorized to delete academy holidays." };
    }

    try {
        const adminClient = createAdminClient();

        // 1. Fetch holiday to know date and id
        const { data: holiday, error: fetchError } = await adminClient
            .from('academy_holidays')
            .select('*')
            .eq('id', holidayId)
            .single();

        if (fetchError || !holiday) {
            return { success: false, error: "Holiday not found." };
        }

        let restoredCount = 0;

        // 2. Optionally restore classes
        if (restoreClasses) {
            // Restore classes that were linked to this holiday or were cancelled on that date
            const { startUtcIso, endUtcIso } = getIstDayUtcBounds(holiday.holiday_date);

            const { data: classesToRestore } = await adminClient
                .from('live_classes')
                .select('id')
                .gte('scheduled_at', startUtcIso)
                .lte('scheduled_at', endUtcIso)
                .eq('status', 'cancelled');

            const ids = (classesToRestore || []).map(c => c.id);

            if (ids.length > 0) {
                const { error: restoreError } = await adminClient
                    .from('live_classes')
                    .update({
                        status: 'scheduled',
                        cancellation_reason: null,
                        holiday_id: null
                    })
                    .in('id', ids);

                if (!restoreError) {
                    restoredCount = ids.length;
                } else {
                    console.error("Error restoring classes on holiday delete:", restoreError);
                }
            }
        }

        // 3. Delete holiday
        const { error: deleteError } = await adminClient
            .from('academy_holidays')
            .delete()
            .eq('id', holidayId);

        if (deleteError) {
            console.error("Error deleting holiday:", deleteError);
            return { success: false, error: deleteError.message };
        }

        revalidatePath('/(dashboard)', 'layout');
        revalidatePath('/class-logs');
        revalidatePath('/admin/schedules');

        return { success: true, restoredCount };
    } catch (err: unknown) {
        console.error("Unexpected error in deleteAcademyHoliday:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to delete holiday."
        };
    }
}
