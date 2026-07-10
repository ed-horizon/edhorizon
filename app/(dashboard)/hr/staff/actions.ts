
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatStudentIdAndMobile } from "@/lib/utils";
import { generateNextReceiptNumber } from "@/app/(dashboard)/payments/actions";

type TeacherRelation = {
    staff_details?: { status?: string } | Array<{ status?: string }>;
};

function isLockedTeacherRelation(teacher: unknown) {
    const relation = Array.isArray(teacher) ? teacher[0] : teacher;
    if (!relation || typeof relation !== "object") return false;

    const typedRelation = relation as TeacherRelation;
    const staffDetails = Array.isArray(typedRelation.staff_details)
        ? typedRelation.staff_details[0]
        : typedRelation.staff_details;
    return staffDetails?.status === "locked";
}

function hasLockedAssignedTeacher(student: unknown) {
    if (!student || typeof student !== "object") return false;
    const assignments = student as Record<string, unknown>;

    return [
        assignments.assigned_teacher,
        assignments.assigned_teacher_2,
        assignments.assigned_teacher_3,
        assignments.assigned_teacher_4,
        assignments.assigned_teacher_5,
    ].some(isLockedTeacherRelation);
}

async function containsLockedTeacher(
    adminClient: ReturnType<typeof createAdminClient>,
    teacherIds: Array<string | undefined>,
) {
    const ids = teacherIds.filter(
        (id): id is string => Boolean(id && id !== "none" && id !== "unassigned"),
    );
    if (ids.length === 0) return false;

    const { data } = await adminClient
        .from("staff_details")
        .select("id")
        .in("id", ids)
        .eq("status", "locked")
        .limit(1);

    return Boolean(data?.length);
}

export async function createStaffMember(data: { 
    full_name: string; 
    email: string; 
    role: string; 
    employee_id?: string; 
    mobile_number: string;
    pay_basis?: string;
    basic_salary?: number;
    hourly_rate?: number;
}) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Security: Check if requester is authorized (HR or Admin)
    const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr"].includes(requesterProfile?.role || "")) {
        return { error: "Unauthorized" };
    }

    // Create the user in Auth directly with password 'password123' and confirm email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: data.full_name,
            role: data.role
        }
    });

    if (inviteError) {
        console.error("Error inviting staff:", inviteError);
        return { error: inviteError.message };
    }

    // Upsert the employee_id in staff_details
    if (inviteData?.user) {
        const { error: updateError } = await adminClient
            .from("staff_details")
            .upsert({
                id: inviteData.user.id,
                employee_id: data.employee_id || null,
                mobile_number: data.mobile_number || null,
                status: 'active',
                joining_date: new Date().toISOString().split('T')[0],
                pay_basis: data.pay_basis || 'hourly',
                basic_salary: data.basic_salary || 0,
                hourly_rate: data.hourly_rate || 0
            });
            
        if (updateError) {
            console.error("Error setting employee ID on staff details:", updateError);
        }
    }

    revalidatePath("/hr/staff");
    return { success: true };
}

export async function updateStaffMember(id: string, data: { 
    full_name: string; 
    email: string; 
    role: string; 
    hourly_rate?: number; 
    basic_salary?: number;
    pay_basis?: string;
    employee_id?: string; 
    mobile_number?: string; 
}) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr"].includes(requesterProfile?.role || "")) {
        return { error: "Unauthorized" };
    }

    const { data: targetStaff } = await adminClient
        .from("staff_details")
        .select("status")
        .eq("id", id)
        .single();

    if (targetStaff?.status === 'locked' && requesterProfile?.role !== 'super_admin') {
        return { error: "Unauthorized: Only Super Admin can modify locked staff profiles." };
    }

    const { error: profileError } = await adminClient
        .from("profiles")
        .update({
            full_name: data.full_name,
            email: data.email,
            role: data.role
        })
        .eq("id", id);

    if (profileError) return { error: profileError.message };

    // Update staff_details
    const detailsUpdate: any = {};
    if (data.hourly_rate !== undefined) {
        detailsUpdate.hourly_rate = data.hourly_rate;
    }
    if (data.basic_salary !== undefined) {
        detailsUpdate.basic_salary = data.basic_salary;
    }
    if (data.pay_basis !== undefined) {
        detailsUpdate.pay_basis = data.pay_basis;
    }
    if (data.employee_id !== undefined) {
        detailsUpdate.employee_id = data.employee_id || null;
    }
    if (data.mobile_number !== undefined) {
        detailsUpdate.mobile_number = data.mobile_number || null;
    }

    if (Object.keys(detailsUpdate).length > 0) {
        const { error: detailsError } = await adminClient
            .from("staff_details")
            .update(detailsUpdate)
            .eq("id", id);
            
        if (detailsError) return { error: detailsError.message };
    }

    revalidatePath("/hr/staff");
    return { success: true };
}

