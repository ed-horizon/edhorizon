"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getLeads(showAll = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch user's role to determine default access
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    let query = supabase.from("leads").select("*, assigned_to(id, full_name, email)");

    // If NOT showAll and role is salesperson/sales, only show assigned leads
    const isAdminOrHead = profile?.role === "super_admin" || profile?.role === "admin" || profile?.role === "sales_head";
    if (!showAll || !isAdminOrHead) {
        query = query.eq("assigned_to", user.id);
    }

    const { data: leads, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching leads:", error);
        return [];
    }

    return leads;
}

export async function getPipelineStages() {
    const supabase = await createClient();
    const { data: stages, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index", { ascending: true });

    if (error) {
        console.error("Error fetching stages:", error);
        return [];
    }

    return stages;
}

export async function addPipelineStage(label: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const slug = label.toLowerCase().replace(/\s+/g, "_");

    // Get max order_index
    const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1);

    const nextOrder = (stages?.[0]?.order_index ?? -1) + 1;

    const { error } = await supabase.from("pipeline_stages").insert({
        label,
        slug,
        order_index: nextOrder
    });

    if (error) {
        console.error("Error adding stage:", error);
        return { error: error.message };
    }

    revalidatePath("/sales", "page");
    return { success: true };
}

export async function updateLeadStatus(leadId: string, status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);

    if (error) {
        console.error("Error updating lead status:", error);
        return { error: error.message };
    }

    revalidatePath("/sales", "page");
    return { success: true };
}

export async function updateLead(leadId: string, data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const updateData = { ...data };
    if (updateData.assigned_to === "") {
        updateData.assigned_to = null;
    }
    if (updateData.next_follow_up === "") {
        updateData.next_follow_up = null;
    } else if (updateData.next_follow_up) {
        updateData.next_follow_up = new Date(updateData.next_follow_up).toISOString();
    }

    // If required_course is "custom", use the required_course_custom field
    if (updateData.required_course === "custom") {
        updateData.required_course = updateData.required_course_custom || null;
    }
    delete updateData.required_course_custom;

    const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

    if (error) {
        console.error("Error updating lead:", error);
        return { error: error.message };
    }

    revalidatePath("/sales", "page");
    return { success: true };
}

export async function addLead(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const valueInput = formData.get("value") as string;
    const value = valueInput ? parseFloat(valueInput) : 0;
    const notes = formData.get("notes") as string;
    const studentClass = formData.get("class") as string;
    const feedback = formData.get("feedback") as string;
    
    // Detailed CRM fields
    const parentName = formData.get("parent_name") as string;
    const leadSource = formData.get("lead_source") as string;
    let requiredCourse = formData.get("required_course") as string;
    if (requiredCourse === "custom") {
        requiredCourse = (formData.get("required_course_custom") as string) || "";
    }
    const callStatus = formData.get("call_status") as string;
    const lostReason = formData.get("lost_reason") as string;
    const nextFollowUp = formData.get("next_follow_up") as string;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const isManager = profile?.role === "super_admin" || profile?.role === "admin" || profile?.role === "sales_head";
    const formAssignedTo = formData.get("assigned_to") as string;
    let assignedTo: string | null = user.id;
    if (isManager) {
        if (formAssignedTo === "") {
            assignedTo = null;
        } else if (formAssignedTo) {
            assignedTo = formAssignedTo;
        }
    }

    const { error } = await supabase.from("leads").insert({
        name,
        email,
        phone,
        value,
        notes,
        class: studentClass,
        feedback,
        assigned_to: assignedTo,
        status: "new",
        parent_name: parentName || null,
        lead_source: leadSource || null,
        required_course: requiredCourse || null,
        call_status: callStatus || null,
        lost_reason: lostReason || null,
        next_follow_up: nextFollowUp ? new Date(nextFollowUp).toISOString() : null
    });

    if (error) {
        console.error("Error adding lead:", error);
        return { error: error.message };
    }

    revalidatePath("/sales", "page");
    return { success: true };
}

export async function getUniqueCourses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const defaultCourses = ["Spoken Hindi", "School Hindi", "Spoken English", "AI for kids", "Math / Science"];
    if (!user) return defaultCourses;

    const { data, error } = await supabase
        .from("leads")
        .select("required_course");

    if (error) {
        console.error("Error fetching unique courses:", error);
        return defaultCourses;
    }

    const dbCourses = data
        .map(l => l.required_course)
        .filter((c): c is string => !!c && c.trim() !== "");

    // Merge and get unique courses
    const allCourses = Array.from(new Set([...defaultCourses, ...dbCourses]));
    return allCourses;
}

export async function getLeadNotes(leadId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: notes, error } = await supabase
        .from("sales_notes")
        .select("*, created_by:profiles!created_by(full_name, email)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching lead notes:", error);
        return [];
    }

    return notes;
}

export async function addLeadNote(leadId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };
    if (!content.trim()) return { error: "Content cannot be empty" };

    const { error } = await supabase.from("sales_notes").insert({
        lead_id: leadId,
        content,
        created_by: user.id
    });

    if (error) {
        console.error("Error adding lead note:", error);
        return { error: error.message };
    }

    revalidatePath("/sales", "page");
    return { success: true };
}

export async function getSalesAgents() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: agents, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["sales", "sales_head", "admin", "super_admin"])
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Error fetching sales agents:", error);
        return [];
    }

    return agents;
}
