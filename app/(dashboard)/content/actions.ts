'use server'

import { createClient } from "@/lib/supabase/server";
import { parseDescription, formatDescription } from "@/lib/utils";

export async function getModules() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .order('created_at', { ascending: false });

    if (modulesError) throw modulesError;

    // Fetch all student profiles to join student names
    const { data: studentProfiles } = await supabase
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
        const { data: assignedStudents } = await supabase
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
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('module_id', moduleId)
        .order('order', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getTopicsByCourse(courseId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const { data, error } = await supabase
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

    if (error) throw error;

    const parsedTopics = (data || []).map((topic: any) => {
        if (topic.courses?.modules) {
            const { studentId } = parseDescription(topic.courses.modules.description);
            topic.courses.modules.student_id = studentId;
        }
        return topic;
    });

    if (profile?.role === 'teacher') {
        const { data: assignedStudents } = await supabase
            .from('student_details')
            .select('id')
            .eq('assigned_teacher_id', user.id);
        
        const studentIds = assignedStudents?.map(s => s.id) || [];
        return parsedTopics.filter((t: any) => t.courses?.modules?.student_id && studentIds.includes(t.courses.modules.student_id));
    }

    return parsedTopics;
}

export async function getOrCreateTopicForStudent(studentId: string, topicTitle: string) {
    const supabase = await createClient();
    
    // 1. Fetch all modules to check if student already has a default module
    const { data: allModules, error: moduleFetchError } = await supabase
        .from('modules')
        .select('*');
        
    if (moduleFetchError) throw moduleFetchError;

    let targetModule = (allModules || []).find(mod => {
        const { studentId: parsedStudentId } = parseDescription(mod.description);
        return parsedStudentId === studentId && mod.title === "General Syllabus";
    });

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
    const { data: courses, error: courseFetchError } = await supabase
        .from('courses')
        .select('*')
        .eq('module_id', moduleId);

    if (courseFetchError) throw courseFetchError;

    let targetCourse = (courses || []).find(c => c.title === "General Course");
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
        title: topicTitle
    });

    return newTopic.id;
}

export async function saveCapsule(payload: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    let topicId = payload.topic_id;
    if (!topicId && payload.student_id) {
        const topicTitle = payload.custom_topic_title?.trim() || "General Study";
        topicId = await getOrCreateTopicForStudent(payload.student_id, topicTitle);
    }

    const { data, error } = await supabase
        .from('capsules')
        .insert({
            topic_id: topicId,
            title: payload.title,
            type: payload.type,
            content: {
                ...payload.content,
                student_id: payload.student_id // Store student_id inside the JSONB content column
            },
            author_id: user.id,
            status: 'draft'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getPendingCapsules() {
    const supabase = await createClient();
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            student_details!student_details_id_fkey!inner (
                assigned_teacher_id
            )
        `)
        .eq('student_details.assigned_teacher_id', user.id)
        .order('full_name', { ascending: true });

    if (error) throw error;
    return data;
}

export async function saveModule(payload: { title: string; description: string; student_id: string; icon?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const slug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`;
    const formattedDesc = formatDescription(payload.student_id, payload.description);

    const { data, error } = await supabase
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

    const { data: existing } = await supabase
        .from('courses')
        .select('order')
        .eq('module_id', payload.module_id)
        .order('order', { ascending: false })
        .limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].order + 1) : 0;

    const { data, error } = await supabase
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

    const { data: existing } = await supabase
        .from('topics')
        .select('order')
        .eq('course_id', payload.course_id)
        .order('order', { ascending: false })
        .limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].order + 1) : 0;

    const { data, error } = await supabase
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

