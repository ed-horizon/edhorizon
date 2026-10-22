import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizInterface } from "../QuizInterface";
import { FlashcardPlayer } from "../FlashcardPlayer";
import { VideoCompletionButton } from "./VideoCompletionButton";
import { ArrowLeft, Trophy, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        notFound();
    }

    const adminSupabase = createAdminClient();
    const { data: capsule, error } = await adminSupabase
        .from('capsules')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !capsule) {
        notFound();
    }

    // Allow access if directly assigned to user or no specific student lock
    if (capsule.content?.student_id && capsule.content.student_id !== user.id) {
        notFound();
    }

    // Check existing completion & attempts count
    const { data: completion } = await adminSupabase
        .from('quiz_completions')
        .select('*')
        .eq('student_id', user.id)
        .eq('capsule_id', id)
        .maybeSingle();

    const attemptsCount = completion ? Number(completion.attempts_count || 1) : 0;
    const bestScore = completion ? Number(completion.best_score ?? completion.score ?? 0) : null;
    const isMaxAttemptsReached = capsule.type !== 'video' && attemptsCount >= 2;
    const attemptHistory = Array.isArray(completion?.attempt_history) ? completion.attempt_history : [];

    // If max attempts (2) are already reached, render the Completed Summary screen
    if (isMaxAttemptsReached) {
        return (
            <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4">
                <div className="max-w-xl w-full bg-card border-2 border-indigo-600/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="space-y-4">
                        <div className="inline-block p-6 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl">
                            <Trophy size={60} />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-xs px-3 py-1">
                                ✓ 2 of 2 Attempts Completed
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
                            Capsule Completed!
                        </h1>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                            You have completed both allowed attempts for <strong className="text-foreground">{capsule.title}</strong>. Your recorded result is locked to your highest score.
                        </p>
                    </div>

                    {/* Best Score Highlight */}
                    <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            Final Recorded Best Score
                        </span>
                        <div className="text-5xl font-black text-indigo-700 dark:text-indigo-300">
                            {bestScore !== null ? `${bestScore}%` : '100%'}
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1">
                            Shared with your assigned tutor and batch administration.
                        </p>
                    </div>

                    {/* Attempts Breakdown */}
                    {attemptHistory.length > 0 && (
                        <div className="space-y-2 text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">
                                Attempts History
                            </span>
                            <div className="space-y-2">
                                {attemptHistory.map((att: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-muted-foreground">
                                                Attempt {att.attempt_number || idx + 1}:
                                            </span>
                                            <span className="font-bold text-foreground">
                                                {att.score}%
                                            </span>
                                            {att.score === bestScore && (
                                                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 px-1.5 py-0">
                                                    Best
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {att.completed_at ? new Date(att.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Completed'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link href="/student" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs gap-2">
                                <ArrowLeft size={16} />
                                Student Dashboard
                            </Button>
                        </Link>
                        <Link href="/student/learn" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full sm:w-auto rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs">
                                All Learning Modules
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex flex-col justify-center py-12">
            {/* Show notice if on attempt 2 of 2 */}
            {attemptsCount === 1 && capsule.type !== 'video' && (
                <div className="max-w-2xl mx-auto w-full mb-6 px-4">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>
                                <strong>Attempt 2 of 2 (Final Attempt):</strong> Your first score was {bestScore}%. The highest score of the 2 will be saved.
                            </span>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px] shrink-0 font-mono">
                            Final Attempt
                        </Badge>
                    </div>
                </div>
            )}

            {capsule.type === 'quiz' ? (
                <QuizInterface
                    capsuleId={capsule.id}
                    title={capsule.title}
                    content={capsule.content as any}
                    attemptNumber={attemptsCount + 1}
                    bestScoreSoFar={bestScore}
                />
            ) : capsule.type === 'flashcards' ? (
                <FlashcardPlayer
                    capsuleId={capsule.id}
                    title={capsule.title}
                    content={capsule.content as any}
                    attemptNumber={attemptsCount + 1}
                    bestScoreSoFar={bestScore}
                />
            ) : (
                <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center gap-6 mb-8">
                        <Link href="/student/learn">
                            <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-serif font-bold italic tracking-tight">{capsule.title}</h1>
                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mt-1">Video Lesson</p>
                        </div>
                    </div>

                    <div className="aspect-video bg-indigo-900 rounded-[3rem] shadow-2xl overflow-hidden flex items-center justify-center border-8 border-white/10 relative group">
                        <div className="p-8 text-white/50 italic text-center">
                            <p className="font-bold text-xl mb-2 text-white/80">Interactive Video Player</p>
                            <p>{capsule.content?.videoUrl || "Ready to Stream..."}</p>
                        </div>
                        {/* Overlay with subtle gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/40 to-transparent pointer-events-none" />
                    </div>

                    <div className="bg-card border border-border/40 rounded-[2.5rem] p-10 shadow-xl space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 italic">Lesson Notes</h3>
                        <div className="text-muted-foreground leading-relaxed italic">
                            {capsule.content?.description || "In this unit, we explore the core concepts defined in the curriculum. Pay close attention to the visual aids and summaries provided."}
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <VideoCompletionButton capsuleId={capsule.id} />
                    </div>
                </div>
            )}
        </div>
    );
}
