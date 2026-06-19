'use server'

import { createClient } from "@/lib/supabase/server";
import { parseDescription } from "@/lib/utils";

export async function getStudentCourses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Fetch modules and filter by student_id
    const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id, description');
    if (modulesError) throw modulesError;

    const studentModuleIds = (modulesData || [])
        .filter(mod => parseDescription(mod.description).studentId === user.id)
        .map(mod => mod.id);

    if (studentModuleIds.length === 0) return [];

    // 2. Fetch courses along with topics and capsules
    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            topics (
                *,
                capsules (
                    *,
                    quiz_completions (score)
                )
            )
        `)
        .in('module_id', studentModuleIds)
        .order('order', { ascending: true });

    if (error) throw error;

    // 3. Process to filter capsules assigned to this student and calculate progress
    return data.map(course => ({
        ...course,
        topics: course.topics.map((topic: any) => {
            const studentCapsules = (topic.capsules || []).filter((c: any) => c.content?.student_id === user.id);
            const totalCapsules = studentCapsules.length;
            const completedCapsules = studentCapsules.filter((c: any) =>
                c.quiz_completions && (c.quiz_completions.length > 0 || c.type === 'video')
            ).length;

            return {
                ...topic,
                capsules: studentCapsules,
                progress: totalCapsules > 0 ? (completedCapsules / totalCapsules) * 100 : 0,
                totalCapsules,
                completedCapsules
            };
        })
    }));
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

    const { error } = await supabase
        .from('quiz_completions')
        .upsert({
            student_id: user.id,
            capsule_id: capsuleId,
            score,
            total_questions: totalQuestions,
            completed_at: new Date().toISOString()
        }, {
            onConflict: 'student_id,capsule_id'
        });

    if (error) throw error;

    // Award XP based on score (e.g., 10 XP per correct answer + 5 base)
    const xpAwarded = (score * 10) + 5;
    await awardXPAndStreak(user.id, xpAwarded);

    return { success: true, xpAwarded };
}

export async function trackVideoCompletion(capsuleId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Track completion in a generic progress table or specific video_completions
    // For now, using quiz_completions with perfect score for video
    const { error } = await supabase
        .from('quiz_completions')
        .upsert({
            student_id: user.id,
            capsule_id: capsuleId,
            score: 1,
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
