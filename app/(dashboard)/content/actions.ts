'use server'

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { parseDescription, formatDescription } from "@/lib/utils";
import { unstable_noStore as noStore } from "next/cache";

function getAdminSupabase() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return null;
}

export async function getModules() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const adminSupabase = getAdminSupabase() || supabase;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const { data: modulesData, error: modulesError } = await adminSupabase
        .from('modules')
        .select('*')
        .order('created_at', { ascending: false });

    if (modulesError) throw modulesError;

    // Fetch all student profiles to join student names
    const { data: studentProfiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student');
    
    const studentMap = new Map((studentProfiles || []).map(p => [p.id, p.full_name]));

    const parsedModules = (modulesData || []).map(mod => {
        const { studentId, cleanDescription } = parseDescription(mod.description);
        return {
            ...mod,
            student_id: studentId,
            description: cleanDescription,
            student: studentId ? { full_name: studentMap.get(studentId) || 'Unknown Student' } : null
        };
    });

    if (profile?.role === 'teacher') {
        // Get teacher's assigned student IDs
        const { data: assignedStudents } = await adminSupabase
            .from('student_details')
            .select('id')
            .eq('assigned_teacher_id', user.id);
        
        const studentIds = assignedStudents?.map(s => s.id) || [];
        return parsedModules.filter(mod => mod.student_id && studentIds.includes(mod.student_id));
    }

    return parsedModules;
}

export async function getCoursesByModule(moduleId: string) {
    const supabase = await createClient();
    const adminSupabase = getAdminSupabase() || supabase;
    const { data, error } = await adminSupabase
        .from('courses')
        .select('*')
        .eq('module_id', moduleId)
        .order('order', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getTopicsByCourse(courseId: string) {
    const supabase = await createClient();
    const adminSupabase = getAdminSupabase() || supabase;
    const { data, error } = await adminSupabase
        .from('topics')
        .select(`
            *,
            capsules (*)
        `)
        .eq('course_id', courseId)
        .order('order', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getTopics() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const adminSupabase = getAdminSupabase() || supabase;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const { data, error } = await adminSupabase
            .from('topics')
            .select(`
                *,
                courses (
                    title,
                    modules (
                        id,
                        title,
                        description
                    )
                )
            `)
            .order('title', { ascending: true });

        if (error) {
            console.error("getTopics query error:", error);
            return [];
        }

        const parsedTopics = (data || []).map((topic: any) => {
            if (topic.courses?.modules) {
                const { studentId } = parseDescription(topic.courses.modules.description);
                topic.courses.modules.student_id = studentId;
            }
            return topic;
        });

        if (profile?.role === 'teacher') {
            const { data: assignedStudents } = await adminSupabase
                .from('student_details')
                .select('id')
                .or(`assigned_teacher_id.eq.${user.id},assigned_teacher_id_2.eq.${user.id},assigned_teacher_id_3.eq.${user.id},assigned_teacher_id_4.eq.${user.id},assigned_teacher_id_5.eq.${user.id}`);
            
            const studentIds = assignedStudents?.map(s => s.id) || [];
            return parsedTopics.filter((t: any) => !t.courses?.modules?.student_id || studentIds.includes(t.courses.modules.student_id));
        }

        return parsedTopics;
    } catch (err) {
        console.error("getTopics unexpected error:", err);
        return [];
    }
}

export async function getOrCreateTopicForStudent(studentId: string, topicTitle: string) {
    const supabase = await createClient();
    const adminSupabase = getAdminSupabase() || supabase;
    
    // 1. Fetch all modules to check if student already has a default module
    const { data: allModules } = await adminSupabase
        .from('modules')
        .select('*');
        
    let targetModule = (allModules || []).find(mod => {
        const { studentId: parsedStudentId } = parseDescription(mod.description);
        return parsedStudentId === studentId;
    }) || (allModules || [])[0];

    if (!targetModule) {
        // Create a default module
        targetModule = await saveModule({
            title: "General Syllabus",
            description: "General learning syllabus module",
            student_id: studentId,
            icon: "BookOpen"
        });
    }

    const moduleId = targetModule.id;

    // 2. Find or create default course under this module
    const { data: courses } = await adminSupabase
        .from('courses')
        .select('*')
        .eq('module_id', moduleId);

    let targetCourse = (courses || [])[0];
    if (!targetCourse) {
        targetCourse = await saveCourse({
            module_id: moduleId,
            title: "General Course"
        });
    }

    const courseId = targetCourse.id;

    // 3. Create topic under this course
    const newTopic = await saveTopic({
        course_id: courseId,
        title: topicTitle || "General Study"
    });

    return newTopic.id;
}

export async function saveCapsule(payload: any) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized: User session not found." };
        }

        const adminSupabase = getAdminSupabase() || supabase;

        let topicId = payload.topic_id;
        if (!topicId && payload.student_id) {
            try {
                const topicTitle = payload.custom_topic_title?.trim() || "General Study";
                topicId = await getOrCreateTopicForStudent(payload.student_id, topicTitle);
            } catch (err: any) {
                console.error("Error creating topic for student:", err);
            }
        }

        // If topicId is still missing, fallback to any existing topic in the database or create a new default topic
        if (!topicId) {
            const { data: existingTopic } = await adminSupabase
                .from('topics')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (existingTopic?.id) {
                topicId = existingTopic.id;
            } else {
                const defaultMod = await saveModule({
                    title: "General Syllabus",
                    description: "General learning syllabus module",
                    student_id: payload.student_id || user.id,
                    icon: "BookOpen"
                });
                const defaultCourse = await saveCourse({
                    module_id: defaultMod.id,
                    title: "General Course"
                });
                const defaultTopic = await saveTopic({
                    course_id: defaultCourse.id,
                    title: payload.custom_topic_title?.trim() || "General Study"
                });
                topicId = defaultTopic.id;
            }
        }

        if (!topicId) {
            return { success: false, error: "Could not resolve a valid parent topic for this capsule." };
        }

        const insertPayload: any = {
            topic_id: topicId,
            title: payload.title || "Untitled Capsule",
            type: payload.type || "video",
            content: {
                ...(payload.content || {}),
                student_id: payload.student_id
            },
            author_id: user.id,
            status: 'draft'
        };

        const { data, error } = await adminSupabase
            .from('capsules')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            console.error("saveCapsule Supabase Insert Error:", error);
            return { success: false, error: error.message || "Failed to save capsule record in database." };
        }
        return { success: true, data };
    } catch (err: any) {
        console.error("saveCapsule unexpected error:", err);
        return { success: false, error: err?.message || "An unexpected error occurred while saving the capsule." };
    }
}

