'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function getAdmin() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createAdminClient();
    }
    return null;
}

export type BatchStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type BatchSessionStatus = 'scheduled' | 'completed' | 'not_conducted' | 'rescheduled' | 'cancelled';
export type FeeStatus = 'unpaid' | 'paid' | 'partially_paid' | 'waived';

export interface BatchSummary {
    id: string;
    name: string;
    course_name: string;
    course_id: string | null;
    teacher_id: string | null;
    capacity: number;
    start_date: string;
    end_date: string | null;
    schedule_description: string;
    meeting_link: string | null;
    status: BatchStatus;
    agreed_tutor_payout: number;
    default_course_fee: number;
    notes: string | null;
    created_at: string;
    teacher: {
        id: string;
        full_name: string;
        email: string;
    } | null;
    enrolled_count: number;
    total_sessions: number;
    completed_sessions: number;
    total_expected_fees: number;
    total_collected_fees: number;
}

/**
 * Check if the user is authorized as staff (Super Admin, Admin, Operations)
 */
async function getAuthenticatedUserRole() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, role: null };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return { user, role: profile?.role || null };
}

/**
 * Fetch all batches accessible to the current user
 */
export async function getBatches(filters?: { status?: string; teacherId?: string; search?: string }) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return [];

    const admin = getAdmin() || await createClient();

    let query = admin
        .from('batches')
        .select(`
            *,
            teacher:profiles!batches_teacher_id_fkey(id, full_name, email),
            batch_enrollments(id, course_fee, paid_amount, fee_status),
            batch_sessions(id, status)
        `)
        .order('created_at', { ascending: false });

    // Filter by role: teachers only see their batches, students see enrolled batches
    if (role === 'teacher') {
        query = query.eq('teacher_id', user.id);
    } else if (role === 'student') {
        // Enrolled batches handled via separate student helper or RLS
        const { data: myEnrollments } = await admin
            .from('batch_enrollments')
            .select('batch_id')
            .eq('student_id', user.id);
        const batchIds = (myEnrollments || []).map(e => e.batch_id);
        if (batchIds.length === 0) return [];
        query = query.in('id', batchIds);
    }

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    if (filters?.teacherId) {
        query = query.eq('teacher_id', filters.teacherId);
    }

    const { data, error } = await query;
    if (error) {
        console.error("getBatches error:", error);
        return [];
    }

    let results = (data || []).map((b: any) => {
        const enrollments = b.batch_enrollments || [];
        const sessions = b.batch_sessions || [];

        const totalExpected = enrollments.reduce((sum: number, e: any) => sum + Number(e.course_fee || 0), 0);
        const totalCollected = enrollments.reduce((sum: number, e: any) => sum + Number(e.paid_amount || 0), 0);
        const completedSessions = sessions.filter((s: any) => s.status === 'completed').length;

        return {
            id: b.id,
            name: b.name,
            course_name: b.course_name,
            course_id: b.course_id,
            teacher_id: b.teacher_id,
            capacity: b.capacity,
            start_date: b.start_date,
            end_date: b.end_date,
            schedule_description: b.schedule_description,
            meeting_link: b.meeting_link,
            status: b.status,
            agreed_tutor_payout: Number(b.agreed_tutor_payout || 0),
            default_course_fee: Number(b.default_course_fee || 0),
            notes: b.notes,
            created_at: b.created_at,
            teacher: b.teacher || null,
            enrolled_count: enrollments.length,
            total_sessions: sessions.length,
            completed_sessions: completedSessions,
            total_expected_fees: totalExpected,
            total_collected_fees: totalCollected,
        } as BatchSummary;
    });

    if (filters?.search) {
        const term = filters.search.toLowerCase();
        results = results.filter(b =>
            b.name.toLowerCase().includes(term) ||
            b.course_name.toLowerCase().includes(term) ||
            (b.teacher?.full_name || '').toLowerCase().includes(term)
        );
    }

    return results;
}

/**
 * Fetch full details for a single batch
 */
