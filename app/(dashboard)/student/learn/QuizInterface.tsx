'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, ArrowRight, Trophy, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveQuizResult } from "./actions"
import Link from "next/link"

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    options: Option[];
    correctOptionId: string;
}

interface QuizInterfaceProps {
    capsuleId: string;
    title: string;
    content: {
        questions?: any[];
        [key: string]: any;
    } | any[];
    attemptNumber?: number;
    bestScoreSoFar?: number | null;
}

export function QuizInterface({ capsuleId, title, content, attemptNumber = 1, bestScoreSoFar = null }: QuizInterfaceProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
    const [isAnswered, setIsAnswered] = useState(false)
    const [score, setScore] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [currentAttempt, setCurrentAttempt] = useState(attemptNumber)
    const [finalBestScore, setFinalBestScore] = useState<number | null>(bestScoreSoFar)

    // Normalize raw questions from various shapes ({ questions: [...] } or direct array [...])
    const rawQuestions: any[] = Array.isArray((content as any)?.questions)
        ? (content as any).questions
        : Array.isArray(content)
            ? content
            : [];

    // Filter and sanitize questions so bad/empty questions never cause runtime crashes
    const questions: Question[] = rawQuestions
        .filter(q => q && (typeof q.text === 'string' ? q.text.trim() : typeof q.question === 'string' ? q.question.trim() : false))
        .map((q, qIdx) => {
            const text = String(q.text || q.question || `Question ${qIdx + 1}`).trim();
            const rawOptions: any[] = Array.isArray(q.options)
                ? q.options
                : typeof q.options === 'object' && q.options !== null
                    ? Object.values(q.options)
                    : [];

            const options: Option[] = rawOptions.map((opt: any, optIdx: number) => {
                if (typeof opt === 'string') {
                    return { id: String(optIdx + 1), text: opt.trim() };
                }
                return {
                    id: String(opt?.id ?? optIdx + 1),
                    text: String(opt?.text ?? opt?.label ?? `Option ${optIdx + 1}`).trim()
                };
            }).filter(opt => opt.text.length > 0);

            // Determine correctOptionId: support string id, number, or correctIndex
            let correctOptionId = String(q.correctOptionId ?? '');
            if (!correctOptionId && q.correctIndex !== undefined) {
                correctOptionId = String(Number(q.correctIndex) + 1);
            }
            if (!options.some(opt => opt.id === correctOptionId) && options.length > 0) {
                correctOptionId = options[0].id;
            }

            return {
                id: String(q.id || `q-${qIdx + 1}`),
                text,
                options,
                correctOptionId
            };
        })
        .filter(q => q.options.length > 0);

    const totalSteps = questions.length;
    const safeStep = Math.min(Math.max(0, currentStep), Math.max(0, totalSteps - 1));
    const currentQuestion = questions[safeStep] || null;
    const progress = totalSteps > 0 ? ((safeStep + 1) / totalSteps) * 100 : 0;

    const handleCheck = () => {
        if (!selectedOptionId || !currentQuestion) return;

        const isCorrect = selectedOptionId === currentQuestion.correctOptionId;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        setIsAnswered(true);
    }

    const handleNext = async () => {
        if (currentStep + 1 < totalSteps) {
            setCurrentStep(prev => prev + 1);
            setSelectedOptionId(null);
            setIsAnswered(false);
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            setIsSaving(true);
            try {
                const res = await saveQuizResult(capsuleId, score, totalSteps);
                if (res && res.bestScore !== undefined) {
                    setFinalBestScore(res.bestScore);
                } else {
                    const currentPct = totalSteps > 0 ? Math.round((score / totalSteps) * 100) : 100;
                    setFinalBestScore(prev => Math.max(prev || 0, currentPct));
                }
            } catch (error) {
                console.error("Failed to save result", error);
                // Gracefully fallback to local score calculation so the student is never stuck
                const currentPct = totalSteps > 0 ? Math.round((score / totalSteps) * 100) : 100;
                setFinalBestScore(prev => Math.max(prev || 0, currentPct));
            } finally {
                setIsSaving(false);
                setIsFinished(true);
            }
        }
    }

    const handleRetakeSecondAttempt = () => {
        setCurrentAttempt(2);
        setCurrentStep(0);
        setSelectedOptionId(null);
        setIsAnswered(false);
        setScore(0);
        setIsFinished(false);
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (totalSteps === 0 || !currentQuestion) {
        return (
            <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed">
                <p className="italic text-muted-foreground">This quiz has no questions yet.</p>
                <Link href="/student/learn">
                    <Button variant="link" className="mt-4">Go Back</Button>
                </Link>
            </div>
        )
    }

    if (isFinished) {
        const percentage = Math.round((score / totalSteps) * 100);
        const recordedBest = finalBestScore !== null ? finalBestScore : Math.max(bestScoreSoFar || 0, percentage);
        const isFinalAttempt = currentAttempt >= 2;

        return (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="space-y-4">
                    <div className="inline-block p-6 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl">
                        <Trophy size={64} />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Attempt {currentAttempt} of 2 {isFinalAttempt ? "(Final Attempt Completed)" : ""}
                        </span>
                    </div>
                    <h2 className="text-4xl font-serif font-bold">
                        {isFinalAttempt ? "Quiz Completed!" : "Attempt 1 Complete!"}
                    </h2>
                    <p className="text-muted-foreground italic max-w-md mx-auto">
                        {isFinalAttempt 
                            ? `You have completed all 2 attempts for ${title}. Your best score of ${recordedBest}% has been saved.`
                            : `Great job on your first attempt for ${title}! You have 1 final attempt remaining to improve your score.`
                        }
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border/40 rounded-[2rem] p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Attempt {currentAttempt} Score
                        </p>
                        <p className="text-3xl font-bold">{score} / {totalSteps} ({percentage}%)</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-[2rem] p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
                            Recorded Best Score
                        </p>
                        <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{recordedBest}%</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <Link href="/student" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs gap-3">
                            Back to Dashboard
                            <ArrowRight size={18} />
                        </Button>
                    </Link>

                    {!isFinalAttempt && (
                        <Button
                            variant="outline"
                            onClick={handleRetakeSecondAttempt}
                            className="w-full sm:w-auto border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs gap-3"
                        >
                            <RefreshCcw size={18} />
                            Retake (Attempt 2 of 2)
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-10 pb-28">
            {/* Nav Header */}
            <div className="flex items-center gap-6">
                <Link href="/student">
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                        <XCircle className="text-muted-foreground" size={24} />
                    </Button>
                </Link>
                <div className="flex-1">
                    <Progress value={progress} className="h-3 bg-muted rounded-full overflow-hidden" />
                </div>
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Question {safeStep + 1} of {totalSteps}
                </div>
            </div>

            <div className="space-y-8">
                <div className="text-center space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 italic">Level UP • {title}</h3>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">{currentQuestion.text}</h2>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                    {currentQuestion.options.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => setSelectedOptionId(opt.id)}
                            className={cn(
                                "flex items-center justify-between p-5 md:p-6 rounded-[2rem] border-2 transition-all text-left group",
                                selectedOptionId === opt.id
                                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-md scale-[1.01]"
                                    : "border-border/40 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-muted/30",
                                isAnswered && opt.id === currentQuestion.correctOptionId && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                                isAnswered && selectedOptionId === opt.id && opt.id !== currentQuestion.correctOptionId && "border-red-500 bg-red-50 dark:bg-red-950/40"
                            )}
                        >
                            <span className={cn(
                                "font-bold text-base md:text-lg",
                                selectedOptionId === opt.id ? "text-indigo-950 dark:text-indigo-200" : "text-foreground",
                                isAnswered && opt.id === currentQuestion.correctOptionId && "text-emerald-900 dark:text-emerald-200",
                                isAnswered && selectedOptionId === opt.id && opt.id !== currentQuestion.correctOptionId && "text-red-900 dark:text-red-200"
                            )}>
                                {opt.text}
                            </span>

                            {isAnswered && opt.id === currentQuestion.correctOptionId && (
                                <CheckCircle2 className="text-emerald-500 shrink-0 ml-3" size={24} />
                            )}
                            {isAnswered && selectedOptionId === opt.id && opt.id !== currentQuestion.correctOptionId && (
                                <XCircle className="text-red-500 shrink-0 ml-3" size={24} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Bar: Sticky and always visible on mobile & desktop */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 border-t bg-background/95 backdrop-blur-md z-30 shadow-2xl">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    {isAnswered ? (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {selectedOptionId === currentQuestion.correctOptionId ? (
                                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <span>Correct! Great job.</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold text-sm">
                                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                                        <XCircle size={18} />
                                    </div>
                                    <span>Incorrect answer. Let's learn!</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground font-medium hidden sm:block">
                            Select an option above to test your knowledge...
                        </div>
                    )}

                    <div className="w-full sm:w-auto flex justify-end">
                        {!isAnswered ? (
                            <Button
                                type="button"
                                disabled={!selectedOptionId}
                                onClick={handleCheck}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 md:h-14 px-10 font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                Check Answer
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className={cn(
                                    "w-full sm:w-auto rounded-2xl h-12 md:h-14 px-10 font-black uppercase tracking-widest text-xs gap-2 shadow-lg transition-colors",
                                    selectedOptionId === currentQuestion.correctOptionId
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-red-600 hover:bg-red-700 text-white"
                                )}
                            >
                                {isSaving ? "Saving..." : (safeStep + 1 === totalSteps ? "Finish Quiz" : "Continue")}
                                <ArrowRight size={18} />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
