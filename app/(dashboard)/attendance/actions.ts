'use server'

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth, isAfter } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";

// --- Live Classes ---

export async function getLiveClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let query = supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name),
            module:modules(title),
            course:courses(title)
        `);

    // If teacher, only show their sessions. If student, only show their sessions.
    if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
    } else if (profile?.role === 'student') {
        query = query.eq('student_id', user.id);
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true });
    if (error) throw error;

    // Fetch students separately for these classes to avoid PostgREST relationship issues
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return data;
}

export async function getAssignedStudents() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: studentsData, error } = await supabase
        .from('student_details')
        .select('*')
        .eq('assigned_teacher_id', user.id);

    if (error) throw error;
    if (!studentsData || studentsData.length === 0) return [];

    // Fetch profiles separately to avoid PostgREST relationship issues
    const studentIds = studentsData.map(d => d.id);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

    if (profileError) throw profileError;

    const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || []);

    // Fetch active class schedules to dynamically populate preferred schedule if null
    const { data: activeSchedules, error: scheduleError } = await supabase
        .from('class_schedules')
        .select('student_id, time_of_day, meeting_link, day_timings')
        .in('student_id', studentIds)
        .eq('status', 'active');

    if (scheduleError) {
        console.error("Error fetching active schedules for assigned students:", scheduleError);
    }

    const scheduleMap = Object.fromEntries(
        activeSchedules?.map(s => [s.student_id, s]) || []
    );

    return studentsData.map((d: any) => {
        const profile = profileMap[d.id];
        const activeSch = scheduleMap[d.id];
        
        // Use active schedule fallback if preferred_time/meeting_link are null
        const preferredTime = d.preferred_time || (activeSch?.time_of_day ? activeSch.time_of_day.substring(0, 5) : null);
        const preferredMeetingLink = d.preferred_meeting_link || activeSch?.meeting_link || null;

        return {
            id: d.id,
            full_name: profile?.full_name || 'Unknown Student',
            email: profile?.email || '',
            preferred_meeting_link: preferredMeetingLink,
            preferred_time: preferredTime,
            day_timings: activeSch?.day_timings || null
        };
    });
}

export async function createLiveClass(payload: {
    title: string;
    meeting_link: string;
    scheduled_at: string;
    module_id?: string;
    course_id?: string;
    student_id: string;
    duration_hours?: number;
    teacher_id?: string;
    parent_note?: string;
    preferred_time?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("Scheduling failed: User not authenticated");
        return { error: "User not authenticated" };
    }

    try {
        // Check user's role to determine if they can override teacher_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdminOrOps = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
        const teacherId = (isAdminOrOps && payload.teacher_id) ? payload.teacher_id : user.id;

        // Also update the student's preferred link/time if provided
        if (payload.meeting_link) {
            const timeVal = payload.preferred_time || payload.scheduled_at.split('T')[1].substring(0, 5);
            const { error: studentUpdateError } = await supabase
                .from('student_details')
                .update({ 
                    preferred_meeting_link: payload.meeting_link,
                    preferred_time: timeVal
                })
                .eq('id', payload.student_id);
            
            if (studentUpdateError) {
                console.error("Error updating student preferences:", studentUpdateError);
                // We'll continue even if this fails, as the class creation is more important
            }
        }

        const insertPayload: any = {
            title: payload.title,
            meeting_link: payload.meeting_link,
            scheduled_at: payload.scheduled_at,
            module_id: payload.module_id || null,
            course_id: payload.course_id || null,
            student_id: payload.student_id,
            duration_hours: payload.duration_hours || 1.0,
            teacher_id: teacherId
        };

        if (payload.parent_note) {
            insertPayload.parent_note = payload.parent_note;
        }

        const { error: insertError } = await supabase
            .from('live_classes')
            .insert(insertPayload);

        if (insertError) {
            console.error("Error inserting live class:", insertError);
            return { error: insertError.message };
        }

        revalidatePath('/(dashboard)', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in createLiveClass:", error);
        return { error: error.message || "An unexpected error occurred" };
    }
}

export async function cancelLiveClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const allowedRoles = ['admin', 'super_admin', 'operations', 'teacher'];
        if (!allowedRoles.includes(profile?.role || '')) {
            return { success: false, error: "Unauthorized to cancel class sessions" };
        }

        const { error } = await supabase
            .from('live_classes')
            .update({
                status: 'cancelled'
            })
            .eq('id', classId);

        if (error) {
            console.error("Error cancelling live class:", error);
            return { success: false, error: error.message };
        }

        revalidatePath('/(dashboard)', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in cancelLiveClass:", error);
        return { success: false, error: error.message || "An unexpected error occurred" };
    }
}


export async function getAllTeachers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
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
        console.error("getAllTeachers error:", error);
        return [];
    }

    const filtered = (data || []).filter((t: any) => {
        if (currentUserRole === 'super_admin') return true;
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return details?.status !== 'locked';
    });

    return filtered.map((t: any) => ({
        id: t.id,
        full_name: t.full_name,
        email: t.email
    }));
}

export async function getAllStudentsAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email,
            student_details!student_details_id_fkey (
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey (
                    staff_details (status)
                )
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getAllStudentsAdmin error:", error);
        return [];
    }

    const filtered = (data || []).filter((s: any) => {
        if (currentUserRole === 'super_admin') return true;
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        const assignedTeacher = details?.assigned_teacher;
        const teacherDetails = Array.isArray(assignedTeacher?.staff_details) ? assignedTeacher?.staff_details[0] : assignedTeacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    return filtered.map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email
    }));
}

export async function getCurrentProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.error("getCurrentProfile error:", error);
        return null;
    }
    return profile;
}

export async function completeLiveClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Just mark class as completed and pending verification
    const { error: updateError } = await supabase
        .from('live_classes')
        .update({ 
            status: 'completed',
            verification_status: 'pending'
        })
        .eq('id', classId);

    if (updateError) {
        console.error("completeLiveClass error:", updateError);
        return { success: false, error: updateError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

// --- Student Attendance ---

export async function markStudentAttendance(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('student_attendance')
        .upsert({
            class_id: classId,
            student_id: studentId,
            status,
            marked_by: user.id
        }, {
            onConflict: 'class_id,student_id'
        });

    if (error) throw error;
    return { success: true };
}

export async function getStudentAttendance(studentId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = studentId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('student_attendance')
        .select(`
            *,
            class:live_classes(*)
        `)
        .eq('student_id', targetId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

// --- Teacher Attendance ---

export async function finalizeClassSession(
    classId: string, 
    studentAttendances: {studentId: string, status: 'present'|'absent'|'late'}[],
    topicTaught: string,
    homeworkGiven: string,
    studentPerformance: string,
    parentNote: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Tutors cannot edit attendance logs once submitted
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const { data: classObj } = await supabase
        .from('live_classes')
        .select('status, scheduled_at')
        .eq('id', classId)
        .single();

    if (profile?.role === 'teacher') {
        if (classObj?.status === 'completed') {
            return { 
                success: false, 
                error: "Tutors cannot edit attendance logs once submitted. Please contact HR or Operations to request changes." 
            };
        }
        if (classObj?.scheduled_at) {
            const scheduledTime = new Date(classObj.scheduled_at).getTime();
            const elapsed = new Date().getTime() - scheduledTime;
            if (elapsed > 24 * 60 * 60 * 1000) {
                return {
                    success: false,
                    error: "This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session. Please contact HR or Operations to log this session."
                };
            }
        }
    }

    // Save all student attendances
    for (const att of studentAttendances) {
        const { error } = await supabase
            .from('student_attendance')
            .upsert({
                class_id: classId,
                student_id: att.studentId,
                status: att.status,
                marked_by: user.id
            }, { onConflict: 'class_id,student_id' });
            
        if (error) {
            console.error("finalizeClassSession Error:", error);
            return { success: false, error: error.message };
        }
    }

    // Update live_classes with status, verification_status and post-class logs
    const { error: updateError } = await supabase
        .from('live_classes')
        .update({ 
            status: 'completed',
            verification_status: 'pending',
            topic_taught: topicTaught,
            homework_given: homeworkGiven,
            student_performance: studentPerformance,
            parent_note: parentNote
        })
        .eq('id', classId);

    if (updateError) {
        console.error("finalizeClassSession Live Class Update Error:", updateError);
        return { success: false, error: updateError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

// --- Teacher Action Loggers ---

export async function assignHomework(studentId: string, title: string, description: string, dueDate: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('homework_assignments')
        .insert({
            student_id: studentId,
            teacher_id: user.id,
            title,
            description,
            due_date: dueDate || null,
            status: 'assigned'
        });

    if (error) {
        console.error("assignHomework Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function uploadMaterial(studentId: string, title: string, fileUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('student_materials')
        .insert({
            student_id: studentId,
            teacher_id: user.id,
            title,
            file_url: fileUrl
        });

    if (error) {
        console.error("uploadMaterial Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function requestReschedule(classId: string | null, studentId: string, requestedDate: string, requestedTime: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Resolve teacher_id:
    let teacherId = null;
    if (classId) {
        const { data: classData } = await supabase
            .from('live_classes')
            .select('teacher_id')
            .eq('id', classId)
            .single();
        teacherId = classData?.teacher_id;
    }
    
    if (!teacherId) {
        const { data: studentDetails } = await supabase
            .from('student_details')
            .select('assigned_teacher_id')
            .eq('id', studentId)
            .single();
        teacherId = studentDetails?.assigned_teacher_id;
    }

    if (!teacherId) {
        return { success: false, error: "Could not find teacher for this student or class." };
    }

    const { error } = await supabase
        .from('reschedule_requests')
        .insert({
            class_id: classId || null,
            student_id: studentId,
            teacher_id: teacherId,
            requested_date: requestedDate,
            requested_time: requestedTime,
            reason,
            status: 'pending'
        });

    if (error) {
        console.error("requestReschedule Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function applyForLeave(startDate: string, endDate: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Find assigned teacher
    const { data: studentDetails } = await supabase
        .from('student_details')
        .select('assigned_teacher_id')
        .eq('id', user.id)
        .maybeSingle();

    const teacherId = studentDetails?.assigned_teacher_id || null;

    const { error } = await supabase
        .from('student_leaves')
        .insert({
            student_id: user.id,
            teacher_id: teacherId,
            start_date: startDate,
            end_date: endDate,
            reason,
            status: 'pending'
        });

    if (error) {
        console.error("applyForLeave Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getTeacherRequestsData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { rescheduleRequests: [], leaveRequests: [] };

    const { data: rescheduleRequests, error: resError } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(full_name, email)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

    if (resError) console.error("Error fetching teacher reschedule requests:", resError);

    const { data: leaveRequests, error: leaveError } = await supabase
        .from('student_leaves')
        .select(`
            *,
            student:profiles!student_id(full_name, email)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

    if (leaveError) console.error("Error fetching teacher leave requests:", leaveError);

    return {
        rescheduleRequests: rescheduleRequests || [],
        leaveRequests: leaveRequests || []
    };
}

