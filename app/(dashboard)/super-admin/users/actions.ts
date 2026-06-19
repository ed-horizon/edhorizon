
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getUsers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Security: Check if requester is super_admin or admin
    const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (requesterProfile?.role !== "super_admin" && requesterProfile?.role !== "admin") {
        console.warn("Unauthorized access attempt to getUsers by", user.id);
        return [];
    }

    // Fetch all profiles with details
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, staff_details(*), student_details!student_details_id_fkey(*)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return profiles;
}

export async function deleteUser(userId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Security: Check if requester is super_admin or admin
    const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (requesterProfile?.role !== "super_admin" && requesterProfile?.role !== "admin") {
        return { error: "Unauthorized" };
    }

    // Call Supabase Admin API to delete the user from auth.users (Profiles cascades on delete)
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
        console.error("Error deleting user from auth:", error);
        return { error: error.message };
    }

    revalidatePath("/super-admin/users", "page");
    return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Security: Check if requester is super_admin or admin (optimized single query)
    const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (requesterProfile?.role !== "super_admin" && requesterProfile?.role !== "admin") {
        return { error: "Unauthorized" };
    }

    // Update the user role
    const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) return { error: error.message };

    // Use more specific revalidation for better performance
    revalidatePath("/super-admin/users", "page");
    return { success: true };
}

export async function updateUserRoles(changes: { userId: string, newRole: string }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Security: Check if requester is super_admin or admin
    const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (requesterProfile?.role !== "super_admin" && requesterProfile?.role !== "admin") {
        return { error: "Unauthorized" };
    }

    // Process all changes
    const results = await Promise.all(
        changes.map(async ({ userId, newRole }) => {
            console.log(`Attempting to update user ${userId} to role ${newRole}...`);
            const { error } = await supabase
                .from("profiles")
                .update({ role: newRole })
                .eq("id", userId)
                .select(); // Returning data to ensure update happened

            if (error) {
                console.error(`Error updating user ${userId} to role ${newRole}:`, error.message);
                return { userId, error: error.message };
            }

            console.log(`Successfully updated user ${userId} to ${newRole}`);
            return { userId, success: true };
        })
    );

    const errors = results.filter(r => 'error' in r);

    revalidatePath("/super-admin/users", "page");

    if (errors.length > 0) {
        return {
            error: "Some updates failed. Check logs for details.",
            details: errors
        };
    }

    return { success: true };
}

export async function createUser(data: { email: string; password: string; fullName: string; role: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Security: Check if requester is super_admin or admin
    const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (requesterProfile?.role !== "super_admin" && requesterProfile?.role !== "admin") {
        return { error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    // 1. Create the user in Auth
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            full_name: data.fullName,
            role: data.role
        }
    });

    if (authError) return { error: authError.message };

    // 2. The trigger handles profile creation, but let's ensure the role is set correctly
    // (Trigger logic: raw_user_meta_data->>'role')
    // We already passed role in user_metadata, so it should be fine.

    revalidatePath("/super-admin/users", "page");
    return { success: true, user: newUser.user };
}

export async function updateUserPassword(targetUserId: string, newPassword: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Not authenticated" };

        // 1. Fetch caller's profile
        const { data: callerProfile, error: callerError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (callerError || !callerProfile) {
            return { error: "Failed to authenticate caller profile" };
        }

        const callerRole = callerProfile.role;
        if (callerRole !== "super_admin" && callerRole !== "operations") {
            return { error: "Unauthorized. Password resets can only be performed by Super Admin or Operations." };
        }

        // 2. Fetch target's profile
        const { data: targetProfile, error: targetError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", targetUserId)
            .single();

        if (targetError || !targetProfile) {
            return { error: "Target user not found" };
        }

        const targetRole = targetProfile.role;

        // 3. Enforce constraint: operations cannot change a super_admin's password.
        if (targetRole === "super_admin" && callerRole !== "super_admin") {
            return { error: "Unauthorized. Only a Super Admin can change a Super Admin's password." };
        }

        // 4. Update password using Auth Admin API
        const adminClient = createAdminClient();
        const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, {
            password: newPassword
        });

        if (authError) {
            return { error: authError.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Exception in updateUserPassword:", err);
        return { error: err.message || "An unexpected error occurred." };
    }
}

