'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Helper to check if user has Operations or Super Admin role
async function checkManagerRole() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isManager: false, userId: null };

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isManager = profile?.role === 'operations' || profile?.role === 'super_admin';
    return { isManager, userId: user.id };
}

// Helper: Generate chronological sequential receipt number starting at EDH400
async function generateNextReceiptNumber() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('payments')
        .select('receipt_number')
        .like('receipt_number', 'EDH%');

    if (error) {
        console.error("Error fetching receipt numbers for sequential generation:", error);
        return 'EDH400';
    }

    let maxNum = 399; // So the first generated one is EDH400
    if (data && data.length > 0) {
        for (const row of data) {
            const receipt = row.receipt_number;
            if (receipt && receipt.startsWith('EDH')) {
                const numStr = receipt.substring(3);
                if (/^\d+$/.test(numStr)) {
                    const num = parseInt(numStr, 10);
                    if (num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        }
    }

    return `EDH${maxNum + 1}`;
}

// 1. Create a payment record (triggered by student)
export async function createPaymentRecord(payload: {
    amount: number;
    month: number;
    year: number;
    method: 'razorpay' | 'upi_qr';
    transactionId?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const isCompleted = payload.method === 'razorpay';
    const status = isCompleted ? 'completed' : 'pending';
    
    // Generate a unique receipt number for completed payments
    let receiptNumber = null;
    if (isCompleted) {
        receiptNumber = await generateNextReceiptNumber();
    }

    const { data: payment, error } = await supabase
        .from('payments')
        .insert({
            student_id: user.id,
            amount: payload.amount,
            billing_month: payload.month,
            billing_year: payload.year,
            payment_method: payload.method,
            transaction_id: payload.transactionId || null,
            status,
            receipt_number: receiptNumber
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating payment record:", error);
        return { success: false, error: error.message };
    }

    // If Razorpay payment is completed immediately, activate student classes
    if (isCompleted) {
        const activateRes = await activateStudentClasses(user.id);
        if (!activateRes.success) {
            return { success: true, warning: "Payment recorded, but failed to update class scheduling details automatically.", payment };
        }
    }

    revalidatePath('/(dashboard)/student');
    return { success: true, payment };
}

// 2. Fetch payments for current student
export async function getStudentPayments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching student payments:", error);
        return [];
    }

    return data || [];
}

// 3. Fetch pending payments for Operations / Super Admin
export async function getPendingPayments() {
    const { isManager, userId } = await checkManagerRole();
    if (!isManager) {
        throw new Error("Unauthorized: Only Operations and Super Admin can view pending payments.");
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId || '')
        .single();
    const currentUserRole = profile?.role || 'student';

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
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching pending payments:", error);
        return [];
    }

    const filtered = (data || []).filter((p: any) => {
        if (currentUserRole === 'super_admin') return true;
        const details = Array.isArray(p.student?.student_details) ? p.student?.student_details[0] : p.student?.student_details;
        const teacherDetails = Array.isArray(details?.assigned_teacher?.staff_details)
            ? details?.assigned_teacher?.staff_details[0]
            : details?.assigned_teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    return filtered;
}

// 3b. Fetch all payments (completed, pending, failed) for Operations / Super Admin
export async function getAllPayments() {
    const { isManager, userId } = await checkManagerRole();
    if (!isManager) {
        throw new Error("Unauthorized: Only Operations and Super Admin can view all payments.");
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId || '')
        .single();
    const currentUserRole = profile?.role || 'student';

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
        console.error("Error fetching all payments:", error);
        return [];
    }

    const filtered = (data || []).filter((p: any) => {
        if (currentUserRole === 'super_admin') return true;
        const details = Array.isArray(p.student?.student_details) ? p.student?.student_details[0] : p.student?.student_details;
        const teacherDetails = Array.isArray(details?.assigned_teacher?.staff_details)
            ? details?.assigned_teacher?.staff_details[0]
            : details?.assigned_teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    return filtered;
}

// 4. Process Payment Approval (Operations / Super Admin only)
export async function processPaymentApproval(paymentId: string, status: 'completed' | 'failed') {
    const { isManager } = await checkManagerRole();
    if (!isManager) {
        return { success: false, error: "Unauthorized: Only Operations and Super Admin can approve payments." };
    }

    const supabase = await createClient();

    // Fetch the payment record to get the student_id and teacher lock status
    const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select(`
            *,
            student:profiles!student_id(
                student_details!student_details_id_fkey(
                    assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(
                        staff_details (status)
                    )
                )
            )
        `)
        .eq('id', paymentId)
        .single();

    if (fetchError || !payment) {
        return { success: false, error: "Payment record not found." };
    }

    // Check teacher lock status
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id || '')
        .single();
    const currentUserRole = profile?.role || 'student';

    const details = Array.isArray(payment.student?.student_details)
        ? payment.student?.student_details[0]
        : payment.student?.student_details;
    
    const assignedTeacher = details?.assigned_teacher;
    const teacherDetails = Array.isArray(assignedTeacher?.staff_details)
        ? assignedTeacher?.staff_details[0]
        : assignedTeacher?.staff_details;

    if (teacherDetails?.status === 'locked' && currentUserRole !== 'super_admin') {
        return { success: false, error: "Unauthorized: Only Super Admin can approve payments for private students." };
    }

    // Generate unique receipt number if approved
    let receiptNumber = payment.receipt_number;
    if (status === 'completed' && !receiptNumber) {
        receiptNumber = await generateNextReceiptNumber();
    }

    const { error: updateError } = await supabase
        .from('payments')
        .update({
            status,
            receipt_number: receiptNumber,
            updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

    if (updateError) {
        console.error("Error updating payment status:", updateError);
        return { success: false, error: updateError.message };
    }

    // If approved, activate classes for the student
    if (status === 'completed') {
        const activateRes = await activateStudentClasses(payment.student_id);
        if (!activateRes.success) {
            return { success: true, warning: "Payment approved, but student class schedule limit failed to auto-update.", receiptNumber };
        }
    }

    revalidatePath('/(dashboard)/operations');
    return { success: true, receiptNumber };
}

// 5. Record Manual/Offline Payment (Operations / Super Admin only)
export async function recordManualPayment(payload: {
    studentId: string;
    amount: number;
    month: number;
    year: number;
    method: 'bank_transfer' | 'cash' | 'other';
    transactionId?: string;
}) {
    const { isManager } = await checkManagerRole();
    if (!isManager) {
        return { success: false, error: "Unauthorized: Only Operations and Super Admin can record manual payments." };
    }

    const supabase = await createClient();

    // Generate a unique receipt number
    const receiptNumber = await generateNextReceiptNumber();

    const { data: payment, error } = await supabase
        .from('payments')
        .insert({
            student_id: payload.studentId,
            amount: payload.amount,
            billing_month: payload.month,
            billing_year: payload.year,
            payment_method: payload.method,
            transaction_id: payload.transactionId || null,
            status: 'completed',
            receipt_number: receiptNumber
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating manual payment record:", error);
        return { success: false, error: error.message };
    }

    // Activate classes for the student
    const activateRes = await activateStudentClasses(payload.studentId);
    if (!activateRes.success) {
        return { success: true, warning: "Payment recorded, but student status update failed.", payment };
    }

    revalidatePath('/(dashboard)/operations');
    return { success: true, payment };
}

// Helper: Activate student status and ensure class limits are configured
async function activateStudentClasses(studentId: string) {
    const supabase = await createClient();
    
    // Fetch current details
    const { data: details, error: fetchError } = await supabase
        .from('student_details')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

    if (fetchError) {
        console.error("Error fetching student details for activation:", fetchError);
        return { success: false, error: fetchError.message };
    }

    // Reset status to active and ensure classes_per_month is at least 12 (or keeps current if set)
    const currentClasses = details?.classes_per_month || 12;
    
    const { error: updateError } = await supabase
        .from('student_details')
        .update({
            status: 'active',
            classes_per_month: currentClasses === 0 ? 12 : currentClasses,
            updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

    if (updateError) {
        console.error("Error activating student details:", updateError);
        return { success: false, error: updateError.message };
    }

    return { success: true };
}