export async function getAllRequestsData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { rescheduleRequests: [], leaveRequests: [] };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data: rescheduleRequests, error: resError } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(full_name, email),
            teacher:profiles!teacher_id(
                full_name,
                staff_details (status)
            )
        `)
        .order('created_at', { ascending: false });

    if (resError) console.error("Error fetching all reschedule requests:", resError);

    const { data: leaveRequests, error: leaveError } = await supabase
        .from('student_leaves')
        .select(`
            *,
            student:profiles!student_id(full_name, email, role),
            teacher:profiles!teacher_id(
                full_name,
                staff_details (status)
            )
        `)
        .order('created_at', { ascending: false });

    if (leaveError) console.error("Error fetching all leave requests:", leaveError);

    const filteredRescheduleRequests = (rescheduleRequests || []).filter((r: any) => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(r.teacher?.staff_details) ? r.teacher?.staff_details[0] : r.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    const filteredLeaveRequests = (leaveRequests || []).filter((l: any) => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(l.teacher?.staff_details) ? l.teacher?.staff_details[0] : l.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    return {
        rescheduleRequests: filteredRescheduleRequests,
        leaveRequests: filteredLeaveRequests
    };
}

export async function updateRescheduleStatus(requestId: string, status: 'approved' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('reschedule_requests')
        .update({ status: status })
        .eq('id', requestId);

    if (error) {
        console.error("updateRescheduleStatus Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('student_leaves')
        .update({ status: status })
        .eq('id', leaveId);

    if (error) {
        console.error("updateLeaveStatus Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getStudentHistory(studentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { classes: [], homework: [], materials: [], reschedule: [] };

    // 1. Fetch completed live classes with logs
    const { data: classes, error: classError } = await supabase
        .from('live_classes')
        .select(`
            *,
            course:courses(title),
            student_attendance(status)
        `)
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

    if (classError) console.error("Error fetching student class history:", classError);

    // 2. Fetch homework assignments
    const { data: homework, error: hwError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (hwError) console.error("Error fetching student homework:", hwError);

    // 3. Fetch uploaded materials
    const { data: materials, error: matError } = await supabase
        .from('student_materials')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (matError) console.error("Error fetching student materials:", matError);

    // 4. Fetch reschedule requests
    const { data: reschedule, error: resError } = await supabase
        .from('reschedule_requests')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (resError) console.error("Error fetching student reschedule requests:", resError);

    return {
        classes: classes || [],
        homework: homework || [],
        materials: materials || [],
        reschedule: reschedule || []
    };
}

export async function updateStudentAttendanceHR(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
        .from('student_attendance')
        .update({ status: status })
        .eq('class_id', classId)
        .eq('student_id', studentId);

    if (error) {
        console.error("updateStudentAttendanceHR Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function verifyClassAttendance(classId: string, verificationStatus: 'verified' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update the live_classes record bypassing RLS
    const { data: classData, error } = await supabaseAdmin
        .from('live_classes')
        .update({
            verification_status: verificationStatus,
            verified_by: user.id
        })
        .eq('id', classId)
        .select(`
            *,
            teacher:profiles!teacher_id(
                id,
                staff_details(hourly_rate)
            )
        `)
        .single();

    if (error) {
        console.error("verifyClassAttendance admin update error:", error)
        throw error;
    }

    // 2. Automate Payroll Calculation if Verified
    if (verificationStatus === 'verified' && classData) {
        const teacherProfile = classData.teacher as any;
        const hourlyRate = teacherProfile?.staff_details?.hourly_rate || 0;
        const duration = Number(classData.duration_hours) || 1.0;

        if (hourlyRate > 0) {
            const sessionPay = duration * Number(hourlyRate);

            // Find or create active payroll run for the scheduled month
            const scheduledDate = new Date(classData.scheduled_at);
            const classMonth = scheduledDate.getMonth() + 1; // 1-12
            const classYear = scheduledDate.getFullYear();

            let { data: payrollRun } = await supabaseAdmin
                .from('payroll_runs')
                .select('id')
                .eq('month', classMonth)
                .eq('year', classYear)
                .single();

            if (!payrollRun) {
                const { data: newRun } = await supabaseAdmin
                    .from('payroll_runs')
                    .insert({ month: classMonth, year: classYear })
                    .select()
                    .single();
                payrollRun = newRun;
            }

            if (payrollRun) {
                const { data: existingItem } = await supabaseAdmin
                    .from('payroll_items')
                    .select('*')
                    .eq('payroll_run_id', payrollRun.id)
                    .eq('staff_id', classData.teacher_id)
                    .single();

                if (existingItem) {
                    await supabaseAdmin
                        .from('payroll_items')
                        .update({ amount: Number(existingItem.amount) + sessionPay })
                        .eq('id', existingItem.id);
                } else {
                    await supabaseAdmin
                        .from('payroll_items')
                        .insert({
                            payroll_run_id: payrollRun.id,
                            staff_id: classData.teacher_id,
                            amount: sessionPay
                        });
                }
            }
        }
    }

    revalidatePath('/(dashboard)/hr', 'page');
    revalidatePath('/(dashboard)/admin', 'page');
    return { success: true };
}

export async function getPendingClassVerifications() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name, 
                email,
                staff_details (status)
            ),
            course:courses(title)
        `)
        .eq('status', 'completed')
        .eq('verification_status', 'pending')
        .order('scheduled_at', { ascending: false });

    if (error) throw error;

    const filtered = (data || []).filter((c: any) => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch students manually
    const studentIds = filtered.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return filtered.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return filtered;
}

