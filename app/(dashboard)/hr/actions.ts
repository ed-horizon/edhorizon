
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function runPayrollMock() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Check if HR or Admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!["super_admin", "admin", "hr"].includes(profile?.role || "")) {
        return { error: "Unauthorized" };
    }

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { success: true, message: "Payroll processing initiated for Feb 2026 cycle." };
}
