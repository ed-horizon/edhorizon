import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface StudentAttendanceEntry {
    studentId: string;
    status: 'present' | 'absent' | 'late';
}

export interface FinalizeAttendancePayload {
    classId: string;
    studentAttendances: StudentAttendanceEntry[];
    topicTaught?: string;
    homeworkGiven?: string;
    studentPerformance?: string;
    parentNote?: string;
}

/**
 * Core attendance finalization logic.
 * Shared between Server Action and Route Handler (/api/attendance/finalize)
 * to provide resiliency against Next.js build-hash skew.
 */
export async function executeFinalizeClassSession(payload: FinalizeAttendancePayload) {
    const {
        classId,
        studentAttendances = [],
        topicTaught = '',
        homeworkGiven = '',
        studentPerformance = 'Good',
        parentNote = ''
    } = payload;

    if (!classId || typeof classId !== 'string') {
        return { success: false, error: "Class ID is required." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized. Please log in again." };
    }

    // Fetch user profile role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Fetch the target live class session
    const { data: classObj, error: fetchError } = await supabase
        .from('live_classes')
        .select('id, status, verification_status, scheduled_at, tutor_joined_at, student_joined_at')
        .eq('id', classId)
        .maybeSingle();

    if (fetchError || !classObj) {
        return { success: false, error: "Class session not found." };
    }

    // Role-based validations for teachers
    if (profile?.role === 'teacher') {
        if (classObj.status === 'completed') {
            return {
                success: false,
                error: "Tutors cannot edit attendance logs once submitted. Please contact HR or Operations to request changes."
            };
        }
        if (classObj.scheduled_at) {
            const scheduledTime = new Date(classObj.scheduled_at).getTime();
            const elapsed = Date.now() - scheduledTime;
            if (elapsed > 24 * 60 * 60 * 1000) {
                return {
                    success: false,
                    error: "This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session. Please contact HR or Operations to log this session."
                };
            }
        }
    }

    // Upsert individual student attendance records
    for (const att of studentAttendances) {
        if (!att?.studentId) continue;
        const { error: attError } = await supabase
            .from('student_attendance')
            .upsert({
                class_id: classId,
                student_id: att.studentId,
                status: att.status || 'present',
                marked_by: user.id
            }, { onConflict: 'class_id,student_id' });

        if (attError) {
            console.error("executeFinalizeClassSession student_attendance Error:", attError);
            return { success: false, error: attError.message };
        }
    }

    // Preserve existing verification status if already verified or rejected
    const targetVerificationStatus = (classObj.verification_status === 'verified' || classObj.verification_status === 'rejected')
        ? classObj.verification_status
        : 'pending';

    // Update live_classes with status, verification_status and post-class logs
    const { error: updateError } = await supabase
        .from('live_classes')
        .update({
            status: 'completed',
            verification_status: targetVerificationStatus,
            topic_taught: topicTaught,
            homework_given: homeworkGiven,
            student_performance: studentPerformance,
            parent_note: parentNote,
            // Join timestamps are populated only by an actual check-in.
            tutor_joined_at: classObj.tutor_joined_at || null,
            student_joined_at: classObj.student_joined_at || null
        })
        .eq('id', classId);

    if (updateError) {
        console.error("executeFinalizeClassSession Live Class Update Error:", updateError);
        return { success: false, error: updateError.message };
    }

    try {
        revalidatePath('/(dashboard)', 'layout');
    } catch {
        // Safe to ignore if revalidatePath is called in environments without active request context
    }

    return { success: true };
}