export async function getTeacherCompletedClasses(teacherId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const targetId = teacherId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            *,
            course:courses(title),
            student_attendance(status, student_id)
        `)
        .eq('teacher_id', targetId)
        .order('scheduled_at', { ascending: false })
        .limit(90);

    if (error) throw error;
    
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return data;
}

export async function getAllCompletedClassLogs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name, 
                email,
                staff_details (status)
            ),
            course:courses(title),
            student_attendance(status, student_id)
        `)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

    if (error) {
        console.error("Error fetching all completed class logs:", error);
        return [];
    }

    const filtered = (data || []).filter((c: any) => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch students manually
    const studentIds = filtered.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return filtered.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return filtered;
}

export async function updateTeacherAttendance(
    teacherId: string, 
    dateStr: string, 
    status: 'present' | 'absent' | 'on_leave', 
    verificationStatus: 'pending' | 'verified' | 'rejected' = 'pending'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is HR/Admin to verify
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const verifiedBy = (profile?.role === 'hr' || profile?.role === 'admin' || profile?.role === 'super_admin') ? user.id : null;

    const { error } = await supabase
        .from('teacher_attendance')
        .upsert({
            teacher_id: teacherId,
            date: dateStr,
            status,
            verified_by: verifiedBy,
            verification_status: verificationStatus
        }, {
            onConflict: 'teacher_id,date'
        });

    if (error) {
        console.error("updateTeacherAttendance Error:", error);
        throw error;
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function markTeacherAttendance(status: 'present' | 'absent' | 'on_leave') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dateStr = new Date().toISOString().split('T')[0];

    const { error } = await supabase
        .from('teacher_attendance')
        .upsert({
            teacher_id: user.id,
            date: dateStr,
            status,
            verification_status: 'pending'
        }, {
            onConflict: 'teacher_id,date'
        });

    if (error) {
        console.error("markTeacherAttendance Error:", error);
        throw error;
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getAttendanceToday() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dateStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

    if (error) {
        console.error("getAttendanceToday Error:", error);
        return null;
    }

    return data;
}

export async function getAttendanceHistory(teacherId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = teacherId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', targetId)
        .order('date', { ascending: false });

    if (error) {
        console.error("getAttendanceHistory Error:", error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        date: r.date,
        status: r.status as 'present' | 'absent' | 'on_leave',
        verification_status: r.verification_status as 'pending' | 'verified' | 'rejected'
    }));
}

export async function getStudentDashboardData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { todayClasses: [], upcomingClass: null, allCalendarClasses: [], homework: [], materials: [], details: null, attendanceHistory: [], completedClasses: [] };

    // 1. Fetch live classes
    const { data: classesData, error: classesError } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('scheduled_at', { ascending: true });

    if (classesError) throw classesError;

    // 2. Fetch active homework
    const { data: homeworkData } = await supabase
        .from('homework_assignments')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

    // 3. Fetch shared materials
    const { data: materialsData } = await supabase
        .from('student_materials')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // 4. Fetch student details (fees & billing info)
    const { data: detailsData } = await supabase
        .from('student_details')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    // 5. Fetch attendance logs
    const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select(`
            *,
            class:live_classes(title, scheduled_at)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // 6. Fetch reschedule requests
    const { data: rescheduleRequests } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // 7. Fetch leave requests
    const { data: leaveRequests } = await supabase
        .from('student_leaves')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // Process classes: today's classes, next upcoming class, other classes
    const todayStr = new Date().toDateString();
    const now = new Date();

    const todayClasses = (classesData || []).filter(c => new Date(c.scheduled_at).toDateString() === todayStr);
    
    // Future classes scheduled after today (or after right now)
    const futureClasses = (classesData || []).filter(c => {
        const date = new Date(c.scheduled_at);
        return date.toDateString() !== todayStr && isAfter(date, now);
    });

    const upcomingClass = futureClasses.length > 0 ? futureClasses[0] : null;
    const completedClasses = (classesData || []).filter(c => c.status === 'completed');

    return {
        todayClasses,
        upcomingClass,
        allCalendarClasses: classesData || [],
        homework: homeworkData || [],
        materials: materialsData || [],
        details: detailsData || null,
        attendanceHistory: attendanceData || [],
        completedClasses,
        rescheduleRequests: rescheduleRequests || [],
        leaveRequests: leaveRequests || []
    };
}

export async function submitHomework(homeworkId: string, submissionUrl: string, submissionNotes?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('homework_assignments')
        .update({
            status: 'submitted',
            submission_url: submissionUrl,
            submission_notes: submissionNotes || null
        })
        .eq('id', homeworkId);

    if (error) {
        console.error("submitHomework Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getTeacherMissingAttendanceClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const nowStr = now.toISOString();

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            id,
            title,
            scheduled_at,
            student_id
        `)
        .eq('teacher_id', user.id)
        .eq('status', 'scheduled')
        .lt('scheduled_at', nowStr)
        .gte('scheduled_at', oneDayAgo)
        .order('scheduled_at', { ascending: false });

    if (error) {
        console.error("getTeacherMissingAttendanceClasses error:", error);
        return [];
    }

    // Fetch student profile names
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return data;
}