export async function getBatchById(batchId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return null;

    const admin = getAdmin() || await createClient();

    // 1. Fetch Batch
    const { data: batch, error: batchError } = await admin
        .from('batches')
        .select(`
            *,
            teacher:profiles!batches_teacher_id_fkey(id, full_name, email)
        `)
        .eq('id', batchId)
        .single();

    if (batchError || !batch) {
        console.error("getBatchById error:", batchError);
        return null;
    }

    // 2. Fetch Enrolled Students
    const { data: enrollments, error: enrollError } = await admin
        .from('batch_enrollments')
        .select(`
            *,
            student:profiles!batch_enrollments_student_id_fkey(
                id,
                full_name,
                email,
                avatar_url,
                student_details!student_details_id_fkey(phone, enrollment_status, custom_student_id)
            )
        `)
        .eq('batch_id', batchId)
        .order('enrolled_at', { ascending: true });

    if (enrollError) {
        console.error("getBatchById enrollments error:", enrollError);
    }

    // 3. Fetch Sessions
    const { data: sessions, error: sessionsError } = await admin
        .from('batch_sessions')
        .select(`
            *,
            conducted_by_profile:profiles!batch_sessions_conducted_by_fkey(id, full_name)
        `)
        .eq('batch_id', batchId)
        .order('scheduled_at', { ascending: true });

    if (sessionsError) {
        console.error("getBatchById sessions error:", sessionsError);
    }

    // 4. Fetch Assigned Learning Content
    const { data: assignedContent, error: contentError } = await admin
        .from('batch_learning_content')
        .select(`
            *,
            capsule:capsules(
                id,
                title,
                type,
                status,
                topic:topics(
                    id,
                    title,
                    course:courses(id, title)
                ),
                quiz_completions(
                    id,
                    score,
                    total_questions,
                    completed_at,
                    student_id
                )
            )
        `)
        .eq('batch_id', batchId)
        .order('assigned_at', { ascending: false });

    if (contentError) {
        console.error("getBatchById content error:", contentError);
    }

    const cleanEnrollments = (enrollments || []).map((e: any) => {
        const sd = Array.isArray(e.student?.student_details)
            ? e.student?.student_details[0]
            : e.student?.student_details;
        return {
            id: e.id,
            student_id: e.student_id,
            course_fee: Number(e.course_fee || 0),
            fee_status: e.fee_status as FeeStatus,
            paid_amount: Number(e.paid_amount || 0),
            payment_method: e.payment_method || 'other',
            transaction_id: e.transaction_id || null,
            fee_notes: e.fee_notes || null,
            status: e.status,
            enrolled_at: e.enrolled_at,
            student: {
                id: e.student?.id,
                full_name: e.student?.full_name || 'Student',
                email: e.student?.email || '',
                avatar_url: e.student?.avatar_url || null,
                phone: sd?.phone || '',
                enrollment_status: sd?.enrollment_status || 'active',
                custom_student_id: sd?.custom_student_id || null,
            }
        };
    });

    const cleanSessions = (sessions || []).map((s: any) => ({
        id: s.id,
        batch_id: s.batch_id,
        session_number: s.session_number,
        title: s.title,
        scheduled_at: s.scheduled_at,
        duration_minutes: Number(s.duration_minutes || 60),
        meeting_link: s.meeting_link || batch.meeting_link,
        status: s.status as BatchSessionStatus,
        notes: s.notes || null,
        completed_at: s.completed_at || null,
        conducted_by: s.conducted_by,
        conducted_by_name: s.conducted_by_profile?.full_name || null,
    }));

    const cleanContent = (assignedContent || []).map((item: any) => {
        const c = item.capsule;
        return {
            assignment_id: item.id,
            capsule_id: item.capsule_id,
            assigned_at: item.assigned_at,
            title: c?.title || 'Learning Capsule',
            type: c?.type || 'video',
            topic_title: c?.topic?.title || 'General',
            course_title: c?.topic?.course?.title || 'Course',
            completions: c?.quiz_completions || [],
        };
    });

    const totalExpected = cleanEnrollments.reduce((sum, e) => sum + e.course_fee, 0);
    const totalCollected = cleanEnrollments.reduce((sum, e) => sum + e.paid_amount, 0);
    const pendingReceivables = Math.max(0, totalExpected - totalCollected);

    return {
        ...batch,
        agreed_tutor_payout: Number(batch.agreed_tutor_payout || 0),
        default_course_fee: Number(batch.default_course_fee || 0),
        enrollments: cleanEnrollments,
        sessions: cleanSessions,
        assigned_content: cleanContent,
        stats: {
            enrolled_count: cleanEnrollments.length,
            capacity: batch.capacity,
            total_sessions: cleanSessions.length,
            completed_sessions: cleanSessions.filter(s => s.status === 'completed').length,
            total_expected_fees: totalExpected,
            total_collected_fees: totalCollected,
            pending_receivables: pendingReceivables,
        },
        user_role: role,
        can_manage: ['super_admin', 'admin', 'operations'].includes(role || ''),
        is_assigned_tutor: batch.teacher_id === user.id,
    };
}

