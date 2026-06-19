
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatStudentIdAndMobile } from "@/lib/utils";

export async function createStaffMember(data: { full_name: string; email: string; role: string; employee_id?: string }) {
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
                status: 'active',
                joining_date: new Date().toISOString().split('T')[0]
            });
            
        if (updateError) {
            console.error("Error setting employee ID on staff details:", updateError);
        }
    }

    revalidatePath("/hr/staff");
    return { success: true };
}

export async function updateStaffMember(id: string, data: { full_name: string; email: string; role: string; hourly_rate?: number; employee_id?: string }) {
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
    if (data.employee_id !== undefined) {
        detailsUpdate.employee_id = data.employee_id || null;
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
                custom_student_id: serializedId
            });

        if (updateError) {
            console.error("Error upserting student details:", updateError);
        }
    }

    revalidatePath("/hr/students");
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
        custom_student_id: serializedId
    };
    if (data.monthly_fee !== undefined) updateFields.monthly_fee = data.monthly_fee;
    if (data.classes_per_month !== undefined) updateFields.classes_per_month = data.classes_per_month;
    if (data.tutor_hourly_rate !== undefined) updateFields.tutor_hourly_rate = data.tutor_hourly_rate;

    const { error: detailError } = await adminClient
        .from("student_details")
        .update(updateFields)
        .eq("id", id);

    if (detailError) return { error: detailError.message };

    revalidatePath("/hr/students");
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