export async function getPendingCapsules() {
    noStore();
    const supabase = await createClient();
    const adminSupabase = getAdminSupabase() || supabase;
    const { data, error } = await adminSupabase
        .from('capsules')
        .select(`
            *,
            author:profiles (full_name),
            topic:topics (title)
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function updateCapsuleStatus(id: string, status: 'published' | 'draft' | 'rejected') {
    const supabase = await createClient();
    const adminSupabase = getAdminSupabase() || supabase;
    const { data, error } = await adminSupabase
        .from('capsules')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getStudents() {
    const supabase = await createClient();
    const adminSupabase = getAdminSupabase() || supabase;
    const { data, error } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getTutorStudents() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const adminSupabase = getAdminSupabase() || supabase;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (['super_admin', 'admin', 'hr', 'operations'].includes(profile?.role || '')) {
        return getStudents();
    }

    const { data: assignedStudents } = await adminSupabase
        .from('student_details')
        .select('id')
        .or(`assigned_teacher_id.eq.${user.id},assigned_teacher_id_2.eq.${user.id},assigned_teacher_id_3.eq.${user.id},assigned_teacher_id_4.eq.${user.id},assigned_teacher_id_5.eq.${user.id}`);

    const studentIds = (assignedStudents || []).map(s => s.id);
    if (studentIds.length === 0) return [];

    const { data, error } = await adminSupabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
        .order('full_name', { ascending: true });

    if (error) return [];
    return data || [];
}

export async function saveModule(payload: { title: string; description: string; student_id: string; icon?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminSupabase = getAdminSupabase() || supabase;

    const slug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`;
    const formattedDesc = formatDescription(payload.student_id, payload.description);

    const { data, error } = await adminSupabase
        .from('modules')
        .insert({
            title: payload.title,
            slug,
            description: formattedDesc,
            icon: payload.icon || 'BookOpen'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function saveCourse(payload: { module_id: string; title: string; grade?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminSupabase = getAdminSupabase() || supabase;

    const { data: existing } = await adminSupabase
        .from('courses')
        .select('order')
        .eq('module_id', payload.module_id)
        .order('order', { ascending: false })
        .limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].order + 1) : 0;

    const { data, error } = await adminSupabase
        .from('courses')
        .insert({
            module_id: payload.module_id,
            title: payload.title,
            order: nextOrder
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function saveTopic(payload: { course_id: string; title: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminSupabase = getAdminSupabase() || supabase;

    const { data: existing } = await adminSupabase
        .from('topics')
        .select('order')
        .eq('course_id', payload.course_id)
        .order('order', { ascending: false })
        .limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].order + 1) : 0;

    const { data, error } = await adminSupabase
        .from('topics')
        .insert({
            course_id: payload.course_id,
            title: payload.title,
            order: nextOrder
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