export async function adminEditAttendance(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Check caller's role - must be admin, super_admin, hr, or operations
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { success: false, error: "Unauthorized: Only HR and Operations can edit finalized attendance." };
    }

    // Upsert the attendance status
    const { error: attError } = await supabase
        .from('student_attendance')
        .upsert({
            class_id: classId,
            student_id: studentId,
            status: status,
            marked_by: user.id
        }, {
            onConflict: 'class_id,student_id'
        });

    if (attError) {
        console.error("adminEditAttendance error:", attError);
        return { success: false, error: attError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getStudentsWithClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    // Fetch students with their profiles and details
    const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            student_details!student_details_id_fkey (
                grade_level,
                monthly_fee,
                status,
                assigned_teacher_id,
                preferred_meeting_link,
                preferred_time,
                classes_per_month,
                custom_student_id,
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey (
                    staff_details (status)
                )
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (studentsError) {
        console.error("getStudentsWithClasses error:", studentsError);
        return [];
    }

    const filteredStudents = (students || []).filter((s: any) => {
        if (currentUserRole === 'super_admin') return true;
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        const assignedTeacher = details?.assigned_teacher;
        const teacherDetails = Array.isArray(assignedTeacher?.staff_details) ? assignedTeacher?.staff_details[0] : assignedTeacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch all live classes
    const { data: classes, error: classesError } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name,
                staff_details (status)
            )
        `)
        .order('scheduled_at', { ascending: true });

    if (classesError) {
        console.error("getStudentsWithClasses classes error:", classesError);
        return [];
    }

    const filteredClasses = (classes || []).filter((c: any) => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch all teachers for mapping/reference
    const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher');

    const teacherMap = Object.fromEntries(teachers?.map(t => [t.id, t.full_name]) || []);

    // Group classes by student_id
    const classesByStudent: Record<string, any[]> = {};
    filteredClasses.forEach(c => {
        if (c.student_id) {
            if (!classesByStudent[c.student_id]) {
                classesByStudent[c.student_id] = [];
            }
            classesByStudent[c.student_id].push(c);
        }
    });

    return filteredStudents.map((s: any) => {
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        return {
            id: s.id,
            full_name: s.full_name,
            email: s.email,
            grade_level: details?.grade_level || 'N/A',
            monthly_fee: details?.monthly_fee || 0,
            status: details?.status || 'active',
            assigned_teacher_id: details?.assigned_teacher_id || null,
            assigned_teacher_name: details?.assigned_teacher_id ? (teacherMap[details.assigned_teacher_id] || 'Unknown Tutor') : 'None Assigned',
            preferred_meeting_link: details?.preferred_meeting_link || '',
            preferred_time: details?.preferred_time || '',
            classes_per_month: details?.classes_per_month || 12,
            custom_student_id: details?.custom_student_id || null,
            classes: classesByStudent[s.id] || []
        };
    });
}

export async function assignTutorToStudent(studentId: string, teacherId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { success: false, error: "Unauthorized" };
    }

    if (profile?.role !== 'super_admin') {
        if (teacherId) {
            const { data: teacherDetails } = await adminClient
                .from('staff_details')
                .select('status')
                .eq('id', teacherId)
                .maybeSingle();

            if (teacherDetails?.status === 'locked') {
                return { success: false, error: "Unauthorized: Cannot assign a locked tutor." };
            }
        }

        const { data: currentStudent } = await adminClient
            .from('student_details')
            .select(`
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(
                    staff_details(status)
                )
            `)
            .eq('id', studentId)
            .maybeSingle();

        const teacherData = currentStudent?.assigned_teacher as any;
        const teacher = Array.isArray(teacherData) ? teacherData[0] : teacherData;
        const staffDetails = Array.isArray(teacher?.staff_details) ? teacher.staff_details[0] : teacher?.staff_details;
        const isAssignedToLocked = staffDetails?.status === 'locked';

        if (isAssignedToLocked) {
            return { success: false, error: "Unauthorized: Only Super Admin can change assignments of private students." };
        }
    }

    const { error } = await supabase
        .from('student_details')
        .upsert({
            id: studentId,
            assigned_teacher_id: teacherId || null
        }, {
            onConflict: 'id'
        });

    if (error) {
        console.error("assignTutorToStudent error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function onboardStudent(payload: {
    fullName: string;
    email: string;
    gradeLevel: string;
    monthlyFee: number;
    classesPerMonth?: number;
    assignedTeacherId?: string;
    customStudentId?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const adminClient = createAdminClient();

    // Security: Check caller's role
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations', 'sales'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { error: "Unauthorized" };
    }

    // 1. Create the user in Auth with password 'password123'
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: payload.fullName,
            role: 'student'
        }
    });

    if (authError) {
        console.error("Auth creation failed during onboarding:", authError);
        return { error: authError.message };
    }

    const newStudentId = authUser.user.id;

    // 2. Ensure the profile row exists (use adminClient to bypass RLS)
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: newStudentId,
            email: payload.email,
            full_name: payload.fullName,
            role: 'student'
        });

    if (profileError) {
        console.error("Profile update failed during onboarding:", profileError);
        return { error: profileError.message };
    }

    // 3. Create/Upsert the entry in student_details (use adminClient to bypass RLS)
    const { error: detailsError } = await adminClient
        .from('student_details')
        .upsert({
            id: newStudentId,
            grade_level: payload.gradeLevel,
            monthly_fee: payload.monthlyFee,
            assigned_teacher_id: payload.assignedTeacherId || null,
            status: 'active',
            classes_per_month: payload.classesPerMonth || 12,
            custom_student_id: payload.customStudentId || null
        });

    if (detailsError) {
        console.error("Student details creation failed during onboarding:", detailsError);
        return { error: detailsError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true, studentId: newStudentId };
}

export async function logTutorJoinClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Set tutor_joined_at to NOW() and change class status to 'ongoing' if it was 'scheduled'
    const { data: classData, error: fetchError } = await supabase
        .from('live_classes')
        .select('status, tutor_joined_at')
        .eq('id', classId)
        .single();

    if (fetchError) {
        console.error("logTutorJoinClass fetch error:", fetchError);
        return { success: false, error: fetchError.message };
    }

    const updates: any = {};
    if (!classData.tutor_joined_at) {
        updates.tutor_joined_at = new Date().toISOString();
    }
    if (classData.status === 'scheduled') {
        updates.status = 'ongoing';
    }

    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('live_classes')
            .update(updates)
            .eq('id', classId);

        if (updateError) {
            console.error("logTutorJoinClass update error:", updateError);
            return { success: false, error: updateError.message };
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function logStudentJoinClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: classData, error: fetchError } = await supabase
        .from('live_classes')
        .select('student_joined_at')
        .eq('id', classId)
        .single();

    if (fetchError) {
        console.error("logStudentJoinClass fetch error:", fetchError);
        return { success: false, error: fetchError.message };
    }

    if (!classData.student_joined_at) {
        const { error: updateError } = await supabase
            .from('live_classes')
            .update({ student_joined_at: new Date().toISOString() })
            .eq('id', classId);

        if (updateError) {
            console.error("logStudentJoinClass update error:", updateError);
            return { success: false, error: updateError.message };
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function submitCompletedWorksheet(title: string, fileUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('student_materials')
        .insert({
            student_id: user.id,
            teacher_id: null,
            title: `[Submitted Worksheet] ${title}`,
            file_url: fileUrl
        });

    if (error) {
        console.error("submitCompletedWorksheet error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getClassLogsForMonth(year: number, month: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile) return [];

    // Construct start and end bounds of the month in UTC
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    let query = supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(id, full_name, email),
            student:profiles!student_id(id, full_name, email),
            student_attendance(status, marked_by)
        `)
        .gte('scheduled_at', startDate.toISOString())
        .lt('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

    if (profile.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
    } else if (profile.role === 'student' || profile.role === 'parent') {
        query = query.eq('student_id', user.id);
    }

    const { data: classes, error } = await query;
    if (error) {
        console.error("Error fetching class logs for month:", error);
        return [];
    }

    return classes;
}

export async function modifyClassLog(
    classId: string,
    status: string,
    scheduledAt: string,
    studentAttendanceStatus: string | null,
    topicTaught: string,
    homeworkGiven: string,
    studentPerformance: string,
    parentNote: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['hr', 'super_admin'].includes(profile.role)) {
        return { success: false, error: "Access denied. Only HR and Super Admin can modify class logs." };
    }

    // 1. Update live class status, scheduled_at and post-class logging details
    const { error: updateClassError } = await supabase
        .from('live_classes')
        .update({
            status: status,
            scheduled_at: scheduledAt,
            topic_taught: topicTaught || null,
            homework_given: homeworkGiven || null,
            student_performance: studentPerformance || null,
            parent_note: parentNote || null
        })
        .eq('id', classId);

    if (updateClassError) {
        console.error("modifyClassLog live_classes update error:", updateClassError);
        return { success: false, error: updateClassError.message };
    }

    // 2. Handle student attendance updates
    const { data: classObj } = await supabase
        .from('live_classes')
        .select('student_id')
        .eq('id', classId)
        .single();

    if (classObj?.student_id) {
        if (studentAttendanceStatus && studentAttendanceStatus !== '') {
            // Upsert attendance record
            const { error: upsertError } = await supabase
                .from('student_attendance')
                .upsert({
                    class_id: classId,
                    student_id: classObj.student_id,
                    status: studentAttendanceStatus as any,
                    marked_by: user.id
                }, { onConflict: 'class_id,student_id' });

            if (upsertError) {
                console.error("modifyClassLog student_attendance upsert error:", upsertError);
                return { success: false, error: upsertError.message };
            }
        } else {
            // Delete attendance record if empty/null
            const { error: deleteError } = await supabase
                .from('student_attendance')
                .delete()
                .eq('class_id', classId)
                .eq('student_id', classObj.student_id);

            if (deleteError) {
                console.error("modifyClassLog student_attendance delete error:", deleteError);
                return { success: false, error: deleteError.message };
            }
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

