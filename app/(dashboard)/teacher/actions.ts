
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getTeacherCapsules() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("capsules")
        .select("*, topics(title, courses(title))")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching capsules:", error);
        return [];
    }

    return data;
}

export async function createCapsule(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const videoUrl = formData.get("videoUrl") as string;

    // Hardcoded for V1 MVP: MathHorizon -> Grade 1 -> Counting to 10
    // In real app, these would come from select dropdowns or context
    // We need to fetch the Topic ID based on our seed data
    const { data: topic } = await supabase
        .from("topics")
        .select("id")
        .eq("title", "Counting to 10")
        .single();

    if (!topic) {
        // Fallback if seed data missing
        return { error: "Topic not found. Please run seed." };
    }

    const payload = {
        title,
        topic_id: topic.id,
        type: "video",
        status: "draft",
        author_id: user.id,
        content: {
            videoUrl,
            description,
        },
    };

    const { error } = await supabase.from("capsules").insert(payload);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/teacher", "page");
    return { success: true };
}

export async function getTeacherStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { students: 0, capsules: 0, hours: 0, monthlyClassCount: 0 };

    // 1. Active Students assigned to this teacher
    const { count: studentCount } = await supabase
        .from('student_details')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_teacher_id', user.id);

    // 2. Total Capsules created by this teacher
    const { count: capsuleCount } = await supabase
        .from('capsules')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id);

    // 3. Completed teaching hours
    const { data: classData } = await supabase
        .from('live_classes')
        .select('duration_hours, student_attendance(status)')
        .eq('teacher_id', user.id)
        .eq('status', 'completed');

    const validClassesForHours = (classData || []).filter((c: any) => {
        const att = Array.isArray(c.student_attendance) ? c.student_attendance[0] : c.student_attendance;
        return att?.status !== 'absent';
    });

    const totalHours = validClassesForHours.reduce((acc, curr) => acc + Number(curr.duration_hours || 0), 0) || 0;

    // 4. Completed classes in current month
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthlyClassesData } = await supabase
        .from('live_classes')
        .select('id, student_attendance(status)')
        .eq('teacher_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_at', startOfCurrentMonth);

    const monthlyClassCount = (monthlyClassesData || []).filter((c: any) => {
        const att = Array.isArray(c.student_attendance) ? c.student_attendance[0] : c.student_attendance;
        return att?.status !== 'absent';
    }).length;

    return {
        students: studentCount || 0,
        capsules: capsuleCount || 0,
        hours: totalHours,
        monthlyClassCount: monthlyClassCount || 0
    };
}
