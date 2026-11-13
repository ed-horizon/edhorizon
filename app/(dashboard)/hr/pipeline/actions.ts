"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import {
    HRCandidate,
    HRCandidatePayload,
    HRCandidateStatus,
    isHRPipelineAuthorized,
    validateCandidatePayload,
    filterCandidates,
    HR_CANDIDATE_STATUSES,
} from "@/lib/hr-candidates";

async function verifyHRAccess() {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { authorized: false, error: "Not authenticated", user: null };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (!isHRPipelineAuthorized(profile?.role)) {
        return {
            authorized: false,
            error: "Unauthorized: Access restricted to HR and Admin.",
            user: null,
        };
    }

    return { authorized: true, user, role: profile?.role, fullName: profile?.full_name };
}

export async function getHRCandidates(filters?: { status?: string; search?: string }): Promise<{
    success: boolean;
    candidates: HRCandidate[];
    error?: string;
}> {
    noStore();
    const auth = await verifyHRAccess();
    if (!auth.authorized) {
        return { success: false, candidates: [], error: auth.error };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from("hr_candidates")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching HR candidates:", error);
        return { success: false, candidates: [], error: error.message };
    }

    let candidates: HRCandidate[] = data || [];
    if (filters) {
        candidates = filterCandidates(candidates, filters);
    }

    return { success: true, candidates };
}

export async function createHRCandidate(payload: Partial<HRCandidatePayload>): Promise<{
    success: boolean;
    candidate?: HRCandidate;
    error?: string;
}> {
    const auth = await verifyHRAccess();
    if (!auth.authorized || !auth.user) {
        return { success: false, error: auth.error };
    }

    const validation = validateCandidatePayload(payload);
    if (!validation.valid || !validation.sanitized) {
        return { success: false, error: validation.error || "Invalid candidate data" };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from("hr_candidates")
        .insert({
            name: validation.sanitized.name,
            phone: validation.sanitized.phone,
            subject: validation.sanitized.subject,
            salary_discussed: validation.sanitized.salary_discussed,
            status: validation.sanitized.status,
            feedback: validation.sanitized.feedback,
            created_by: auth.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

    if (error) {
        console.error("Error creating HR candidate:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/hr/pipeline");
    revalidatePath("/hr");
    return { success: true, candidate: data };
}

export async function updateHRCandidateStatus(
    candidateId: string,
    status: HRCandidateStatus
): Promise<{
    success: boolean;
    error?: string;
}> {
    const auth = await verifyHRAccess();
    if (!auth.authorized) {
        return { success: false, error: auth.error };
    }

    const validStatuses = HR_CANDIDATE_STATUSES.map((s) => s.value);
    if (!validStatuses.includes(status)) {
        return { success: false, error: "Invalid status value" };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("hr_candidates")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

    if (error) {
        console.error("Error updating candidate status:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/hr/pipeline");
    return { success: true };
}

export async function updateHRCandidateFeedback(
    candidateId: string,
    feedback: string
): Promise<{
    success: boolean;
    error?: string;
}> {
    const auth = await verifyHRAccess();
    if (!auth.authorized) {
        return { success: false, error: auth.error };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("hr_candidates")
        .update({
            feedback: feedback.trim(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

    if (error) {
        console.error("Error updating candidate feedback:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/hr/pipeline");
    return { success: true };
}

export async function updateHRCandidateDetails(
    candidateId: string,
    payload: Partial<HRCandidatePayload>
): Promise<{
    success: boolean;
    error?: string;
}> {
    const auth = await verifyHRAccess();
    if (!auth.authorized) {
        return { success: false, error: auth.error };
    }

    const validation = validateCandidatePayload(payload);
    if (!validation.valid || !validation.sanitized) {
        return { success: false, error: validation.error || "Invalid candidate data" };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("hr_candidates")
        .update({
            name: validation.sanitized.name,
            phone: validation.sanitized.phone,
            subject: validation.sanitized.subject,
            salary_discussed: validation.sanitized.salary_discussed,
            status: validation.sanitized.status,
            feedback: validation.sanitized.feedback,
            updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

    if (error) {
        console.error("Error updating candidate details:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/hr/pipeline");
    return { success: true };
}

export async function deleteHRCandidate(candidateId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const auth = await verifyHRAccess();
    if (!auth.authorized) {
        return { success: false, error: auth.error };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("hr_candidates").delete().eq("id", candidateId);

    if (error) {
        console.error("Error deleting candidate:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/hr/pipeline");
    revalidatePath("/hr");
    return { success: true };
}