export async function updateStaffStatus(id: string, status: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr"].includes(requesterProfile?.role || "")) {
        return { error: "Unauthorized" };
    }

    const { data: targetStaff } = await adminClient
        .from("staff_details")
        .select("status")
        .eq("id", id)
        .single();

    const isLockedAction = targetStaff?.status === 'locked' || status === 'locked';
    if (isLockedAction && requesterProfile?.role !== 'super_admin') {
        return { error: "Unauthorized: Only Super Admin can manage locked status." };
    }

    const { error: statusError } = await adminClient
        .from("staff_details")
        .update({ status })
        .eq("id", id);

    if (statusError) return { error: statusError.message };

    revalidatePath("/hr/staff");
    return { success: true };
}

export async function createStudentMember(data: { 
    full_name: string; 
    email: string; 
    grade_level: string;
    monthly_fee?: number;
    classes_per_month?: number;
    tutor_hourly_rate?: number | null;
    custom_student_id?: string;
    mobile_number: string;
    parent_email?: string;
    subject_name_1?: string;
    subject_name_2?: string;
    monthly_fee_2?: number;
    classes_per_month_2?: number;
    assigned_teacher_id_2?: string;
    subject_name_3?: string;
    monthly_fee_3?: number;
    classes_per_month_3?: number;
    assigned_teacher_id_3?: string;
    subject_name_4?: string;
    monthly_fee_4?: number;
    classes_per_month_4?: number;
    assigned_teacher_id_4?: string;
    subject_name_5?: string;
    monthly_fee_5?: number;
    classes_per_month_5?: number;
    assigned_teacher_id_5?: string;
    assigned_teacher_id?: string;
}) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr", "operations"].includes(requesterProfile?.role || "")) {
        return { error: "Unauthorized" };
    }

    if (
        requesterProfile?.role !== "super_admin" &&
        await containsLockedTeacher(adminClient, [
            data.assigned_teacher_id,
            data.assigned_teacher_id_2,
            data.assigned_teacher_id_3,
            data.assigned_teacher_id_4,
            data.assigned_teacher_id_5,
        ])
    ) {
        return { error: "Unauthorized: Only Super Admin can assign locked tutors." };
    }

    // Create student directly with password 'password123' and confirm email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: data.full_name,
            role: "student"
        }
    });

    if (inviteError) {
        console.error("Error inviting student:", inviteError);
        return { error: inviteError.message };
    }

    const serializedId = formatStudentIdAndMobile(data.custom_student_id, data.mobile_number);

    // Upsert grade_level in student_details (ensure row exists)
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
                parent_email: data.parent_email || null,
                subject_name_1: data.subject_name_1 || 'Maths',
                subject_name_2: data.subject_name_2 || null,
                monthly_fee_2: data.monthly_fee_2 || 0,
                classes_per_month_2: data.classes_per_month_2 || 0,
                assigned_teacher_id_2: (data.assigned_teacher_id_2 === "none" || data.assigned_teacher_id_2 === "unassigned" || !data.assigned_teacher_id_2) ? null : data.assigned_teacher_id_2,
                subject_name_3: data.subject_name_3 || null,
                monthly_fee_3: data.monthly_fee_3 || 0,
                classes_per_month_3: data.classes_per_month_3 || 0,
                assigned_teacher_id_3: (data.assigned_teacher_id_3 === "none" || data.assigned_teacher_id_3 === "unassigned" || !data.assigned_teacher_id_3) ? null : data.assigned_teacher_id_3,
                subject_name_4: data.subject_name_4 || null,
                monthly_fee_4: data.monthly_fee_4 || 0,
                classes_per_month_4: data.classes_per_month_4 || 0,
                assigned_teacher_id_4: (data.assigned_teacher_id_4 === "none" || data.assigned_teacher_id_4 === "unassigned" || !data.assigned_teacher_id_4) ? null : data.assigned_teacher_id_4,
                subject_name_5: data.subject_name_5 || null,
                monthly_fee_5: data.monthly_fee_5 || 0,
                classes_per_month_5: data.classes_per_month_5 || 0,
                assigned_teacher_id_5: (data.assigned_teacher_id_5 === "none" || data.assigned_teacher_id_5 === "unassigned" || !data.assigned_teacher_id_5) ? null : data.assigned_teacher_id_5,
                assigned_teacher_id: (data.assigned_teacher_id === "none" || data.assigned_teacher_id === "unassigned" || !data.assigned_teacher_id) ? null : data.assigned_teacher_id
            });

        if (updateError) {
            console.error("Error upserting student details:", updateError);
        } else {
            // Generate automated fee receipt
            try {
                const totalAmount = (data.monthly_fee !== undefined ? data.monthly_fee : 4500) +
                                    (data.monthly_fee_2 || 0) +
                                    (data.monthly_fee_3 || 0) +
                                    (data.monthly_fee_4 || 0) +
                                    (data.monthly_fee_5 || 0);

                if (totalAmount > 0) {
                    const receiptNumber = await generateNextReceiptNumber();
                    const subjectsList = [
                        data.subject_name_1 || 'Maths',
                        data.subject_name_2,
                        data.subject_name_3,
                        data.subject_name_4,
                        data.subject_name_5
                    ].filter(Boolean).join(', ');

                    const { error: paymentError } = await adminClient
                        .from('payments')
                        .insert({
                            student_id: inviteData.user.id,
                            amount: totalAmount,
                            billing_month: new Date().getMonth() + 1,
                            billing_year: new Date().getFullYear(),
                            payment_method: 'upi_qr', // default convenient offline onboarding method
                            status: 'completed',
                            receipt_number: receiptNumber,
                            subject_name: subjectsList
                        });

                    if (paymentError) {
                        console.error("Error generating automated onboarding payment receipt:", paymentError);
                    }
                }
            } catch (receiptErr) {
                console.error("Failed to generate onboarding payment receipt:", receiptErr);
            }
        }
    }

    revalidatePath("/(dashboard)", "layout");
    return { success: true };
}

