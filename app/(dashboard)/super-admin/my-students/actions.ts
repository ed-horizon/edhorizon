"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { formatStudentIdAndMobile } from "@/lib/utils";

// Helper security check: ensure the caller is indeed super_admin
async function checkSuperAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isSuperAdmin: false, userId: null };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return { isSuperAdmin: profile?.role === 'super_admin', userId: user.id };
}

// 1. Get Private Tutors (locked)
export async function getPrivateTutors() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            staff_details!inner (*)
        `)
        .eq('role', 'teacher')
        .eq('staff_details.status', 'locked')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getPrivateTutors error:", error);
        return [];
    }

    return (data || []).map((t: any) => ({
        ...t,
        staff_details: Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details
    }));
}

// 2. Get Private Students
export async function getPrivateStudents() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data: allStudents, error } = await supabase
        .from('profiles')
        .select(`
            *,
            student_details!student_details_id_fkey (
                *,
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey (
                    full_name,
                    staff_details (status)
                )
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getPrivateStudents error:", error);
        return [];
    }

    const processed = (allStudents || []).map((s: any) => ({
        ...s,
        student_details: Array.isArray(s.student_details) ? s.student_details[0] : s.student_details
    }));

    return processed.filter((s: any) => {
        const assignedTeacher = s.student_details?.assigned_teacher;
        const teacherDetails = Array.isArray(assignedTeacher?.staff_details)
            ? assignedTeacher?.staff_details[0]
            : assignedTeacher?.staff_details;
        return teacherDetails?.status === 'locked';
    });
}

// 3. Get Private Schedules
export async function getPrivateSchedules() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data: schedules, error } = await supabase
        .from('class_schedules')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name,
                email,
                staff_details (status)
            ),
            student:profiles!student_id(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("getPrivateSchedules error:", error);
        return [];
    }

    return (schedules || []).filter((sch: any) => {
        const teacherDetails = Array.isArray(sch.teacher?.staff_details) ? sch.teacher?.staff_details[0] : sch.teacher?.staff_details;
        return teacherDetails?.status === 'locked';
    });
}

// 4. Get Private Class Logs (completed/pending/ongoing classes)
export async function getPrivateClassLogs() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();
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
        .order('scheduled_at', { ascending: false });

    if (error) {
        console.error("getPrivateClassLogs error:", error);
        return [];
    }

    const filtered = (data || []).filter((c: any) => {
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status === 'locked';
    });

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

// 5. Get Private Reschedules & Leaves
export async function getPrivateRequests() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data: rescheduleRequests } = await supabase
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

    const { data: leaveRequests } = await supabase
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

    const filteredRescheduleRequests = (rescheduleRequests || []).filter((r: any) => {
        const teacherDetails = Array.isArray(r.teacher?.staff_details) ? r.teacher?.staff_details[0] : r.teacher?.staff_details;
        return teacherDetails?.status === 'locked';
    });

    const filteredLeaveRequests = (leaveRequests || []).filter((l: any) => {
        const teacherDetails = Array.isArray(l.teacher?.staff_details) ? l.teacher?.staff_details[0] : l.teacher?.staff_details;
        return teacherDetails?.status === 'locked';
    });

    return {
        rescheduleRequests: filteredRescheduleRequests,
        leaveRequests: filteredLeaveRequests
    };
}

// 6. Get Private Payments
export async function getPrivatePayments() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('payments')
        .select(`
            *,
            student:profiles!student_id(
                full_name,
                email,
                student_details!student_details_id_fkey(
                    assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(
                        staff_details (status)
                    )
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("getPrivatePayments error:", error);
        return [];
    }

    return (data || []).filter((p: any) => {
        const details = Array.isArray(p.student?.student_details) ? p.student?.student_details[0] : p.student?.student_details;
        const teacherDetails = Array.isArray(details?.assigned_teacher?.staff_details)
            ? details?.assigned_teacher?.staff_details[0]
            : details?.assigned_teacher?.staff_details;
        return teacherDetails?.status === 'locked';
    });
}

// 7. Create Private Tutor (onboarding directly with 'locked' status)
export async function createPrivateTutor(data: { full_name: string; email: string; employee_id?: string }) {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) return { error: "Unauthorized" };

    const adminClient = createAdminClient();

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: data.full_name,
            role: 'teacher'
        }
    });

    if (inviteError) {
        console.error("Error creating private tutor:", inviteError);
        return { error: inviteError.message };
    }

    if (inviteData?.user) {
        const { error: updateError } = await adminClient
            .from("staff_details")
            .upsert({
                id: inviteData.user.id,
                employee_id: data.employee_id || null,
                status: 'locked',
                joining_date: new Date().toISOString().split('T')[0]
            });
            
        if (updateError) {
            console.error("Error setting details on private tutor:", updateError);
        }
    }

    revalidatePath("/super-admin/my-students");
    return { success: true };
}

// 8. Create Private Student (assigned to a locked tutor)
export async function createPrivateStudent(data: {
    full_name: string;
    email: string;
    grade_level: string;
    monthly_fee?: number;
    classes_per_month?: number;
    tutor_hourly_rate?: number | null;
    custom_student_id?: string;
    mobile_number: string;
    assigned_teacher_id: string;
}) {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) return { error: "Unauthorized" };

    const adminClient = createAdminClient();

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: data.full_name,
            role: 'student'
        }
    });

    if (inviteError) {
        console.error("Error inviting private student:", inviteError);
        return { error: inviteError.message };
    }

    const serializedId = formatStudentIdAndMobile(data.custom_student_id, data.mobile_number);

    if (inviteData?.user) {
        const { error: updateError } = await adminClient
            .from("student_details")
            .upsert({
                id: inviteData.user.id,
                grade_level: data.grade_level,
                monthly_fee: data.monthly_fee !== undefined ? data.monthly_fee : 4500,
                classes_per_month: data.classes_per_month !== undefined ? data.classes_per_month : 12,
                tutor_hourly_rate: data.tutor_hourly_rate !== undefined ? data.tutor_hourly_rate : null,
                status: 'active',
                custom_student_id: serializedId,
                assigned_teacher_id: data.assigned_teacher_id
            });

        if (updateError) {
            console.error("Error upserting private student details:", updateError);
        }
    }

    revalidatePath("/super-admin/my-students");
    return { success: true };
}

// 9. Get Private Students With Classes (Flattened for StudentClassMonitor)
export async function getPrivateStudentsWithClasses() {
    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) throw new Error("Unauthorized");

    const supabase = await createClient();

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
        console.error("getPrivateStudentsWithClasses error:", studentsError);
        return [];
    }

    const filteredStudents = (students || []).filter((s: any) => {
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        const assignedTeacher = details?.assigned_teacher;
        const teacherDetails = Array.isArray(assignedTeacher?.staff_details) ? assignedTeacher?.staff_details[0] : assignedTeacher?.staff_details;
        return teacherDetails?.status === 'locked';
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
        console.error("getPrivateStudentsWithClasses classes error:", classesError);
        return [];
    }

    const filteredClasses = (classes || []).filter((c: any) => {
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status === 'locked';
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
