'use server'

import { createClient } from "@/lib/supabase/server";
import { parseDescription } from "@/lib/utils";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getStudentCourses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const adminSupabase = createAdminClient();

    // 1. Fetch modules and filter by student_id
    const { data: modulesData, error: modulesError } = await adminSupabase
        .from('modules')
        .select('id, description');
    if (modulesError) throw modulesError;

    const studentModuleIds = (modulesData || [])
        .filter(mod => parseDescription(mod.description).studentId === user.id)
        .map(mod => mod.id);

    // 2. Fetch courses along with topics and capsules
    let query = adminSupabase
        .from('courses')
        .select(`
            *,
            topics (
                *,
                capsules (
                    *,
                    quiz_completions (score, student_id)
                )
            )
        `)
        .order('order', { ascending: true });

    if (studentModuleIds.length > 0) {
        query = query.in('module_id', studentModuleIds);
    }

    const { data, error } = await query;
    if (error) {
        console.error("getStudentCourses Error:", error);
        return [];
    }

    // 3. Process to filter capsules assigned to this student and calculate progress
    const processedCourses = (data || []).map(course => ({
        ...course,
        topics: (course.topics || []).map((topic: any) => {
            const studentCapsules = (topic.capsules || []).filter((c: any) => {
                const studentIdInContent = String(c.content?.student_id || '').trim();
                const userIdStr = String(user.id).trim();
                const isDirectAssignment = Boolean(studentIdInContent && studentIdInContent === userIdStr);
                const isModuleAssignment = studentModuleIds.includes(course.module_id);
                return isDirectAssignment || isModuleAssignment;
            });

            const totalCapsules = studentCapsules.length;
            const completedCapsules = studentCapsules.filter((c: any) => {
                const userCompletions = (c.quiz_completions || []).filter((qc: any) => String(qc.student_id).trim() === String(user.id).trim());
                return userCompletions.length > 0 || c.type === 'video';
            }).length;

            return {
                ...topic,
                capsules: studentCapsules,
                progress: totalCapsules > 0 ? Math.round((completedCapsules / totalCapsules) * 100) : 0,
                totalCapsules,
                completedCapsules
            };
        }).filter((topic: any) => topic.capsules.length > 0)
    }));

    return processedCourses.filter(c => c.topics && c.topics.length > 0);
}

export async function getStudentAssignedCapsules(studentId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = studentId || user?.id;
    if (!targetUserId) return [];

    const adminSupabase = createAdminClient();

    // 1. Fetch modules for this student
    const { data: modulesData } = await adminSupabase
        .from('modules')
        .select('id, description');

    const studentModuleIds = (modulesData || [])
        .filter(mod => {
            const modStudentId = parseDescription(mod.description).studentId;
            return modStudentId && String(modStudentId).trim() === String(targetUserId).trim();
        })
        .map(mod => mod.id);

    // 2. Query capsules assigned to targetUserId or student's modules
    const { data: capsulesData, error } = await adminSupabase
        .from('capsules')
        .select(`
            *,
            topic:topics (
                id,
                title,
                course:courses (
                    id,
                    title,
                    module_id
                )
            ),
            quiz_completions (
                id,
                score,
                completed_at,
                student_id
            )
        `)
        .order('created_at', { ascending: false });

    if (error || !capsulesData) {
        console.error("getStudentAssignedCapsules error:", error);
        return [];
    }

    // Filter capsules for targetUserId
    const assigned = capsulesData.filter(c => {
        const studentIdInContent = String(c.content?.student_id || '').trim();
        const targetIdStr = String(targetUserId).trim();
        const directMatch = Boolean(studentIdInContent && studentIdInContent === targetIdStr);
        const moduleMatch = Boolean(c.topic?.course?.module_id && studentModuleIds.includes(c.topic.course.module_id));
        return directMatch || moduleMatch;
    });

    return assigned.map(c => {
        const userCompletions = (c.quiz_completions || []).filter((qc: any) => String(qc.student_id).trim() === String(targetUserId).trim());
        const isCompleted = userCompletions.length > 0 || c.type === 'video';
        const bestScore = userCompletions.reduce((max: number, qc: any) => Math.max(max, Number(qc.score || 0)), 0);

        return {
            id: c.id,
            title: c.title,
            type: c.type, // 'mcq' | 'flashcard' | 'video'
            status: c.status,
            created_at: c.created_at,
            topic_id: c.topic_id,
            topic_title: c.topic?.title || "General Study",
            course_title: c.topic?.course?.title || "General Course",
            is_completed: isCompleted,
            score: userCompletions.length > 0 ? bestScore : null,
            content: c.content
        };
    });
}



async function awardXPAndStreak(userId: string, xp: number) {
    const supabase = await createClient();

    // 1. Update XP Total
    const { data: gamification } = await supabase
        .from('user_gamification')
        .select('xp_total, level')
        .eq('user_id', userId)
        .single();

    if (gamification) {
        const newXP = gamification.xp_total + xp;
        const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1; // Simple level logic

        await supabase
            .from('user_gamification')
            .update({
                xp_total: newXP,
                level: newLevel,
                last_activity_at: new Date().toISOString()
            })
            .eq('user_id', userId);
    }

    // 2. Update Streak
    const { data: streak } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (streak) {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = streak.last_streak_date;

        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            let newStreak = 1;
            if (lastDate === yesterdayStr) {
                newStreak = streak.current_streak + 1;
            }

            await supabase
                .from('user_streaks')
                .update({
                    current_streak: newStreak,
                    longest_streak: Math.max(newStreak, streak.longest_streak),
                    last_streak_date: today
                })
                .eq('user_id', userId);
        }
    }
}

export async function saveQuizResult(capsuleId: string, score: number, totalQuestions: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminSupabase = createAdminClient();

    // Calculate percentage score (0-100%) if raw correct count was passed
    const percentageScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;

    const { error } = await adminSupabase
        .from('quiz_completions')
        .upsert({
            student_id: user.id,
            capsule_id: capsuleId,
            score: percentageScore,
            total_questions: totalQuestions,
            completed_at: new Date().toISOString()
        }, {
            onConflict: 'student_id,capsule_id'
        });

    if (error) throw error;

    // Award XP based on correct count or percentage
    const xpAwarded = (score * 10) + 5;
    await awardXPAndStreak(user.id, xpAwarded);

    return { success: true, xpAwarded, score: percentageScore };
}

export async function trackVideoCompletion(capsuleId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from('quiz_completions')
        .upsert({
            student_id: user.id,
            capsule_id: capsuleId,
            score: 100,
            total_questions: 1,
            completed_at: new Date().toISOString()
        }, {
            onConflict: 'student_id,capsule_id'
        });

    if (error) throw error;

    // Award fixed XP for video completion
    const xpAwarded = 25;
    await awardXPAndStreak(user.id, xpAwarded);

    return { success: true, xpAwarded };
}
