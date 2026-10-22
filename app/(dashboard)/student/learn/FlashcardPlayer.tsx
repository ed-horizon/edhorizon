'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, RotateCw, Trophy, CheckCircle2, Layout, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveQuizResult } from "./actions" // Reusing this for completion tracking
import Link from "next/link"

interface CardSide {
    text: string;
    imageUrl?: string;
}

interface Flashcard {
    id: string;
    front: CardSide;
    back: CardSide;
}

interface FlashcardPlayerProps {
    capsuleId: string;
    title: string;
    content: {
        cards: Flashcard[];
    };
    attemptNumber?: number;
    bestScoreSoFar?: number | null;
}

export function FlashcardPlayer({ capsuleId, title, content, attemptNumber = 1, bestScoreSoFar = null }: FlashcardPlayerProps) {
    const [currentIdx, setCurrentIdx] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [currentAttempt, setCurrentAttempt] = useState(attemptNumber)

    const cards = content.cards || [];
    const totalCards = cards.length;
    const currentCard = cards[currentIdx];
    const progress = ((currentIdx) / totalCards) * 100;

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleNext = async () => {
        if (currentIdx + 1 < totalCards) {
            setCurrentIdx(prev => prev + 1);
            setIsFlipped(false);
        } else {
            setIsSaving(true);
            try {
                // Record completion with "perfect" score for flashcards
                await saveQuizResult(capsuleId, totalCards, totalCards);
                setIsFinished(true);
            } catch (error) {
                console.error("Failed to save result", error);
                alert("Failed to save progress. Check console.");
            } finally {
                setIsSaving(false);
            }
        }
    }

    const handleRetake = () => {
        setCurrentAttempt(2);
        setCurrentIdx(0);
        setIsFlipped(false);
        setIsFinished(false);
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(prev => prev - 1);
            setIsFlipped(false);
        }
    }

    if (totalCards === 0) {
        return (
            <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed">
                <p className="italic text-muted-foreground">This deck has no cards yet.</p>
                <Link href="/student/learn">
                    <Button variant="link" className="mt-4">Go Back</Button>
                </Link>
            </div>
        )
    }

    if (isFinished) {
        const isFinal = currentAttempt >= 2;
        return (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="space-y-4">
                    <div className="inline-block p-6 bg-amber-500 rounded-[2.5rem] text-white shadow-2xl">
                        <Trophy size={64} />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Attempt {currentAttempt} of 2 {isFinal ? "(Completed)" : ""}
                        </span>
                    </div>
                    <h2 className="text-4xl font-serif font-bold">
                        {isFinal ? "Deck Mastered!" : "Attempt 1 Complete!"}
                    </h2>
                    <p className="text-muted-foreground italic max-w-md mx-auto">
                        {isFinal 
                            ? `You have completed all 2 review rounds for ${title}. Your completion is recorded.`
                            : `You reviewed all ${totalCards} cards! You have 1 final review attempt remaining.`}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <Link href="/student/learn" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200">
                            Back to Journey
                            <ArrowRight size={18} />
                        </Button>
                    </Link>

                    {!isFinal && (
                        <Button
                            variant="outline"
                            onClick={handleRetake}
                            className="w-full sm:w-auto border-amber-500 text-amber-600 dark:text-amber-400 rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs gap-3"
                        >
                            Review Again (Attempt 2 of 2)
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-12 pb-12">
            {/* Header */}
            <div className="flex items-center gap-6">
                <Link href="/student/learn">
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                        <ArrowLeft className="text-muted-foreground" size={24} />
                    </Button>
                </Link>
                <div className="flex-1">
                    <Progress value={progress} className="h-3 bg-muted rounded-full overflow-hidden" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                    {currentIdx + 1} / {totalCards}
                </div>
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 italic">Flashcard Review • {title}</h3>
                <p className="text-muted-foreground text-sm italic">Tap to flip, then continue to the next card.</p>
            </div>

            {/* Flashcard Component */}
            <div className="perspective-1000 h-[400px] w-full cursor-pointer group" onClick={handleFlip}>
                <div className={cn(
                    "relative h-full w-full transition-all duration-700 preserve-3d",
                    isFlipped ? "rotate-y-180" : ""
                )}>
                    {/* Front Side */}
                    <CardSideView
                        side={currentCard.front}
                        isBack={false}
                    />

                    {/* Back Side */}
                    <CardSideView
                        side={currentCard.back}
                        isBack={true}
                    />
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between gap-6">
                <Button
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    disabled={currentIdx === 0}
                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 border-border/40"
                >
                    <ArrowLeft size={18} />
                    Previous
                </Button>

                <Button
                    onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                    className="h-14 w-14 rounded-full bg-muted text-foreground hover:bg-indigo-600 hover:text-white transition-all shadow-lg p-0"
                >
                    <RotateCw size={24} />
                </Button>

                <Button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200"
                >
                    {currentIdx + 1 === totalCards ? "Finish Review" : "Next Card"}
                    <ArrowRight size={18} />
                </Button>
            </div>

            {isSaving && <div className="text-center text-xs font-bold text-indigo-600/50 italic animate-pulse">Saving your progress...</div>}
        </div>
    )
}

function CardSideView({ side, isBack }: { side: CardSide, isBack: boolean }) {
    return (
        <div className={cn(
            "absolute inset-0 backface-hidden rounded-[3rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl border border-border/40 bg-card",
            isBack ? "rotate-y-180" : ""
        )}>
            {side.imageUrl && (
                <div className="w-full max-h-[60%] rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-lg">
                    <img
                        src={side.imageUrl}
                        alt="Card visual"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/indigo/white?text=Image+Not+Found';
                        }}
                    />
                </div>
            )}

            <div className={cn(
                "font-serif font-bold text-2xl leading-tight italic",
                isBack ? "text-indigo-900" : "text-foreground"
            )}>
                {side.text || (isBack ? "Empty Back" : "Empty Front")}
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-10">
                <Layout size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{isBack ? "Answer" : "Question"}</span>
            </div>
        </div>
    )
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("bg-card border rounded-3xl", className)}>{children}</div>
}