export async function updateStudentMember(id: string, data: {
    full_name: string;
    email: string; 
    grade_level: string;
    monthly_fee?: number;
    classes_per_month?: number;
    tutor_hourly_rate?: number | null;
    custom_student_id?: string;
    mobile_number: string;
    parent_email?: string;
    subject_name_1?: string;
    subject_name_2?: string;
    monthly_fee_2?: number;
    classes_per_month_2?: number;
    assigned_teacher_id_2?: string;
    subject_name_3?: string;
    monthly_fee_3?: number;
    classes_per_month_3?: number;
    assigned_teacher_id_3?: string;
    subject_name_4?: string;
    monthly_fee_4?: number;
    classes_per_month_4?: number;
    assigned_teacher_id_4?: string;
    subject_name_5?: string;
    monthly_fee_5?: number;
    classes_per_month_5?: number;
    assigned_teacher_id_5?: string;
    assigned_teacher_id?: string;
}) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr", "operations"].includes(requesterProfile?.role || "")) {
        return { error: "Unauthorized" };
    }

    const { data: targetStudent } = await adminClient
        .from("student_details")
        .select(`
            assigned_teacher_id,
            assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(
                staff_details(status)
            ),
            assigned_teacher_2:profiles!student_details_assigned_teacher_id_2_fkey(
                staff_details(status)
            ),
            assigned_teacher_3:profiles!student_details_assigned_teacher_id_3_fkey(
                staff_details(status)
            ),
            assigned_teacher_4:profiles!student_details_assigned_teacher_id_4_fkey(
                staff_details(status)
            ),
            assigned_teacher_5:profiles!student_details_assigned_teacher_id_5_fkey(
                staff_details(status)
            )
        `)
        .eq("id", id)
        .single();

    if (hasLockedAssignedTeacher(targetStudent) && requesterProfile?.role !== 'super_admin') {
        return { error: "Unauthorized: Only Super Admin can modify private students." };
    }

    if (
        requesterProfile?.role !== "super_admin" &&
        await containsLockedTeacher(adminClient, [
            data.assigned_teacher_id,
            data.assigned_teacher_id_2,
            data.assigned_teacher_id_3,
            data.assigned_teacher_id_4,
            data.assigned_teacher_id_5,
        ])
    ) {
        return { error: "Unauthorized: Only Super Admin can assign locked tutors." };
    }

    const { error: profileError } = await adminClient
        .from("profiles")
        .update({
            full_name: data.full_name,
            email: data.email
        })
        .eq("id", id);

    if (profileError) return { error: profileError.message };

    const serializedId = formatStudentIdAndMobile(data.custom_student_id, data.mobile_number);

    const updateFields: any = {
        grade_level: data.grade_level,
        custom_student_id: serializedId,
        parent_email: data.parent_email !== undefined ? data.parent_email : null,
        subject_name_1: data.subject_name_1 || 'Maths',
        subject_name_2: data.subject_name_2 !== undefined ? data.subject_name_2 : null,
        monthly_fee_2: data.monthly_fee_2 !== undefined ? data.monthly_fee_2 : 0,
        classes_per_month_2: data.classes_per_month_2 !== undefined ? data.classes_per_month_2 : 0,
        assigned_teacher_id_2: (data.assigned_teacher_id_2 !== undefined && data.assigned_teacher_id_2 !== "none" && data.assigned_teacher_id_2 !== "unassigned") ? data.assigned_teacher_id_2 : null,
        subject_name_3: data.subject_name_3 !== undefined ? data.subject_name_3 : null,
        monthly_fee_3: data.monthly_fee_3 !== undefined ? data.monthly_fee_3 : 0,
        classes_per_month_3: data.classes_per_month_3 !== undefined ? data.classes_per_month_3 : 0,
        assigned_teacher_id_3: (data.assigned_teacher_id_3 !== undefined && data.assigned_teacher_id_3 !== "none" && data.assigned_teacher_id_3 !== "unassigned") ? data.assigned_teacher_id_3 : null,
        subject_name_4: data.subject_name_4 !== undefined ? data.subject_name_4 : null,
        monthly_fee_4: data.monthly_fee_4 !== undefined ? data.monthly_fee_4 : 0,
        classes_per_month_4: data.classes_per_month_4 !== undefined ? data.classes_per_month_4 : 0,
        assigned_teacher_id_4: (data.assigned_teacher_id_4 !== undefined && data.assigned_teacher_id_4 !== "none" && data.assigned_teacher_id_4 !== "unassigned") ? data.assigned_teacher_id_4 : null,
        subject_name_5: data.subject_name_5 !== undefined ? data.subject_name_5 : null,
        monthly_fee_5: data.monthly_fee_5 !== undefined ? data.monthly_fee_5 : 0,
        classes_per_month_5: data.classes_per_month_5 !== undefined ? data.classes_per_month_5 : 0,
        assigned_teacher_id_5: (data.assigned_teacher_id_5 !== undefined && data.assigned_teacher_id_5 !== "none" && data.assigned_teacher_id_5 !== "unassigned") ? data.assigned_teacher_id_5 : null
    };
    if (data.monthly_fee !== undefined) updateFields.monthly_fee = data.monthly_fee;
    if (data.classes_per_month !== undefined) updateFields.classes_per_month = data.classes_per_month;
    if (data.tutor_hourly_rate !== undefined) updateFields.tutor_hourly_rate = data.tutor_hourly_rate;
    if (data.assigned_teacher_id !== undefined) updateFields.assigned_teacher_id = (data.assigned_teacher_id === "none" || data.assigned_teacher_id === "unassigned" || !data.assigned_teacher_id) ? null : data.assigned_teacher_id;

    const { error: detailError } = await adminClient
        .from("student_details")
        .update(updateFields)
        .eq("id", id);

    if (detailError) return { error: detailError.message };

    revalidatePath("/(dashboard)", "layout");
    return { success: true };
}