/**
 * Create a new Batch
 */
export async function createBatch(data: {
    name: string;
    course_name: string;
    course_id?: string | null;
    teacher_id?: string | null;
    capacity?: number;
    start_date: string;
    end_date?: string | null;
    schedule_description: string;
    meeting_link?: string | null;
    default_course_fee?: number;
    agreed_tutor_payout?: number;
    notes?: string | null;
}) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized: only staff can create batches." };
    }

    if (!data.name?.trim()) return { success: false, error: "Batch name is required." };
    if (!data.course_name?.trim()) return { success: false, error: "Course name is required." };
    if (!data.start_date) return { success: false, error: "Start date is required." };
    if (!data.schedule_description?.trim()) return { success: false, error: "Schedule description is required." };

    const admin = getAdmin() || await createClient();

    const insertPayload: any = {
        name: data.name.trim(),
        course_name: data.course_name.trim(),
        course_id: data.course_id || null,
        teacher_id: data.teacher_id || null,
        capacity: Number(data.capacity || 20),
        start_date: data.start_date,
        end_date: data.end_date || null,
        schedule_description: data.schedule_description.trim(),
        meeting_link: data.meeting_link?.trim() || null,
        default_course_fee: Number(data.default_course_fee || 0),
        agreed_tutor_payout: Number(data.agreed_tutor_payout || 0),
        notes: data.notes?.trim() || null,
        status: 'upcoming',
        created_by: user.id,
    };

    const { data: created, error } = await admin
        .from('batches')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        console.error("createBatch error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/batches');
    return { success: true, batchId: created.id };
}

/**
 * Update an existing Batch
 */
