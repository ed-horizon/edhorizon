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

    // Fetch batch enrollments for this student
    const { data: myBatchEnrollments } = await adminSupabase
        .from('batch_enrollments')
        .select('batch_id')
        .eq('student_id', user.id);

    const batchIds = (myBatchEnrollments || []).map(b => b.batch_id);
    let batchCapsuleIds: string[] = [];
    if (batchIds.length > 0) {
        const { data: batchContent } = await adminSupabase
            .from('batch_learning_content')
            .select('capsule_id')
            .in('batch_id', batchIds);
        batchCapsuleIds = (batchContent || []).map(bc => bc.capsule_id);
    }

    // 2. Fetch courses along with topics and capsules
    let query = adminSupabase
        .from('courses')
        .select(`
            *,
            topics (
                *,
                capsules (
                    *,
                    quiz_completions (score, best_score, attempts_count, student_id)
                )
            )
        `)
        .order('order', { ascending: true });

    if (studentModuleIds.length > 0 && batchCapsuleIds.length === 0) {
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
                const isBatchAssignment = batchCapsuleIds.includes(c.id);
                return isDirectAssignment || isModuleAssignment || isBatchAssignment;
            });

            const totalCapsules = studentCapsules.length;
            const completedCapsules = studentCapsules.filter((c: any) => {
                const userCompletions = (c.quiz_completions || []).filter((qc: any) => String(qc.student_id).trim() === String(user.id).trim());
                const comp = userCompletions[0];
                const attemptsCount = comp ? Number(comp.attempts_count || 1) : 0;
                return c.type === 'video' ? Boolean(comp) : attemptsCount >= 2;
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

    // Fetch batch enrollments for this student
    const { data: myBatchEnrollments } = await adminSupabase
        .from('batch_enrollments')
        .select('batch_id')
        .eq('student_id', targetUserId);

    const batchIds = (myBatchEnrollments || []).map(b => b.batch_id);
    let batchCapsuleIds: string[] = [];
    if (batchIds.length > 0) {
        const { data: batchContent } = await adminSupabase
            .from('batch_learning_content')
            .select('capsule_id')
            .in('batch_id', batchIds);
        batchCapsuleIds = (batchContent || []).map(bc => bc.capsule_id);
    }

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
                best_score,
                attempts_count,
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
        const batchMatch = batchCapsuleIds.includes(c.id);
        return directMatch || moduleMatch || batchMatch;
    });

    return assigned.map(c => {
        const userCompletions = (c.quiz_completions || []).filter((qc: any) => String(qc.student_id).trim() === String(targetUserId).trim());
        const completion = userCompletions[0];
        const attemptsCount = completion ? Number(completion.attempts_count || 1) : 0;
        const bestScore = completion ? Number(completion.best_score ?? completion.score ?? 0) : null;
        const isCompleted = c.type === 'video' ? Boolean(completion) : (attemptsCount >= 2);
        const canAttempt = c.type === 'video' ? true : (attemptsCount < 2);

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
            attempts_count: attemptsCount,
            can_attempt: canAttempt,
            best_score: bestScore,
            score: bestScore,
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

    // 1. Fetch existing completion record
    const { data: existing } = await adminSupabase
        .from('quiz_completions')
        .select('id, attempts_count, best_score, score, attempt_history')
        .eq('student_id', user.id)
        .eq('capsule_id', capsuleId)
        .maybeSingle();

    const currentAttempts = existing ? Number(existing.attempts_count || 1) : 0;

    // Strict limit: 2 attempts only
    if (currentAttempts >= 2) {
        return {
            success: false,
            error: "Maximum attempts (2) reached for this capsule.",
            isMaxAttempts: true,
            attemptsCount: currentAttempts,
            bestScore: Number(existing?.best_score ?? existing?.score ?? 0)
        };
    }

    // Calculate percentage score (0-100%) if raw correct count was passed
    const percentageScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;
    const newAttemptNumber = currentAttempts + 1;
    const currentBest = existing ? Number(existing.best_score ?? existing.score ?? 0) : 0;
    const newBestScore = existing ? Math.max(currentBest, percentageScore) : percentageScore;

    const newAttemptItem = {
        attempt_number: newAttemptNumber,
        score: percentageScore,
        raw_score: score,
        total_questions: totalQuestions,
        completed_at: new Date().toISOString()
    };

    const existingHistory = (existing && Array.isArray(existing.attempt_history)) ? existing.attempt_history : [];
    const updatedHistory = [...existingHistory, newAttemptItem];

    if (existing) {
        const { error } = await adminSupabase
            .from('quiz_completions')
            .update({
                score: newBestScore,
                best_score: newBestScore,
                attempts_count: newAttemptNumber,
                attempt_history: updatedHistory,
                total_questions: totalQuestions,
                completed_at: new Date().toISOString()
            })
            .eq('id', existing.id);

        if (error) throw error;
    } else {
        const { error } = await adminSupabase
            .from('quiz_completions')
            .insert({
                student_id: user.id,
                capsule_id: capsuleId,
                score: percentageScore,
                best_score: percentageScore,
                attempts_count: 1,
                attempt_history: [newAttemptItem],
                total_questions: totalQuestions,
                completed_at: new Date().toISOString()
            });

        if (error) throw error;
    }

    // Award XP based on correct count or percentage
    const xpAwarded = (score * 10) + 5;
    await awardXPAndStreak(user.id, xpAwarded);

    return { 
        success: true, 
        xpAwarded, 
        score: percentageScore, 
        bestScore: newBestScore, 
        attemptsCount: newAttemptNumber,
        isCompleted: newAttemptNumber >= 2 
    };
}

export async function getCapsuleAttemptStatus(capsuleId: string, studentId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = studentId || user?.id;
    if (!targetUserId) return null;

    const adminSupabase = createAdminClient();
    const { data } = await adminSupabase
        .from('quiz_completions')
        .select('id, score, best_score, attempts_count, attempt_history, completed_at')
        .eq('student_id', targetUserId)
        .eq('capsule_id', capsuleId)
        .maybeSingle();

    const attemptsCount = data ? Number(data.attempts_count || 1) : 0;
    const bestScore = data ? Number(data.best_score ?? data.score ?? 0) : null;
    const canAttempt = attemptsCount < 2;
    const isCompleted = attemptsCount >= 2;

    return {
        hasAttempted: Boolean(data),
        attemptsCount,
        maxAttempts: 2,
        canAttempt,
        isCompleted,
        bestScore,
        lastScore: data?.score ?? null,
        attemptHistory: Array.isArray(data?.attempt_history) ? data.attempt_history : [],
        completedAt: data?.completed_at || null
    };
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
            best_score: 100,
            attempts_count: 1,
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