export async function updateStudentStatus(id: string, status: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr", "operations"].includes(requesterProfile?.role || "")) {
        return { error: "Unauthorized" };
    }

    const { data: targetStudent } = await adminClient
        .from("student_details")
        .select(`
            assigned_teacher_id,
            assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(
                staff_details(status)
            ),
            assigned_teacher_2:profiles!student_details_assigned_teacher_id_2_fkey(
                staff_details(status)
            ),
            assigned_teacher_3:profiles!student_details_assigned_teacher_id_3_fkey(
                staff_details(status)
            ),
            assigned_teacher_4:profiles!student_details_assigned_teacher_id_4_fkey(
                staff_details(status)
            ),
            assigned_teacher_5:profiles!student_details_assigned_teacher_id_5_fkey(
                staff_details(status)
            )
        `)
        .eq("id", id)
        .single();

    if (hasLockedAssignedTeacher(targetStudent) && requesterProfile?.role !== 'super_admin') {
        return { error: "Unauthorized: Only Super Admin can modify private student status." };
    }

    const { error: statusError } = await adminClient
        .from("student_details")
        .update({ status })
        .eq("id", id);

    if (statusError) return { error: statusError.message };

    // If student is marked as inactive, make all connected areas inactive/cancelled/rejected
    if (status === 'inactive') {
        // 1. Cancel all class schedules for this student
        await adminClient
            .from("class_schedules")
            .update({ status: 'cancelled' })
            .eq("student_id", id);

        // 2. Cancel all scheduled/ongoing live classes for this student
        await adminClient
            .from("live_classes")
            .update({ status: 'cancelled' })
            .eq("student_id", id)
            .in("status", ["scheduled", "ongoing"]);

        // 3. Reject pending leaves for this student
        await adminClient
            .from("student_leaves")
            .update({ status: 'rejected' })
            .eq("student_id", id)
            .eq("status", "pending");

        // 4. Reject pending reschedule requests for this student
        await adminClient
            .from("reschedule_requests")
            .update({ status: 'rejected' })
            .eq("student_id", id)
            .eq("status", "pending");
    }

    revalidatePath("/hr/students");
    revalidatePath("/(dashboard)", "layout");
    return { success: true };
}