export async function updateBatch(batchId: string, data: Partial<{
    name: string;
    course_name: string;
    course_id: string | null;
    teacher_id: string | null;
    capacity: number;
    start_date: string;
    end_date: string | null;
    schedule_description: string;
    meeting_link: string | null;
    status: BatchStatus;
    default_course_fee: number;
    agreed_tutor_payout: number;
    notes: string | null;
}>) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();

    const updatePayload: any = {
        ...data,
        updated_at: new Date().toISOString()
    };

    const { error } = await admin
        .from('batches')
        .update(updatePayload)
        .eq('id', batchId);

    if (error) {
        console.error("updateBatch error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/batches');
    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Delete a Batch
 */
export async function deleteBatch(batchId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();

    const { error } = await admin
        .from('batches')
        .delete()
        .eq('id', batchId);

    if (error) {
        console.error("deleteBatch error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/batches');
    return { success: true };
}

/**
 * Enroll an existing academy student in a batch
 */
export async function enrollStudentInBatch(
    batchId: string,
    studentId: string,
    courseFee: number,
    feeStatus: FeeStatus = 'unpaid',
    paidAmount: number = 0,
    paymentMethod: string = 'other',
    transactionId?: string,
    feeNotes?: string
) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();

    // Check capacity
    const { data: batch } = await admin
        .from('batches')
        .select('capacity')
        .eq('id', batchId)
        .single();

    const { count } = await admin
        .from('batch_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId);

    if (batch && count !== null && count >= batch.capacity) {
        return { success: false, error: `Batch has reached maximum capacity of ${batch.capacity} students.` };
    }

    const { error } = await admin
        .from('batch_enrollments')
        .insert({
            batch_id: batchId,
            student_id: studentId,
            course_fee: Number(courseFee || 0),
            fee_status: feeStatus,
            paid_amount: Number(paidAmount || 0),
            payment_method: paymentMethod || 'other',
            transaction_id: transactionId?.trim() || null,
            fee_notes: feeNotes?.trim() || null,
            status: 'active'
        });

    if (error) {
        console.error("enrollStudentInBatch error:", error);
        if (error.code === '23505') {
            return { success: false, error: "This student is already enrolled in this batch." };
        }
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Remove an enrolled student from a batch
 */
export async function removeStudentFromBatch(batchId: string, studentId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();

    const { error } = await admin
        .from('batch_enrollments')
        .delete()
        .eq('batch_id', batchId)
        .eq('student_id', studentId);

    if (error) {
        console.error("removeStudentFromBatch error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Update an enrolled student's course fee and payment details
 */
export async function updateBatchEnrollmentFee(
    enrollmentId: string,
    batchId: string,
    data: {
        course_fee?: number;
        fee_status: FeeStatus;
        paid_amount: number;
        payment_method?: string;
        transaction_id?: string;
        fee_notes?: string;
    }
) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();

    const updatePayload: any = {
        fee_status: data.fee_status,
        paid_amount: Number(data.paid_amount || 0),
        payment_method: data.payment_method || 'other',
        transaction_id: data.transaction_id?.trim() || null,
        fee_notes: data.fee_notes?.trim() || null,
        updated_at: new Date().toISOString()
    };

    if (data.course_fee !== undefined) {
        updatePayload.course_fee = Number(data.course_fee);
    }

    const { error } = await admin
        .from('batch_enrollments')
        .update(updatePayload)
        .eq('id', enrollmentId);

    if (error) {
        console.error("updateBatchEnrollmentFee error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Create a batch session
 */
export async function createBatchSession(batchId: string, data: {
    title: string;
    scheduled_at: string;
    duration_minutes?: number;
    meeting_link?: string | null;
    notes?: string | null;
}) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    const admin = getAdmin() || await createClient();

    // Check if user is staff or assigned teacher
    const { data: batch } = await admin
        .from('batches')
        .select('teacher_id')
        .eq('id', batchId)
        .single();

    const isStaff = ['super_admin', 'admin', 'operations'].includes(role || '');
    const isTeacher = batch?.teacher_id === user.id;

    if (!isStaff && !isTeacher) {
        return { success: false, error: "Unauthorized to schedule sessions for this batch." };
    }

    // Determine session number
    const { count } = await admin
        .from('batch_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId);

    const nextNumber = (count || 0) + 1;

    const { error } = await admin
        .from('batch_sessions')
        .insert({
            batch_id: batchId,
            session_number: nextNumber,
            title: data.title.trim(),
            scheduled_at: data.scheduled_at,
            duration_minutes: Number(data.duration_minutes || 60),
            meeting_link: data.meeting_link?.trim() || null,
            notes: data.notes?.trim() || null,
            status: 'scheduled',
            conducted_by: user.id
        });

    if (error) {
        console.error("createBatchSession error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Update a batch session's completion status: Completed, Not Conducted, Rescheduled, Cancelled.
 * GUARANTEE: Does NOT touch 1-on-1 attendance or payroll.
 */
export async function updateBatchSessionStatus(
    sessionId: string,
    batchId: string,
    status: BatchSessionStatus,
    data?: {
        notes?: string | null;
        scheduled_at?: string;
        meeting_link?: string | null;
    }
) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    const admin = getAdmin() || await createClient();

    const { data: batch } = await admin
        .from('batches')
        .select('teacher_id')
        .eq('id', batchId)
        .single();

    const isStaff = ['super_admin', 'admin', 'operations'].includes(role || '');
    const isTeacher = batch?.teacher_id === user.id;

    if (!isStaff && !isTeacher) {
        return { success: false, error: "Unauthorized to update this session." };
    }

    const updatePayload: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
        updatePayload.conducted_by = user.id;
    } else {
        updatePayload.completed_at = null;
    }

    if (data?.notes !== undefined) {
        updatePayload.notes = data.notes?.trim() || null;
    }

    if (data?.scheduled_at) {
        updatePayload.scheduled_at = data.scheduled_at;
    }

    if (data?.meeting_link !== undefined) {
        updatePayload.meeting_link = data.meeting_link?.trim() || null;
    }

    const { error } = await admin
        .from('batch_sessions')
        .update(updatePayload)
        .eq('id', sessionId);

    if (error) {
        console.error("updateBatchSessionStatus error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Delete a batch session
 */
export async function deleteBatchSession(sessionId: string, batchId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();

    const { error } = await admin
        .from('batch_sessions')
        .delete()
        .eq('id', sessionId);

    if (error) {
        console.error("deleteBatchSession error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Assign a capsule from existing content library to a batch
 */
export async function assignCapsuleToBatch(batchId: string, capsuleId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    const admin = getAdmin() || await createClient();

    const { data: batch } = await admin
        .from('batches')
        .select('teacher_id')
        .eq('id', batchId)
        .single();

    const isStaff = ['super_admin', 'admin', 'operations'].includes(role || '');
    const isTeacher = batch?.teacher_id === user.id;

    if (!isStaff && !isTeacher) {
        return { success: false, error: "Unauthorized" };
    }

    const { error } = await admin
        .from('batch_learning_content')
        .insert({
            batch_id: batchId,
            capsule_id: capsuleId,
            assigned_by: user.id
        });

    if (error) {
        console.error("assignCapsuleToBatch error:", error);
        if (error.code === '23505') {
            return { success: false, error: "This content is already assigned to this batch." };
        }
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    revalidatePath('/student/learn');
    return { success: true };
}

/**
 * Remove an assigned capsule from a batch
 */
export async function unassignCapsuleFromBatch(batchId: string, capsuleId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    const admin = getAdmin() || await createClient();

    const { error } = await admin
        .from('batch_learning_content')
        .delete()
        .eq('batch_id', batchId)
        .eq('capsule_id', capsuleId);

    if (error) {
        console.error("unassignCapsuleFromBatch error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    revalidatePath('/student/learn');
    return { success: true };
}

/**
 * Fetch available students from academy database for enrollment
 */
export async function getAvailableStudentsForBatch(batchId: string) {
    const admin = getAdmin() || await createClient();

    // 1. Fetch currently enrolled student IDs
    const { data: enrolled } = await admin
        .from('batch_enrollments')
        .select('student_id')
        .eq('batch_id', batchId);

    const enrolledIds = new Set((enrolled || []).map(e => e.student_id));

    // 2. Fetch all registered students
    const { data: students, error } = await admin
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            student_details!student_details_id_fkey(
                phone,
                enrollment_status,
                custom_student_id
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getAvailableStudentsForBatch error:", error);
        return [];
    }

    return (students || []).map((s: any) => {
        const sd = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        return {
            id: s.id,
            full_name: s.full_name || 'Student',
            email: s.email || '',
            phone: sd?.phone || '',
            enrollment_status: sd?.enrollment_status || 'active',
            custom_student_id: sd?.custom_student_id || null,
            is_already_enrolled: enrolledIds.has(s.id)
        };
    });
}

/**
 * Fetch published capsules for assignment
 */
export async function getAvailableCapsulesForBatch(batchId: string) {
    const admin = getAdmin() || await createClient();

    // 1. Already assigned capsule IDs
    const { data: assigned } = await admin
        .from('batch_learning_content')
        .select('capsule_id')
        .eq('batch_id', batchId);

    const assignedIds = new Set((assigned || []).map(a => a.capsule_id));

    // 2. All published capsules
    const { data: capsules, error } = await admin
        .from('capsules')
        .select(`
            id,
            title,
            type,
            status,
            created_at,
            topic:topics(
                id,
                title,
                course:courses(id, title)
            )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("getAvailableCapsulesForBatch error:", error);
        return [];
    }

    return (capsules || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        topic_title: c.topic?.title || 'General',
        course_title: c.topic?.course?.title || 'Course',
        is_already_assigned: assignedIds.has(c.id)
    }));
}

/**
 * Fetch list of tutors for dropdown
 */
export async function getTutorsList() {
    const admin = getAdmin() || await createClient();

    const { data: teachers, error } = await admin
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            staff_details(status, basic_salary, pay_basis)
        `)
        .eq('role', 'teacher')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getTutorsList error:", error);
        return [];
    }

    return (teachers || []).map((t: any) => {
        const sd = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return {
            id: t.id,
            full_name: t.full_name || 'Tutor',
            email: t.email || '',
            status: sd?.status || 'active',
            pay_basis: sd?.pay_basis || 'hourly',
            basic_salary: Number(sd?.basic_salary || 0),
        };
    });
}

/**
 * Fetch batches in which a student is enrolled
 */
export async function getStudentEnrolledBatches(studentId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = studentId || user?.id;
    if (!targetUserId) return [];

    const admin = getAdmin() || supabase;

    const { data: enrollments, error } = await admin
        .from('batch_enrollments')
        .select(`
            batch_id,
            course_fee,
            paid_amount,
            fee_status,
            batch:batches(
                id,
                name,
                course_name,
                schedule_description,
                meeting_link,
                status,
                teacher:profiles!batches_teacher_id_fkey(full_name),
                batch_sessions(id, session_number, title, scheduled_at, duration_minutes, meeting_link, status)
            )
        `)
        .eq('student_id', targetUserId);

    if (error || !enrollments) {
        console.error("getStudentEnrolledBatches error:", error);
        return [];
    }

    return enrollments.map((e: any) => {
        const b = e.batch || {};
        const sessions = (b.batch_sessions || []).sort(
            (s1: any, s2: any) => new Date(s1.scheduled_at).getTime() - new Date(s2.scheduled_at).getTime()
        );
        return {
            batch_id: e.batch_id,
            course_fee: Number(e.course_fee || 0),
            paid_amount: Number(e.paid_amount || 0),
            fee_status: e.fee_status,
            id: b.id,
            name: b.name,
            course_name: b.course_name,
            schedule_description: b.schedule_description,
            meeting_link: b.meeting_link,
            status: b.status,
            teacher: b.teacher,
            sessions
        };
    });
}

/**
 * Fetch batches assigned to a teacher
 */
export async function getTeacherBatches(teacherId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetTeacherId = teacherId || user?.id;
    if (!targetTeacherId) return [];

    const admin = getAdmin() || supabase;

    const { data: batches, error } = await admin
        .from('batches')
        .select(`
            id,
            name,
            course_name,
            schedule_description,
            meeting_link,
            status,
            capacity,
            agreed_tutor_payout,
            batch_enrollments(id),
            batch_sessions(id, session_number, title, scheduled_at, duration_minutes, meeting_link, status)
        `)
        .eq('teacher_id', targetTeacherId)
        .order('created_at', { ascending: false });

    if (error || !batches) {
        console.error("getTeacherBatches error:", error);
        return [];
    }

    return batches.map((b: any) => {
        const sessions = (b.batch_sessions || []).sort(
            (s1: any, s2: any) => new Date(s1.scheduled_at).getTime() - new Date(s2.scheduled_at).getTime()
        );
        return {
            id: b.id,
            name: b.name,
            course_name: b.course_name,
            schedule_description: b.schedule_description,
            meeting_link: b.meeting_link,
            status: b.status,
            capacity: b.capacity,
            agreed_tutor_payout: Number(b.agreed_tutor_payout || 0),
            enrolled_count: (b.batch_enrollments || []).length,
            sessions
        };
    });
}
