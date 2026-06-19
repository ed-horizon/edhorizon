import { createClient } from "@/lib/supabase/server";
import { QuizInterface } from "../QuizInterface";
import { FlashcardPlayer } from "../FlashcardPlayer";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        notFound();
    }

    const { data: capsule, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !capsule || (capsule.content?.student_id && capsule.content.student_id !== user.id)) {
        notFound();
    }

    return (
        <div className="min-h-[80vh] flex flex-col justify-center py-12">
            {capsule.type === 'quiz' ? (
                <QuizInterface
                    capsuleId={capsule.id}
                    title={capsule.title}
                    content={capsule.content as any}
                />
            ) : capsule.type === 'flashcards' ? (
                <FlashcardPlayer
                    capsuleId={capsule.id}
                    title={capsule.title}
                    content={capsule.content as any}
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
                        <Link href="/student/learn">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-200">
                                Complete Lesson
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
