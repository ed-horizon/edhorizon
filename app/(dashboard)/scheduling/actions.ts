'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { addDays, format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from "date-fns"
import { createAdminClient } from "@/lib/supabase/admin"

interface SchedulePayload {
    student_id: string;
    title: string;
    meeting_link: string;
    pattern_days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
    time_of_day: string; // "HH:mm"
    duration_hours: number;
    start_date: string; // "YYYY-MM-DD"
    end_date: string; // "YYYY-MM-DD"
    teacher_id?: string;
    parent_note?: string;
    clientOffsetMinutes?: number;
    day_timings?: Record<number, string>; // Maps day of week (0-6) to "HH:mm"
}

/**
 * Helper to compute specific dates between a start and end based on DOW patterns
 */
function computeDatesForPattern(
    startDate: Date, 
    endDate: Date, 
    patternDays: number[], 
    timeOfDay: string, 
    clientOffsetMinutes: number = 0,
    dayTimings?: Record<number, string>
) {
    const dates = []
    let current = startOfDay(startDate)
    const end = endOfDay(endDate)

    while (!isAfter(current, end)) {
        const dayOfWeek = current.getDay();
        if (patternDays.includes(dayOfWeek)) {
            const dateStr = format(current, 'yyyy-MM-dd')
            let specificTime = (dayTimings && dayTimings[dayOfWeek]) ? dayTimings[dayOfWeek] : timeOfDay;
            if (!specificTime) {
                specificTime = "00:00:00";
            }
            const parts = specificTime.split(':');
            let normalizedTime = specificTime;
            if (parts.length === 2) {
                normalizedTime = `${specificTime}:00`;
            } else if (parts.length === 1) {
                normalizedTime = `${specificTime}:00:00`;
            }
            const localUtcDate = new Date(`${dateStr}T${normalizedTime}Z`)
            const utcDate = new Date(localUtcDate.getTime() + clientOffsetMinutes * 60 * 1000)
            dates.push(utcDate.toISOString())
        }
        current = addDays(current, 1)
    }

    return dates
}

function limitDatesByMonthlyMax(dates: string[], maxPerMonth: number) {
    if (maxPerMonth <= 0) return dates;
    return dates.slice(0, maxPerMonth);
}

function resolveMaxClassesForSubject(title: string, details: any): number {
    if (!details) return 12;

    const titleLower = (title || "").toLowerCase();
    const sub1 = (details.subject_name_1 || "").toLowerCase();
    const sub2 = (details.subject_name_2 || "").toLowerCase();
    const sub3 = (details.subject_name_3 || "").toLowerCase();
    const sub4 = (details.subject_name_4 || "").toLowerCase();
    const sub5 = (details.subject_name_5 || "").toLowerCase();

    if (sub1 && titleLower.includes(sub1)) {
        return details.classes_per_month || 12;
    } else if (sub2 && titleLower.includes(sub2)) {
        return details.classes_per_month_2 || 12;
    } else if (sub3 && titleLower.includes(sub3)) {
        return details.classes_per_month_3 || 12;
    } else if (sub4 && titleLower.includes(sub4)) {
        return details.classes_per_month_4 || 12;
    } else if (sub5 && titleLower.includes(sub5)) {
        return details.classes_per_month_5 || 12;
    }

    return details.classes_per_month || 12;
}

