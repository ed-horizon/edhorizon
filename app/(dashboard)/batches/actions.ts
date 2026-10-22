'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getIstDayUtcBounds } from "@/lib/holidays";
import { calculateBatchSchedule } from "@/lib/batch-schedule";

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
    course_duration_days?: number | null;
    schedule_description: string | null;
    recurring_days?: string[] | null;
    session_time?: string | null;
    session_duration_minutes?: number | null;
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
            course_duration_days: b.course_duration_days || null,
            schedule_description: b.schedule_description || null,
            recurring_days: b.recurring_days || null,
            session_time: b.session_time || null,
            session_duration_minutes: b.session_duration_minutes || 60,
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
                student_details!student_details_id_fkey(status, grade_level, parent_email, custom_student_id)
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

    // 4. Fetch Assigned Learning Content (Fresh batch materials)
    const { data: assignedContent, error: contentError } = await admin
        .from('batch_learning_content')
        .select('id, batch_id, capsule_id, title, type, content_url, description, source_batch_id, created_at, assigned_at, assigned_by')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

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
                parent_email: sd?.parent_email || '',
                status: sd?.status || 'active',
                grade_level: sd?.grade_level || '',
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

    const cleanContent = (assignedContent || []).map((item: any) => ({
        id: item.id,
        batch_id: item.batch_id,
        capsule_id: item.capsule_id || null,
        title: item.title || 'Batch Material',
        type: item.type || 'document',
        content_url: item.content_url || null,
        description: item.description || null,
        source_batch_id: item.source_batch_id || null,
        created_at: item.created_at || item.assigned_at,
        assigned_by: item.assigned_by || null,
    }));

    const totalExpected = cleanEnrollments.reduce((sum, e) => sum + e.course_fee, 0);
    const totalCollected = cleanEnrollments.reduce((sum, e) => sum + e.paid_amount, 0);
    const pendingReceivables = Math.max(0, totalExpected - totalCollected);

    return {
        ...batch,
        agreed_tutor_payout: Number(batch.agreed_tutor_payout || 0),
        default_course_fee: Number(batch.default_course_fee || 0),
        course_duration_days: batch.course_duration_days || null,
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
 * Helper to auto-generate session slots on selected calendar days
 */
async function autoGenerateBatchSessions(
    batchId: string,
    config: {
        startDate: string;
        endDate: string | null;
        durationDays?: number | null;
        recurringDays: string[];
        sessionTime: string;
        durationMinutes: number;
        meetingLink: string | null;
        userId: string;
    }
) {
    const admin = getAdmin() || await createClient();
    const targetCount = config.durationDays && config.durationDays > 0 ? config.durationDays : 10;
    const { endDateStr, scheduledDates } = calculateBatchSchedule(config.startDate, config.recurringDays, targetCount);

    if (scheduledDates.length === 0) return;

    const timeParts = config.sessionTime.split(':');
    const hours = parseInt(timeParts[0] || '18', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);

    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
    const sessionPayloads = scheduledDates.map((dateStr, idx) => {
        const parts = dateStr.split('-').map(Number);
        const utcMs = Date.UTC(parts[0], parts[1] - 1, parts[2], hours, minutes, 0, 0) - IST_OFFSET_MS;
        const scheduledAt = new Date(utcMs);
        return {
            batch_id: batchId,
            session_number: idx + 1,
            title: `Session #${idx + 1}`,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: config.durationMinutes,
            meeting_link: config.meetingLink,
            status: 'scheduled' as BatchSessionStatus,
            conducted_by: config.userId,
        };
    });

    if (sessionPayloads.length > 0) {
        const { error } = await admin
            .from('batch_sessions')
            .insert(sessionPayloads);

        if (error) {
            console.error("Failed to bulk insert generated sessions:", error);
        } else if (endDateStr) {
            // Update batch end_date to match the actual calculated final session date
            await admin
                .from('batches')
                .update({ end_date: endDateStr })
                .eq('id', batchId);
        }
    }
}

/**
 * Action to auto-generate all session slots for a batch according to its configured schedule and class count
 */
export async function generateBatchSessionsAction(batchId: string) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user || !['super_admin', 'admin', 'operations'].includes(role || '')) {
        return { success: false, error: "Unauthorized" };
    }

    const admin = getAdmin() || await createClient();
    const { data: batch, error } = await admin
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();

    if (error || !batch) {
        return { success: false, error: "Batch not found" };
    }

    if (!batch.recurring_days || batch.recurring_days.length === 0) {
        return { success: false, error: "Please select recurring calendar days (e.g. Mon, Wed, Fri) for this batch first." };
    }

    const totalClasses = batch.course_duration_days || 10;
    await autoGenerateBatchSessions(batch.id, {
        startDate: batch.start_date,
        endDate: batch.end_date,
        durationDays: totalClasses,
        recurringDays: batch.recurring_days,
        sessionTime: batch.session_time || "18:00",
        durationMinutes: Number(batch.session_duration_minutes || 60),
        meetingLink: batch.meeting_link || null,
        userId: user.id
    });

    revalidatePath('/batches');
    revalidatePath(`/batches/${batchId}`);
    return { success: true };
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
    course_duration_days?: number | null;
    schedule_description?: string | null;
    recurring_days?: string[];
    session_time?: string;
    session_duration_minutes?: number;
    auto_generate_sessions?: boolean;
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

    let scheduleDesc = data.schedule_description?.trim() || "";
    if (!scheduleDesc && data.recurring_days && data.recurring_days.length > 0) {
        const timeStr = data.session_time ? ` at ${data.session_time}` : "";
        const durStr = data.session_duration_minutes ? ` (${data.session_duration_minutes} mins)` : "";
        scheduleDesc = `${data.recurring_days.join(', ')}${timeStr}${durStr}`;
    }

    const totalClasses = data.course_duration_days ? Number(data.course_duration_days) : 10;
    let calculatedEndDate = data.end_date || null;
    if (totalClasses > 0 && data.start_date) {
        calculatedEndDate = calculateBatchSchedule(data.start_date, data.recurring_days || [], totalClasses).endDateStr;
    }

    const admin = getAdmin() || await createClient();

    const insertPayload: any = {
        name: data.name.trim(),
        course_name: data.course_name.trim(),
        course_id: data.course_id || null,
        teacher_id: data.teacher_id || null,
        capacity: Number(data.capacity || 20),
        start_date: data.start_date,
        end_date: calculatedEndDate,
        course_duration_days: totalClasses,
        schedule_description: scheduleDesc || null,
        recurring_days: data.recurring_days && data.recurring_days.length > 0 ? data.recurring_days : null,
        session_time: data.session_time || null,
        session_duration_minutes: Number(data.session_duration_minutes || 60),
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

    // Auto-generate session records if requested and recurring days are selected
    if (data.auto_generate_sessions && data.recurring_days && data.recurring_days.length > 0) {
        try {
            await autoGenerateBatchSessions(created.id, {
                startDate: data.start_date,
                endDate: calculatedEndDate,
                durationDays: totalClasses,
                recurringDays: data.recurring_days,
                sessionTime: data.session_time || "18:00",
                durationMinutes: Number(data.session_duration_minutes || 60),
                meetingLink: data.meeting_link?.trim() || null,
                userId: user.id
            });
        } catch (genErr) {
            console.error("autoGenerateBatchSessions non-fatal error:", genErr);
        }
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
    course_duration_days: number | null;
    schedule_description: string | null;
    recurring_days: string[] | null;
    session_time: string | null;
    session_duration_minutes: number | null;
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

    let calculatedEndDate = data.end_date !== undefined ? data.end_date : undefined;
    if (data.course_duration_days && data.course_duration_days > 0 && data.start_date) {
        calculatedEndDate = calculateBatchSchedule(data.start_date, data.recurring_days || [], data.course_duration_days).endDateStr;
    }

    const updatePayload: any = {
        ...data,
        ...(calculatedEndDate !== undefined ? { end_date: calculatedEndDate } : {}),
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
    title?: string;
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
    const finalTitle = data.title?.trim() || `Session #${nextNumber}`;

    const { error } = await admin
        .from('batch_sessions')
        .insert({
            batch_id: batchId,
            session_number: nextNumber,
            title: finalTitle,
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
 * Create fresh learning content specifically for a batch
 */
export async function createBatchContent(batchId: string, data: {
    title: string;
    type?: string;
    content_url?: string;
    description?: string;
}) {
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
        return { success: false, error: "Unauthorized to add content to this batch" };
    }

    if (!data.title?.trim()) {
        return { success: false, error: "Material title is required" };
    }

    const { data: created, error } = await admin
        .from('batch_learning_content')
        .insert({
            batch_id: batchId,
            title: data.title.trim(),
            type: data.type || 'document',
            content_url: data.content_url?.trim() || null,
            description: data.description?.trim() || null,
            assigned_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error("createBatchContent error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true, item: created };
}

/**
 * Create a native Capsule (Quiz, Flashcards, Video Presentation) specifically for a batch
 */
export async function createBatchCapsule(
    batchId: string,
    data: {
        title: string;
        type: 'quiz' | 'flashcards' | 'video';
        content: any;
        description?: string | null;
    }
) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!data.title?.trim()) return { success: false, error: "Capsule title is required." };
    if (!data.type) return { success: false, error: "Capsule type is required." };

    const admin = getAdmin() || await createClient();

    const { data: batch, error: batchError } = await admin
        .from('batches')
        .select('id, name, course_name, teacher_id')
        .eq('id', batchId)
        .single();

    if (batchError || !batch) return { success: false, error: "Batch not found." };

    const isStaff = ['super_admin', 'admin', 'operations'].includes(role || '');
    const isTeacher = batch.teacher_id === user.id;
    if (!isStaff && !isTeacher) {
        return { success: false, error: "Unauthorized to create content for this batch." };
    }

    try {
        let topicId: string | null = null;
        const topicTitle = `${batch.course_name} (Batch Material)`;

        const { data: existingTopic } = await admin
            .from('topics')
            .select('id')
            .eq('title', topicTitle)
            .maybeSingle();

        if (existingTopic?.id) {
            topicId = existingTopic.id;
        } else {
            const { data: existingModule } = await admin
                .from('modules')
                .select('id')
                .limit(1)
                .maybeSingle();

            let moduleId = existingModule?.id;
            if (!moduleId) {
                const { data: newMod } = await admin
                    .from('modules')
                    .insert({
                        title: "Batch Courses Syllabus",
                        description: "Module for cohort batch class capsules"
                    })
                    .select('id')
                    .single();
                moduleId = newMod?.id;
            }

            const { data: existingCourse } = await admin
                .from('courses')
                .select('id')
                .eq('title', batch.course_name)
                .maybeSingle();

            let courseId = existingCourse?.id;
            if (!courseId) {
                const { data: newCourse } = await admin
                    .from('courses')
                    .insert({
                        module_id: moduleId,
                        title: batch.course_name
                    })
                    .select('id')
                    .single();
                courseId = newCourse?.id;
            }

            const { data: newTopic } = await admin
                .from('topics')
                .insert({
                    course_id: courseId,
                    title: topicTitle
                })
                .select('id')
                .single();
            topicId = newTopic?.id || null;
        }

        if (!topicId) {
            const { data: fallbackTopic } = await admin.from('topics').select('id').limit(1).single();
            topicId = fallbackTopic?.id;
        }

        const { data: capsule, error: capError } = await admin
            .from('capsules')
            .insert({
                topic_id: topicId,
                title: data.title.trim(),
                type: data.type,
                content: {
                    ...(data.content || {}),
                    batch_id: batchId
                },
                author_id: user.id,
                status: 'published'
            })
            .select()
            .single();

        if (capError || !capsule) {
            console.error("createBatchCapsule error inserting capsule:", capError);
            return { success: false, error: capError?.message || "Failed to create capsule." };
        }

        const { data: contentItem, error: contentError } = await admin
            .from('batch_learning_content')
            .insert({
                batch_id: batchId,
                capsule_id: capsule.id,
                title: data.title.trim(),
                type: data.type,
                description: data.description || null,
                assigned_by: user.id
            })
            .select()
            .single();

        if (contentError) {
            console.error("createBatchCapsule error linking content:", contentError);
            return { success: false, error: contentError.message };
        }

        revalidatePath(`/batches/${batchId}`);
        return { success: true, capsuleId: capsule.id, contentId: contentItem.id };
    } catch (err: any) {
        console.error("createBatchCapsule error:", err);
        return { success: false, error: err.message || "An unexpected error occurred." };
    }
}

/**
 * Upload a PDF or file directly for a batch
 */
export async function uploadBatchFile(formData: FormData) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    const batchId = formData.get('batchId') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || null;
    const file = formData.get('file') as File;

    if (!batchId || !title?.trim() || !file) {
        return { success: false, error: "Batch ID, title, and file are required." };
    }

    const admin = getAdmin() || await createClient();

    const { data: batch } = await admin
        .from('batches')
        .select('id, teacher_id')
        .eq('id', batchId)
        .single();

    if (!batch) return { success: false, error: "Batch not found." };
    const isStaff = ['super_admin', 'admin', 'operations'].includes(role || '');
    const isTeacher = batch.teacher_id === user.id;
    if (!isStaff && !isTeacher) {
        return { success: false, error: "Unauthorized to upload materials for this batch." };
    }

    try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = `batches/${batchId}/materials/${crypto.randomUUID()}-${cleanFileName}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { uploadFileBufferToR2 } = await import('@/lib/r2');
        await uploadFileBufferToR2(key, buffer, file.type || 'application/octet-stream');

        await admin
            .from('file_metadata')
            .insert({
                r2_key: key,
                original_filename: file.name,
                mime_type: file.type || 'application/octet-stream',
                size_bytes: file.size,
                uploaded_by: user.id,
                purpose: 'teacher_material'
            });

        const { data: inserted, error: insertError } = await admin
            .from('batch_learning_content')
            .insert({
                batch_id: batchId,
                title: title.trim(),
                type: 'document',
                content_url: key,
                description: description,
                assigned_by: user.id
            })
            .select()
            .single();

        if (insertError) {
            console.error("uploadBatchFile DB insert error:", insertError);
            return { success: false, error: insertError.message };
        }

        revalidatePath(`/batches/${batchId}`);
        return { success: true, data: inserted };
    } catch (err: any) {
        console.error("uploadBatchFile error:", err);
        return { success: false, error: err.message || "Failed to upload file." };
    }
}

/**
 * Delete a batch content item
 */
export async function deleteBatchContent(contentId: string, batchId: string) {
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
        .delete()
        .eq('id', contentId)
        .eq('batch_id', batchId);

    if (error) {
        console.error("deleteBatchContent error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/batches/${batchId}`);
    return { success: true };
}

/**
 * Copy learning materials from another batch into this batch
 */
export async function copyBatchContent(targetBatchId: string, contentIds: string[]) {
    const { user, role } = await getAuthenticatedUserRole();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!contentIds || contentIds.length === 0) {
        return { success: false, error: "No materials selected to copy" };
    }

    const admin = getAdmin() || await createClient();

    const { data: targetBatch } = await admin
        .from('batches')
        .select('teacher_id')
        .eq('id', targetBatchId)
        .single();

    const isStaff = ['super_admin', 'admin', 'operations'].includes(role || '');
    const isTeacher = targetBatch?.teacher_id === user.id;

    if (!isStaff && !isTeacher) {
        return { success: false, error: "Unauthorized to modify this batch" };
    }

    // Fetch the selected materials
    const { data: sourceMaterials, error: fetchErr } = await admin
        .from('batch_learning_content')
        .select('*')
        .in('id', contentIds);

    if (fetchErr || !sourceMaterials || sourceMaterials.length === 0) {
        return { success: false, error: "Selected materials could not be found" };
    }

    // Insert copies for targetBatchId
    const newItems = sourceMaterials.map((item: any) => ({
        batch_id: targetBatchId,
        title: item.title,
        type: item.type || 'document',
        content_url: item.content_url || null,
        description: item.description || null,
        source_batch_id: item.batch_id,
        assigned_by: user.id
    }));

    const { error: insertErr } = await admin
        .from('batch_learning_content')
        .insert(newItems);

    if (insertErr) {
        console.error("copyBatchContent insert error:", insertErr);
        return { success: false, error: insertErr.message };
    }

    revalidatePath(`/batches/${targetBatchId}`);
    return { success: true, count: newItems.length };
}

/**
 * Fetch other batches that have learning content, for the copy dialog
 */
export async function getBatchesWithContent(excludeBatchId: string) {
    const admin = getAdmin() || await createClient();

    const { data: batches, error } = await admin
        .from('batches')
        .select(`
            id,
            name,
            course_name,
            batch_learning_content(id, title, type, content_url, description, created_at)
        `)
        .neq('id', excludeBatchId)
        .order('created_at', { ascending: false });

    if (error || !batches) {
        console.error("getBatchesWithContent error:", error);
        return [];
    }

    return batches
        .filter((b: any) => (b.batch_learning_content || []).length > 0)
        .map((b: any) => ({
            id: b.id,
            name: b.name,
            course_name: b.course_name,
            materials: (b.batch_learning_content || []).map((m: any) => ({
                id: m.id,
                title: m.title || 'Untitled Material',
                type: m.type || 'document',
                content_url: m.content_url || null,
                description: m.description || null,
                created_at: m.created_at
            }))
        }));
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
                status,
                grade_level,
                parent_email,
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
            parent_email: sd?.parent_email || '',
            status: sd?.status || 'active',
            grade_level: sd?.grade_level || '',
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
    noStore();
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
                batch_sessions(id, session_number, title, scheduled_at, duration_minutes, meeting_link, status),
                batch_learning_content:batch_learning_content!batch_learning_content_batch_id_fkey(id, title, type, content_url, description, capsule_id)
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
            sessions,
            learning_content: b.batch_learning_content || []
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

/**
 * Fetch tutor's today's batch sessions
 */
export async function getTeacherTodayBatchSessions(teacherId?: string) {
    noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const targetId = teacherId || user.id;
    const admin = getAdmin() || supabase;

    // Check user role
    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const isStaff = ['super_admin', 'admin', 'operations'].includes(profile?.role || '');

    let batchQuery = admin
        .from('batches')
        .select('id, name, course_name, meeting_link, status, teacher_id')
        .in('status', ['upcoming', 'ongoing']);

    if (!isStaff || teacherId) {
        batchQuery = batchQuery.eq('teacher_id', targetId);
    }

    const { data: batches } = await batchQuery;

    if (!batches || batches.length === 0) return [];

    const batchMap = new Map(batches.map(b => [b.id, b]));
    const batchIds = batches.map(b => b.id);

    const now = new Date();
    const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const { startUtcIso, endUtcIso } = getIstDayUtcBounds(istDateStr);

    const { data: sessions, error } = await admin
        .from('batch_sessions')
        .select('*')
        .in('batch_id', batchIds)
        .gte('scheduled_at', startUtcIso)
        .lte('scheduled_at', endUtcIso)
        .order('scheduled_at', { ascending: true });

    if (error || !sessions) return [];

    return sessions.map((s: any) => {
        const b = batchMap.get(s.batch_id);
        return {
            id: s.id,
            batch_id: s.batch_id,
            batch_name: b?.name || 'Batch Class',
            course_name: b?.course_name || '',
            session_number: s.session_number,
            title: s.title,
            scheduled_at: s.scheduled_at,
            duration_minutes: s.duration_minutes || 60,
            meeting_link: s.meeting_link || b?.meeting_link || null,
            status: s.status as BatchSessionStatus,
            notes: s.notes,
            completed_at: s.completed_at
        };
    });
}

/**
 * Fetch tutor's assigned batches
 */
export async function getTeacherAssignedBatches(teacherId?: string) {
    noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const targetId = teacherId || user.id;
    const admin = getAdmin() || supabase;

    // Check user role
    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const isStaff = ['super_admin', 'admin', 'operations'].includes(profile?.role || '');

    let query = admin
        .from('batches')
        .select(`
            id,
            name,
            course_name,
            capacity,
            start_date,
            end_date,
            course_duration_days,
            schedule_description,
            meeting_link,
            status,
            batch_sessions(id, status, scheduled_at),
            batch_learning_content:batch_learning_content!batch_learning_content_batch_id_fkey(id)
        `)
        .order('created_at', { ascending: false });

    if (!isStaff || teacherId) {
        query = query.eq('teacher_id', targetId);
    }

    const { data: batches, error } = await query;

    if (error || !batches) {
        if (error) console.error("getTeacherAssignedBatches error:", error);
        return [];
    }

    return batches.map((b: any) => {
        const sessions = b.batch_sessions || [];
        const completedCount = sessions.filter((s: any) => s.status === 'completed').length;
        return {
            id: b.id,
            name: b.name,
            course_name: b.course_name,
            capacity: b.capacity,
            start_date: b.start_date,
            end_date: b.end_date,
            course_duration_days: b.course_duration_days || null,
            schedule_description: b.schedule_description,
            meeting_link: b.meeting_link,
            status: b.status as BatchStatus,
            total_sessions: sessions.length,
            completed_sessions: completedCount,
            content_count: (b.batch_learning_content || []).length
        };
    });
}