export async function createClassSchedule(payload: SchedulePayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    // Server-side parameter validation to prevent anonymous/corrupt schedule configurations
    if (!payload.student_id) return { success: false, error: "Student selection is required." }
    if (!payload.title || !payload.title.trim()) return { success: false, error: "Subject title is required." }
    if (!payload.pattern_days || payload.pattern_days.length === 0) return { success: false, error: "At least one pattern day is required." }
    if (!payload.time_of_day) return { success: false, error: "Default time of day is required." }
    if (!payload.start_date || !payload.end_date) return { success: false, error: "Start and end dates are required." }

    try {
        const adminClient = createAdminClient();
        // Check user's role to determine if they can override teacher_id
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdminOrOps = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
        const teacherId = (isAdminOrOps && payload.teacher_id) ? payload.teacher_id : user.id;

        if (!teacherId) {
            return { success: false, error: "Tutor assignment is required." }
        }

        // 1. Insert into class_schedules
        const { data: schedule, error: scheduleError } = await supabase
            .from('class_schedules')
            .insert({
                teacher_id: teacherId,
                student_id: payload.student_id,
                title: payload.title,
                meeting_link: payload.meeting_link,
                pattern_days: payload.pattern_days,
                time_of_day: payload.time_of_day,
                duration_hours: payload.duration_hours,
                start_date: payload.start_date,
                end_date: payload.end_date,
                status: 'active',
                day_timings: payload.day_timings || null
            })
            .select()
            .single()

        if (scheduleError) throw scheduleError

        // Sync to student_details
        const timeHHMM = payload.time_of_day.substring(0, 5);
        const { error: studentUpdateError } = await supabase
            .from('student_details')
            .update({
                preferred_meeting_link: payload.meeting_link,
                preferred_time: timeHHMM
            })
            .eq('id', payload.student_id);

        if (studentUpdateError) {
            console.error("Error syncing student preferences in createClassSchedule:", studentUpdateError);
        }

        // Fetch student details to get the exact class count config for this subject
        const { data: studentDetails } = await supabase
            .from('student_details')
            .select(`
                classes_per_month,
                subject_name_1,
                classes_per_month_2,
                subject_name_2,
                classes_per_month_3,
                subject_name_3,
                classes_per_month_4,
                subject_name_4,
                classes_per_month_5,
                subject_name_5
            `)
            .eq('id', payload.student_id)
            .maybeSingle();

        const maxClasses = resolveMaxClassesForSubject(payload.title, studentDetails);

        // 2. Compute individual class dates
        let computedDates = computeDatesForPattern(
            parseISO(payload.start_date),
            parseISO(payload.end_date),
            payload.pattern_days,
            payload.time_of_day,
            payload.clientOffsetMinutes || 0,
            payload.day_timings
        )

        // Limit occurrences by student's monthly limit
        computedDates = limitDatesByMonthlyMax(computedDates, maxClasses);

        // Filter out dates that already have a class scheduled for this student at that exact time to prevent duplicates
        if (computedDates.length > 0) {
            const { data: existingClasses, error: fetchClassesError } = await supabase
                .from('live_classes')
                .select('scheduled_at')
                .eq('student_id', payload.student_id)
                .in('scheduled_at', computedDates);

            if (fetchClassesError) throw fetchClassesError;

            const existingTimestamps = new Set(existingClasses?.map(c => new Date(c.scheduled_at).toISOString()) || []);
            computedDates = computedDates.filter(date => !existingTimestamps.has(new Date(date).toISOString()));
        }

        // 3. Bulk insert live_classes
        if (computedDates.length > 0) {
            const classPayloads = computedDates.map(date => {
                const item: any = {
                    teacher_id: teacherId,
                    student_id: payload.student_id,
                    title: payload.title,
                    meeting_link: payload.meeting_link,
                    scheduled_at: date,
                    duration_hours: payload.duration_hours,
                    schedule_id: schedule.id,
                    status: 'scheduled'
                };
                if (payload.parent_note) {
                    item.parent_note = payload.parent_note;
                }
                return item;
            })

            const { error: classesError } = await supabase
                .from('live_classes')
                .insert(classPayloads)

            if (classesError) throw classesError
        }

        revalidatePath('/(dashboard)', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error("createClassSchedule error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateClassSchedule(scheduleId: string, payload: Partial<SchedulePayload>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    try {
        // Validate access
        const { data: existing, error: fetchErr } = await supabase
            .from('class_schedules')
            .select('*')
            .eq('id', scheduleId)
            .single()

        if (fetchErr || !existing) throw new Error("Schedule not found")

        // 1. Update schedule parent
        const { data: updatedSchedule, error: updateErr } = await supabase
            .from('class_schedules')
            .update({
                title: payload.title,
                meeting_link: payload.meeting_link,
                pattern_days: payload.pattern_days,
                time_of_day: payload.time_of_day,
                duration_hours: payload.duration_hours,
                end_date: payload.end_date, // Admin might extend it
                day_timings: payload.day_timings || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', scheduleId)
            .select()
            .single()

        if (updateErr) throw updateErr

        // Sync to student_details
        if (payload.meeting_link || payload.time_of_day) {
            const updateFields: any = {};
            if (payload.meeting_link) updateFields.preferred_meeting_link = payload.meeting_link;
            if (payload.time_of_day) updateFields.preferred_time = payload.time_of_day.substring(0, 5);

            const { error: studentUpdateError } = await supabase
                .from('student_details')
                .update(updateFields)
                .eq('id', updatedSchedule.student_id);

            if (studentUpdateError) {
                console.error("Error syncing student preferences in updateClassSchedule:", studentUpdateError);
            }
        }

        // 2. Delete all FUTURE untouched live_classes associated with this schedule
        // Status must be exactly 'scheduled' (not completed/ongoing)
        const now = new Date().toISOString()
        const { error: deleteErr } = await supabase
            .from('live_classes')
            .delete()
            .eq('schedule_id', scheduleId)
            .eq('status', 'scheduled')
            .gt('scheduled_at', now)

        if (deleteErr) throw deleteErr

        // Fetch student details to get the exact class count config for this subject
        const { data: studentDetails } = await supabase
            .from('student_details')
            .select(`
                classes_per_month,
                subject_name_1,
                classes_per_month_2,
                subject_name_2,
                classes_per_month_3,
                subject_name_3,
                classes_per_month_4,
                subject_name_4,
                classes_per_month_5,
                subject_name_5
            `)
            .eq('id', updatedSchedule.student_id)
            .maybeSingle();

        const maxClasses = resolveMaxClassesForSubject(updatedSchedule.title, studentDetails);

        // 3. Regenerate future live_classes based on the new pattern
        // The effective start date for new calculations is Tomorrow (or Today if safe)
        const computedDates = computeDatesForPattern(
            new Date(), // Start from right now
            parseISO(updatedSchedule.end_date),
            updatedSchedule.pattern_days,
            updatedSchedule.time_of_day,
            payload.clientOffsetMinutes || 0,
            payload.day_timings || updatedSchedule.day_timings
        )

        // Filter out dates that are inherently in the past relative to right now 
        // computeDatesForPattern starts loop from 0:00 of today, so we filter.
        let futureDates = computedDates.filter(d => isAfter(parseISO(d), new Date()))

        // Limit occurrences by student's monthly limit
        futureDates = limitDatesByMonthlyMax(futureDates, maxClasses);

        // Filter out dates that already have a class scheduled for this student at that exact time to prevent duplicates
        if (futureDates.length > 0) {
            const { data: existingClasses, error: fetchClassesError } = await supabase
                .from('live_classes')
                .select('scheduled_at')
                .eq('student_id', updatedSchedule.student_id)
                .in('scheduled_at', futureDates);

            if (fetchClassesError) throw fetchClassesError;

            const existingTimestamps = new Set(existingClasses?.map(c => new Date(c.scheduled_at).toISOString()) || []);
            futureDates = futureDates.filter(date => !existingTimestamps.has(new Date(date).toISOString()));
        }

        if (futureDates.length > 0) {
            const classPayloads = futureDates.map(date => ({
                teacher_id: updatedSchedule.teacher_id,
                student_id: updatedSchedule.student_id,
                title: updatedSchedule.title,
                meeting_link: updatedSchedule.meeting_link,
                scheduled_at: date,
                duration_hours: updatedSchedule.duration_hours,
                schedule_id: scheduleId,
                status: 'scheduled'
            }))

            const { error: classesError } = await supabase
                .from('live_classes')
                .insert(classPayloads)

            if (classesError) throw classesError
        }

        revalidatePath('/(dashboard)', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error("updateClassSchedule error:", error)
        return { success: false, error: error.message }
    }
}

export async function cancelClassSchedule(scheduleId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const { error: cancelErr } = await supabase
            .from('class_schedules')
            .update({ status: 'cancelled' })
            .eq('id', scheduleId)

        if (cancelErr) throw cancelErr

        const now = new Date().toISOString()
        const { error: deleteErr } = await supabase
            .from('live_classes')
            .delete()
            .eq('schedule_id', scheduleId)
            .eq('status', 'scheduled')
            .gt('scheduled_at', now)

        if (deleteErr) throw deleteErr

        revalidatePath('/(dashboard)', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error("cancelClassSchedule error:", error)
        return { success: false, error: error.message }
    }
}

export async function getAllActiveSchedules() {
    const supabase = await createClient()
    
    // Admin query pulls all
    const { data, error } = await supabase
        .from('class_schedules')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name, email),
            student:profiles!student_id(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

export async function getTeacherSchedules(teacherId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const targetId = teacherId || user?.id
    if (!targetId) return []

    const { data, error } = await supabase
        .from('class_schedules')
        .select(`
            *,
            student:profiles!student_id(full_name)
        `)
        .eq('teacher_id', targetId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}
